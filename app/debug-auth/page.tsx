'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type DebugState = {
  status: 'loading' | 'ready' | 'error'
  email: string | null
  sessionExists: boolean
  message: string | null
}

const supabaseUrlExists = !!process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKeyExists = !!(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)

export default function DebugAuthPage() {
  const [state, setState] = useState<DebugState>({
    status: 'loading',
    email: null,
    sessionExists: false,
    message: null,
  })

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const supabase = createClient()
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!active) {
          return
        }

        setState({
          status: error ? 'error' : 'ready',
          email: session?.user.email ?? null,
          sessionExists: !!session,
          message: error?.message ?? null,
        })
      } catch (err) {
        if (!active) {
          return
        }

        setState({
          status: 'error',
          email: null,
          sessionExists: false,
          message: err instanceof Error ? err.message : 'Unexpected debug auth error',
        })
      }
    }

    loadSession()

    return () => {
      active = false
    }
  }, [])

  const rows = [
    ['Supabase URL exists', supabaseUrlExists ? 'yes' : 'no'],
    ['Supabase anon key exists', supabaseAnonKeyExists ? 'yes' : 'no'],
    ['Current user email', state.status === 'loading' ? 'checking...' : state.email ?? 'none'],
    ['Session exists', state.status === 'loading' ? 'checking...' : state.sessionExists ? 'yes' : 'no'],
  ]

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", padding: '1rem' }}>
        <main style={{ width: '100%', maxWidth: '560px', background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 24px rgba(15,23,42,0.08)' }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.45rem', color: '#0F172A', margin: '0 0 1rem' }}>
            Auth debug
          </h1>

          <div style={{ display: 'grid', gap: '10px' }}>
            {rows.map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '10px 0', borderBottom: '1px solid #E2E8F0', color: '#334155', fontSize: '0.92rem' }}>
                <strong style={{ color: '#0F172A' }}>{label}</strong>
                <span>{value}</span>
              </div>
            ))}
          </div>

          {state.message && (
            <div style={{ marginTop: '1rem', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', color: '#DC2626', lineHeight: 1.45 }}>
              {state.message}
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
        </main>
      </div>
    </>
  )
}
