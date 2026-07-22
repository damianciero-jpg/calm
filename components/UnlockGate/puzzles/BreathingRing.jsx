import { useEffect } from 'react';

export function BreathingRing({ onSolved }) {
  useEffect(() => {
    const timer = setTimeout(onSolved, 4000);
    return () => clearTimeout(timer);
  }, [onSolved]);

  return (
    <>
      <style>{`
        @keyframes breathingRingScale {
          from { transform: scale(1); }
          to { transform: scale(1.6); }
        }
      `}</style>
      <div
        aria-label="Breathe in slowly"
        style={{
          width: 100, height: 100, borderRadius: '50%',
          border: '3px solid #a8c8ec', margin: '0 auto',
          animation: 'breathingRingScale 4000ms ease-in-out forwards',
        }}
      />
    </>
  );
}
