import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Guard: if env vars are missing (e.g. misconfigured deployment),
  // pass the request through rather than crashing the entire middleware.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Middleware: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.')
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    // Retrieve current authenticated Supabase session user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Protect /dashboard, /super-admin, /storefront
    const isProtectedRoute =
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/super-admin') ||
      pathname.startsWith('/storefront')

    if (isProtectedRoute && !user) {
      // Allow simulation header override ONLY in local development
      const isDev = process.env.NODE_ENV === 'development'
      const simRole = request.headers.get('x-simulated-role')

      if (!isDev || !simRole) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(url)
      }
    }

    // Redirect authenticated users away from login/register back to dashboard
    if ((pathname === '/login' || pathname === '/register') && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (err) {
    // Never let middleware crash the page — log and pass through
    console.error('Middleware error:', err)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files & images
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
