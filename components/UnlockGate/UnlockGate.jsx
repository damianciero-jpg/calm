import { useState, useCallback, useMemo } from 'react';
import { ShapeMatchPuzzle } from './puzzles/ShapeMatchPuzzle';
import { TapToWake } from './puzzles/TapToWake';
import { MemoryGridPuzzle } from './puzzles/MemoryGridPuzzle';
import { MathPuzzle } from './puzzles/MathPuzzle';
import { BreathingRing } from './puzzles/BreathingRing';
import { completeGate } from '../../lib/unlockGate';
import styles from './UnlockGate.module.css';

// triggerType generalized beyond alarm/checkin to cover any transition moment.
// Puzzle components are unchanged — only which transition invokes the gate differs.
const COPY = {
  wake: {
    kids: { title: "Open today's door", sub: 'Match them all to begin.' },
    teens: { title: "Open today's door", sub: 'Complete the sequence to start your day.' },
  },
  checkin: {
    kids: { title: 'Come find your feelings', sub: 'Tap gently, three times.' },
    teens: { title: 'Come find your feelings', sub: 'Take a breath with us before entering.' },
  },
  homework: {
    kids: { title: 'Ready your desk', sub: 'Match them all to begin.' },
    teens: { title: 'Ready your desk', sub: 'Complete the sequence to start.' },
  },
  winddown: {
    kids: { title: 'Time to slow down', sub: 'Tap gently, three times.' },
    teens: { title: 'Time to slow down', sub: 'Take a breath with us.' },
  },
};

function MemoryGridPuzzleOrMath({ gateId, ...props }) {
  const useMath = useMemo(() => gateId.charCodeAt(0) % 2 === 0, [gateId]);
  return useMath ? <MathPuzzle {...props} /> : <MemoryGridPuzzle {...props} />;
}

export function UnlockGate({ childId, gateId, triggerType, ageProfile, onComplete }) {
  const [solved, setSolved] = useState(false);
  const copy = COPY[triggerType][ageProfile];

  const handleSolved = useCallback(async () => {
    setSolved(true);
    await completeGate(childId, gateId, { triggerType, ageProfile });
    setTimeout(() => onComplete?.(), 600);
  }, [childId, gateId, triggerType, ageProfile, onComplete]);

  // wake/homework use the "active" puzzle family; checkin/winddown use the "calm" family
  const isActiveFamily = triggerType === 'wake' || triggerType === 'homework';

  const Puzzle = useMemo(() => {
    if (isActiveFamily) {
      return ageProfile === 'kids' ? ShapeMatchPuzzle : MemoryGridPuzzleOrMath;
    }
    return ageProfile === 'kids' ? TapToWake : BreathingRing;
  }, [isActiveFamily, ageProfile]);

  return (
    <div className={styles.gate} role="dialog" aria-label={copy.title}>
      <h2 className={styles.title}>{copy.title}</h2>
      <p className={styles.sub}>{copy.sub}</p>
      <div className={styles.puzzleArea}>
        <Puzzle gateId={gateId} onSolved={handleSolved} solved={solved} />
      </div>
    </div>
  );
}
