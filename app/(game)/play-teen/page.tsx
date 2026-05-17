'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { SignInRequired } from '@/lib/browser-auth'
import { getFirebaseDb } from '@/lib/firebase'
import { useFirebaseUser } from '@/lib/useFirebaseUser'
import TeenMode from '@/components/teenmode'
import type { Child } from '@/types/database'

function mapChild(id: string, data: Record<string, unknown>): Child {
  const age = typeof data.age === 'number' ? data.age : Number(data.age ?? 0)
  const gameMode = age >= 13 ? 'teen' : 'kids'
  const parentId = (data.parentId ?? data.parent_id ?? '') as string
  return {
    id,
    parentId,
    parent_id: parentId,
    name: String(data.name ?? ''),
    age,
    avatar: typeof data.avatar === 'string' ? data.avatar : '',
    color: typeof data.color === 'string' ? data.color : '#6366F1',
    gameMode,
    game_mode: gameMode,
    createdAt: data.createdAt,
  }
}

export default function PlayTeenPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <PlayTeenContent />
    </Suspense>
  )
}

function PlayTeenContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const childIdParam = searchParams.get('childId')
  const [loading,       setLoading]       = useState(true)
  const [authMissing,   setAuthMissing]   = useState(false)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const { user, loading: authLoading } = useFirebaseUser()

  useEffect(() => {
    let active = true
    const db = getFirebaseDb()

    async function loadTeenPlay() {
      try {
        if (!user) return

        const snapshot = await getDocs(query(collection(db, 'children'), where('parentId', '==', user.uid)))

        if (!active) return

        const kids = snapshot.docs.map(doc => mapChild(doc.id, doc.data()))

        let target: Child | null = null
        if (childIdParam) {
          target = kids.find(k => k.id === childIdParam) ?? null
        } else if (kids.length === 1) {
          target = kids[0]
        }

        if (!target) { router.push('/play'); return }
        if ((target.age ?? 0) < 13) { router.push(`/play?childId=${target.id}`); return }

        setSelectedChild(target)
      } catch (err) {
        console.error('Teen play load failed', err)
        if (active) setAuthMissing(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    if (authLoading) return () => { active = false }
    if (!user) {
      setAuthMissing(true)
      setLoading(false)
      return () => { active = false }
    }

    setLoading(true)
    setAuthMissing(false)
    loadTeenPlay()

    return () => {
      active = false
    }
  }, [router, childIdParam, user, authLoading])

  if (authLoading || loading) return <FullPageLoader />
  if (authMissing) return <SignInRequired />
  if (!selectedChild) return null
  return <TeenMode childId={selectedChild.id} parentId={user?.uid} />
}

function FullPageLoader() {
  return (
    <>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}`}</style>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg,#0F172A 0%,#1E293B 60%,#0F172A 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: '3rem', animation: 'bounce 1.2s ease-in-out infinite' }}>🧠</div>
      </div>
    </>
  )
}
