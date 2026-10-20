'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/auth/auth-shell';
import {
  Alert,
  Field,
  SubmitButton,
  inputClass,
} from '@/components/auth/form-ui';
import Stepper from '@/components/onboarding/stepper';
import FilePicker from '@/components/onboarding/file-picker';
import TimeSelect from '@/components/time-select';
import { normalizePkPhone } from '@/lib/phone';
import { fetchTimeOptionsForGroup, type TimeOption } from '@/lib/time-options';
import {
  amountDue,
  formatPkr,
  monthlyFee,
  RESERVATION_FEE,
  AC_SURCHARGE,
} from '@/lib/onboarding/pricing';
import { clearDraft, loadDraft, useSaveDraft } from '@/lib/onboarding/draft';
import { friendlyOnboardingError } from '@/lib/onboarding/errors';
import { findRejectionReason } from '@/lib/onboarding/rejection-reasons';
import { uploadPath } from '@/lib/upload/compress';

type DepartureGroup = {
  id: string;
  university: string;
  department: string;
  description: string | null;
};
type Route = { id: string; name: string; price: number };
type PickupPoint = { id: string; route_id: string | null; name: string };
type Availability = {
  route_id: string;
  seat_capacity: number | null;
  seats_left: number | null;
};

type Form = {
  userType: 'student' | 'faculty';
  university: string;
  departmentId: string;
  idNumber: string;
  phone: string;
  whatsappOptIn: boolean;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: string;
  routeId: string;
  wantsAc: boolean;
  pickupPointId: string;
  pickupArea: string;
  pickupOther: string;
  preferredMorning: string;
  preferredEvening: string;
};

const EMPTY: Form = {
  userType: 'student',
  university: '',
  departmentId: '',
  idNumber: '',
  phone: '',
  whatsappOptIn: true,
  guardianName: '',
  guardianPhone: '',
  guardianRelation: '',
  routeId: '',
  wantsAc: false,
  pickupPointId: '',
  pickupArea: '',
  pickupOther: '',
  preferredMorning: '',
  preferredEvening: '',
};

const selectClass = `${inputClass} border-zinc-700/80 focus:border-yellow-400/80 focus:ring-yellow-400/20`;
type Errors = Partial<Record<keyof Form, string>>;

