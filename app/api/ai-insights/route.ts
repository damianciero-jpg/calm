import { NextResponse, type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAdminAuth } from '@/lib/firebase-admin'

export const maxDuration = 30

const anthropic = new Anthropic()

type Session = { date: string; time: string; mood: string; stars: number; game?: string }

const MAX_SESSIONS = 200
const MAX_BODY_BYTES = 100 * 1024

// Best-effort, per-serverless-instance rate limit. Resets whenever the
// instance is recycled and does not coordinate across instances.
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const requestLog = new Map<string, number[]>()

function isRateLimited(uid: string): boolean {
  const now = Date.now()
  const timestamps = (requestLog.get(uid) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)

  if (timestamps.length >= RATE_LIMIT_MAX) {
    requestLog.set(uid, timestamps)
    return true
  }

  timestamps.push(now)
  requestLog.set(uid, timestamps)
  return false
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? ''
  const match = authHeader.match(/^Bearer (.+)$/)
  if (!match) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let uid: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(match[1])
    uid = decoded.uid
  } catch (err) {
    console.error('ai-insights auth verification failed:', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (isRateLimited(uid)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const rawBody = await request.text()
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 400 })
  }

  try {
    const { sessions, childName, childAge, iepGoals, mode } = JSON.parse(rawBody) as {
      sessions: Session[]
      childName?: string
      childAge?: number
      iepGoals?: string[]
      mode: 'parent' | 'therapist'
    }

    if (!Array.isArray(sessions) || sessions.length > MAX_SESSIONS) {
      return NextResponse.json({ error: 'Invalid sessions payload' }, { status: 400 })
    }

    let prompt: string

    if (mode === 'therapist') {
      const summary = sessions.map(s => `${s.date} ${s.time}: ${s.mood}, ${s.stars} stars`).join('; ')
      prompt = `You are a child behavioral therapist assistant analyzing a week of emotional wellness app data for a neurodivergent child or teen.

Child: ${childName}, age ${childAge}
Session data: ${summary}
IEP Goals: ${(iepGoals ?? []).join(', ')}

Return ONLY a JSON object (no markdown) with:
{
  "clinicalSummary": "2-3 sentence clinical summary for the therapist",
  "patterns": ["pattern 1", "pattern 2", "pattern 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "parentTalkingPoints": ["point 1", "point 2"]
}`
    } else {
      const summary = sessions
        .map(s => `${s.date} ${s.time}: mood=${s.mood}, stars=${s.stars}, game=${s.game ?? ''}`)
        .join('\n')
      prompt = `You are a compassionate child behavior analyst helping parents of neurodivergent kids and teens understand emotional wellness patterns.

Here is one week of mood and game data from the child's MoodQuest app:

${summary}

Analyze this data and return ONLY a JSON array (no markdown, no preamble) with 4 insight objects. Each object must have:
- "type": one of "positive", "warning", or "info"
- "title": short headline (max 8 words)
- "body": 1-2 sentences of warm, helpful, parent-friendly insight

Focus on: time-of-day patterns, day-of-week trends, mood sequences, and actionable suggestions. Be warm and supportive, never alarming.`
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content.find(b => b.type === 'text')
    const text = rawText?.type === 'text' ? rawText.text : (mode === 'therapist' ? '{}' : '[]')
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

    return NextResponse.json({ data: parsed })
  } catch (err) {
    console.error('ai-insights error:', err)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
