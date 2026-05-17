'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { assertFirebaseEnv, getFirebaseAuth, getFirebaseDb } from '@/lib/firebase'

const CHILD_AVATAR_OPTIONS = [
  { emoji: '⭐', color: '#FFD93D' },
  { emoji: '🌿', color: '#6BCB77' },
  { emoji: '🌊', color: '#74B9FF' },
  { emoji: '🔥', color: '#FF6B6B' },
  { emoji: '💜', color: '#A29BFE' },
  { emoji: '🌙', color: '#FDCB6E' },
]

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000} seconds`)), ms)
    ),
  ])
}

function getAutoGameMode(age: number) {
  return age >= 13 ? 'teen' : 'kids'
}

function getAuthErrorMessage(err: unknown) {
  const code = typeof err === 'object' && err && 'code' in err ? err.code : null

  if (code === 'auth/configuration-not-found') {
    return 'Firebase Authentication is not enabled. Enable Email/Password sign-in in Firebase Console.'
  }

  if (code === 'permission-denied') {
    return 'Firestore permission denied. Check Firestore security rules.'
  }

  if (code === 'unavailable') {
    return 'Firebase is temporarily unavailable. Try again.'
  }

  if (code === 'auth/email-already-in-use') {
    return 'That email already has an account. Try signing in.'
  }

  return err instanceof Error ? err.message : 'Unexpected signup error'
}

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'parent' | 'therapist'>('parent')
  const [childName, setChildName] = useState('')
  const [childAge, setChildAge] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(CHILD_AVATAR_OPTIONS[0])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const emailSent = false

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (role === 'parent') {
      if (!childName.trim()) {
        setError('Child name is required for parent accounts.')
        return
      }

      if (!childAge || Number.isNaN(Number(childAge))) {
        setError('Child age is required for parent accounts.')
        return
      }
    }

    setLoading(true)
    setStatus('Creating account...')
    let navigationStarted = false

    try {
      assertFirebaseEnv()
      const auth = getFirebaseAuth()
      const db = getFirebaseDb()
      let credential

      try {
        credential = await withTimeout(
          createUserWithEmailAndPassword(auth, email.trim(), password),
          30_000,
          'Creating account'
        )
      } catch (err) {
        console.error('auth creation failed', err)
        throw err
      }

      const user = credential.user

      setStatus('Saving profile...')
      try {
        await withTimeout(
          setDoc(doc(db, 'users', user.uid), {
            email: user.email ?? email.trim(),
            fullName: fullName.trim(),
            role,
            createdAt: serverTimestamp(),
          }),
          15_000,
          'Saving profile'
        )
      } catch (err) {
        console.error('user profile write failed', err)
        throw err
      }

      if (role === 'parent') {
        const age = Number(childAge)
        const gameMode = getAutoGameMode(age)
        setStatus('Creating child profile...')
        try {
          await withTimeout(
            addDoc(collection(db, 'children'), {
              parentId: user.uid,
              name: childName.trim(),
              age,
              avatar: selectedAvatar.emoji,
              color: selectedAvatar.color,
              gameMode,
              createdAt: serverTimestamp(),
            }),
            15_000,
            'Creating child profile'
          )
        } catch (err) {
          console.error('child profile write failed', err)
          throw err
        }
      }

      setStatus('Opening dashboard...')
      router.refresh()
      navigationStarted = true
      window.location.assign(role === 'therapist' ? '/patients' : '/dashboard')
    } catch (err) {
      console.error('Signup failed', err)
      setError(getAuthErrorMessage(err))
      setStatus(null)
    } finally {
      if (!navigationStarted) {
        setLoading(false)
      }
    }
  }

  if (emailSent) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;600;700&display=swap');`}</style>
        <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '20px', padding: '2.5rem', boxShadow: '0 4px 24px rgba(15,23,42,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>ðŸ“¬</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: '#0F172A', marginBottom: '0.75rem' }}>Check your email</div>
            <div style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.6 }}>
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account and sign in.
            </div>
            <Link href="/login" style={{ display: 'block', marginTop: '1.5rem', color: '#6366F1', fontWeight: 600, textDecoration: 'none', fontSize: '0.88rem' }}>
              â† Back to login
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .auth-input { width: 100%; padding: 11px 14px; border: 1.5px solid #E2E8F0; border-radius: 10px; font-family: 'Outfit', sans-serif; font-size: 0.92rem; color: #0F172A; outline: none; transition: border-color 0.15s; background: white; }
        .auth-input:focus { border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
        .auth-btn { width: 100%; padding: 12px; background: #6366F1; color: white; border: none; border-radius: 10px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: opacity 0.15s; }
        .auth-btn:hover { opacity: 0.9; }
        .auth-btn:disabled { opacity: 0.6; cursor: default; }
        .auth-link { color: #6366F1; font-weight: 600; text-decoration: none; }
        .auth-link:hover { text-decoration: underline; }
        .role-card { flex: 1; padding: 14px; border: 2px solid #E2E8F0; border-radius: 12px; cursor: pointer; text-align: center; background: white; font-family: 'Outfit', sans-serif; transition: all 0.15s; }
        .role-card.active { border-color: #6366F1; background: #EEF2FF; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", padding: '1rem' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 12px' }}>
              ðŸ§©
            </div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.75rem', color: '#0F172A', lineHeight: 1 }}>Viada</div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>AI-Powered Autism Support</div>
          </div>

          {/* Card */}
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', boxShadow: '0 4px 24px rgba(15,23,42,0.08)' }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: '#0F172A', marginBottom: '1.5rem' }}>
              Create your account
            </div>

            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Role selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>I am aâ€¦</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className={`role-card${role === 'parent' ? ' active' : ''}`} onClick={() => setRole('parent')}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>ðŸ‘¨â€ðŸ‘©â€ðŸ‘§</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: role === 'parent' ? '#4F46E5' : '#374151' }}>Parent</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>Track my child</div>
                  </button>
                  <button type="button" className={`role-card${role === 'therapist' ? ' active' : ''}`} onClick={() => setRole('therapist')}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>ðŸ©º</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: role === 'therapist' ? '#4F46E5' : '#374151' }}>Therapist</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>Manage patients</div>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Full name</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Your name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Email</label>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Password</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              {role === 'parent' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.05rem', color: '#0F172A' }}>Child profile</div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Child name</label>
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="e.g. Alex"
                      value={childName}
                      onChange={e => setChildName(e.target.value)}
                      required={role === 'parent'}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Child age</label>
                    <input
                      className="auth-input"
                      type="number"
                      min={1}
                      max={18}
                      placeholder="e.g. 8"
                      value={childAge}
                      onChange={e => setChildAge(e.target.value)}
                      required={role === 'parent'}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Child avatar</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {CHILD_AVATAR_OPTIONS.map(avatar => (
                        <button
                          key={avatar.emoji}
                          type="button"
                          onClick={() => setSelectedAvatar(avatar)}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: '10px', cursor: 'pointer',
                            border: `2px solid ${selectedAvatar.emoji === avatar.emoji ? avatar.color : '#E2E8F0'}`,
                            background: selectedAvatar.emoji === avatar.emoji ? `${avatar.color}22` : 'white',
                            fontSize: '1.3rem', transition: 'all 0.12s',
                          }}
                        >
                          {avatar.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#DC2626' }}>
                  {error}
                </div>
              )}

              {status && (
                <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#4F46E5' }}>
                  {status}
                </div>
              )}

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? status ?? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: '#64748B' }}>
              Already have an account?{' '}
              <Link href="/login" className="auth-link">Sign in</Link>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}


