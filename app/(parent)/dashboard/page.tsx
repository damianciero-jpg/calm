'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { createClient } from '@/lib/supabase'
import CalmPathDashboardRaw from '@/components/calmpath-dashboard'
import AddChildModal from '@/components/add-child-modal'
import type { Child } from '@/types/database'

type DashboardProps = { childId: string; childName: string; childAge: number; childAvatar: string; childColor: string; childGameMode: string }
const CalmPathDashboard = CalmPathDashboardRaw as unknown as React.ComponentType<DashboardProps>

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading]             = useState(true)
  const [children, setChildren]           = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [showAddChild, setShowAddChild]   = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      supabase
        .from('children')
        .select('*')
        .order('created_at')
        .then(({ data }) => {
          const kids = (data ?? []) as Child[]
          setChildren(kids)
          if (kids.length >= 1) setSelectedChild(kids[0])
          setLoading(false)
        })
    })
  }, [router])

  function handleAddSuccess(child: Child) {
    setChildren(prev => [...prev, child])
    setSelectedChild(child)
    setShowAddChild(false)
  }

  if (loading) return (
    <>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}`}</style>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '2rem', animation: 'bounce 1.2s ease-in-out infinite' }}>📊</div>
      </div>
    </>
  )

  if (!selectedChild) {
    return <AddChildModal onSuccess={handleAddSuccess} />
  }

  return (
    <>
      <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '0.5rem 1.5rem', display: 'flex', gap: '8px', alignItems: 'center', overflowX: 'auto' }}>
        {children.map(child => (
          <button
            key={child.id}
            onClick={() => setSelectedChild(child)}
            style={{
              padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              background: selectedChild.id === child.id ? child.color : '#F1F5F9',
              color: selectedChild.id === child.id ? 'white' : '#374151',
              fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.82rem',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px',
              flexShrink: 0,
            }}
          >
            <span>{child.avatar}</span> {child.name}
          </button>
        ))}
        <button
          onClick={() => setShowAddChild(true)}
          style={{
            padding: '6px 14px', borderRadius: '20px', border: '1.5px dashed #CBD5E1',
            background: 'white', color: '#64748B', cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: '0.82rem',
            transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '4px',
            flexShrink: 0, marginLeft: 'auto',
          }}
        >
          + Add Child
        </button>
      </div>

      <CalmPathDashboard
        childId={selectedChild.id}
        childName={selectedChild.name}
        childAge={selectedChild.age}
        childAvatar={selectedChild.avatar}
        childColor={selectedChild.color}
        childGameMode={selectedChild.game_mode ?? 'kids'}
      />

      {showAddChild && (
        <AddChildModal
          onSuccess={handleAddSuccess}
          onCancel={() => setShowAddChild(false)}
        />
      )}
    </>
  )
}
