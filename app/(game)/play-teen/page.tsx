'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getBrowserSession, SignInRequired } from '@/lib/browser-auth'
import TeenMode from '@/components/teenmode'
import type { Child } from '@/types/database'

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

  useEffect(() => {
    let active = true
    const supabase = createClient()

    async function loadTeenPlay() {
      try {
        const session = await getBrowserSession('Teen play session lookup')
        if (!active) return

        if (!session) {
          setAuthMissing(true)
          return
        }

        const { data } = await supabase
          .from('children')
          .select('*')
          .order('created_at')

        if (!active) return

        const kids = (data ?? []) as Child[]

        let target: Child | null = null
        if (childIdParam) {
          target = kids.find(k => k.id === childIdParam) ?? null
        } else if (kids.length === 1) {
          target = kids[0]
        }

        if (!target) { router.push('/play'); return }
        if (target.age < 13) { router.push(`/play?childId=${target.id}`); return }

        setSelectedChild(target)
      } catch (err) {
        console.error('Teen play load failed', err)
        if (active) setAuthMissing(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadTeenPlay()

    return () => {
      active = false
    }
  }, [router, childIdParam])

  if (loading) return <FullPageLoader />
  if (authMissing) return <SignInRequired />
  if (!selectedChild) return null
  return <TeenMode childId={selectedChild.id} />
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
