'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin/api';
import { card } from './ui';

type Role = 'owner' | 'operations' | 'accounts';
type StaffMember = { id: string; email: string; role: Role; you: boolean };

export const ROLE_INFO: Record<Role, { title: string; can: string }> = {
  owner: { title: 'Owner', can: 'Everything, including staff roles.' },
  operations: { title: 'Operations', can: 'Students, trips, drivers, vehicles, holidays and messages. No fees or accounts.' },
  accounts: { title: 'Accounts', can: 'Fees, expenses and reports. Can see the rest but not change trips.' },
};

/** Owners choose what each admin account can do. */
export default function StaffTab() {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void adminApi<{ staff: StaffMember[] }>('/api/admin/staff').then((result) => {
      if (result.ok) setStaff(result.staff);
      else setError(result.error);
    });
  }, []);

  const change = async (member: StaffMember, role: Role) => {
    setSaving(member.id);
    setError('');
    setNotice('');
    const result = await adminApi('/api/admin/staff', { method: 'PATCH', body: { id: member.id, role } });
    setSaving(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStaff((current) => current?.map((row) => (row.id === member.id ? { ...row, role } : row)) ?? null);
    setNotice(`${member.email} is now ${ROLE_INFO[role].title}.`);
  };

  return (
    <div className="space-y-6">
      <section className={card} aria-labelledby="staff-title">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Who can do what</p>
        <h2 id="staff-title" className="mt-1 text-xl font-semibold text-white">Staff roles</h2>
        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          {(Object.keys(ROLE_INFO) as Role[]).map((role) => (
            <div key={role} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <dt className="text-sm font-semibold text-white">{ROLE_INFO[role].title}</dt>
              <dd className="mt-1 text-xs text-zinc-400">{ROLE_INFO[role].can}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-zinc-500">The database enforces these roles, so they hold even outside this screen. There is always at least one owner.</p>
      </section>

      <section className={card} aria-label="Admin accounts">
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm text-red-200">{error}</p>}
        {notice && <p role="status" className="mb-4 text-sm text-emerald-200">{notice}</p>}
        {!staff ? (
          !error && <p className="text-sm text-zinc-500">Loading staff…</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {staff.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0 text-sm text-zinc-100">
                  {member.email}
                  {member.you && <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">You</span>}
                </span>
                <select
                  aria-label={`Role for ${member.email}`}
                  value={member.role}
                  disabled={saving === member.id}
                  onChange={(event) => void change(member, event.target.value as Role)}
                  className="min-h-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
                >
                  {(Object.keys(ROLE_INFO) as Role[]).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_INFO[role].title}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-zinc-500">New admin accounts are added in Supabase (the admin_users table) and start as Owner. Set their role here.</p>
      </section>
    </div>
  );
}
