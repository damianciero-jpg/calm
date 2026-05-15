'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const SUPABASE_TIMEOUT_MS = 10_000

type DebugState = {
  status: 'loading' | 'ready' | 'error'
  message: string
  userId?: string
  email?: string
  expiresAt?: number
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${SUPABASE_TIMEOUT_MS / 1000} seconds`))
    }, SUPABASE_TIMEOUT_MS)

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeout))
  })
}

export default function DebugAuthPage() {
  const [state, setState] = useState<DebugState>({
    status: 'loading',
    message: 'Checking browser Supabase session...',
  })

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const supabase = createClient()
        const {
          data: { session },
          error,
        } = await withTimeout(supabase.auth.getSession(), 'Debug auth session lookup')

        if (error) {
          console.error('Debug auth session lookup failed', error)
          if (active) {
            setState({ status: 'error', message: `Session error: ${error.message}` })
          }
          return
        }

        if (!session) {
          console.error('Debug auth found no browser session')
          if (active) {
            setState({
              status: 'error',
              message: 'No browser session found after login. Supabase auth cookies/local storage were not available to the browser client.',
            })
          }
          return
        }

        if (active) {
          setState({
            status: 'ready',
            message: 'Browser Supabase session is available.',
            userId: session.user.id,
            email: session.user.email ?? undefined,
            expiresAt: session.expires_at,
          })
        }
      } catch (err) {
        console.error('Debug auth load failed', err)
        if (active) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Unexpected debug auth error',
          })
        }
      }
    }

    loadSession()

    return () => {
      active = false
    }
  }, [])

  const isReady = state.status === 'ready'

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", padding: '1rem' }}>
        <div style={{ width: '100%', maxWidth: '560px', background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 24px rgba(15,23,42,0.08)' }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.45rem', color: '#0F172A', marginBottom: '0.5rem' }}>
            Auth debug
          </div>
          <div style={{ background: isReady ? '#F0FDF4' : state.status === 'error' ? '#FEF2F2' : '#EFF6FF', border: `1px solid ${isReady ? '#86EFAC' : state.status === 'error' ? '#FCA5A5' : '#93C5FD'}`, borderRadius: '8px', padding: '12px 14px', color: isReady ? '#166534' : state.status === 'error' ? '#DC2626' : '#1D4ED8', fontSize: '0.92rem', lineHeight: 1.45 }}>
            {state.message}
          </div>

          {isReady && (
            <div style={{ marginTop: '1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 14px', color: '#334155', fontSize: '0.85rem', lineHeight: 1.6 }}>
              <div><strong>User ID:</strong> {state.userId}</div>
              <div><strong>Email:</strong> {state.email ?? 'No email returned'}</div>
              <div><strong>Expires at:</strong> {state.expiresAt ? new Date(state.expiresAt * 1000).toLocaleString() : 'Unknown'}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard" style={{ padding: '10px 14px', background: '#6366F1', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>
              Open dashboard
            </Link>
            <Link href="/login" style={{ padding: '10px 14px', background: '#F1F5F9', color: '#334155', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
