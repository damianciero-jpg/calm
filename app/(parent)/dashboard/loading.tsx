export default function DashboardLoading() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ height: 54, background: 'white', borderBottom: '1px solid #E2E8F0', padding: '0.75rem 1.5rem' }}>
        <div style={{ width: 140, height: 28, borderRadius: 20, background: '#E2E8F0' }} />
      </div>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ height: 96, borderRadius: 18, background: '#E2E8F0', marginBottom: 18 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
          {[0, 1, 2, 3].map(i => <div key={i} style={{ height: 116, borderRadius: 18, background: '#E2E8F0' }} />)}
        </div>
        <div style={{ height: 260, borderRadius: 18, background: '#E2E8F0' }} />
      </main>
    </div>
  )
}
