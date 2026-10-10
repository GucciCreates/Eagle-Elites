'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type DepartureGroup = {
  id: string;
  university: string;
  department: string;
  description: string;
};

const PICKUP_AREAS = [
  'B-17',
  'D-17',
  'E-11',
  'F-10',
  'F-11',
  'G-11',
  'G-13',
  'I-8',
  'I-10',
  'Bahria Town',
  'Rawalpindi Saddar',
  'Rawalpindi Cantt',
  'Other',
];

export default function OnboardingProfile() {
  const [userType, setUserType] = useState('student');
  const [departureGroups, setDepartureGroups] = useState<DepartureGroup[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [pickupArea, setPickupArea] = useState('');
  const [preferredMorning, setPreferredMorning] = useState('');
  const [preferredEvening, setPreferredEvening] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchGroups = async () => {
      const { data } = await supabase
        .from('departure_groups')
        .select('*')
        .eq('active', true)
        .order('university');

      if (data) setDepartureGroups(data as DepartureGroup[]);
      setGroupsLoading(false);
    };

    void fetchGroups();
  }, [supabase]);

  const universities = Array.from(
    new Set(departureGroups.map((group) => group.university)),
  );
  const departments = departureGroups.filter(
    (group) => group.university === selectedUniversity,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedDepartmentId) {
      setError('Please select your university and department.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/auth/login');
        return;
      }

      const selectedGroup = departureGroups.find(
        (group) => group.id === selectedDepartmentId,
      );

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          user_type: userType,
          institution: selectedGroup?.university || '',
          cnic_last4: idNumber,
          phone,
          pickup_area: pickupArea,
          preferred_morning: preferredMorning || null,
          preferred_evening: preferredEvening || null,
          departure_group_id: selectedDepartmentId,
          status: 'payment_pending',
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      router.push('/onboarding/payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070b] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_28%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/10 bg-[#0b1018]/80 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative hidden overflow-hidden border-r border-white/10 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.2),_transparent_30%),linear-gradient(135deg,_rgba(17,24,39,0.95),_rgba(10,13,20,0.98))] p-8 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px]" />
            <div className="relative">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-xl font-black text-black shadow-[0_18px_40px_rgba(250,204,21,0.45)]">
                EE
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-yellow-300/80">
                Eagle Elites
              </p>
              <h1 className="mt-5 max-w-xs text-4xl font-black leading-tight text-white">
                Complete your profile.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-300">
                Select your university and department to unlock the correct
                departure slots.
              </p>
            </div>

            <div className="relative grid gap-3 text-sm text-zinc-200">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  Quick steps
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-white">Profile setup</span>
                  <span className="text-yellow-300">02/03</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full p-6 sm:p-8 lg:p-10">
            <div className="mb-8 text-center lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-yellow-300/80">
                Onboarding
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                Complete your profile
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Step 2 of 3 — Tell us about yourself
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0f1724]/80 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:p-6">
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-200">
                  <span className="text-base">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    I am a
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['student', 'faculty'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setUserType(type)}
                        className={`rounded-xl border py-3 text-sm font-semibold transition-all ${
                          userType === type
                            ? 'border-yellow-400 bg-yellow-400 text-black'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500'
                        }`}
                      >
                        {type === 'student'
                          ? '🎓 Student'
                          : '👨‍🏫 Faculty / Staff'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    University / Institution
                  </label>
                  {groupsLoading ? (
                    <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-sm text-zinc-400">
                      Loading universities...
                    </div>
                  ) : universities.length === 0 ? (
                    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
                      No universities added yet. Please contact admin to add
                      your institution.
                    </div>
                  ) : (
                    <select
                      value={selectedUniversity}
                      onChange={(event) => {
                        setSelectedUniversity(event.target.value);
                        setSelectedDepartmentId('');
                      }}
                      required
                      className="w-full rounded-2xl border border-zinc-700/80 bg-zinc-900/80 px-4 py-3.5 text-white focus:border-yellow-400/80 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                    >
                      <option value="">Select your university...</option>
                      {universities.map((university) => (
                        <option key={university} value={university}>
                          {university}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedUniversity && departments.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">
                      Department / Program
                    </label>
                    <div className="space-y-2">
                      {departments.map((dept) => (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => setSelectedDepartmentId(dept.id)}
                          className={`flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                            selectedDepartmentId === dept.id
                              ? 'border-yellow-400/50 bg-yellow-400/10'
                              : 'border-zinc-700/80 bg-zinc-800/80 hover:border-zinc-500'
                          }`}
                        >
                          <div>
                            <div className="font-medium text-white">
                              {dept.department}
                            </div>
                            {dept.description && (
                              <div className="mt-1 text-xs text-zinc-400">
                                {dept.description}
                              </div>
                            )}
                          </div>
                          {selectedDepartmentId === dept.id && (
                            <span className="text-lg text-yellow-300">✓</span>
                          )}
                        </button>
                      ))}
                    </div>

                    {selectedDepartmentId && (
                      <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                        ✓ You will be assigned to: {selectedUniversity} —{' '}
                        {
                          departments.find((d) => d.id === selectedDepartmentId)
                            ?.department
                        }
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="idNumber"
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    {userType === 'student'
                      ? 'Enrollment Number'
                      : 'Employee / Faculty Code'}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      🪪
                    </span>
                    <input
                      id="idNumber"
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-zinc-700/80 bg-zinc-900/80 pl-10 pr-4 py-3.5 text-white placeholder-zinc-500 focus:border-yellow-400/80 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                      placeholder={
                        userType === 'student'
                          ? 'e.g. 01-235678-001'
                          : 'e.g. FAC-2024-045'
                      }
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      📞
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-zinc-700/80 bg-zinc-900/80 pl-10 pr-4 py-3.5 text-white placeholder-zinc-500 focus:border-yellow-400/80 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                      placeholder="03XX-XXXXXXX"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="pickupArea"
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Your Area / Pickup Zone
                  </label>
                  <select
                    id="pickupArea"
                    value={pickupArea}
                    onChange={(e) => setPickupArea(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-zinc-700/80 bg-zinc-900/80 px-4 py-3.5 text-white focus:border-yellow-400/80 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                  >
                    <option value="">Select your area...</option>
                    {PICKUP_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="preferredMorning"
                      className="mb-2 block text-sm font-medium text-zinc-300"
                    >
                      🌅 Morning Pickup
                    </label>
                    <input
                      id="preferredMorning"
                      type="time"
                      value={preferredMorning}
                      onChange={(e) => setPreferredMorning(e.target.value)}
                      className="w-full rounded-2xl border border-zinc-700/80 bg-zinc-900/80 px-3 py-3 text-white focus:border-yellow-400/80 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="preferredEvening"
                      className="mb-2 block text-sm font-medium text-zinc-300"
                    >
                      🌆 Evening Return
                    </label>
                    <input
                      id="preferredEvening"
                      type="time"
                      value={preferredEvening}
                      onChange={(e) => setPreferredEvening(e.target.value)}
                      className="w-full rounded-2xl border border-zinc-700/80 bg-zinc-900/80 px-3 py-3 text-white focus:border-yellow-400/80 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                    />
                  </div>
                </div>

                <p className="text-xs text-zinc-500">
                  Preferred times help admin assign you to the right route.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-4 py-3.5 font-semibold text-black shadow-[0_14px_30px_rgba(250,204,21,0.35)] hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Payment</span>
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-6 text-center text-xs text-zinc-600">
              Eagle Elites Transport © 2026 · All rights reserved
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
