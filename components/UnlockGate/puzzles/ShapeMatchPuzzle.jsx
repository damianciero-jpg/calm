import { useState } from 'react';

const SHAPES = [
  { id: 'circle', emoji: '🔵' },
  { id: 'square', emoji: '🟨' },
  { id: 'triangle', emoji: '🔺' },
];

export function ShapeMatchPuzzle({ onSolved }) {
  const [matched, setMatched] = useState([]);
  const [target] = useState(() => [...SHAPES].sort(() => Math.random() - 0.5));

  function handleTap(shapeId) {
    const nextIndex = matched.length;
    if (target[nextIndex]?.id === shapeId) {
      const next = [...matched, shapeId];
      setMatched(next);
      if (next.length === SHAPES.length) onSolved();
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {target.map((s, i) => (
          <span key={s.id} style={{ opacity: i < matched.length ? 1 : 0.25, fontSize: 32 }}>
            {s.emoji}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {SHAPES.map((s) => (
          <button
            key={s.id}
            onClick={() => handleTap(s.id)}
            aria-label={`Tap ${s.id}`}
            style={{ fontSize: 40, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            {s.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
