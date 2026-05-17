'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import { useFirebaseUser } from '@/lib/useFirebaseUser'

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
  const [firstChildHref, setFirstChildHref] = useState<string | null>(null)
  const [unread,       setUnread]       = useState(0)
  const { user, loading: authLoading } = useFirebaseUser()

  useEffect(() => {
    const db = getFirebaseDb()
    let unsubscribeNotifications: (() => void) | null = null

    if (authLoading) return () => undefined
    if (!user) {
      setRole(null); setFirstChildHref(null); setUnread(0)
      return () => undefined
    }
    const uid = user.uid

    async function loadNav() {
      const profileSnap = await getDoc(doc(db, 'users', uid))
      const r = profileSnap.exists() && typeof profileSnap.data().role === 'string'
        ? profileSnap.data().role
        : 'parent'
      setRole(r)

      if (r === 'parent') {
        const childrenSnap = await getDocs(query(collection(db, 'children'), where('parentId', '==', uid), limit(1)))
        const first = childrenSnap.docs[0]
        if (first) {
          const data = first.data()
          const age = typeof data.age === 'number' ? data.age : Number(data.age ?? 0)
          setFirstChildHref(age >= 13 ? `/play-teen?childId=${first.id}` : `/play?childId=${first.id}`)
        } else {
          setFirstChildHref(null)
        }
      }

      if (unsubscribeNotifications) unsubscribeNotifications()
      unsubscribeNotifications = onSnapshot(
        query(collection(db, 'notifications'), where('recipientId', '==', uid), where('read', '==', false)),
        snapshot => setUnread(snapshot.size)
      )
    }

    loadNav().catch(err => {
      console.error('Bottom nav load failed', err)
      setRole(null)
      setFirstChildHref(null)
      setUnread(0)
    })

    return () => {
      if (unsubscribeNotifications) unsubscribeNotifications()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading])

  if (AUTH_PATHS.has(pathname) || authLoading || !role) return null

  const homeHref = role === 'therapist' ? '/patients' : '/dashboard'
  const playHref = urlChildId && pathname === '/play-teen' ? `/play-teen?childId=${urlChildId}` : urlChildId ? `/play?childId=${urlChildId}` : firstChildHref ?? '/play'

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
