'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase'

const AUTH_PATHS = new Set(['/login', '/signup'])

interface NavTab {
  id:     string
  label:  string
  icon:   string
  href:   string
  badge?: number
}

function BottomNavContent() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const urlChildId   = searchParams.get('childId')

  const [role,         setRole]         = useState<string | null>(null)
  const [uid,          setUid]          = useState<string | null>(null)
  const [firstChildId, setFirstChildId] = useState<string | null>(null)
  const [unread,       setUnread]       = useState(0)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const db = getFirebaseDb()
    let unsubscribeNotifications: (() => void) | null = null

    const unsubscribeAuth = onAuthStateChanged(auth, async user => {
      if (!user) {
        setRole(null); setUid(null); setFirstChildId(null); setUnread(0)
        if (unsubscribeNotifications) { unsubscribeNotifications(); unsubscribeNotifications = null }
        return
      }

      const profileSnap = await getDoc(doc(db, 'users', user.uid))
      const r = profileSnap.exists() && typeof profileSnap.data().role === 'string'
        ? profileSnap.data().role
        : 'parent'
      const uid = user.uid
      setRole(r)
      setUid(uid)

      if (r === 'parent' && !firstChildId) {
        const childrenSnap = await getDocs(query(collection(db, 'children'), where('parentId', '==', uid), limit(1)))
        const first = childrenSnap.docs[0]
        if (first) setFirstChildId(first.id)
      }

      if (unsubscribeNotifications) unsubscribeNotifications()
      unsubscribeNotifications = onSnapshot(
        query(collection(db, 'notifications'), where('recipientId', '==', uid), where('read', '==', false)),
        snapshot => setUnread(snapshot.size)
      )
    })

    return () => {
      unsubscribeAuth()
      if (unsubscribeNotifications) unsubscribeNotifications()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (AUTH_PATHS.has(pathname) || !role) return null

  const homeHref = role === 'therapist' ? '/patients' : '/dashboard'
  const playHref = urlChildId ? `/play?childId=${urlChildId}` : firstChildId ? `/play?childId=${firstChildId}` : '/play'

  const tabs: NavTab[] = [
    { id: 'home',     label: 'Home',     icon: '🏠', href: homeHref },
    { id: 'play',     label: 'Play',     icon: '🎮', href: playHref },
    { id: 'alerts',   label: 'Alerts',   icon: '🔔', href: '/notifications', badge: unread },
    { id: 'settings', label: 'Settings', icon: '⚙️', href: '/settings' },
  ]

  function isActive(tab: NavTab) {
    if (tab.id === 'home')     return pathname === '/dashboard' || pathname === '/patients'
    if (tab.id === 'play')     return pathname.startsWith('/play')
    if (tab.id === 'alerts')   return pathname === '/notifications'
    if (tab.id === 'settings') return pathname === '/settings'
    return false
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'white', borderTop: '1px solid #E2E8F0',
      display: 'flex', zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => {
        const active = isActive(tab)
        return (
          <Link
            key={tab.id}
            href={tab.href}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '8px 0 6px', gap: '2px',
              textDecoration: 'none', transition: 'color 0.15s',
            }}
          >
            <span style={{ position: 'relative', lineHeight: 1 }}>
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '26px', borderRadius: '8px',
                background: active ? '#EEF2FF' : 'transparent',
                fontSize: '1.15rem', transition: 'background 0.15s',
              }}>
                {tab.icon}
              </span>
              {(tab.badge ?? 0) > 0 && (
                <span style={{
                  position: 'absolute', top: '-2px', right: '-2px',
                  background: '#EF4444', color: 'white', borderRadius: '20px',
                  minWidth: '15px', height: '15px', padding: '0 3px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.58rem', fontWeight: 800, lineHeight: 1,
                }}>
                  {(tab.badge ?? 0) > 9 ? '9+' : tab.badge}
                </span>
              )}
            </span>
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '0.67rem', fontWeight: active ? 700 : 500,
              color: active ? '#6366F1' : '#94A3B8',
              transition: 'color 0.15s',
            }}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export default function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavContent />
    </Suspense>
  )
}
