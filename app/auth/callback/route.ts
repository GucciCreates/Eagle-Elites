import { NextResponse } from 'next/server';
import { getPostLoginPath } from '@/lib/auth/post-login-path';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type Portal = 'student' | 'admin' | 'driver';

function loginPath(portal: Portal, reason: string) {
  const path = portal === 'admin'
    ? '/admin/login'
    : portal === 'driver'
      ? '/driver/login'
      : '/auth/login';
  return `${path}?auth=${reason}`;
}

function redirect(origin: string, path: string) {
  const response = NextResponse.redirect(new URL(path, origin));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedPortal = url.searchParams.get('portal');
  const portal: Portal =
    requestedPortal === 'admin' || requestedPortal === 'driver'
      ? requestedPortal
      : 'student';
  const code = url.searchParams.get('code');

  if (!code) return redirect(url.origin, loginPath(portal, 'google_failed'));

  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } =
    await supabase.auth.exchangeCodeForSession(code);
  const user = authData.user;

  if (authError || !user) return redirect(url.origin, loginPath(portal, 'google_failed'));

  if (portal === 'admin') {
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !admin) {
      await supabase.auth.signOut();
      return redirect(url.origin, loginPath('admin', 'admin_only'));
    }
    return redirect(url.origin, '/admin/dashboard');
  }

  if (portal === 'driver') {
    const { data: driver, error } = await supabase
      .from('drivers')
      .select('id')
      .eq('id', user.id)
      .eq('active', true)
      .maybeSingle();

    if (error || !driver) {
      await supabase.auth.signOut();
      return redirect(url.origin, loginPath('driver', 'driver_only'));
    }
    return redirect(url.origin, '/driver/dashboard');
  }

  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (adminError) {
    await supabase.auth.signOut();
    return redirect(url.origin, loginPath('student', 'setup_failed'));
  }
  if (admin) return redirect(url.origin, '/admin/dashboard');

  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .select('id')
    .eq('id', user.id)
    .eq('active', true)
    .maybeSingle();
  if (driverError) {
    await supabase.auth.signOut();
    return redirect(url.origin, loginPath('student', 'setup_failed'));
  }
  if (driver) return redirect(url.origin, '/driver/dashboard');

  if (user.user_metadata?.account_type === 'driver') {
    await supabase.auth.signOut();
    return redirect(url.origin, loginPath('driver', 'driver_only'));
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, status, full_name')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) {
    await supabase.auth.signOut();
    return redirect(url.origin, loginPath('student', 'setup_failed'));
  }

  const fullName = String(
    user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Eagle Elites student',
  ).trim();

  if (!profile) {
    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email ?? '',
      full_name: fullName,
      role: 'student',
      status: 'incomplete',
    });
    if (error) {
      await supabase.auth.signOut();
      return redirect(url.origin, loginPath('student', 'setup_failed'));
    }
    return redirect(url.origin, '/onboarding/profile');
  }

  if (profile.role !== 'student') {
    await supabase.auth.signOut();
    return redirect(url.origin, loginPath('student', 'google_failed'));
  }

  if (!profile.full_name && fullName) {
    await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);
  }

  return redirect(url.origin, getPostLoginPath(profile.status));
}
