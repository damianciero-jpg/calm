import { useEffect, useState } from 'react';
import { listenRoutine, recalculateBuffers } from '../../lib/routines';
import { ActiveTaskCircle } from './ActiveTaskCircle';
import { UpcomingTaskBar } from './UpcomingTaskBar';
import styles from './ScheduleVisualizer.module.css';

export function ScheduleVisualizer({ childId, routineId }) {
  const [routine, setRoutine] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const unsub = listenRoutine(childId, routineId, setRoutine);
    return unsub;
  }, [childId, routineId]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  if (!routine) return null;

  const adjusted = recalculateBuffers(routine, now);
  const activeTask = adjusted.tasks.find((t) => t.id === adjusted.activeTaskId);
  const upcoming = adjusted.tasks.filter((t) => t.id !== adjusted.activeTaskId && !t.completed);
  const completed = adjusted.tasks.filter((t) => t.completed);

  return (
    <div className={styles.visualizer}>
      {activeTask && (
        <ActiveTaskCircle task={activeTask} startedAt={adjusted.startedAt} now={now} />
      )}
      <div className={styles.upcoming}>
        {upcoming.map((t) => (
          <UpcomingTaskBar key={t.id} task={t} />
        ))}
      </div>
      {completed.length > 0 && (
        <div className={styles.completed}>
          {completed.map((t) => (
            <div key={t.id} className={styles.completedRow}>
              <span aria-hidden="true">✓</span> {t.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
