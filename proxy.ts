import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  const supabaseContext = createClient(request)

  const { data: { user } } = await supabaseContext.supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname === '/login' || pathname === '/signup'
  const isAuthCallback = pathname.startsWith('/auth/')
  const isDebugAuth = pathname === '/debug-auth'

  if (!user && !isAuthPage && !isAuthCallback && !isDebugAuth) {
    const url = request.nextUrl.clone()
    const from = `${pathname}${request.nextUrl.search}`
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('error', 'missing_session')
    url.searchParams.set('from', from)
    url.searchParams.set('source', 'proxy')
    return NextResponse.redirect(url)
  }

  return supabaseContext.response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
