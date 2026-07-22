import { useState, useEffect } from 'react';

export function MemoryGridPuzzle({ onSolved }) {
  const [sequence] = useState(() =>
    Array.from({ length: 3 }, () => Math.floor(Math.random() * 4))
  );
  const [showing, setShowing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [highlight, setHighlight] = useState(-1);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setHighlight(sequence[i]);
      setTimeout(() => setHighlight(-1), 500);
      i++;
      if (i >= sequence.length) {
        clearInterval(interval);
        setTimeout(() => setShowing(false), 700);
      }
    }, 900);
    return () => clearInterval(interval);
  }, [sequence]);

  function handleTap(cell) {
    if (showing) return;
    if (sequence[progress] === cell) {
      const next = progress + 1;
      setProgress(next);
      if (next === sequence.length) onSolved();
    } else {
      setProgress(0);
      setShowing(true);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 60px)', gap: 10 }}>
      {[0, 1, 2, 3].map((cell) => (
        <button
          key={cell}
          onClick={() => handleTap(cell)}
          style={{
            width: 60, height: 60, borderRadius: 12, border: '1px solid #ddd',
            background: highlight === cell ? '#8ec5ff' : '#f0f4ff', cursor: 'pointer',
          }}
        />
      ))}
    </div>
  );
}
