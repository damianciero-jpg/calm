import { useState } from 'react';

export function MathPuzzle({ onSolved }) {
  const [{ a, b, answer }] = useState(() => {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    return { a, b, answer: a + b };
  });
  const [input, setInput] = useState('');

  function handleChange(e) {
    const val = e.target.value;
    setInput(val);
    if (Number(val) === answer) onSolved();
  }

  return (
    <div>
      <p style={{ fontSize: 20, marginBottom: 8 }}>{a} + {b} = ?</p>
      <input
        type="number"
        value={input}
        onChange={handleChange}
        aria-label="Answer"
        style={{ fontSize: 18, padding: 8, width: 80, textAlign: 'center' }}
      />
    </div>
  );
}
