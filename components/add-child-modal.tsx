'use client'

import { useState } from 'react'
import type React from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase'
import type { Child } from '@/types/database'

// Same 6 mood emojis and colors as moodquest.jsx
const AVATARS = [
  { emoji: '😄', color: '#FFD93D' },
  { emoji: '😌', color: '#6BCB77' },
  { emoji: '😟', color: '#74B9FF' },
  { emoji: '😠', color: '#FF6B6B' },
  { emoji: '😢', color: '#A29BFE' },
  { emoji: '😴', color: '#FDCB6E' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #E2E8F0', borderRadius: '10px',
  fontFamily: "'Outfit', sans-serif", fontSize: '0.92rem', color: '#0F172A',
  outline: 'none', background: 'white', transition: 'border-color 0.15s',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000} seconds`)), ms)
    ),
  ])
}

function getChildSaveErrorMessage(err: unknown) {
  const code = typeof err === 'object' && err && 'code' in err ? err.code : null

  if (code === 'permission-denied') {
    return 'Firestore permission denied. Check Firestore security rules for children.'
  }

  if (code === 'unavailable') {
    return 'Firebase is unavailable. Try again.'
  }

  return err instanceof Error ? err.message : 'Unexpected child profile error'
}

interface Props {
  onSuccess: (child: Child) => void
  onCancel?: () => void
}

export default function AddChildModal({ onSuccess, onCancel }: Props) {
  const [name, setName]         = useState('')
  const [age, setAge]           = useState('')
  const [selected, setSelected] = useState(AVATARS[0])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const isOnboarding = !onCancel

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const user = getFirebaseAuth().currentUser

      if (!user) {
        setError('Session expired. Please sign in again.')
        return
      }

      const db = getFirebaseDb()
      const child = {
        parentId: user.uid,
        parent_id: user.uid,
        name: name.trim(),
        age: parseInt(age, 10),
        avatar: selected.emoji,
        color: selected.color,
        gameMode: 'kids',
        game_mode: 'kids',
        createdAt: serverTimestamp(),
      }
      const ref = await withTimeout(
        addDoc(collection(db, 'children'), child),
        15000,
        'Child profile save'
      )

      onSuccess({ id: ref.id, ...child } as Child)
    } catch (err) {
      console.error('Add child failed', err)
      setError(getChildSaveErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const card = (
    <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', boxShadow: '0 4px 24px rgba(15,23,42,0.08)', width: '100%', maxWidth: '420px' }}>
      {isOnboarding ? (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px', transition: 'all 0.15s' }}>{selected.emoji}</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.4rem', color: '#0F172A' }}>Set up your first child</div>
          <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '4px' }}>Set up their profile to start tracking their emotional journey</div>
        </div>
      ) : (
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: '#0F172A', marginBottom: '1.5rem' }}>Add a child</div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Field label="Child's name">
          <input
            type="text"
            placeholder="e.g. Alex"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
            onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
          />
        </Field>

        <Field label="Age">
          <input
            type="number"
            placeholder="e.g. 8"
            min={1}
            max={18}
            value={age}
            onChange={e => setAge(e.target.value)}
            required
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
            onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
          />
        </Field>

        <Field label="Avatar">
          <div style={{ display: 'flex', gap: '8px' }}>
            {AVATARS.map(a => (
              <button
                key={a.emoji}
                type="button"
                onClick={() => setSelected(a)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: '10px', cursor: 'pointer',
                  border: `2px solid ${selected.emoji === a.emoji ? a.color : '#E2E8F0'}`,
                  background: selected.emoji === a.emoji ? `${a.color}22` : 'white',
                  fontSize: '1.4rem', transition: 'all 0.12s',
                }}
              >
                {a.emoji}
              </button>
            ))}
          </div>
        </Field>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#DC2626' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !name.trim() || !age}
          style={{
            width: '100%', padding: '12px', background: '#6366F1', color: 'white', border: 'none',
            borderRadius: '10px', fontFamily: "'Outfit', sans-serif", fontWeight: 700,
            fontSize: '0.95rem', cursor: saving || !name.trim() || !age ? 'default' : 'pointer',
            opacity: saving || !name.trim() || !age ? 0.6 : 1, transition: 'opacity 0.15s',
          }}
        >
          {saving ? 'Saving…' : 'Add child'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none', border: 'none', fontFamily: "'Outfit', sans-serif",
              fontSize: '0.85rem', color: '#94A3B8', cursor: 'pointer', padding: '4px',
            }}
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  )

  if (isOnboarding) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&display=swap');`}</style>
        <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 12px' }}>🧩</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.75rem', color: '#0F172A', lineHeight: 1 }}>Viada</div>
              <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>AI-Powered Autism Support</div>
            </div>
            {card}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&display=swap');`}</style>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
        onClick={e => { if (e.target === e.currentTarget) onCancel?.() }}
      >
        {card}
      </div>
    </>
  )
}
