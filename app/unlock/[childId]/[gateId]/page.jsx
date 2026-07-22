'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { UnlockGate } from '@/components/UnlockGate/UnlockGate'

export default function UnlockGatePage() {
  const { childId, gateId } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const triggerType = searchParams.get('triggerType') ?? 'wake'
  const ageProfile = searchParams.get('ageProfile') ?? 'kids'
  const routineId = searchParams.get('routineId')

  return (
    <UnlockGate
      childId={childId}
      gateId={gateId}
      triggerType={triggerType}
      ageProfile={ageProfile}
      onComplete={() => {
        router.push(routineId ? `/schedule/${childId}/${routineId}` : `/dashboard`)
      }}
    />
  )
}
