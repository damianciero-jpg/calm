'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import { useFirebaseUser } from '@/lib/useFirebaseUser'
import { SignInRequired } from '@/lib/browser-auth'
import CalmPathDashboardRaw from '@/components/calmpath-dashboard'
import AddChildModal from '@/components/add-child-modal'
import { isChildModeActive } from '@/lib/child-pin'
import type { Child } from '@/types/database'

type DashboardProps = { childId: string; parentId: string; childName: string; childAge: number; childAvatar: string; childColor: string; childGameMode: string }
const CalmPathDashboard = CalmPathDashboardRaw as unknown as React.ComponentType<DashboardProps>

function getAutoGameMode(age: number | null | undefined) {
  return (age ?? 0) >= 13 ? 'teen' : 'kids'
}

function mapChild(id: string, data: Record<string, unknown>): Child {
  const age = typeof data.age === 'number' ? data.age : Number(data.age ?? 0)
  const gameMode = (data.gameMode ?? data.game_mode ?? getAutoGameMode(age)) as string
  const parentId = (data.parentId ?? data.parent_id ?? '') as string
  return {
    id,
    parentId,
    parent_id: parentId,
    name: String(data.name ?? ''),
    age,
    avatar: typeof data.avatar === 'string' ? data.avatar : '',
    color: typeof data.color === 'string' ? data.color : '#6366F1',
    gameMode,
    game_mode: gameMode,
    createdAt: data.createdAt,
  }
}

function DashboardSkeleton() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&display=swap');
        @keyframes shimmer { 0% { background-position: -420px 0; } 100% { background-position: 420px 0; } }
        .dash-skeleton { background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%); background-size: 420px 100%; animation: shimmer 1.2s ease infinite; }
      `}</style>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ height: 54, background: 'white', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 1.5rem' }}>
          {[0, 1, 2].map(i => <div key={i} className="dash-skeleton" style={{ width: i === 0 ? 120 : 92, height: 28, borderRadius: 20 }} />)}
        </div>
        <main style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
          <div className="dash-skeleton" style={{ height: 96, borderRadius: 18, marginBottom: 18 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
            {[0, 1, 2, 3].map(i => <div key={i} className="dash-skeleton" style={{ height: 116, borderRadius: 18 }} />)}
          </div>
          <div className="dash-skeleton" style={{ height: 260, borderRadius: 18, marginBottom: 18 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="dash-skeleton" style={{ height: 210, borderRadius: 18 }} />
            <div className="dash-skeleton" style={{ height: 210, borderRadius: 18 }} />
          </div>
        </main>
      </div>
    </>
  )
}

export default function DashboardPage() {
  const [loading, setLoading]             = useState(true)
  const [children, setChildren]           = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [showAddChild, setShowAddChild]   = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [isEmpty, setIsEmpty] = useState(false)
  const { user, loading: authLoading } = useFirebaseUser()

  useEffect(() => {
    if (isChildModeActive()) {
      window.location.replace('/play/select')
      return
    }

    let active = true
    const db = getFirebaseDb()

    async function loadDashboard(userId: string) {
      setLoading(true)
      setDashboardError(null)
      setIsEmpty(false)

      try {
        const snapshot = await getDocs(
          query(
            collection(db, 'children'),
            where('parentId', '==', userId),
            orderBy('createdAt')
          )
        )
        const kids = snapshot.docs.map(childDoc => mapChild(childDoc.id, childDoc.data()))

        if (active) {
          setChildren(kids)
          setSelectedChild(kids[0] ?? null)
          setIsEmpty(kids.length === 0)
        }
      } catch (err) {
        console.error('Dashboard load failed', err)
        if (active) {
          setDashboardError(err instanceof Error ? err.message : 'Unexpected dashboard loading error')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    if (authLoading) return () => { active = false }
    if (!user) {
      queueMicrotask(() => {
        if (active) setLoading(false)
      })
      return () => { active = false }
    }

    loadDashboard(user.uid)

    return () => {
      active = false
    }
  }, [user, authLoading])

  function handleAddSuccess(child: Child) {
    const normalizedChild = { ...child, gameMode: getAutoGameMode(child.age), game_mode: getAutoGameMode(child.age) }
    setChildren(prev => [...prev, normalizedChild])
    setSelectedChild(normalizedChild)
    setIsEmpty(false)
    setShowAddChild(false)
  }

  if (authLoading || loading) return <DashboardSkeleton />

  if (!user) {
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
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ marginTop: '1rem', padding: '10px 14px', background: '#6366F1', color: 'white', border: 'none', borderRadius: '10px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </div>
      </>
    )
  }

  if (isEmpty || !selectedChild) {
    return (
      <AddChildModal onSuccess={handleAddSuccess} />
    )
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
              background: selectedChild.id === child.id ? child.color ?? '#6366F1' : '#F1F5F9',
              color: selectedChild.id === child.id ? 'white' : '#374151',
              fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.82rem',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px',
              flexShrink: 0,
            }}
          >
            <span>{child.avatar ?? ''}</span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
              <span>{child.name}</span>
              <span style={{ fontSize: '0.58rem', opacity: 0.8, letterSpacing: '0.04em' }}>
                {(child.gameMode ?? child.game_mode) === 'teen' ? 'TEEN MODE' : 'KIDS MODE'}
              </span>
            </span>
          </button>
        ))}
        <button
          onClick={() => window.location.assign('/play/select')}
          style={{
            padding: '6px 14px', borderRadius: '20px', border: 'none',
            background: '#6366F1', color: 'white', cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.82rem',
            transition: 'all 0.15s', flexShrink: 0,
          }}
        >
          Hand to Child
        </button>
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
        parentId={user.uid}
        childName={selectedChild.name}
        childAge={selectedChild.age ?? 0}
        childAvatar={selectedChild.avatar ?? ''}
        childColor={selectedChild.color ?? '#6366F1'}
        childGameMode={(selectedChild.gameMode ?? selectedChild.game_mode ?? getAutoGameMode(selectedChild.age)) as string}
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
