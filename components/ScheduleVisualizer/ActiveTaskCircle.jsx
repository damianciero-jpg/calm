// Round = happening now. Fill drains as time passes. Buffer segment is a
// visually distinct lighter ring so "task time" and "getting-ready buffer"
// read as different things without a legend. No numeric countdown.
export function ActiveTaskCircle({ task, startedAt, now }) {
  const totalMs = (task.durationMin + task.bufferMin) * 60000;
  const elapsedRatio = startedAt
    ? Math.min(1, Math.max(0, (now - new Date(startedAt)) / totalMs))
    : 0;

  const taskRatio = task.durationMin / (task.durationMin + task.bufferMin);
  const size = 180;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const remaining = 1 - elapsedRatio;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#eef1f6" strokeWidth={stroke}
        />
        {/* buffer segment, lighter */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#cfe0f7" strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * taskRatio}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* remaining task+buffer time, drains as time passes */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#5b8def" strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - remaining)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1000ms linear' }}
        />
      </svg>
      <p style={{ marginTop: 8, fontSize: 16, fontWeight: 600 }}>{task.label}</p>
    </div>
  );
}
