'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { waitForFirebaseUser, SignInRequired } from '@/lib/browser-auth'
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase'
import AddChildModal from '@/components/add-child-modal'
import type { Child } from '@/types/database'

interface Profile {
  id:          string
  full_name:   string | null
  role:        string | null
}

function mapChild(id: string, data: Record<string, unknown>): Child {
  const gameMode = (data.gameMode ?? data.game_mode ?? 'kids') as string
  const parentId = (data.parentId ?? data.parent_id ?? '') as string
  return {
    id,
    parentId,
    parent_id: parentId,
    name: String(data.name ?? ''),
    age: typeof data.age === 'number' ? data.age : Number(data.age ?? 0),
    avatar: typeof data.avatar === 'string' ? data.avatar : '',
    color: typeof data.color === 'string' ? data.color : '#6366F1',
    gameMode,
    game_mode: gameMode,
    createdAt: data.createdAt,
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', border: '1px solid #E2E8F0' }}>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.05rem', color: '#0F172A', marginBottom: '1rem' }}>{title}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 13px', border: '1.5px solid #E2E8F0', borderRadius: '10px',
  fontFamily: "'Outfit', sans-serif", fontSize: '0.9rem', color: '#0F172A',
  outline: 'none', background: 'white', transition: 'border-color 0.15s',
  boxSizing: 'border-box',
}

export default function SettingsPage() {
  const router = useRouter()

  const [loading,      setLoading]      = useState(true)
  const [authMissing,  setAuthMissing]  = useState(false)
  const [profile,      setProfile]      = useState<Profile | null>(null)
  const [email,        setEmail]        = useState('')
  const [displayName,  setDisplayName]  = useState('')
  const [savingName,   setSavingName]   = useState(false)
  const [nameSaved,    setNameSaved]    = useState(false)

  const [children,     setChildren]     = useState<Child[]>([])
  const [showAddChild, setShowAddChild] = useState(false)
  const [gameModes,    setGameModes]    = useState<Record<string, 'kids' | 'teen'>>({})

  const [signingOut,   setSigningOut]   = useState(false)

  useEffect(() => {
    let active = true
    const db = getFirebaseDb()

    async function loadSettings() {
      try {
        const user = await waitForFirebaseUser('Settings session lookup')
        if (!active) return

        if (!user) {
          setAuthMissing(true)
          return
        }

        setEmail(user.email ?? '')

        const [profileSnap, childrenSnap] = await Promise.all([
          getDoc(doc(db, 'users', user.uid)),
          getDocs(query(collection(db, 'children'), where('parentId', '==', user.uid))),
        ])

        if (!active) return

        if (profileSnap.exists()) {
          const data = profileSnap.data()
          const profileData = {
            id: user.uid,
            full_name: typeof data.fullName === 'string' ? data.fullName : '',
            role: typeof data.role === 'string' ? data.role : 'parent',
          }
          setProfile(profileData)
          setDisplayName(profileData.full_name ?? '')
        }

        const kids = childrenSnap.docs.map(doc => mapChild(doc.id, doc.data()))
        setChildren(kids)
        const modes: Record<string, 'kids' | 'teen'> = {}
        for (const k of kids) {
          modes[k.id] = (k.game_mode ?? 'kids') as 'kids' | 'teen'
        }
        setGameModes(modes)
      } catch (err) {
        console.error('Settings load failed', err)
        if (active) setAuthMissing(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSettings()

    return () => {
      active = false
    }
  }, [router])

  async function saveName() {
    if (!profile) return
    setSavingName(true)
    const db = getFirebaseDb()
    await updateDoc(doc(db, 'users', profile.id), { fullName: displayName.trim() })
    setProfile(p => p ? { ...p, full_name: displayName.trim() } : p)
    setSavingName(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function signOut() {
    setSigningOut(true)
    await firebaseSignOut(getFirebaseAuth())
    router.push('/login')
  }

  function handleAddSuccess(child: Child) {
    setChildren(prev => [...prev, child])
    setShowAddChild(false)
  }

  async function updateGameMode(childId: string, mode: 'kids' | 'teen') {
    setGameModes(prev => ({ ...prev, [childId]: mode }))
    const db = getFirebaseDb()
    await updateDoc(doc(db, 'children', childId), { gameMode: mode })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>⚙️</div>
  )

  if (authMissing) {
    return <SignInRequired />
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Outfit', sans-serif" }}>

        {/* Header */}
        <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '1rem 1.5rem' }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', color: '#0F172A', margin: 0 }}>Settings</h1>
        </div>

        <div style={{ padding: '1.25rem', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Account Info */}
          <Section title="Account">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Display name</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
                    onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
                  />
                  <button
                    onClick={saveName}
                    disabled={savingName || !displayName.trim()}
                    style={{
                      padding: '10px 18px', borderRadius: '10px', border: 'none',
                      background: nameSaved ? '#16A34A' : '#6366F1', color: 'white',
                      fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.85rem',
                      cursor: savingName || !displayName.trim() ? 'default' : 'pointer',
                      opacity: savingName || !displayName.trim() ? 0.6 : 1,
                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                  >
                    {nameSaved ? '✓ Saved' : savingName ? '…' : 'Save'}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Email</label>
                <div style={{ ...inputStyle, background: '#F8FAFC', color: '#64748B', display: 'flex', alignItems: 'center' }}>{email}</div>
              </div>

              {profile?.role && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>Role</span>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                    background: profile.role === 'therapist' ? '#EFF6FF' : '#F0FDF4',
                    color: profile.role === 'therapist' ? '#2563EB' : '#16A34A',
                  }}>
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </span>
                </div>
              )}
            </div>
          </Section>

          {/* Children (parents only) */}
          {profile?.role === 'parent' && (
            <Section title="Children">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {children.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#94A3B8', textAlign: 'center', padding: '1rem 0' }}>No children yet.</div>
                ) : (
                  children.map(child => (
                    <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '50%',
                        background: `${child.color ?? '#6366F1'}18`, border: `2px solid ${child.color ?? '#6366F1'}55`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0,
                      }}>
                        {child.avatar ?? ''}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>{child.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Age {child.age ?? '-'}</div>
                      </div>
                      <div style={{ display: 'flex', borderRadius: '20px', overflow: 'hidden', border: '1px solid #E2E8F0', flexShrink: 0 }}>
                        <button
                          onClick={() => updateGameMode(child.id, 'kids')}
                          style={{
                            padding: '5px 10px', border: 'none',
                            background: (gameModes[child.id] ?? 'kids') === 'kids' ? '#6366F1' : '#F1F5F9',
                            color: (gameModes[child.id] ?? 'kids') === 'kids' ? 'white' : '#64748B',
                            cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.72rem',
                            transition: 'all 0.15s',
                          }}
                        >🎮 Kids</button>
                        <button
                          onClick={() => updateGameMode(child.id, 'teen')}
                          style={{
                            padding: '5px 10px', border: 'none',
                            background: (gameModes[child.id] ?? 'kids') === 'teen' ? '#6366F1' : '#F1F5F9',
                            color: (gameModes[child.id] ?? 'kids') === 'teen' ? 'white' : '#64748B',
                            cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.72rem',
                            transition: 'all 0.15s',
                          }}
                        >🌙 Teen</button>
                      </div>
                    </div>
                  ))
                )}
                <button
                  onClick={() => setShowAddChild(true)}
                  style={{
                    padding: '10px', borderRadius: '10px', border: '1.5px dashed #CBD5E1',
                    background: 'white', color: '#6366F1', fontFamily: "'Outfit', sans-serif",
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  Add child profile
                </button>
              </div>
            </Section>
          )}

          {/* Notification preferences placeholder */}
          <Section title="Notifications">
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔔</span>
              <span>Notification preferences — coming soon.</span>
            </div>
          </Section>

          {/* Sign out */}
          <button
            onClick={signOut}
            disabled={signingOut}
            style={{
              width: '100%', padding: '13px', borderRadius: '12px', border: '1.5px solid #FCA5A5',
              background: 'white', color: '#DC2626', fontFamily: "'Outfit', sans-serif",
              fontWeight: 700, fontSize: '0.92rem', cursor: signingOut ? 'default' : 'pointer',
              opacity: signingOut ? 0.6 : 1, transition: 'all 0.15s',
            }}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>

        </div>
      </div>

      {showAddChild && (
        <AddChildModal
          onSuccess={handleAddSuccess}
          onCancel={() => setShowAddChild(false)}
        />
      )}
    </>
  )
}
