'use client'

export const CHILD_MODE_KEY = 'viada_child_mode'
export const CHILD_ID_KEY = 'viada_child_id'
export const CHILD_GAME_MODE_KEY = 'viada_child_game_mode'

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

export function enterChildMode(childId: string, gameMode: 'kids' | 'teen' | string = 'kids') {
  localStorage.setItem(CHILD_MODE_KEY, '1')
  localStorage.setItem(CHILD_ID_KEY, childId)
  localStorage.setItem(CHILD_GAME_MODE_KEY, gameMode)
  document.cookie = `${CHILD_MODE_KEY}=1; path=/; max-age=86400; SameSite=Lax`
  document.cookie = `${CHILD_ID_KEY}=${encodeURIComponent(childId)}; path=/; max-age=86400; SameSite=Lax`
  document.cookie = `${CHILD_GAME_MODE_KEY}=${encodeURIComponent(gameMode)}; path=/; max-age=86400; SameSite=Lax`
}

export function exitChildMode() {
  localStorage.removeItem(CHILD_MODE_KEY)
  localStorage.removeItem(CHILD_ID_KEY)
  localStorage.removeItem(CHILD_GAME_MODE_KEY)
  document.cookie = `${CHILD_MODE_KEY}=; path=/; max-age=0; SameSite=Lax`
  document.cookie = `${CHILD_ID_KEY}=; path=/; max-age=0; SameSite=Lax`
  document.cookie = `${CHILD_GAME_MODE_KEY}=; path=/; max-age=0; SameSite=Lax`
}

export function isChildModeActive() {
  return typeof window !== 'undefined' && localStorage.getItem(CHILD_MODE_KEY) === '1'
}
