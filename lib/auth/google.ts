'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

export type AuthPortal = 'student' | 'admin' | 'driver';

/**
 * Starts Google OAuth. /auth/callback decides where the user lands:
 * admins and drivers to their dashboards, new students to onboarding,
 * returning students to the step that matches their application status.
 */
export async function startGoogleSignIn(
  supabase: SupabaseClient,
  portal: AuthPortal = 'student',
) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?portal=${portal}`,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}
