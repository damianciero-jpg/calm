import { NextResponse, type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 30

const anthropic = new Anthropic()

type Session = { date: string; time: string; mood: string; stars: number; game?: string }

export async function POST(request: NextRequest) {
  try {
    const { sessions, childName, childAge, iepGoals, mode } = await request.json() as {
      sessions: Session[]
      childName?: string
      childAge?: number
      iepGoals?: string[]
      mode: 'parent' | 'therapist'
    }

    let prompt: string

    if (mode === 'therapist') {
      const summary = sessions.map(s => `${s.date} ${s.time}: ${s.mood}, ${s.stars} stars`).join('; ')
      prompt = `You are a child behavioral therapist assistant analyzing a week of app data for a child with autism.

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
      prompt = `You are a compassionate child behavior analyst helping parents of children with autism understand their child's emotional patterns.

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
