// Supabase Edge Function — triggered by a Database Webhook on sessions INSERT
//
// Deploy:
//   supabase functions deploy on-session-insert --project-ref pvxhlvsoshtbcwpgfixs
//
// Then in Supabase Dashboard → Database → Webhooks → Create webhook:
//   Table: sessions   Event: INSERT
//   Type: Supabase Edge Functions   Function: on-session-insert

import { createClient } from 'jsr:@supabase/supabase-js@2'

const STRESS = ['anxious', 'angry', 'sad']

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    // Database webhook sends { type, table, schema, record, old_record }
    const childId: string | undefined = payload?.record?.child_id ?? payload?.childId
    if (!childId) return Response.json({ created: 0 })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: child } = await supabase
      .from('children')
      .select('id, name, parent_id, therapist_id')
      .eq('id', childId)
      .single()
    if (!child) return Response.json({ created: 0 })

    const recipients = [child.parent_id as string | null, child.therapist_id as string | null]
      .filter(Boolean) as string[]

    const nowUTC = new Date()
    const todayUTC = new Date(nowUTC); todayUTC.setUTCHours(0, 0, 0, 0)
    const dow = nowUTC.getUTCDay()
    const weekStartUTC = new Date(nowUTC)
    weekStartUTC.setUTCDate(nowUTC.getUTCDate() - (dow === 0 ? 6 : dow - 1))
    weekStartUTC.setUTCHours(0, 0, 0, 0)
    const fourWeeksAgo = new Date(todayUTC); fourWeeksAgo.setUTCDate(todayUTC.getUTCDate() - 28)

    const [{ data: t }, { data: w }, { data: h }] = await Promise.all([
      supabase.from('sessions').select('mood, stars, played_at, day_label').eq('child_id', childId).gte('played_at', todayUTC.toISOString()),
      supabase.from('sessions').select('mood, stars, played_at, day_label').eq('child_id', childId).gte('played_at', weekStartUTC.toISOString()),
      supabase.from('sessions').select('mood, stars, played_at, day_label').eq('child_id', childId).gte('played_at', fourWeeksAgo.toISOString()),
    ])

    type Row = { mood: string; stars: number; played_at: string; day_label: string }
    const today = (t ?? []) as Row[], week = (w ?? []) as Row[], hist = (h ?? []) as Row[]
    let created = 0

    const alreadyNotified = async (type: string, since: Date, titleLike?: string) => {
      // deno-lint-ignore no-explicit-any
      let q: any = supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('child_id', childId).eq('type', type).gte('created_at', since.toISOString())
      if (titleLike) q = q.ilike('title', `%${titleLike}%`)
      const { count } = await q
      return (count ?? 0) > 0
    }

    const insert = async (type: string, title: string, body: string) => {
      if (!recipients.length) return 0
      const rows = recipients.map(recipient_id => ({ recipient_id, child_id: childId, type, title, body }))
      const { error } = await supabase.from('notifications').insert(rows)
      return error ? 0 : rows.length
    }

    // Rule 1: 3+ stress sessions today
    const stressToday = today.filter(s => STRESS.includes(s.mood))
    if (stressToday.length >= 3 && !(await alreadyNotified('alert', todayUTC))) {
      created += await insert('alert',
        `${child.name} had ${stressToday.length} stress sessions today`,
        'Elevated frustration and worry patterns detected. Consider checking in with your child.')
    }

    // Rule 2: Monday morning stress pattern
    const monDates = [...new Set(
      hist.filter(s => s.day_label === 'Mon' && new Date(s.played_at).getUTCHours() < 14 && STRESS.includes(s.mood))
          .map(s => s.played_at.slice(0, 10))
    )]
    if (monDates.length >= 2 && !(await alreadyNotified('pattern', weekStartUTC, 'Monday'))) {
      created += await insert('pattern',
        `Monday morning stress pattern — ${child.name}`,
        `Stress sessions on ${monDates.length} Monday mornings in the past 4 weeks. May align with school start-of-week anxiety.`)
    }

    // Rule 3: Thursday afternoon stress pattern
    const thuDates = [...new Set(
      hist.filter(s => s.day_label === 'Thu' && new Date(s.played_at).getUTCHours() >= 14 && STRESS.includes(s.mood))
          .map(s => s.played_at.slice(0, 10))
    )]
    if (thuDates.length >= 2 && !(await alreadyNotified('pattern', weekStartUTC, 'Thursday'))) {
      created += await insert('pattern',
        `Thursday afternoon trend — ${child.name}`,
        `Frustrated mood on ${thuDates.length} Thursday afternoons in the past 4 weeks. May be post-school fatigue.`)
    }

    // Rule 4: Weekly positive milestone
    if (week.length >= 5) {
      const avg = week.reduce((a, s) => a + s.stars, 0) / week.length
      if (avg >= 2.5 && !(await alreadyNotified('positive', weekStartUTC))) {
        created += await insert('positive',
          `Great week for ${child.name}! 🌟`,
          `Average of ${avg.toFixed(1)} stars across ${week.length} sessions. Excellent emotional regulation this week!`)
      }
    }

    return Response.json({ created })
  } catch (err) {
    console.error(err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
})
