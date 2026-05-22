'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { SignInRequired } from '@/lib/browser-auth'
import { getFirebaseDb } from '@/lib/firebase'
import { useFirebaseUser } from '@/lib/useFirebaseUser'
import SensoryMergeGame from '@/components/SensoryMergeGame'
import MoodQuest from '@/components/moodquest.jsx'
import TeenMode from '@/components/teenmode'
import type { Child } from '@/types/database'

type GameChoice = 'moodquest' | 'merge' | 'teen'

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
  const searchParams = useSearchParams()
  const childIdParam = searchParams.get('childId')
  const [loading, setLoading]             = useState(true)
  const [authMissing, setAuthMissing]     = useState(false)
  const [children, setChildren]           = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [selectedGame, setSelectedGame]   = useState<GameChoice | null>(null)
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
            setSelectedChild(match)
            return
          }
        }
        if (kids.length === 1) {
          setSelectedChild(kids[0])
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
      queueMicrotask(() => {
        if (!active) return
        setAuthMissing(true)
        setLoading(false)
      })
      return () => { active = false }
    }

    queueMicrotask(() => {
      if (!active) return
      setLoading(true)
      setAuthMissing(false)
    })
    loadPlay()

    return () => {
      active = false
    }
  }, [childIdParam, user, authLoading])

  if (authLoading || loading) return <FullPageLoader />
  if (!user || authMissing) return <SignInRequired />
  if (selectedChild && user && selectedGame === 'moodquest') return <MoodQuest childId={selectedChild.id} parentId={user.uid} />
  if (selectedChild && user && selectedGame === 'teen') return <TeenMode childId={selectedChild.id} parentId={user.uid} />
  if (selectedChild && selectedGame === 'merge') return <MergeGameScreen child={selectedChild} onBack={() => setSelectedGame(null)} />
  if (selectedChild) return <GameSelector child={selectedChild} onBack={() => setSelectedChild(null)} onSelect={setSelectedGame} />
  return <ChildSelector childOptions={children} onSelect={child => {
    setSelectedGame(null)
    setSelectedChild(child)
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
        <div style={{ color: '#64748B', fontFamily: "'Nunito',sans-serif", fontSize: '0.95rem' }}>Loading...</div>
      </div>
    </>
  )
}

function getMergeTheme(child: Child) {
  return (child.age ?? 0) >= 13 ? 'cosmic' : 'cozy'
}

function GameSelector({ child, onBack, onSelect }: { child: Child; onBack: () => void; onSelect: (choice: GameChoice) => void }) {
  const games: Array<{ id: GameChoice; title: string; description: string; icon: string; color: string }> = [
    { id: 'moodquest', title: 'MoodQuest', description: 'Mood-based mini games and stars.', icon: '🎮', color: '#7C3AED' },
    { id: 'merge', title: 'Merge Game ', description: 'Drop, merge, and clear the basket.', icon: '🫧', color: '#0EA5E9' },
    { id: 'teen', title: 'Teen Mode', description: 'Daily check-in with a guided activity.', icon: '🌙', color: '#312E81' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Baloo+2:wght@700;800&display=swap');
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .game-option:hover { transform:translateY(-3px)!important; box-shadow:0 12px 30px rgba(15,23,42,0.14)!important; }
      `}</style>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#F7F3FF 0%,#EBF5FF 50%,#F0FFF4 100%)', fontFamily: "'Nunito',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1.5rem 6rem' }}>
        <main style={{ width: '100%', maxWidth: '760px', animation: 'fadeSlideUp 0.5s ease' }}>
          <button type="button" onClick={onBack} style={{ marginBottom: '1rem', border: 'none', background: 'white', color: '#64748B', borderRadius: '10px', padding: '9px 12px', fontFamily: "'Nunito',sans-serif", fontWeight: 800, cursor: 'pointer' }}>
            ← Change player
          </button>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.35rem' }}>{child.avatar ?? '🎮'}</div>
            <h1 style={{ fontFamily: "'Baloo 2',cursive", fontSize: '2rem', fontWeight: 800, color: '#333', margin: 0 }}>
              Choose a game for {child.name}
            </h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '14px' }}>
            {games.map(game => (
              <button key={game.id} type="button" className="game-option" onClick={() => onSelect(game.id)} style={{ minHeight: '180px', background: 'white', border: `3px solid ${game.color}33`, borderRadius: '18px', padding: '20px 16px', cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease', boxShadow: `0 6px 18px ${game.color}18`, textAlign: 'left', fontFamily: "'Nunito',sans-serif" }}>
                <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: `${game.color}16`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: '18px' }}>
                  {game.icon}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1F2937', marginBottom: '6px' }}>{game.title}</div>
                <div style={{ fontSize: '0.9rem', lineHeight: 1.35, color: '#64748B' }}>{game.description}</div>
              </button>
            ))}
          </div>
        </main>
      </div>
    </>
  )
}

function MergeGameScreen({ child, onBack }: { child: Child; onBack: () => void }) {
  const theme = getMergeTheme(child)

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800;900&display=swap');`}</style>
      <div style={{ minHeight: '100vh', background: theme === 'cosmic' ? '#050814' : '#F7F3FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 1rem 6rem', fontFamily: "'Outfit',sans-serif" }}>
        <div style={{ width: '450px', maxWidth: '100%', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <button type="button" onClick={onBack} style={{ border: 'none', background: 'white', color: '#475569', borderRadius: '10px', padding: '9px 12px', fontFamily: "'Outfit',sans-serif", fontWeight: 800, cursor: 'pointer' }}>
            ← Games
          </button>
          <div style={{ color: theme === 'cosmic' ? '#EAFBFF' : '#4E342E', fontWeight: 900 }}>
            Merge Game
          </div>
        </div>
        <SensoryMergeGame theme={theme} />
      </div>
    </>
  )
}

// ── Child selector ────────────────────────────────────────────

function ChildSelector({ childOptions, onSelect }: { childOptions: Child[]; onSelect: (c: Child) => void }) {
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

          {childOptions.length === 0 ? (
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
              gridTemplateColumns: `repeat(${Math.min(childOptions.length, 3)},1fr)`,
              gap: '14px',
            }}>
              {childOptions.map((child) => (
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
