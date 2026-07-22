import * as admin from 'firebase-admin';
import { ScheduleConfig } from './scheduleConfig';

export async function createGateAndSend(config: ScheduleConfig, triggerType: string) {
  const db = admin.firestore();
  const gateId = `${triggerType}-${new Date().toISOString().slice(0, 10)}`; // one gate per trigger per day

  const gateRef = db
    .collection('unlockGates')
    .doc(config.childId)
    .collection('gates')
    .doc(gateId);

  const existing = await gateRef.get();
  if (existing.exists) return; // already created/sent today, avoid duplicate push

  await gateRef.set({
    id: gateId,
    childId: config.childId,
    triggerType,
    ageProfile: config.ageProfile,
    completed: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Data-only message: the client's firebase-messaging-sw.js has its own
  // `push` listener that builds the notification itself from `titles[triggerType]`
  // and reads a flat { type, triggerType, gateId, childId } payload. A
  // `notification` block here would change the wire shape FCM delivers to
  // that raw listener (fields nest under `data`/`notification` instead of
  // arriving flat), so title/body stay out of this payload on purpose.
  await admin.messaging().send({
    token: config.fcmToken,
    data: {
      type: 'unlock-gate',
      triggerType,
      gateId,
      childId: config.childId,
    },
  });
}
