'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000} seconds`)), ms)
    ),
  ])
}

type SupabaseTokenResponse = {
  access_token?: string
  refresh_token?: string
  error?: string
  error_description?: string
  msg?: string
  message?: string
}

function isTimeoutError(err: unknown, label: string) {
  return err instanceof Error && err.message.startsWith(`${label} timed out`)
}

function getRestErrorMessage(json: SupabaseTokenResponse | null, fallback: string) {
  return json?.error_description ?? json?.msg ?? json?.message ?? json?.error ?? fallback
}

async function loginWithRestFallback(email: string, password: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const response = await withTimeout(
    fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    }),
    30000,
    'Supabase REST login'
  )

  let json: SupabaseTokenResponse | null = null
  try {
    json = await response.json()
  } catch {
    json = null
  }

  const responseError = getRestErrorMessage(json, `HTTP ${response.status}`)

  if (!response.ok) {
    console.error('REST fallback HTTP status:', response.status)
    console.error('REST fallback response error:', responseError)
    throw new Error(responseError)
  }

  if (json?.error || json?.error_description || json?.msg || json?.message) {
    console.error('REST fallback response error:', responseError)
    throw new Error(responseError)
  }

  if (!json?.access_token || !json?.refresh_token) {
    throw new Error('Backup login did not return a session.')
  }

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStatus('Signing in…')
    setLoading(true)
    let navigationStarted = false

    try {
      const supabase = createClient()

      try {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({
            email,
            password,
          }),
          30000,
          'Supabase login'
        )

        if (error) {
          setError(error.message)
          return
        }

        if (!data?.session) {
          setError('Login succeeded, but no browser session was returned.')
          return
        }
      } catch (err) {
        if (!isTimeoutError(err, 'Supabase login')) {
          throw err
        }

        console.error('SDK login timeout:', err)
        setStatus('Trying backup login…')

        const session = await loginWithRestFallback(email, password)
        const { error: setSessionError } = await supabase.auth.setSession(session)

        if (setSessionError) {
          setError(setSessionError.message)
          return
        }
      }

      setStatus('Opening dashboard…')
      navigationStarted = true
      window.location.assign('/dashboard')
    } catch (err) {
      console.error('Login failed:', err)
      if (isTimeoutError(err, 'Supabase login') || isTimeoutError(err, 'Supabase REST login')) {
        setError('Login is taking longer than expected. Please try again.')
        return
      }

      setError(err instanceof Error ? err.message : 'Unexpected login error')
    } finally {
      if (!navigationStarted) {
        setLoading(false)
        setStatus(null)
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

              {status && (
                <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#4338CA' }}>
                  {status}
                </div>
              )}

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? status ?? 'Signing in…' : 'Sign in'}
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
