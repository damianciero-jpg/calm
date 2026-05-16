'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase'
import { SignInRequired } from '@/lib/browser-auth'
import CalmPathDashboardRaw from '@/components/calmpath-dashboard'
import AddChildModal from '@/components/add-child-modal'
import type { Child } from '@/types/database'

type DashboardProps = { childId: string; childName: string; childAge: number; childAvatar: string; childColor: string; childGameMode: string }
const CalmPathDashboard = CalmPathDashboardRaw as unknown as React.ComponentType<DashboardProps>

function mapChild(id: string, data: Record<string, unknown>): Child {
  const gameMode = (data.gameMode ?? data.game_mode ?? 'kids') as string
  const parentId = (data.parentId ?? data.parent_id ?? '') as string
  return {
    id,
    parentId,
    parent_id: parentId,
    name: String(data.name ?? ''),
    age: typeof data.age === 'number' ? data.age : Number(data.age ?? 0),
    avatar: typeof data.avatar === 'string' ? data.avatar : '',
    color: typeof data.color === 'string' ? data.color : '#6366F1',
    gameMode,
    game_mode: gameMode,
    createdAt: data.createdAt,
  }
}

export default function DashboardPage() {
  const [loading, setLoading]             = useState(true)
  const [children, setChildren]           = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [showAddChild, setShowAddChild]   = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [authMissing, setAuthMissing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(false)

  useEffect(() => {
    let active = true
    const auth = getFirebaseAuth()
    const db = getFirebaseDb()

    async function loadDashboard(userId: string) {
      setLoading(true)
      setDashboardError(null)
      setAuthMissing(false)
      setIsEmpty(false)

      try {
        const snapshot = await getDocs(
          query(
            collection(db, 'children'),
            where('parentId', '==', userId),
            orderBy('createdAt')
          )
        )
        const kids = snapshot.docs.map(doc => mapChild(doc.id, doc.data()))

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

    const unsubscribe = onAuthStateChanged(auth, user => {
      if (!active) return
      if (!user) {
        setAuthMissing(true)
        setLoading(false)
        return
      }
      loadDashboard(user.uid)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  function handleAddSuccess(child: Child) {
    setChildren(prev => [...prev, child])
    setSelectedChild(child)
    setIsEmpty(false)
    setShowAddChild(false)
  }

  if (loading) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", padding: '1rem' }}>
        <div style={{ color: '#64748B', fontSize: '0.95rem' }}>Loading dashboard...</div>
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
            <span>{child.avatar ?? ''}</span> {child.name}
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
        childAge={selectedChild.age ?? 0}
        childAvatar={selectedChild.avatar ?? ''}
        childColor={selectedChild.color ?? '#6366F1'}
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
