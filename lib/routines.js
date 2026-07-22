import { getFirebaseDb } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// routines/{childId}/items/{routineId}
// { id, childId, label, tasks: [{ id, label, durationMin, bufferMin, completed }], activeTaskId, startedAt }

function routineRef(childId, routineId) {
  return doc(getFirebaseDb(), 'routines', childId, 'items', routineId);
}

export async function getRoutine(childId, routineId) {
  const snap = await getDoc(routineRef(childId, routineId));
  return snap.exists() ? snap.data() : null;
}

export async function createRoutine(childId, routineId, { label, tasks }) {
  await setDoc(routineRef(childId, routineId), {
    id: routineId,
    childId,
    label,
    tasks: tasks.map((t, i) => ({ ...t, completed: false, order: i })),
    activeTaskId: tasks[0]?.id ?? null,
    startedAt: null,
    createdAt: serverTimestamp(),
  });
}

export async function startRoutine(childId, routineId) {
  const routine = await getRoutine(childId, routineId);
  if (!routine) return;
  await setDoc(routineRef(childId, routineId), {
    ...routine,
    startedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function completeTask(childId, routineId, taskId) {
  const routine = await getRoutine(childId, routineId);
  if (!routine) return;
  const tasks = routine.tasks.map((t) =>
    t.id === taskId ? { ...t, completed: true } : t
  );
  const nextActive = tasks.find((t) => !t.completed)?.id ?? null;
  await setDoc(routineRef(childId, routineId), {
    ...routine,
    tasks,
    activeTaskId: nextActive,
  }, { merge: true });
}

export function listenRoutine(childId, routineId, callback) {
  return onSnapshot(routineRef(childId, routineId), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

// Silent recalculation: if elapsed time on the active task exceeds its
// durationMin, shrink the *buffer* of remaining tasks proportionally rather
// than flagging lateness. Never returns a "late" flag — only adjusted times.
export function recalculateBuffers(routine, now = new Date()) {
  if (!routine?.startedAt) return routine;
  const elapsedMin = (now - new Date(routine.startedAt)) / 60000;
  const totalPlannedMin = routine.tasks.reduce((sum, t) => sum + t.durationMin + t.bufferMin, 0);
  const overrunMin = Math.max(0, elapsedMin - totalPlannedMin);
  if (overrunMin === 0) return routine;

  const remaining = routine.tasks.filter((t) => !t.completed);
  const totalBuffer = remaining.reduce((sum, t) => sum + t.bufferMin, 0);
  if (totalBuffer === 0) return routine;

  const shrinkRatio = Math.max(0.2, 1 - overrunMin / totalBuffer); // never fully zero out buffer
  return {
    ...routine,
    tasks: routine.tasks.map((t) =>
      t.completed ? t : { ...t, bufferMin: Math.round(t.bufferMin * shrinkRatio) }
    ),
  };
}
