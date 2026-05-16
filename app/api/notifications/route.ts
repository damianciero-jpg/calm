import { NextResponse } from 'next/server'

export const maxDuration = 15

export async function POST() {
  return NextResponse.json({ created: 0 })
}
