import { useState } from 'react';

export function TapToWake({ onSolved }) {
  const [taps, setTaps] = useState(0);

  function handleTap() {
    const next = taps + 1;
    setTaps(next);
    if (next >= 3) onSolved();
  }

  return (
    <button
      onClick={handleTap}
      aria-label="Tap to wake up"
      style={{
        width: 120, height: 120, borderRadius: '50%', border: 'none',
        background: `radial-gradient(circle, rgba(255,220,150,${0.3 + taps * 0.2}) 0%, transparent 70%)`,
        fontSize: 48, cursor: 'pointer', transition: 'all 300ms ease',
        transform: `scale(${1 + taps * 0.08})`,
      }}
    >
      ☀️
    </button>
  );
}
