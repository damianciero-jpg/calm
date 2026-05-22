'use client'

export const CHILD_MODE_KEY = 'viada_child_mode'
export const CHILD_ID_KEY = 'viada_child_id'

export function isValidChildPin(pin: string) {
  return /^\d{4}$/.test(pin)
}

export async function hashChildPin(pin: string, parentId: string) {
  const input = new TextEncoder().encode(`${parentId}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function enterChildMode(childId: string) {
  localStorage.setItem(CHILD_MODE_KEY, '1')
  localStorage.setItem(CHILD_ID_KEY, childId)
}

export function exitChildMode() {
  localStorage.removeItem(CHILD_MODE_KEY)
  localStorage.removeItem(CHILD_ID_KEY)
}

export function isChildModeActive() {
  return typeof window !== 'undefined' && localStorage.getItem(CHILD_MODE_KEY) === '1'
}
