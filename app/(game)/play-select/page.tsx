'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { SignInRequired } from '@/lib/browser-auth'
import { CHILD_ID_KEY, enterChildMode, exitChildMode, hashChildPin } from '@/lib/child-pin'
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase'
import { useFirebaseUser } from '@/lib/useFirebaseUser'
import type { Child } from '@/types/database'

type ChildWithPin = Child & { childPinHash?: string | null; child_pin_hash?: string | null }

function mapChild(id: string, data: Record<string, unknown>): ChildWithPin {
  const age = typeof data.age === 'number' ? data.age : Number(data.age ?? 0)
  const gameMode = (data.gameMode ?? data.game_mode ?? (age >= 13 ? 'teen' : 'kids')) as string
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
    childPinHash: typeof data.childPinHash === 'string' ? data.childPinHash : null,
    child_pin_hash: typeof data.child_pin_hash === 'string' ? data.child_pin_hash : null,
    createdAt: data.createdAt,
  }
}

export default function ChildPlaySelectPage() {
  const { user, loading: authLoading } = useFirebaseUser()
  const [children, setChildren] = useState<ChildWithPin[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChild, setSelectedChild] = useState<ChildWithPin | null>(null)
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [nowMs, setNowMs] = useState(0)
  const [parentPassword, setParentPassword] = useState('')
  const [parentMessage, setParentMessage] = useState('')
  const [showParentLogin, setShowParentLogin] = useState(false)

  const lockSeconds = useMemo(() => {
    if (!lockedUntil) return 0
    return Math.max(0, Math.ceil((lockedUntil - nowMs) / 1000))
  }, [lockedUntil, nowMs])

  useEffect(() => {
    queueMicrotask(() => setNowMs(window.performance.timeOrigin + window.performance.now()))
  }, [])

  useEffect(() => {
    let active = true

    async function loadChildren() {
      if (!user) return
      setLoading(true)
      const db = getFirebaseDb()
      const snapshot = await getDocs(query(collection(db, 'children'), where('parentId', '==', user.uid)))
      if (!active) return
      const rows = snapshot.docs.map(doc => mapChild(doc.id, doc.data()))
      setChildren(rows)

      const storedChildId = localStorage.getItem(CHILD_ID_KEY)
      if (storedChildId) {
        setSelectedChild(rows.find(child => child.id === storedChildId) ?? null)
      }
      setLoading(false)
    }

    if (!authLoading) {
      if (!user) {
        queueMicrotask(() => {
          if (active) setLoading(false)
        })
      } else {
        loadChildren().catch(err => {
          console.error('Child selector load failed', err)
          if (active) {
            setMessage('Children could not load. Ask a parent for help.')
            setLoading(false)
          }
        })
      }
    }

    return () => {
      active = false
    }
  }, [user, authLoading])

  useEffect(() => {
    if (!lockedUntil) return
    const id = window.setInterval(() => {
      const currentTime = window.performance.timeOrigin + window.performance.now()
      setNowMs(currentTime)
      if (currentTime >= lockedUntil) {
        setLockedUntil(0)
        setWrongAttempts(0)
        setMessage('')
      } else {
        setMessage(`Try again in ${Math.ceil((lockedUntil - currentTime) / 1000)} seconds.`)
      }
    }, 1000)

    return () => window.clearInterval(id)
  }, [lockedUntil])

  const submitPin = useCallback(async (nextPin = pin) => {
    if (!selectedChild || !user || nextPin.length !== 4) return
    if (lockedUntil && nowMs < lockedUntil) return

    const expectedHash = selectedChild.childPinHash ?? selectedChild.child_pin_hash
    if (!expectedHash) {
      setMessage('Ask a parent to set your Child PIN first.')
      setPin('')
      return
    }

    const enteredHash = await hashChildPin(nextPin, user.uid)
    if (enteredHash === expectedHash) {
      enterChildMode(selectedChild.id)
      const mode = selectedChild.gameMode ?? selectedChild.game_mode
      window.location.assign(mode === 'teen' ? `/play-teen?childId=${selectedChild.id}` : `/play?childId=${selectedChild.id}`)
      return
    }

    const attempts = wrongAttempts + 1
    setWrongAttempts(attempts)
    setPin('')
    if (attempts >= 5) {
      setLockedUntil((window.performance.timeOrigin + window.performance.now()) + 60_000)
      setMessage('Try again in 60 seconds.')
    } else {
      setMessage('Try again!')
    }
  }, [lockedUntil, nowMs, pin, selectedChild, user, wrongAttempts])

  function appendDigit(digit: string) {
    if (lockedUntil && nowMs < lockedUntil) return
    setMessage('')
    setPin(prev => {
      const nextPin = (prev + digit).slice(0, 4)
      if (nextPin.length === 4) {
        queueMicrotask(() => submitPin(nextPin))
      }
      return nextPin
    })
  }

  async function parentLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.email) return
    setParentMessage('')
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), user.email, parentPassword)
      exitChildMode()
      window.location.assign('/dashboard')
    } catch (err) {
      console.error('Parent unlock failed', err)
      setParentMessage('Password did not match. Try again.')
    }
  }

  if (authLoading || loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontFamily: "'Outfit', sans-serif" }}>Loading...</div>
  }

  if (!user) {
    return <SignInRequired message="Parent Sign In Required" />
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Baloo+2:wght@700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#F7F3FF 0%,#EBF5FF 50%,#F0FFF4 100%)', fontFamily: "'Nunito', sans-serif", padding: '1.5rem 1rem 6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <main style={{ width: '100%', maxWidth: '680px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '2rem', margin: 0, color: '#1F2937' }}>Choose your profile</h1>
          </div>

          {!selectedChild ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '14px' }}>
              {children.map(child => (
                <button key={child.id} type="button" onClick={() => { setSelectedChild(child); setPin(''); setMessage('') }} style={{ minHeight: '150px', border: `3px solid ${child.color ?? '#6366F1'}44`, borderRadius: '18px', background: 'white', cursor: 'pointer', boxShadow: `0 6px 18px ${child.color ?? '#6366F1'}18`, fontFamily: "'Nunito', sans-serif", fontWeight: 900 }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{child.avatar || '🎮'}</div>
                  <div style={{ fontSize: '1.05rem', color: '#1F2937' }}>{child.name}</div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto', textAlign: 'center' }}>
              <button type="button" onClick={() => { setSelectedChild(null); setPin(''); setMessage('') }} style={{ border: 'none', background: 'white', color: '#64748B', borderRadius: '10px', padding: '8px 12px', fontWeight: 900, marginBottom: '1rem' }}>Change profile</button>
              <div style={{ fontSize: '3rem' }}>{selectedChild.avatar || '🎮'}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1F2937', marginBottom: '1rem' }}>{selectedChild.name}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1rem' }}>
                {[0, 1, 2, 3].map(index => (
                  <div key={index} style={{ width: '18px', height: '18px', borderRadius: '50%', background: pin.length > index ? '#6366F1' : 'white', border: '2px solid #CBD5E1' }} />
                ))}
              </div>
              {message && <div style={{ minHeight: '26px', color: message === 'Try again!' ? '#F97316' : '#64748B', fontWeight: 900, marginBottom: '0.75rem' }}>{message}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {['1','2','3','4','5','6','7','8','9'].map(digit => (
                  <button key={digit} type="button" onClick={() => appendDigit(digit)} disabled={lockSeconds > 0} style={{ height: '70px', borderRadius: '18px', border: 'none', background: 'white', color: '#1F2937', fontSize: '1.6rem', fontWeight: 900, boxShadow: '0 4px 14px rgba(15,23,42,0.08)', cursor: lockSeconds > 0 ? 'default' : 'pointer' }}>{digit}</button>
                ))}
                <button type="button" onClick={() => setPin('')} style={{ height: '70px', borderRadius: '18px', border: 'none', background: '#F1F5F9', color: '#64748B', fontSize: '1rem', fontWeight: 900 }}>Clear</button>
                <button type="button" onClick={() => appendDigit('0')} disabled={lockSeconds > 0} style={{ height: '70px', borderRadius: '18px', border: 'none', background: 'white', color: '#1F2937', fontSize: '1.6rem', fontWeight: 900, boxShadow: '0 4px 14px rgba(15,23,42,0.08)', cursor: lockSeconds > 0 ? 'default' : 'pointer' }}>0</button>
                <button type="button" onClick={() => setPin(prev => prev.slice(0, -1))} style={{ height: '70px', borderRadius: '18px', border: 'none', background: '#F1F5F9', color: '#64748B', fontSize: '1rem', fontWeight: 900 }}>Back</button>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button type="button" onClick={() => setShowParentLogin(v => !v)} style={{ border: 'none', background: 'transparent', color: '#64748B', fontWeight: 900, cursor: 'pointer' }}>Parent Login</button>
            {showParentLogin && (
              <form onSubmit={parentLogin} style={{ margin: '1rem auto 0', maxWidth: '320px', display: 'grid', gap: '8px' }}>
                <input type="password" placeholder="Parent password" value={parentPassword} onChange={e => setParentPassword(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontFamily: "'Nunito', sans-serif" }} />
                <button type="submit" style={{ padding: '12px', borderRadius: '10px', border: 'none', background: '#6366F1', color: 'white', fontWeight: 900, fontFamily: "'Nunito', sans-serif" }}>Unlock parent dashboard</button>
                {parentMessage && <div style={{ color: '#DC2626', fontWeight: 900, fontSize: '0.85rem' }}>{parentMessage}</div>}
              </form>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
