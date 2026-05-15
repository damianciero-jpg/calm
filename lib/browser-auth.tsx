'use client'

import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

export const AUTH_TIMEOUT_MS = 10_000

export function withTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${AUTH_TIMEOUT_MS / 1000} seconds`)), AUTH_TIMEOUT_MS)
    ),
  ])
}

export async function getBrowserSession(label: string): Promise<Session | null> {
  const supabase = createClient()
  const {
    data: { session },
    error,
  } = await withTimeout(supabase.auth.getSession(), label)

  if (error) {
    throw error
  }

  return session
}

export function SignInRequired({ message = 'Please sign in' }: { message?: string }) {
  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", padding: '1rem' }}>
        <main style={{ width: '100%', maxWidth: '420px', background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 24px rgba(15,23,42,0.08)', textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.4rem', color: '#0F172A', margin: '0 0 0.5rem' }}>{message}</h1>
          <p style={{ margin: '0 0 1rem', color: '#64748B', fontSize: '0.92rem', lineHeight: 1.45 }}>Sign in to continue.</p>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', background: '#6366F1', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>
            Sign In
          </Link>
        </main>
      </div>
    </>
  )
}
