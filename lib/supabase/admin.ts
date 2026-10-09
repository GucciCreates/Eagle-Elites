import { createClient } from '@/lib/supabase/client';

export async function isAdmin(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return false;

  const { data } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', session.user.id)
    .single();

  return !!data;
}

export async function requireAdmin(): Promise<boolean> {
  const admin = await isAdmin();
  if (!admin && typeof window !== 'undefined') {
    window.location.href = '/admin/login';
  }
  return admin;
}
