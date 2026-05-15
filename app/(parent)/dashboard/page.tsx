'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import { createClient } from '@/lib/supabase'
import { SignInRequired, withTimeout } from '@/lib/browser-auth'
import CalmPathDashboardRaw from '@/components/calmpath-dashboard'
import AddChildModal from '@/components/add-child-modal'
import type { Child } from '@/types/database'

type DashboardProps = { childId: string; childName: string; childAge: number; childAvatar: string; childColor: string; childGameMode: string }
const CalmPathDashboard = CalmPathDashboardRaw as unknown as React.ComponentType<DashboardProps>

function Diagnostics({ diagnostics }: { diagnostics: string[] }) {
  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 12px', color: '#475569', fontSize: '0.78rem', lineHeight: 1.5, textAlign: 'left' }}>
      {diagnostics.length === 0 ? (
        <div>Dashboard diagnostics pending</div>
      ) : (
        diagnostics.map(item => <div key={item}>{item}</div>)
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [loading, setLoading]             = useState(true)
  const [children, setChildren]           = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [showAddChild, setShowAddChild]   = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [authMissing, setAuthMissing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(false)
  const [diagnostics, setDiagnostics] = useState<string[]>([])

  useEffect(() => {
    let active = true
    let childrenQueryStarted = false
    const supabase = createClient()

    function addDiagnostic(message: string) {
      if (active) {
        setDiagnostics(prev => [...prev, message])
      }
    }

    async function loadDashboard() {
      setLoading(true)
      setDashboardError(null)
      setAuthMissing(false)
      setIsEmpty(false)
      setDiagnostics([])

      try {
        const {
          data: { session },
          error: sessionError,
        } = await withTimeout(supabase.auth.getSession(), 'Dashboard session lookup')

        if (sessionError) {
          console.error('Dashboard getSession error', sessionError)
          addDiagnostic(`Auth session error: ${sessionError.message}`)
          if (active) setDashboardError(sessionError.message)
          return
        }

        if (!session) {
          console.error('Dashboard session lookup returned no session')
          if (active) setAuthMissing(true)
          return
        }

        const user = session.user

        addDiagnostic('Auth session found')
        addDiagnostic('Children query started')
        childrenQueryStarted = true

        const { data, error: childrenError } = await withTimeout(
          supabase
            .from('children')
            .select('*')
            .eq('parent_id', user.id)
            .order('created_at'),
          'Dashboard children query'
        )

        if (childrenError) {
          console.error('Dashboard children query error', childrenError)
          addDiagnostic(`Children query error: ${childrenError.message}`)
          if (active) setDashboardError(childrenError.message)
          return
        }

        const kids = (data ?? []) as Child[]
        addDiagnostic(`Children found: ${kids.length}`)

        if (active) {
          setChildren(kids)
          setSelectedChild(kids[0] ?? null)
          setIsEmpty(kids.length === 0)
        }
      } catch (err) {
        console.error('Dashboard load failed', err)
        addDiagnostic(`${childrenQueryStarted ? 'Children query error' : 'Dashboard load error'}: ${err instanceof Error ? err.message : 'Unexpected dashboard loading error'}`)
        if (active) {
          setDashboardError(err instanceof Error ? err.message : 'Unexpected dashboard loading error')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [])

  function handleAddSuccess(child: Child) {
    setChildren(prev => [...prev, child])
    setSelectedChild(child)
    setIsEmpty(false)
    setShowAddChild(false)
  }

  async function signOutAndRetry() {
    const supabase = createClient()

    try {
      await supabase.auth.signOut()
    } finally {
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/login'
    }
  }

  if (loading) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", padding: '1rem' }}>
        <div style={{ width: '100%', maxWidth: '520px', display: 'grid', gap: '12px', color: '#64748B', fontSize: '0.95rem' }}>
          <div>
            Loading dashboard...
          </div>
          <Diagnostics diagnostics={diagnostics} />
        </div>
      </div>
    </>
  )

  if (authMissing) {
    return <SignInRequired />
  }

  if (dashboardError) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&display=swap');`}</style>
        <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '520px', background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 24px rgba(15,23,42,0.08)' }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.35rem', color: '#0F172A', marginBottom: '0.5rem' }}>
              Dashboard could not load
            </div>
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '12px 14px', fontSize: '0.9rem', color: '#DC2626', lineHeight: 1.45 }}>
              {dashboardError}
            </div>
            <div style={{ marginTop: '1rem' }}>
              <Diagnostics diagnostics={diagnostics} />
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ marginTop: '1rem', padding: '10px 14px', background: '#6366F1', color: 'white', border: 'none', borderRadius: '10px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, cursor: 'pointer' }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={signOutAndRetry}
              style={{ marginTop: '1rem', marginLeft: '0.75rem', padding: '10px 14px', background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FCA5A5', borderRadius: '10px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, cursor: 'pointer' }}
            >
              Clear auth data
            </button>
          </div>
        </div>
      </>
    )
  }

  if (isEmpty || !selectedChild) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&display=swap');`}</style>
        <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '460px', background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 24px rgba(15,23,42,0.08)', textAlign: 'center' }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.35rem', color: '#0F172A', marginBottom: '0.5rem' }}>
              No child profile found. Add your first child profile.
            </div>
            <Diagnostics diagnostics={diagnostics} />
            <button
              type="button"
              onClick={() => setShowAddChild(true)}
              style={{ marginTop: '1rem', padding: '10px 14px', background: '#6366F1', color: 'white', border: 'none', borderRadius: '10px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, cursor: 'pointer' }}
            >
              Add child profile
            </button>
          </div>
        </div>
        {showAddChild && <AddChildModal onSuccess={handleAddSuccess} onCancel={() => setShowAddChild(false)} />}
      </>
    )
  }

  return (
    <>
      <div style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '0.5rem 1.5rem' }}>
        <Diagnostics diagnostics={diagnostics} />
      </div>
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
          Add child profile
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
