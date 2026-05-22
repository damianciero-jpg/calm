'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { SignInRequired } from '@/lib/browser-auth'
import { CHILD_ID_KEY, isChildModeActive } from '@/lib/child-pin'
import { getFirebaseDb } from '@/lib/firebase'
import { useFirebaseUser } from '@/lib/useFirebaseUser'
import SensoryMergeGame from '@/components/SensoryMergeGame'
import MoodQuest from '@/components/moodquest.jsx'
import TeenMode from '@/components/teenmode'
import type { Child } from '@/types/database'

type GameChoice = 'moodquest' | 'bubbleDrop' | 'teen'

const BUBBLEDROP_MOODS = [
  { id: 'happy', label: 'Happy', emoji: '😄', color: '#F59E0B' },
  { id: 'calm', label: 'Calm', emoji: '😌', color: '#10B981' },
  { id: 'anxious', label: 'Worried', emoji: '😟', color: '#3B82F6' },
  { id: 'angry', label: 'Frustrated', emoji: '😠', color: '#EF4444' },
  { id: 'sad', label: 'Sad', emoji: '😢', color: '#8B5CF6' },
  { id: 'tired', label: 'Tired', emoji: '😴', color: '#F97316' },
]

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
        const childModeId = isChildModeActive() ? localStorage.getItem(CHILD_ID_KEY) : null
        if (childModeId) {
          const match = kids.find(k => k.id === childModeId)
          if (match) {
            setSelectedChild(match)
            return
          }
          window.location.replace('/play/select')
          return
        }

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
  if (selectedChild && user && selectedGame === 'bubbleDrop') return <BubbleDropScreen child={selectedChild} parentId={user.uid} onBack={() => setSelectedGame(null)} />
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

function getBubbleDropTheme(child: Child) {
  return (child.age ?? 0) >= 13 ? 'cosmic' : 'cozy'
}

function calculateBubbleDropStars(score: number) {
  if (score >= 500) return 3
  if (score >= 250) return 2
  return 1
}

function GameSelector({ child, onBack, onSelect }: { child: Child; onBack: () => void; onSelect: (choice: GameChoice) => void }) {
  const games: Array<{ id: GameChoice; title: string; description: string; icon: string; color: string }> = [
    { id: 'moodquest', title: 'MoodQuest', description: 'Mood-based mini games and stars.', icon: '🎮', color: '#7C3AED' },
    { id: 'bubbleDrop', title: 'BubbleDrop', description: 'Drop, combine, and clear the basket.', icon: '🫧', color: '#0EA5E9' },
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

function BubbleDropScreen({ child, parentId, onBack }: { child: Child; parentId: string; onBack: () => void }) {
  const theme = getBubbleDropTheme(child)
  const [selectedMood, setSelectedMood] = useState('')
  const [score, setScore] = useState(0)
  const [gameEnded, setGameEnded] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const saveStartedRef = useRef(false)

  const exitBubbleDrop = useCallback(() => {
    if (!gameEnded && score > 0 && !window.confirm("Are you sure? Your score won't be saved")) {
      return
    }

    window.location.assign('/play')
  }, [gameEnded, score])

  const goHome = useCallback(() => {
    window.location.assign('/dashboard')
  }, [])

  const saveBubbleDropSession = useCallback(async (finalScore: number) => {
    if (saveStartedRef.current || !selectedMood) return
    saveStartedRef.current = true
    setGameEnded(true)
    setSaveStatus('Saving...')

    const stars = calculateBubbleDropStars(finalScore)
    const db = getFirebaseDb()

    try {
      await addDoc(collection(db, 'sessions'), {
        parentId,
        childId: child.id,
        child_id: child.id,
        mood: selectedMood,
        game: 'BubbleDrop',
        world: 'BubbleDrop',
        stars,
        score: finalScore,
        playedAt: serverTimestamp(),
        played_at: serverTimestamp(),
        createdAt: serverTimestamp(),
      })
      setSaveStatus('Saved! ⭐')
    } catch (err) {
      console.error('BubbleDrop session insert failed:', err)
      setSaveStatus('Save failed')
    }
  }, [child.id, parentId, selectedMood])

  const handleScoreChange = useCallback((nextScore: number) => {
    setScore(nextScore)
  }, [])

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore)
    saveBubbleDropSession(finalScore)
  }, [saveBubbleDropSession])

  if (!selectedMood) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800;900&display=swap');`}</style>
        <div style={{ minHeight: '100vh', width: '100%', maxWidth: '100vw', overflowX: 'hidden', background: theme === 'cosmic' ? '#050814' : '#F7F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem 6rem', fontFamily: "'Outfit',sans-serif" }}>
          <main style={{ width: '100%', maxWidth: '560px' }}>
            <button type="button" onClick={onBack} style={{ marginBottom: '1rem', border: 'none', background: 'white', color: '#475569', borderRadius: '10px', padding: '9px 12px', fontFamily: "'Outfit',sans-serif", fontWeight: 800, cursor: 'pointer' }}>
              ← Games
            </button>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <h1 style={{ margin: 0, color: theme === 'cosmic' ? '#EAFBFF' : '#1F2937', fontSize: '2rem', fontWeight: 900 }}>BubbleDrop</h1>
              <p style={{ margin: '0.5rem 0 0', color: theme === 'cosmic' ? '#A5B4FC' : '#64748B', fontSize: '0.95rem', fontWeight: 700 }}>How are you feeling before you play?</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '10px' }}>
              {BUBBLEDROP_MOODS.map(mood => (
                <button key={mood.id} type="button" onClick={() => setSelectedMood(mood.id)} style={{ minHeight: '96px', border: `2px solid ${mood.color}44`, borderRadius: '16px', background: 'white', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontWeight: 900, color: '#1F2937' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '6px' }}>{mood.emoji}</div>
                  <div>{mood.label}</div>
                </button>
              ))}
            </div>
          </main>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800;900&display=swap');`}</style>
      <div style={{ minHeight: '100vh', width: '100%', maxWidth: '100vw', overflowX: 'hidden', background: theme === 'cosmic' ? '#050814' : '#F7F3FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 0 6rem', fontFamily: "'Outfit',sans-serif" }}>
        <div style={{ width: 'min(450px, 100vw)', maxWidth: '100vw', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '0 10px', boxSizing: 'border-box' }}>
          <button type="button" onClick={exitBubbleDrop} aria-label="Exit BubbleDrop" style={{ width: '42px', height: '42px', border: 'none', background: 'white', color: '#475569', borderRadius: '50%', fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}>
            ×
          </button>
          <div style={{ color: theme === 'cosmic' ? '#EAFBFF' : '#4E342E', fontWeight: 900 }}>
            BubbleDrop
          </div>
          <div style={{ width: '42px' }} />
        </div>
        <SensoryMergeGame theme={theme} onScoreChange={handleScoreChange} onGameOver={handleGameOver} gameOverStatus={saveStatus} onGoHome={goHome} />
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
