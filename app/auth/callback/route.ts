import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const role = data.user.user_metadata?.role

      if (role === 'parent') {
        const metadata = data.user.user_metadata
        const childName = typeof metadata?.child_name === 'string' ? metadata.child_name.trim() : ''
        const childAge = Number(metadata?.child_age)

        if (childName && Number.isFinite(childAge)) {
          const { data: existingChildren, error: existingError } = await supabase
            .from('children')
            .select('id')
            .eq('parent_id', data.user.id)
            .limit(1)

          if (!existingError && (existingChildren?.length ?? 0) === 0) {
            const { error: childError } = await supabase.from('children').insert({
              parent_id: data.user.id,
              name: childName,
              age: childAge,
              avatar: typeof metadata?.child_avatar === 'string' ? metadata.child_avatar : 'ðŸ‘¦',
              color: typeof metadata?.child_color === 'string' ? metadata.child_color : '#6366F1',
              game_mode: 'kids',
            })

            if (childError) {
              console.error('Auth callback child profile insert failed', childError)
            }
          } else if (existingError) {
            console.error('Auth callback child profile lookup failed', existingError)
          }
        }
      }

      const redirectTo = role === 'therapist' ? '/patients' : next
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
