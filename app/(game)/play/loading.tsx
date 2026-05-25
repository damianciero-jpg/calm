export default function PlayLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#F7F3FF 0%,#EBF5FF 50%,#F0FFF4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 450 }}>
        <div style={{ height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.78)', marginBottom: 12 }} />
        <div style={{ height: 650, borderRadius: 8, background: 'linear-gradient(160deg,#FF6EB4 0%,#9B59B6 100%)', opacity: 0.75 }} />
      </div>
    </div>
  )
}