export default function OnboardingProfile() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [stage, setStage] = useState<'details' | 'route'>('details');
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [rejection, setRejection] = useState<{
    reason: string | null;
    code: string | null;
  } | null>(null);
  const [existingIdCard, setExistingIdCard] = useState<string | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);

  const [groups, setGroups] = useState<DepartureGroup[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [availability, setAvailability] = useState<
    Record<string, Availability>
  >({});
  const [timeOptions, setTimeOptions] = useState<{
    arrival: TimeOption[];
    departure: TimeOption[];
  }>({ arrival: [], departure: [] });

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  useSaveDraft(userId ? `profile:${userId}` : null, { form, stage }, ready);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      const uid = session.user.id;
      const [
        { data: profile },
        { data: groupRows },
        { data: routeRows },
        { data: pointRows },
        { data: zoneRows },
        { data: availRows },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase
          .from('departure_groups')
          .select('*')
          .eq('active', true)
          .order('university'),
        supabase.from('routes').select('id, name, price').order('price'),
        supabase
          .from('pickup_points')
          .select('id, route_id, name')
          .order('name'),
        supabase
          .from('pickup_zones')
          .select('name')
          .eq('active', true)
          .order('sort_order'),
        supabase.rpc('route_availability'),
      ]);

      if (
        profile &&
        ['pending', 'active'].includes(profile.status) &&
        profile.applied_at
      ) {
        router.push(
          profile.status === 'active' ? '/dashboard' : '/onboarding/pending',
        );
        return;
      }

      const groupList = (groupRows ?? []) as DepartureGroup[];
      setGroups(groupList);
      setRoutes((routeRows ?? []) as Route[]);
      setPoints((pointRows ?? []) as PickupPoint[]);
      setZones(
        zoneRows?.length
          ? zoneRows.map((z: { name: string }) => z.name)
          : [
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
            ],
      );
      setAvailability(
        Object.fromEntries(
          ((availRows ?? []) as Availability[]).map((a) => [a.route_id, a]),
        ),
      );

      // Prefill from the saved profile (fix-and-resubmit), then the local draft.
      let next: Form = { ...EMPTY };
      if (profile) {
        const group = groupList.find(
          (g) => g.id === profile.departure_group_id,
        );
        next = {
          ...next,
          userType: profile.user_type === 'faculty' ? 'faculty' : 'student',
          university: group?.university ?? '',
          departmentId: profile.departure_group_id ?? '',
          idNumber: profile.cnic_last4 ?? '',
          phone: profile.phone
            ? `0${String(profile.phone).replace(/^\+?92/, '')}`
            : '',
          whatsappOptIn: profile.whatsapp_opt_in ?? true,
          guardianName: profile.guardian_name ?? '',
          guardianPhone: profile.guardian_phone
            ? `0${String(profile.guardian_phone).replace(/^\+?92/, '')}`
            : '',
          guardianRelation: profile.guardian_relation ?? '',
          routeId: profile.requested_route_id ?? '',
          wantsAc: Boolean(profile.wants_ac),
          pickupPointId: profile.pickup_point_id ?? '',
          pickupArea: profile.pickup_area ?? '',
          preferredMorning: profile.preferred_morning?.slice(0, 5) ?? '',
          preferredEvening: profile.preferred_evening?.slice(0, 5) ?? '',
        };
        if (profile.status === 'rejected')
          setRejection({
            reason: profile.rejected_reason,
            code: profile.rejection_code,
          });
        setExistingIdCard(profile.student_id_card_path ?? null);
      }
      const draft = loadDraft<{ form: Form; stage: 'details' | 'route' }>(
        `profile:${uid}`,
      );
      if (draft?.form) next = { ...next, ...draft.form };
      if (draft?.stage) setStage(draft.stage);
      setForm(next);
      setUserId(uid);
      setReady(true);
    };
    void init();
  }, [router, supabase]);

  useEffect(() => {
    void fetchTimeOptionsForGroup(supabase, form.departmentId || null).then(
      setTimeOptions,
    );
  }, [supabase, form.departmentId]);

  const universities = useMemo(
    () => Array.from(new Set(groups.map((g) => g.university))),
    [groups],
  );
  const departments = groups.filter((g) => g.university === form.university);
  const route = routes.find((r) => r.id === form.routeId) ?? null;
  const routePoints = points.filter((p) => p.route_id === form.routeId);
  const isStudent = form.userType === 'student';

  const validateDetails = (): Errors => {
    const e: Errors = {};
    if (!form.university)
      e.university = 'Choose your university or institution.';
    else if (!form.departmentId)
      e.departmentId = 'Choose your department or program.';
    const id = form.idNumber.trim();
    if (id.length < 3)
      e.idNumber = isStudent
        ? 'Enter your enrolment number as shown on your student card.'
        : 'Enter your employee or faculty code.';
    else if (!/^[A-Za-z0-9\-/ ]+$/.test(id))
      e.idNumber = 'Use only letters, numbers, dashes or slashes.';
    if (!normalizePkPhone(form.phone))
      e.phone = 'Enter a Pakistani mobile number, e.g. 0300 1234567.';
    if (form.guardianPhone && !normalizePkPhone(form.guardianPhone))
      e.guardianPhone = 'Enter a valid number, e.g. 0300 1234567.';
    if (form.guardianPhone && !form.guardianName.trim())
      e.guardianName = 'Add the parent or guardian’s name.';
    return e;
  };

  const validateRoute = (): Errors => {
    const e: Errors = {};
    if (!form.routeId) e.routeId = 'Choose a route.';
    if (routePoints.length > 0 ? !form.pickupPointId : !form.pickupArea)
      e.pickupArea = 'Choose where we should pick you up.';
    if (
      !routePoints.length &&
      form.pickupArea === 'Other' &&
      form.pickupOther.trim().length < 3
    )
      e.pickupOther = 'Tell us your area or nearest landmark.';
    return e;
  };

  const goToRoute = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const e = validateDetails();
    setErrors(e);
    if (Object.keys(e).length) {
      setError('Please fix the highlighted fields.');
      return;
    }
    setStage('route');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const e = { ...validateDetails(), ...validateRoute() };
    setErrors(e);
    if (Object.keys(e).length) {
      if (Object.keys(validateDetails()).length) setStage('details');
      setError('Please fix the highlighted fields.');
      return;
    }
    if (!userId) return;
    setLoading(true);
    try {
      let idCardPath = existingIdCard;
      if (idCardFile) {
        const path = uploadPath(userId, 'student-id', idCardFile);
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(path, idCardFile, { contentType: idCardFile.type });
        if (uploadError) throw uploadError;
        idCardPath = path;
      }
      const group = groups.find((g) => g.id === form.departmentId);
      const point = routePoints.find((p) => p.id === form.pickupPointId);
      const guardianPhone = normalizePkPhone(form.guardianPhone);
      const updates: Record<string, unknown> = {
        user_type: form.userType,
        institution: group?.university ?? '',
        departure_group_id: form.departmentId,
        cnic_last4: form.idNumber.trim(),
        phone: `+${normalizePkPhone(form.phone)}`,
        whatsapp_opt_in: form.whatsappOptIn,
        guardian_name: form.guardianName.trim() || null,
        guardian_phone: guardianPhone ? `+${guardianPhone}` : null,
        guardian_relation: form.guardianRelation || null,
        requested_route_id: form.routeId,
        wants_ac: form.wantsAc,
        pickup_point_id: point?.id ?? null,
        pickup_area:
          point?.name ??
          (form.pickupArea === 'Other'
            ? form.pickupOther.trim()
            : form.pickupArea),
        preferred_morning: form.preferredMorning || null,
        preferred_evening: form.preferredEvening || null,
        student_id_card_path: idCardPath,
        status: 'payment_pending',
      };
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      if (updateError) throw updateError;
      clearDraft(`profile:${userId}`);
      router.push('/onboarding/payment');
    } catch (err) {
      setError(
        friendlyOnboardingError(
          err,
          'We couldn’t save your profile. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <AuthShell
        wide
        title="Loading your application…"
        top={<Stepper current={2} />}
      >
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-900" />
      </AuthShell>
    );
  }

  const rejectionInfo = rejection ? findRejectionReason(rejection.code) : null;

  return (
    <AuthShell
      wide
      eyebrow={rejection ? 'Fix and resubmit' : 'Onboarding'}
      title={stage === 'details' ? 'Tell us about you' : 'Choose your route'}
      subtitle={
        stage === 'details'
          ? 'We use this to match you with the right departure slots.'
          : 'See the price and seats before you pay.'
      }
      top={<Stepper current={stage === 'details' ? 2 : 3} />}
    >
      {rejection && (
        <Alert tone="info">
          <strong>Your application needs a change.</strong>{' '}
          {rejection.reason || rejectionInfo?.message}
          {rejectionInfo?.fix && (
            <span className="mt-1 block text-yellow-200/80">
              {rejectionInfo.fix}
            </span>
          )}
          <span className="mt-1 block text-yellow-200/70">
            Your previous answers are filled in below.
          </span>
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      {stage === 'details' ? (
        <form onSubmit={goToRoute} noValidate className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-zinc-300">
              I am a
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(['student', 'faculty'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={form.userType === type}
                  onClick={() => set('userType', type)}
                  className={`rounded-xl border py-3 text-sm font-semibold transition ${form.userType === type ? 'border-yellow-400 bg-yellow-400 text-black' : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'}`}
                >
                  {type === 'student' ? '🎓 Student' : '👨‍🏫 Faculty / Staff'}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="university"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              University / Institution
            </label>
            {universities.length === 0 ? (
              <Alert tone="info">
                No institutions are listed yet. Message us on WhatsApp and we’ll
                add yours.
              </Alert>
            ) : (
              <select
                id="university"
                value={form.university}
                aria-invalid={Boolean(errors.university)}
                onChange={(e) => {
                  set('university', e.target.value);
                  set('departmentId', '');
                }}
                className={selectClass}
              >
                <option value="">Select your institution…</option>
                {universities.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            )}
            {errors.university && (
              <p className="mt-1.5 text-xs text-red-300">{errors.university}</p>
            )}
          </div>

          {form.university && departments.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-zinc-300">
                Department / Program
              </p>
              <div className="space-y-2">
                {departments.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={form.departmentId === d.id}
                    onClick={() => set('departmentId', d.id)}
                    className={`flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${form.departmentId === d.id ? 'border-yellow-400/50 bg-yellow-400/10' : 'border-zinc-700/80 bg-zinc-900/80 hover:border-zinc-500'}`}
                  >
                    <span>
                      <span className="block font-medium text-white">
                        {d.department}
                      </span>
                      {d.description && (
                        <span className="mt-0.5 block text-xs text-zinc-400">
                          {d.description}
                        </span>
                      )}
                    </span>
                    {form.departmentId === d.id && (
                      <span className="text-yellow-300">✓</span>
                    )}
                  </button>
                ))}
              </div>
              {errors.departmentId && (
                <p className="mt-1.5 text-xs text-red-300">
                  {errors.departmentId}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="idNumber"
              label={isStudent ? 'Enrolment number' : 'Employee / faculty code'}
              value={form.idNumber}
              onChange={(e) => set('idNumber', e.target.value)}
              error={errors.idNumber}
              autoComplete="off"
              placeholder={
                isStudent ? 'e.g. 01-235678-001' : 'e.g. FAC-2024-045'
              }
              hint={isStudent ? 'As printed on your student card.' : undefined}
            />
            <Field
              id="phone"
              label="Mobile number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              error={errors.phone}
              placeholder="0300 1234567"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.whatsappOptIn}
              onChange={(e) => set('whatsappOptIn', e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-yellow-400"
            />
            <span>
              Send me WhatsApp updates on this number (approval, fee reminders,
              holidays, vehicle changes). You can turn this off anytime.
            </span>
          </label>

          <fieldset className="space-y-4 rounded-2xl border border-zinc-800 p-4">
            <legend className="px-1 text-sm font-medium text-zinc-300">
              Parent / guardian contact{' '}
              <span className="text-zinc-500">(recommended)</span>
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="guardianName"
                label="Name"
                value={form.guardianName}
                autoComplete="off"
                onChange={(e) => set('guardianName', e.target.value)}
                error={errors.guardianName}
              />
              <Field
                id="guardianPhone"
                label="Mobile number"
                type="tel"
                inputMode="tel"
                value={form.guardianPhone}
                onChange={(e) => set('guardianPhone', e.target.value)}
                error={errors.guardianPhone}
                placeholder="0300 1234567"
              />
            </div>
            <div>
              <label
                htmlFor="guardianRelation"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Relation
              </label>
              <select
                id="guardianRelation"
                value={form.guardianRelation}
                onChange={(e) => set('guardianRelation', e.target.value)}
                className={selectClass}
              >
                <option value="">Select…</option>
                {[
                  'Father',
                  'Mother',
                  'Guardian',
                  'Sibling',
                  'Spouse',
                  'Other',
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-zinc-500">
              Only used to reach someone in an emergency or about the ride.
            </p>
          </fieldset>

          {isStudent && (
            <FilePicker
              label="Student ID card (optional)"
              file={idCardFile}
              onChange={setIdCardFile}
              onError={setError}
              existingLabel={existingIdCard ? 'uploaded' : null}
              hint="Speeds up verification. Stored privately; only our admin team can see it."
            />
          )}

          <SubmitButton loading={false} loadingText="">
            Continue to route →
          </SubmitButton>
        </form>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <p className="mb-1.5 text-sm font-medium text-zinc-300">Route</p>
            {routes.length === 0 ? (
              <Alert tone="info">
                Routes are being updated. Please message us on WhatsApp.
              </Alert>
            ) : (
              <div className="space-y-2" role="radiogroup" aria-label="Route">
                {routes.map((r) => {
                  const a = availability[r.id];
                  const full = a?.seats_left != null && a.seats_left <= 0;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={form.routeId === r.id}
                      onClick={() => {
                        set('routeId', r.id);
                        set('pickupPointId', '');
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${form.routeId === r.id ? 'border-yellow-400/60 bg-yellow-400/10' : 'border-zinc-700/80 bg-zinc-900/80 hover:border-zinc-500'}`}
                    >
                      <span>
                        <span className="block font-medium text-white">
                          {r.name}
                        </span>
                        {a?.seats_left != null && (
                          <span
                            className={`mt-0.5 block text-xs ${full ? 'text-amber-300' : a.seats_left <= 5 ? 'text-amber-200' : 'text-emerald-300'}`}
                          >
                            {full
                              ? 'Full: join the waitlist'
                              : `${a.seats_left} seat${a.seats_left === 1 ? '' : 's'} left`}
                          </span>
                        )}
                      </span>
                      <span className="text-right text-sm font-semibold text-yellow-300">
                        {formatPkr(r.price)}
                        <span className="block text-[11px] font-normal text-zinc-500">
                          per month
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {errors.routeId && (
              <p className="mt-1.5 text-xs text-red-300">{errors.routeId}</p>
            )}
          </div>

          <div
            className="grid grid-cols-2 gap-2"
            role="radiogroup"
            aria-label="Vehicle type"
          >
            {[false, true].map((ac) => (
              <button
                key={String(ac)}
                type="button"
                role="radio"
                aria-checked={form.wantsAc === ac}
                onClick={() => set('wantsAc', ac)}
                className={`rounded-xl border px-3 py-3 text-sm transition ${form.wantsAc === ac ? 'border-yellow-400 bg-yellow-400/10 text-white' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}
              >
                {ac ? `❄️ AC (+${formatPkr(AC_SURCHARGE)})` : '🚐 Standard'}
              </button>
            ))}
          </div>

          {form.routeId && (
            <div>
              <label
                htmlFor="pickup"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Pickup point
              </label>
              {routePoints.length > 0 ? (
                <select
                  id="pickup"
                  value={form.pickupPointId}
                  onChange={(e) => {
                    set('pickupPointId', e.target.value);
                    setErrors((p) => ({ ...p, pickupArea: undefined }));
                  }}
                  className={selectClass}
                >
                  <option value="">Select a stop on this route…</option>
                  {routePoints.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  id="pickup"
                  value={form.pickupArea}
                  onChange={(e) => set('pickupArea', e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select your area…</option>
                  {[...zones, 'Other'].map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              )}
              {errors.pickupArea && (
                <p className="mt-1.5 text-xs text-red-300">
                  {errors.pickupArea}
                </p>
              )}
              {!routePoints.length && form.pickupArea === 'Other' && (
                <div className="mt-3">
                  <Field
                    id="pickupOther"
                    label="Your area or nearest landmark"
                    value={form.pickupOther}
                    onChange={(e) => set('pickupOther', e.target.value)}
                    error={errors.pickupOther}
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="preferredMorning"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                🌅 Morning pickup
              </label>
              <TimeSelect
                id="preferredMorning"
                value={form.preferredMorning}
                onChange={(v) => set('preferredMorning', v)}
                options={timeOptions.arrival}
                className={selectClass}
              />
            </div>
            <div>
              <label
                htmlFor="preferredEvening"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                🌆 Evening return
              </label>
              <TimeSelect
                id="preferredEvening"
                value={form.preferredEvening}
                onChange={(v) => set('preferredEvening', v)}
                options={timeOptions.departure}
                className={selectClass}
              />
            </div>
          </div>

          {route && (
            <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/5 p-4 text-sm">
              <div className="flex justify-between text-zinc-300">
                <span>Monthly fee{form.wantsAc ? ' (AC)' : ''}</span>
                <span>{formatPkr(monthlyFee(route.price, form.wantsAc))}</span>
              </div>
              <div className="mt-1 flex justify-between text-zinc-300">
                <span>Seat reservation (one-time)</span>
                <span>{formatPkr(RESERVATION_FEE)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-yellow-400/20 pt-2 font-semibold text-white">
                <span>Amount due now</span>
                <span className="text-yellow-300">
                  {formatPkr(amountDue(route.price, form.wantsAc))}
                </span>
              </div>
              {availability[route.id]?.seats_left === 0 && (
                <p className="mt-2 text-xs text-amber-200">
                  This route is full. You’ll join the waitlist and we’ll confirm
                  your seat before your month starts.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStage('details')}
              className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-200 hover:border-zinc-500"
            >
              ← Back
            </button>
            <div className="flex-1">
              <SubmitButton loading={loading} loadingText="Saving…">
                Continue to payment →
              </SubmitButton>
            </div>
          </div>
          <p className="text-center text-xs text-zinc-500">
            Your progress is saved on this device.
          </p>
        </form>
      )}
    </AuthShell>
  );
}
