import { getFirebaseDb } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

function gateRef(childId, gateId) {
  return doc(getFirebaseDb(), 'unlockGates', childId, 'gates', gateId);
}

export async function getGateState(childId, gateId) {
  const snap = await getDoc(gateRef(childId, gateId));
  return snap.exists() ? snap.data() : null;
}

export async function createGate(childId, gateId, { triggerType, ageProfile }) {
  await setDoc(gateRef(childId, gateId), {
    id: gateId, childId, triggerType, ageProfile,
    completed: false, createdAt: serverTimestamp(),
  }, { merge: true });
}

export async function completeGate(childId, gateId, { triggerType, ageProfile }) {
  await setDoc(gateRef(childId, gateId), {
    id: gateId, childId, triggerType, ageProfile,
    completed: true, completedAt: new Date().toISOString(),
  }, { merge: true });
}

export function listenGate(childId, gateId, callback) {
  return onSnapshot(gateRef(childId, gateId), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}
