'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

function getRedirectErrorMessage(search: string) {
  const params = new URLSearchParams(search)
  const error = params.get('error')
  const from = params.get('from')
  const fromPath = from?.split('?')[0]

  if (error === 'missing_session' && (fromPath === '/dashboard' || fromPath === '/patients')) {
    return `Sign in again to continue to ${from}. If this repeats, check that Supabase auth cookies are being saved for this domain.`
  }

  if (error === 'auth_callback_failed') {
    return 'Authentication callback failed. Please try signing in again.'
  }

  return null
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000} seconds`)), ms)
    ),
  ])
}

async function testSupabaseAuthEndpoint(supabaseUrl: string) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Supabase auth endpoint timed out after 5 seconds')
    }

    throw err
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [redirectError, setRedirectError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setRedirectError(getRedirectErrorMessage(window.location.search))
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setRedirectError(null)
    setLoading(true)
    let navigationStarted = false

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      if (!supabaseUrl) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
      }

      console.log('Supabase URL host:', new URL(supabaseUrl).host)

      console.log('login clicked')
      try {
        await testSupabaseAuthEndpoint(supabaseUrl)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected connectivity error'
        throw new Error(`Cannot reach Supabase auth endpoint: ${message}`)
      }

      const supabase = createClient()
      console.log('signInWithPassword starting')

      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        10000,
        'Supabase login'
      )

      console.log('signInWithPassword finished', {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error,
      })

      if (error) {
        console.error('Login failed:', error)
        setError(error.message)
        return
      }

      if (!data?.user) {
        const message = 'Login succeeded but no user session was returned.'
        console.error('Login failed:', message)
        setError(message)
        return
      }

      if (!data.session) {
        const message = 'Login succeeded, but no browser session was returned.'
        console.error('Login failed:', message)
        setError(message)
        return
      }

      navigationStarted = true
      window.location.assign('/dashboard')
    } catch (err) {
      console.error('Login failed:', err)
      setError(err instanceof Error ? err.message : 'Unexpected login error')
    } finally {
      if (!navigationStarted) {
        setLoading(false)
      }
    }
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
      `}</style>

      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", padding: '1rem' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

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
              Welcome back
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#DC2626' }}>
                  {error}
                </div>
              )}

              {redirectError && (
                <div style={{ background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#C2410C', lineHeight: 1.45 }}>
                  {redirectError}
                </div>
              )}

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: '#64748B' }}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="auth-link">Create one</Link>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
