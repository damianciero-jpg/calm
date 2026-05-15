/**
 * Viada seed script — Phase 2
 * Run AFTER applying supabase/schema.sql in Supabase Studio.
 *
 *   npm run seed
 *
 * Creates two test accounts and populates the database with realistic data
 * matching the existing UI mock data. Safe to re-run (idempotent).
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Test credentials ──────────────────────────────────────────
const PARENT_EMAIL    = 'parent@test.calmpath'
const THERAPIST_EMAIL = 'therapist@test.calmpath'
const TEST_PASSWORD   = 'CalmPath123!'

// ── Game → World map ─────────────────────────────────────────
const GAME_WORLDS: Record<string, string> = {
  'Star Collector':  'Sunshine Meadow',
  'Bubble Breath':   'Whispering Forest',
  'Cloud Catcher':   'Cloudy Cove',
  'Volcano Stomp':   'Volcano Valley',
  'Rainbow Painter': 'Rainy Rainbow',
  'Dream Catch':     'Sleepy Clouds',
}

// Compute a timestamp for the current week (Monday = day 0)
function weekTimestamp(dayLabel: string, timeStr: string): string {
  const dayIndex: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  }
  // Monday of the current week
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const target = new Date(monday)
  target.setDate(monday.getDate() + (dayIndex[dayLabel] ?? 0))

  // Parse "3:45 PM" → hours/minutes
  const [timePart, meridiem] = timeStr.split(' ')
  let [h, m] = timePart.split(':').map(Number)
  if (meridiem === 'PM' && h !== 12) h += 12
  if (meridiem === 'AM' && h === 12) h = 0
  target.setHours(h, m, 0, 0)

  return target.toISOString()
}

// ── Raw session data (mirrors mock data in existing UI components) ──
const JORDAN_SESSIONS = [
  { date: 'Mon', mood: 'happy',   stars: 3, time: '3:45 PM', game: 'Star Collector'  },
  { date: 'Mon', mood: 'calm',    stars: 3, time: '4:10 PM', game: 'Bubble Breath'   },
  { date: 'Tue', mood: 'anxious', stars: 2, time: '8:12 AM', game: 'Cloud Catcher'   },
  { date: 'Tue', mood: 'angry',   stars: 1, time: '3:55 PM', game: 'Volcano Stomp'   },
  { date: 'Tue', mood: 'anxious', stars: 2, time: '5:30 PM', game: 'Cloud Catcher'   },
  { date: 'Wed', mood: 'happy',   stars: 3, time: '9:00 AM', game: 'Star Collector'  },
  { date: 'Wed', mood: 'calm',    stars: 3, time: '2:20 PM', game: 'Bubble Breath'   },
  { date: 'Thu', mood: 'sad',     stars: 2, time: '7:45 AM', game: 'Rainbow Painter' },
  { date: 'Thu', mood: 'tired',   stars: 1, time: '3:30 PM', game: 'Dream Catch'     },
  { date: 'Thu', mood: 'angry',   stars: 2, time: '6:00 PM', game: 'Volcano Stomp'   },
  { date: 'Fri', mood: 'happy',   stars: 3, time: '8:30 AM', game: 'Star Collector'  },
  { date: 'Fri', mood: 'calm',    stars: 3, time: '4:00 PM', game: 'Bubble Breath'   },
  { date: 'Sat', mood: 'happy',   stars: 3, time: '10:15 AM', game: 'Star Collector' },
  { date: 'Sat', mood: 'happy',   stars: 3, time: '2:00 PM', game: 'Star Collector'  },
  { date: 'Sun', mood: 'calm',    stars: 3, time: '11:00 AM', game: 'Bubble Breath'  },
] as const

const MIA_SESSIONS = [
  { date: 'Mon', mood: 'calm',    stars: 3, time: '9:00 AM',  game: 'Bubble Breath'   },
  { date: 'Mon', mood: 'happy',   stars: 3, time: '3:00 PM',  game: 'Star Collector'  },
  { date: 'Tue', mood: 'sad',     stars: 2, time: '8:00 AM',  game: 'Rainbow Painter' },
  { date: 'Tue', mood: 'anxious', stars: 1, time: '4:00 PM',  game: 'Cloud Catcher'   },
  { date: 'Wed', mood: 'happy',   stars: 3, time: '10:00 AM', game: 'Star Collector'  },
  { date: 'Thu', mood: 'calm',    stars: 3, time: '9:30 AM',  game: 'Bubble Breath'   },
  { date: 'Thu', mood: 'angry',   stars: 1, time: '3:45 PM',  game: 'Volcano Stomp'   },
  { date: 'Fri', mood: 'happy',   stars: 3, time: '8:00 AM',  game: 'Star Collector'  },
  { date: 'Sat', mood: 'calm',    stars: 3, time: '11:00 AM', game: 'Bubble Breath'   },
] as const

const ELI_SESSIONS = [
  { date: 'Mon', mood: 'angry',   stars: 1, time: '7:50 AM', game: 'Volcano Stomp'  },
  { date: 'Mon', mood: 'anxious', stars: 2, time: '3:30 PM', game: 'Cloud Catcher'  },
  { date: 'Tue', mood: 'calm',    stars: 3, time: '9:00 AM', game: 'Bubble Breath'  },
  { date: 'Wed', mood: 'angry',   stars: 1, time: '7:45 AM', game: 'Volcano Stomp'  },
  { date: 'Wed', mood: 'tired',   stars: 2, time: '3:00 PM', game: 'Dream Catch'    },
  { date: 'Thu', mood: 'happy',   stars: 3, time: '10:00 AM', game: 'Star Collector'},
  { date: 'Fri', mood: 'anxious', stars: 2, time: '8:00 AM', game: 'Cloud Catcher'  },
  { date: 'Fri', mood: 'angry',   stars: 1, time: '3:45 PM', game: 'Volcano Stomp'  },
  { date: 'Sat', mood: 'happy',   stars: 3, time: '9:00 AM', game: 'Star Collector' },
] as const

// ── Helpers ───────────────────────────────────────────────────
async function getOrCreateUser(email: string, name: string, role: string) {
  // Check if user already exists
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) throw listErr

  const existing = users.find(u => u.email === email)
  if (existing) {
    console.log(`  → Found existing user: ${email}`)
    return existing.id
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name, role },
  })
  if (error) throw error
  console.log(`  → Created user: ${email}`)
  return data.user.id
}

function ok(label: string, error: unknown) {
  if (error) {
    console.error(`  ✗ ${label}:`, (error as Error).message ?? error)
    return false
  }
  console.log(`  ✓ ${label}`)
  return true
}

// ── Main ──────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Viada seed script\n')

  // 1. Create test users (trigger auto-creates profiles)
  console.log('Creating test users…')
  const parentId    = await getOrCreateUser(PARENT_EMAIL,    'Lisa Mitchell', 'parent')
  const therapistId = await getOrCreateUser(THERAPIST_EMAIL, 'Dr. Chen',      'therapist')

  // 1b. Ensure profiles exist — handles users created before the DB trigger was installed
  console.log('\nEnsuring profiles…')
  const { error: pe1 } = await supabase.from('profiles').upsert(
    { id: parentId,    role: 'parent',    full_name: 'Lisa Mitchell' },
    { onConflict: 'id' }
  )
  ok('Parent profile', pe1)
  const { error: pe2 } = await supabase.from('profiles').upsert(
    { id: therapistId, role: 'therapist', full_name: 'Dr. Chen' },
    { onConflict: 'id' }
  )
  ok('Therapist profile', pe2)

  // 2. Clear existing seed children for idempotency
  console.log('\nClearing previous seed children…')
  await supabase.from('children').delete().eq('parent_id', parentId)

  // 3. Create children
  console.log('\nCreating children…')

  const { data: jordan, error: j1 } = await supabase.from('children').insert({
    parent_id: parentId, therapist_id: therapistId,
    name: 'Jordan', age: 8, avatar: '👦', color: '#6366F1',
  }).select('id').single()
  ok('Jordan', j1)

  const { data: mia, error: j2 } = await supabase.from('children').insert({
    parent_id: parentId, therapist_id: therapistId,
    name: 'Mia', age: 6, avatar: '👧', color: '#EC4899',
  }).select('id').single()
  ok('Mia', j2)

  const { data: eli, error: j3 } = await supabase.from('children').insert({
    parent_id: parentId, therapist_id: therapistId,
    name: 'Eli', age: 10, avatar: '🧒', color: '#F59E0B',
  }).select('id').single()
  ok('Eli', j3)

  if (!jordan || !mia || !eli) {
    console.error('\n✗ Child creation failed — aborting.')
    process.exit(1)
  }

  // 4. Insert sessions
  console.log('\nInserting sessions…')

  type RawSession = { date: string; mood: string; stars: number; time: string; game: string }
  const toRow = (childId: string) => (s: RawSession) => ({
    child_id:  childId,
    mood:      s.mood,
    stars:     s.stars,
    game:      s.game,
    world:     GAME_WORLDS[s.game] ?? '',
    played_at: weekTimestamp(s.date, s.time),
    day_label: s.date, // also set by DB trigger
  })

  const { error: se1 } = await supabase.from('sessions').insert(JORDAN_SESSIONS.map(toRow(jordan.id)))
  ok(`Jordan sessions (${JORDAN_SESSIONS.length})`, se1)

  const { error: se2 } = await supabase.from('sessions').insert(MIA_SESSIONS.map(toRow(mia.id)))
  ok(`Mia sessions (${MIA_SESSIONS.length})`, se2)

  const { error: se3 } = await supabase.from('sessions').insert(ELI_SESSIONS.map(toRow(eli.id)))
  ok(`Eli sessions (${ELI_SESSIONS.length})`, se3)

  // 5. Insert IEP goals
  console.log('\nInserting IEP goals…')

  const jordanGoals = [
    { child_id: jordan.id, label: 'Emotional regulation', score: 4, max_score: 5 },
    { child_id: jordan.id, label: 'Communication',        score: 3, max_score: 5 },
    { child_id: jordan.id, label: 'Social skills',        score: 3, max_score: 5 },
    { child_id: jordan.id, label: 'Sensory tolerance',    score: 4, max_score: 5 },
  ]
  const miaGoals = [
    { child_id: mia.id, label: 'Emotional regulation', score: 3, max_score: 5 },
    { child_id: mia.id, label: 'Communication',        score: 4, max_score: 5 },
    { child_id: mia.id, label: 'Social skills',        score: 2, max_score: 5 },
    { child_id: mia.id, label: 'Sensory tolerance',    score: 3, max_score: 5 },
  ]
  const eliGoals = [
    { child_id: eli.id, label: 'Emotional regulation', score: 2, max_score: 5 },
    { child_id: eli.id, label: 'Communication',        score: 3, max_score: 5 },
    { child_id: eli.id, label: 'Social skills',        score: 3, max_score: 5 },
    { child_id: eli.id, label: 'Sensory tolerance',    score: 2, max_score: 5 },
  ]

  const { error: ge1 } = await supabase.from('iep_goals').insert(jordanGoals)
  ok('Jordan IEP goals (4)', ge1)
  const { error: ge2 } = await supabase.from('iep_goals').insert(miaGoals)
  ok('Mia IEP goals (4)', ge2)
  const { error: ge3 } = await supabase.from('iep_goals').insert(eliGoals)
  ok('Eli IEP goals (4)', ge3)

  // 6. Insert therapist note for Jordan
  console.log('\nInserting therapist notes…')
  const { error: ne1 } = await supabase.from('therapist_notes').insert({
    child_id:     jordan.id,
    therapist_id: therapistId,
    content:      'Jordan responds well to morning sessions. Afternoon frustration patterns noted on school days. Star Collector appears to be a preferred regulation tool.',
    week_of:      new Date().toISOString().split('T')[0],
  })
  ok('Jordan therapist note', ne1)

  const { error: ne2 } = await supabase.from('therapist_notes').insert({
    child_id:     eli.id,
    therapist_id: therapistId,
    content:      'Eli shows a consistent Monday morning frustration pattern. Peer interactions at school may be a trigger. Recommend parent check-in on Monday mornings.',
    week_of:      new Date().toISOString().split('T')[0],
  })
  ok('Eli therapist note', ne2)

  // 7. Seed notifications for parent
  console.log('\nInserting notifications…')
  const notifs = [
    {
      recipient_id: parentId,
      child_id: jordan.id,
      type: 'alert' as const,
      title: `Jordan had 5 stress sessions this week`,
      body:  'Elevated frustration and worry patterns detected. Consider checking in.',
      read:  false,
    },
    {
      recipient_id: parentId,
      child_id: jordan.id,
      type: 'pattern' as const,
      title: 'Thursday afternoon trend — Jordan',
      body:  'Frustrated mood logged Thursday evenings. May be post-school fatigue.',
      read:  true,
    },
    {
      recipient_id: parentId,
      child_id: mia.id,
      type: 'positive' as const,
      title: `Great week for Mia! 🌟`,
      body:  `Average of 2.7 stars across 9 sessions. Keep it up!`,
      read:  true,
    },
    {
      recipient_id: therapistId,
      child_id: eli.id,
      type: 'alert' as const,
      title: 'Morning stress pattern for Eli',
      body:  '3 difficult morning sessions detected. May align with school schedule.',
      read:  false,
    },
  ]
  const { error: notifErr } = await supabase.from('notifications').insert(notifs)
  ok(`Notifications (${notifs.length})`, notifErr)

  // ── Summary ──────────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Seed complete!

Test accounts:
  Parent     → ${PARENT_EMAIL}
  Therapist  → ${THERAPIST_EMAIL}
  Password   → ${TEST_PASSWORD}

Data seeded:
  3 children (Jordan, Mia, Eli)
  ${JORDAN_SESSIONS.length + MIA_SESSIONS.length + ELI_SESSIONS.length} sessions total
  12 IEP goals (4 per child)
  2 therapist notes
  ${notifs.length} notifications

Next steps:
  1. Open Supabase Studio → Table Editor → verify data
  2. Test RLS: log in as parent, query sessions — should see only own children's data
  3. Run: npx supabase gen types typescript --project-id pvxhlvsoshtbcwpgfixs > types/database.ts
     (requires SUPABASE_ACCESS_TOKEN env var or 'npx supabase login' first)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
}

seed().catch(err => {
  console.error('\n✗ Seed failed:', err.message ?? err)
  process.exit(1)
})
