import { createClient as createBrowserSupabaseClient } from '@/utils/supabase/client'

export function createClient() {
  return createBrowserSupabaseClient()
}
