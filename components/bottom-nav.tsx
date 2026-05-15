'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

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
    const supabase = createClient()
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (!session) {
        setRole(null); setUid(null); setFirstChildId(null); setUnread(0)
        if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null }
        return
      }

      const r   = (session.user.user_metadata?.role as string) ?? null
      const uid = session.user.id
      setRole(r)
      setUid(uid)

      if (r === 'parent' && !firstChildId) {
        const { data } = await supabase.from('children').select('id').order('created_at').limit(1).single()
        if (data) setFirstChildId(data.id)
      }

      const { count } = await supabase
        .from('notifications').select('id', { count: 'exact', head: true })
        .eq('recipient_id', uid).eq('read', false)
      setUnread(count ?? 0)

      if (!realtimeChannel) {
        realtimeChannel = supabase.channel('bottom-nav-notifs')
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'notifications',
            filter: `recipient_id=eq.${uid}`,
          }, () => setUnread(n => n + 1))
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'notifications',
            filter: `recipient_id=eq.${uid}`,
          }, () => {
            supabase.from('notifications').select('id', { count: 'exact', head: true })
              .eq('recipient_id', uid).eq('read', false)
              .then(({ count: c }) => setUnread(c ?? 0))
          })
          .subscribe()
      }
    })

    return () => {
      subscription.unsubscribe()
      if (realtimeChannel) supabase.removeChannel(realtimeChannel)
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
