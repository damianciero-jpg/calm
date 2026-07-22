// Full-length, undrained — order in the day is left-to-right / top-to-bottom
// reading order. Compresses visually (via bufferMin already shrunk upstream
// by recalculateBuffers) without any "late" label or red state.
export function UpcomingTaskBar({ task }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>{task.label}</p>
      <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: '#eef1f6' }}>
        <div style={{ flex: task.durationMin, background: '#5b8def' }} />
        <div style={{ flex: Math.max(task.bufferMin, 1), background: '#cfe0f7' }} />
      </div>
    </div>
  );
}
