import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/setup?onboarding=true'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.session) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      const targetPath = next.startsWith('/') ? next : '/setup?onboarding=true'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${targetPath}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${targetPath}`)
      } else {
        return NextResponse.redirect(`${origin}${targetPath}`)
      }
    }
  }

  // Return the user to login page with notice if session exchange failed
  return NextResponse.redirect(`${origin}/login?error=auth-failed`)
}
