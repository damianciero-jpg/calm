'use client'

import { SignInRequired } from '@/lib/browser-auth'
import { isChildModeActive } from '@/lib/child-pin'
import { useFirebaseUser } from '@/lib/useFirebaseUser'
import CalmPathApp from '@/components/calmpath-full'

export default function PatientsPage() {
  const { user, loading } = useFirebaseUser()

  if (isChildModeActive()) {
    window.location.replace('/play/select')
    return null
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", color: '#64748B' }}>Loading...</div>
  if (!user) return <SignInRequired />

  return <CalmPathApp />
}
