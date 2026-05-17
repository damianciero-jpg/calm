'use client'

import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { SignInRequired } from '@/lib/browser-auth'
import { getFirebaseDb } from '@/lib/firebase'
import { useFirebaseUser } from '@/lib/useFirebaseUser'

interface Notification {
  id:         string
  type:       string
  title:      string
  body:       string
  read:       boolean
  created_at: string
  child:      { name: string; avatar: string; color: string } | null
}

const TYPE_META: Record<string, { label: string; bg: string; color: string }> = {
  alert:    { label: 'Alert',   bg: '#FEF2F2', color: '#DC2626' },
  pattern:  { label: 'Pattern', bg: '#EFF6FF', color: '#2563EB' },
  positive: { label: 'Positive',bg: '#F0FDF4', color: '#16A34A' },
}

function getMeta(type: string) {
  return TYPE_META[type] ?? { label: type, bg: '#F8FAFC', color: '#64748B' }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function NotificationsPage() {
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [notifs,  setNotifs]              = useState<Notification[]>([])
  const [marking, setMarking]             = useState<string | null>(null)
  const { user, loading: authLoading } = useFirebaseUser()

  useEffect(() => {
    let active = true
    const db = getFirebaseDb()

    async function loadNotifications() {
      try {
        if (!user) return

        const snapshot = await getDocs(
          query(
            collection(db, 'notifications'),
            where('recipientId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(50)
          )
        )
        const rows = await Promise.all(snapshot.docs.map(async notificationDoc => {
          const data = notificationDoc.data()
          let child = null
          if (typeof data.childId === 'string') {
            const childSnap = await getDoc(doc(db, 'children', data.childId))
            if (childSnap.exists()) {
              const childData = childSnap.data()
              child = {
                name: String(childData.name ?? ''),
                avatar: String(childData.avatar ?? ''),
                color: String(childData.color ?? '#6366F1'),
              }
            }
          }
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
          return {
            id: notificationDoc.id,
            type: String(data.type ?? 'alert'),
            title: String(data.title ?? ''),
            body: String(data.body ?? ''),
            read: Boolean(data.read),
            created_at: createdAt.toISOString(),
            child,
          }
        }))

        if (active) setNotifs(rows)
      } catch (err) {
        console.error('Notifications load failed', err)
        if (active) setError(err instanceof Error ? err.message : 'Notifications could not load')
      } finally {
        if (active) setLoading(false)
      }
    }

    if (authLoading) return () => { active = false }
    if (!user) {
      setLoading(false)
      return () => { active = false }
    }

    setLoading(true)
    setError(null)
    loadNotifications()

    return () => {
      active = false
    }
  }, [user, authLoading])

  async function markRead(id: string) {
    setMarking(id)
    const db = getFirebaseDb()
    await updateDoc(doc(db, 'notifications', id), { read: true })
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setMarking(null)
  }

  async function markAllRead() {
    const unread = notifs.filter(n => !n.read).map(n => n.id)
    if (!unread.length) return
    const db = getFirebaseDb()
    await Promise.all(unread.map(id => updateDoc(doc(db, 'notifications', id), { read: true })))
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifs.filter(n => !n.read).length

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", color: '#64748B' }}>Loading...</div>
    )
  }

  if (!user) {
    return <SignInRequired />
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Outfit', sans-serif" }}>

        {/* Header */}
        <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', color: '#0F172A', margin: 0 }}>Notifications</h1>
            {unreadCount > 0 && (
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>{unreadCount} unread</div>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{ background: 'none', border: 'none', color: '#6366F1', fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', padding: '4px 8px' }}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ padding: '1rem 1.25rem', maxWidth: '640px', margin: '0 auto' }}>
          {error ? (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '12px 14px', color: '#DC2626', fontSize: '0.9rem' }}>{error}</div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94A3B8', fontSize: '2rem' }}>🔔</div>
          ) : notifs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔔</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: '#0F172A', marginBottom: '0.5rem' }}>All caught up!</div>
              <div style={{ fontSize: '0.9rem', color: '#94A3B8' }}>No notifications yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifs.map(n => {
                const meta = getMeta(n.type)
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markRead(n.id)}
                    style={{
                      background: 'white',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      boxShadow: n.read ? 'none' : '0 2px 12px rgba(99,102,241,0.08)',
                      border: `1px solid ${n.read ? '#E2E8F0' : '#C7D2FE'}`,
                      cursor: n.read ? 'default' : 'pointer',
                      display: 'flex', gap: '12px', alignItems: 'flex-start',
                      opacity: marking === n.id ? 0.5 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {/* Avatar / dot */}
                    <div style={{ flexShrink: 0, position: 'relative' }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '50%',
                        background: n.child ? `${n.child.color}18` : '#F1F5F9',
                        border: `2px solid ${n.child ? `${n.child.color}55` : '#E2E8F0'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.4rem',
                      }}>
                        {n.child?.avatar ?? '🔔'}
                      </div>
                      {!n.read && (
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '10px', height: '10px', background: '#6366F1', borderRadius: '50%', border: '2px solid white' }} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: n.read ? 500 : 700, color: '#0F172A' }}>{n.title}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: meta.bg, color: meta.color }}>{meta.label}</span>
                      </div>
                      <div style={{ fontSize: '0.83rem', color: '#64748B', lineHeight: 1.45 }}>{n.body}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '5px', display: 'flex', gap: '8px' }}>
                        {n.child && <span>{n.child.name}</span>}
                        <span>{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
