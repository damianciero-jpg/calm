import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 15

const STRESS = ['anxious', 'angry', 'sad']

type Session = { mood: string; stars: number; played_at: string; day_label: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceClient = any

async function alreadyNotified(
  svc: ServiceClient,
  childId: string,
  type: string,
  since: Date,
  titleContains?: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = svc
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('type', type)
    .gte('created_at', since.toISOString())
  if (titleContains) q = q.ilike('title', `%${titleContains}%`)
  const { count } = await q
  return (count ?? 0) > 0
}

async function insertNotifs(
  svc: ServiceClient,
  recipientIds: string[],
  childId: string,
  type: string,
  title: string,
  body: string
): Promise<number> {
  if (!recipientIds.length) return 0
  const rows = recipientIds.map(recipient_id => ({ recipient_id, child_id: childId, type, title, body }))
  const { error } = await svc.from('notifications').insert(rows)
  if (error) console.error('notif insert:', error.message)
  return error ? 0 : rows.length
}

export async function POST(request: NextRequest) {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  try {
    const raw = await request.json().catch(() => ({}))
    // Support MoodQuest format { childId } and Supabase webhook format { record: { child_id } }
    const childId: string | undefined = raw?.childId ?? raw?.record?.child_id
    if (!childId) return NextResponse.json({ created: 0 })

    const { data: child } = await service
      .from('children')
      .select('id, name, parent_id, therapist_id')
      .eq('id', childId)
      .single()
    if (!child) return NextResponse.json({ created: 0 })

    const recipients = ([child.parent_id, child.therapist_id] as (string | null)[])
      .filter(Boolean) as string[]

    const nowUTC = new Date()
    const todayUTC = new Date(nowUTC); todayUTC.setUTCHours(0, 0, 0, 0)
    const dow = nowUTC.getUTCDay()
    const weekStartUTC = new Date(nowUTC)
    weekStartUTC.setUTCDate(nowUTC.getUTCDate() - (dow === 0 ? 6 : dow - 1))
    weekStartUTC.setUTCHours(0, 0, 0, 0)
    const fourWeeksAgo = new Date(todayUTC); fourWeeksAgo.setUTCDate(todayUTC.getUTCDate() - 28)

    const [{ data: t }, { data: w }, { data: h }] = await Promise.all([
      service.from('sessions').select('mood, stars, played_at, day_label').eq('child_id', childId).gte('played_at', todayUTC.toISOString()),
      service.from('sessions').select('mood, stars, played_at, day_label').eq('child_id', childId).gte('played_at', weekStartUTC.toISOString()),
      service.from('sessions').select('mood, stars, played_at, day_label').eq('child_id', childId).gte('played_at', fourWeeksAgo.toISOString()),
    ])

    const today = (t ?? []) as Session[]
    const week  = (w ?? []) as Session[]
    const hist  = (h ?? []) as Session[]
    let created = 0

    // ── Rule 1: 3+ stress sessions today ────────────────────────
    const stressToday = today.filter(s => STRESS.includes(s.mood))
    if (stressToday.length >= 3) {
      if (!(await alreadyNotified(service, childId, 'alert', todayUTC))) {
        created += await insertNotifs(
          service, recipients, childId, 'alert',
          `${child.name} had ${stressToday.length} stress sessions today`,
          'Elevated frustration and worry patterns detected. Consider checking in with your child.'
        )
      }
    }

    // ── Rule 2: Monday morning stress pattern ────────────────────
    // Count distinct Mon dates (UTC) where a morning stress session occurred
    const monStressDates = [
      ...new Set(
        hist
          .filter(s => s.day_label === 'Mon' && new Date(s.played_at).getUTCHours() < 14 && STRESS.includes(s.mood))
          .map(s => s.played_at.slice(0, 10))
      ),
    ]
    if (monStressDates.length >= 2) {
      if (!(await alreadyNotified(service, childId, 'pattern', weekStartUTC, 'Monday'))) {
        created += await insertNotifs(
          service, recipients, childId, 'pattern',
          `Monday morning stress pattern — ${child.name}`,
          `Stress sessions detected on ${monStressDates.length} Monday mornings in the past 4 weeks. May align with school start-of-week anxiety.`
        )
      }
    }

    // ── Rule 3: Thursday afternoon stress pattern ────────────────
    // Count distinct Thu dates (UTC ≥ 14:00) where afternoon stress occurred
    const thuStressDates = [
      ...new Set(
        hist
          .filter(s => s.day_label === 'Thu' && new Date(s.played_at).getUTCHours() >= 14 && STRESS.includes(s.mood))
          .map(s => s.played_at.slice(0, 10))
      ),
    ]
    if (thuStressDates.length >= 2) {
      if (!(await alreadyNotified(service, childId, 'pattern', weekStartUTC, 'Thursday'))) {
        created += await insertNotifs(
          service, recipients, childId, 'pattern',
          `Thursday afternoon trend — ${child.name}`,
          `Frustrated mood logged on ${thuStressDates.length} Thursday afternoons in the past 4 weeks. May be post-school fatigue.`
        )
      }
    }

    // ── Rule 4: Weekly positive milestone ────────────────────────
    if (week.length >= 5) {
      const avgStars = week.reduce((a, s) => a + s.stars, 0) / week.length
      if (avgStars >= 2.5) {
        if (!(await alreadyNotified(service, childId, 'positive', weekStartUTC))) {
          created += await insertNotifs(
            service, recipients, childId, 'positive',
            `Great week for ${child.name}! 🌟`,
            `Average of ${avgStars.toFixed(1)} stars across ${week.length} sessions. Excellent emotional regulation this week!`
          )
        }
      }
    }

    return NextResponse.json({ created })
  } catch (err) {
    console.error('notifications error:', err)
    return NextResponse.json({ created: 0 })
  }
}
