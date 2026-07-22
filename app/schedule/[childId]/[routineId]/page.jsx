'use client'

import { useParams } from 'next/navigation'
import { ScheduleVisualizer } from '@/components/ScheduleVisualizer/ScheduleVisualizer'

export default function SchedulePage() {
  const { childId, routineId } = useParams()

  return <ScheduleVisualizer childId={childId} routineId={routineId} />
}
