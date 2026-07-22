import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { createGateAndSend } from './sendUnlockPush';
import { ScheduleConfig } from './scheduleConfig';

// Runs every 5 minutes, checks all active schedule configs, and sends a push
// for any trigger whose configured local time falls within the current window.
// 5-minute granularity is intentional — tight enough to feel timely, loose
// enough to keep function invocations and Firestore reads cheap at scale.
export const checkSchedules = onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'UTC' },
  async () => {
    const db = admin.firestore();
    const snapshot = await db.collection('scheduleConfig').get();

    const now = new Date();

    const jobs = snapshot.docs.map(async (doc) => {
      const config = doc.data() as ScheduleConfig;
      const localNow = new Date(
        now.toLocaleString('en-US', { timeZone: config.timezone })
      );
      const localMinutesOfDay = localNow.getHours() * 60 + localNow.getMinutes();

      for (const [triggerType, trigger] of Object.entries(config.triggers ?? {})) {
        if (!trigger?.enabled) continue;

        // Minutes-of-day distance (mod 1440) so a trigger set near an hour
        // boundary (e.g. 7:59) still fires if the scheduler runs a couple
        // minutes into the next hour (e.g. 8:01) — plain hour+minute
        // equality would miss that case.
        const targetMinutesOfDay = trigger.hour * 60 + trigger.minute;
        const rawDiff = Math.abs(localMinutesOfDay - targetMinutesOfDay);
        const diff = Math.min(rawDiff, 1440 - rawDiff);
        const withinWindow = diff <= 2; // 5-min cadence, +/-2 tolerance

        if (withinWindow) {
          await createGateAndSend(config, triggerType).catch((err) => {
            console.error(`Failed to send ${triggerType} push for ${config.childId}`, err);
          });
        }
      }
    });

    await Promise.all(jobs);
  }
);
