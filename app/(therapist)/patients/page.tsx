'use client'

import { useEffect, useState } from 'react'
import { getBrowserSession, SignInRequired } from '@/lib/browser-auth'
import CalmPathApp from '@/components/calmpath-full'

export default function PatientsPage() {
  const [loading, setLoading] = useState(true)
  const [authMissing, setAuthMissing] = useState(false)

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const session = await getBrowserSession('Patients session lookup')
        if (active && !session) setAuthMissing(true)
      } catch (err) {
        console.error('Patients session lookup failed', err)
        if (active) setAuthMissing(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSession()

    return () => {
      active = false
    }
  }, [])

  if (loading) return null
  if (authMissing) return <SignInRequired />

  return <CalmPathApp />
}
