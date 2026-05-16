'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const CHILD_AVATARS = [
  { emoji: 'ðŸ˜„', color: '#FFD93D' },
  { emoji: 'ðŸ˜Œ', color: '#6BCB77' },
  { emoji: 'ðŸ˜Ÿ', color: '#74B9FF' },
  { emoji: 'ðŸ˜ ', color: '#FF6B6B' },
  { emoji: 'ðŸ˜¢', color: '#A29BFE' },
  { emoji: 'ðŸ˜´', color: '#FDCB6E' },
]

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'parent' | 'therapist'>('parent')
  const [childName, setChildName] = useState('')
  const [childAge, setChildAge] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(CHILD_AVATARS[0])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

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

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          ...(role === 'parent'
            ? {
                child_name: childName.trim(),
                child_age: Number(childAge),
                child_avatar: selectedAvatar.emoji,
                child_color: selectedAvatar.color,
              }
            : {}),
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Profile row is auto-created by DB trigger (handle_new_user) on auth.users INSERT
    // If email confirmation is disabled in Supabase, user is already logged in
    if (data.session) {
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          role,
          full_name: fullName.trim(),
        })

        if (profileError) {
          console.error('Signup profile upsert failed', profileError)
          setError(`Account created, but profile creation failed: ${profileError.message}`)
          setLoading(false)
          return
        }
      }

      if (role === 'parent' && data.user) {
        const { error: childError } = await supabase.from('children').insert({
          parent_id: data.user.id,
          name: childName.trim(),
          age: Number(childAge),
          avatar: selectedAvatar.emoji,
          color: selectedAvatar.color,
          game_mode: 'kids',
        })

        if (childError) {
          console.error('Signup child profile insert failed', childError)
          setError(`Account created, but child profile creation failed: ${childError.message}`)
          setLoading(false)
          return
        }
      }

      router.refresh()
      router.push(role === 'therapist' ? '/patients' : '/dashboard')
    } else {
      setEmailSent(true)
    }
    setLoading(false)
  }

  if (emailSent) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;600;700&display=swap');`}</style>
        <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '20px', padding: '2.5rem', boxShadow: '0 4px 24px rgba(15,23,42,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: '#0F172A', marginBottom: '0.75rem' }}>Check your email</div>
            <div style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.6 }}>
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account and sign in.
            </div>
            <Link href="/login" style={{ display: 'block', marginTop: '1.5rem', color: '#6366F1', fontWeight: 600, textDecoration: 'none', fontSize: '0.88rem' }}>
              ← Back to login
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
              🧩
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
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>I am a…</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className={`role-card${role === 'parent' ? ' active' : ''}`} onClick={() => setRole('parent')}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>👨‍👩‍👧</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: role === 'parent' ? '#4F46E5' : '#374151' }}>Parent</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>Track my child</div>
                  </button>
                  <button type="button" className={`role-card${role === 'therapist' ? ' active' : ''}`} onClick={() => setRole('therapist')}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🩺</div>
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
                      {CHILD_AVATARS.map(avatar => (
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

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
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
