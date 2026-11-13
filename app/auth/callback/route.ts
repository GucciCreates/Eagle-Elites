import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data: sessionData, error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/auth/login?error=${encodeURIComponent(error.message)}`,
          requestUrl.origin,
        ),
      );
    }

    const user = sessionData?.user;
    if (user?.email) {
      const profileName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email.split('@')[0] ||
        'New student';

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email,
          full_name: profileName,
          role: 'student',
          status: 'incomplete',
        },
        { onConflict: 'id' },
      );

      if (profileError) {
        console.error('Google profile upsert failed:', profileError.message);
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
