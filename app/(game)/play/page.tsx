'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { SignInRequired } from '@/lib/browser-auth'
import { getFirebaseDb } from '@/lib/firebase'
import { useFirebaseUser } from '@/lib/useFirebaseUser'
import MoodQuest from '@/components/moodquest.jsx'
import type { Child } from '@/types/database'

function mapChild(id: string, data: Record<string, unknown>): Child {
  const age = typeof data.age === 'number' ? data.age : Number(data.age ?? 0)
  const gameMode = age >= 13 ? 'teen' : 'kids'
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

export default function PlayPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <PlayPageContent />
    </Suspense>
  )
}

function PlayPageContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const childIdParam = searchParams.get('childId')
  const [loading, setLoading]             = useState(true)
  const [authMissing, setAuthMissing]     = useState(false)
  const [children, setChildren]           = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const { user, loading: authLoading } = useFirebaseUser()

  useEffect(() => {
    let active = true
    const db = getFirebaseDb()

    async function loadPlay() {
      try {
        if (!user) return

        const snapshot = await getDocs(query(collection(db, 'children'), where('parentId', '==', user.uid)))

        if (!active) return

        const kids = snapshot.docs.map(doc => mapChild(doc.id, doc.data()))
        setChildren(kids)
        if (childIdParam) {
          const match = kids.find(k => k.id === childIdParam)
          if (match) {
            if ((match.game_mode ?? 'kids') === 'teen') {
              router.replace(`/play-teen?childId=${match.id}`)
              return
            }
            setSelectedChild(match)
            return
          }
        }
        if (kids.length === 1) {
          const only = kids[0]
          if ((only.game_mode ?? 'kids') === 'teen') {
            router.replace(`/play-teen?childId=${only.id}`)
            return
          }
          setSelectedChild(only)
        }
      } catch (err) {
        console.error('Play load failed', err)
        if (active) setAuthMissing(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    if (authLoading) return () => { active = false }
    if (!user) {
      setAuthMissing(true)
      setLoading(false)
      return () => { active = false }
    }

    setLoading(true)
    setAuthMissing(false)
    loadPlay()

    return () => {
      active = false
    }
  }, [router, childIdParam, user, authLoading])

  if (authLoading || loading) return <FullPageLoader />
  if (authMissing)   return <SignInRequired />
  if (selectedChild && user) return <MoodQuest childId={selectedChild.id} parentId={user.uid} />
  return <ChildSelector children={children} onSelect={child => {
    if ((child.age ?? 0) >= 13) router.push(`/play-teen?childId=${child.id}`)
    else setSelectedChild(child)
  }} />
}

// ── Loading screen ────────────────────────────────────────────

function FullPageLoader() {
  return (
    <>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}`}</style>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg,#F7F3FF 0%,#EBF5FF 50%,#F0FFF4 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: '3rem', animation: 'bounce 1.2s ease-in-out infinite' }}>🗺️</div>
      </div>
    </>
  )
}

// ── Child selector ────────────────────────────────────────────

function ChildSelector({ children, onSelect }: { children: Child[]; onSelect: (c: Child) => void }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Baloo+2:wght@700;800&display=swap');
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .child-card:hover { transform:scale(1.05)!important; box-shadow:0 8px 28px rgba(0,0,0,0.14)!important; }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg,#F7F3FF 0%,#EBF5FF 50%,#F0FFF4 100%)',
        fontFamily: "'Nunito',sans-serif",
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}>
        <div style={{ animation: 'fadeSlideUp 0.5s ease', textAlign: 'center', maxWidth: '500px', width: '100%' }}>

          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🗺️</div>
          <h1 style={{
            fontFamily: "'Baloo 2',cursive", fontSize: '2rem', fontWeight: 800,
            color: '#333', marginBottom: '0.25rem',
          }}>
            Who&apos;s playing today?
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#888', marginBottom: '2rem' }}>
            Pick a name to start your MoodQuest!
          </p>

          {children.length === 0 ? (
            <div style={{
              background: 'white', borderRadius: '20px', padding: '2rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)', color: '#94A3B8', fontSize: '0.95rem',
            }}>
              No children found on this account.
              <br />Ask a parent to set up the app first.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(children.length, 3)},1fr)`,
              gap: '14px',
            }}>
              {children.map((child) => (
                <button
                  key={child.id}
                  className="child-card"
                  onClick={() => onSelect(child)}
                  style={{
                    background: 'white',
                    border: `3px solid ${child.color ?? '#6366F1'}44`,
                    borderRadius: '20px',
                    padding: '20px 12px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: `0 4px 16px ${child.color ?? '#6366F1'}22`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  }}
                >
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: `${child.color ?? '#6366F1'}18`,
                    border: `3px solid ${child.color ?? '#6366F1'}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2.2rem',
                  }}>
                    {child.avatar ?? ''}
                  </div>
                  <div style={{ fontFamily: "'Baloo 2',cursive", fontSize: '1.1rem', fontWeight: 800, color: '#333' }}>
                    {child.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#999', fontWeight: 700 }}>
                    Age {child.age ?? '-'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
