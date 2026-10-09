'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  fee_status: string;
  destination: string;
  route_id: string;
};

type DailyAssignment = {
  id: string;
  driver_name: string;
  driver_contact: string;
  seat_confirmed: boolean;
  confirmed_at: string;
  coasters: { coaster_number: string };
};

type WeeklySchedule = {
  id: string;
  day_of_week: string;
  arrival_time: string;
  departure_time: string;
  change_count: number;
  last_changed_at: string;
  pickup_points: { name: string };
};

type Payment = {
  id: string;
  amount: number;
  month: string;
  status: string;
  paid_at: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
};

type Holiday = {
  id: string;
  date: string;
  reason: string;
};

type PickupPoint = { id: string; name: string; route_id: string };

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function getNextWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

function canChangeTime(tripTime: string) {
  const [h, m] = tripTime.split(':').map(Number);
  const now = new Date();
  const trip = new Date();
  trip.setHours(h, m, 0, 0);
  const diffHours = (trip.getTime() - now.getTime()) / (1000 * 60 * 60);
  return diffHours >= 8
    ? { allowed: true, reason: '' }
    : {
        allowed: false,
        reason: 'Deadline passed — must change at least 8 hours before trip',
      };
}

function formatTime(t: string) {
  return t?.slice(0, 5) || '—';
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-PK', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignment, setAssignment] = useState<DailyAssignment | null>(null);
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [classDays, setClassDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    | 'home'
    | 'schedule'
    | 'change'
    | 'payments'
    | 'timetable'
    | 'help'
    | 'profile'
  >('home');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scheduleView, setScheduleView] = useState<
    'overview' | 'change' | 'timetable'
  >('overview');

  const [scheduleForm, setScheduleForm] = useState<
    Record<
      string,
      {
        pickup_point_id: string;
        arrival_time: string;
        departure_time: string;
      }
    >
  >({});
  const [submittingSchedule, setSubmittingSchedule] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  const [changeDay, setChangeDay] = useState('');
  const [changeType, setChangeType] = useState<'arrival' | 'departure'>(
    'arrival',
  );
  const [changeTime, setChangeTime] = useState('');
  const [changingTime, setChangingTime] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);

  const [helpMessage, setHelpMessage] = useState('');
  const [sendingHelp, setSendingHelp] = useState(false);
  const [helpSuccess, setHelpSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [confirmingSeat, setConfirmingSeat] = useState(false);
  const [todayName, setTodayName] = useState('Monday');
  const [isSundayToday, setIsSundayToday] = useState(false);
  const [isFridaySaturdayToday, setIsFridaySaturdayToday] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const demoSessionString = localStorage.getItem('ee_demo_session');
      if (demoSessionString) {
        try {
          const demoSession = JSON.parse(demoSessionString);

          setProfile({
            id: demoSession.user.id,
            full_name: demoSession.profile.full_name,
            email: demoSession.profile.email,
            role: demoSession.profile.role,
            fee_status: 'paid',
            destination: 'North Campus',
            route_id: 'demo-route',
          });

          setAssignment({
            id: 'demo-assignment',
            driver_name: 'Ammar Hassan',
            driver_contact: '+92 300 1234567',
            seat_confirmed: true,
            confirmed_at: new Date().toISOString(),
            coasters: { coaster_number: '12' },
          });

          setSchedules([
            {
              id: 'demo-mon',
              day_of_week: 'Monday',
              arrival_time: '07:15',
              departure_time: '18:30',
              change_count: 0,
              last_changed_at: new Date().toISOString(),
              pickup_points: { name: 'Main Gate' },
            },
            {
              id: 'demo-tue',
              day_of_week: 'Tuesday',
              arrival_time: '07:15',
              departure_time: '18:30',
              change_count: 0,
              last_changed_at: new Date().toISOString(),
              pickup_points: { name: 'Main Gate' },
            },
            {
              id: 'demo-wed',
              day_of_week: 'Wednesday',
              arrival_time: '07:15',
              departure_time: '18:30',
              change_count: 0,
              last_changed_at: new Date().toISOString(),
              pickup_points: { name: 'Main Gate' },
            },
          ]);

          setPickupPoints([
            { id: 'demo-pick-1', name: 'Main Gate', route_id: 'demo-route' },
            { id: 'demo-pick-2', name: 'Library', route_id: 'demo-route' },
          ]);

          setPayments([
            {
              id: 'demo-payment-1',
              amount: 3200,
              month: 'October',
              status: 'paid',
              paid_at: new Date().toISOString(),
            },
            {
              id: 'demo-payment-2',
              amount: 3200,
              month: 'September',
              status: 'paid',
              paid_at: new Date().toISOString(),
            },
          ]);

          setNotifications([
            {
              id: 'demo-note-1',
              title: 'Demo mode active',
              message: 'This dashboard is running in local demo mode.',
              type: 'info',
              created_at: new Date().toISOString(),
            },
          ]);

          setHolidays([
            {
              id: 'demo-holiday',
              date: new Date().toISOString(),
              reason: 'National holiday',
            },
          ]);

          setClassDays(['Monday', 'Wednesday', 'Friday']);
          setLoading(false);
          return;
        } catch {
          localStorage.removeItem('ee_demo_session');
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const weekStart = getNextWeekStart();

      const [
        { data: profileData },
        { data: assignmentData },
        { data: schedulesData },
        { data: paymentsData },
        { data: notificationsData },
        { data: holidaysData },
        { data: timetableData },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single(),
        supabase
          .from('daily_assignments')
          .select('*, coasters(coaster_number)')
          .eq('student_id', session.user.id)
          .eq('assignment_date', today)
          .single(),
        supabase
          .from('weekly_schedules')
          .select('*, pickup_points(name)')
          .eq('student_id', session.user.id)
          .eq('week_start', weekStart),
        supabase
          .from('payments')
          .select('*')
          .eq('student_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('holidays')
          .select('*')
          .gte('date', today)
          .order('date')
          .limit(5),
        supabase
          .from('student_timetables')
          .select('*')
          .eq('student_id', session.user.id)
          .single(),
      ]);

      if (profileData) setProfile(profileData);
      if (assignmentData) setAssignment(assignmentData);
      if (schedulesData) setSchedules(schedulesData);
      if (paymentsData) setPayments(paymentsData);
      if (notificationsData) {
        setNotifications(notificationsData);
        setUnreadCount(notificationsData.length);
      }
      if (holidaysData) setHolidays(holidaysData);
      if (timetableData) setClassDays(timetableData.class_days);

      if (profileData?.route_id) {
        const { data: pickups } = await supabase
          .from('pickup_points')
          .select('*')
          .eq('route_id', profileData.route_id);
        if (pickups) setPickupPoints(pickups);
      } else {
        const { data: allPickups } = await supabase
          .from('pickup_points')
          .select('*');
        if (allPickups) setPickupPoints(allPickups);
      }

      setLoading(false);
    };
    init();

    const now = new Date();
    const weekdayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
    setTodayName(DAYS[weekdayIndex]);
    setIsSundayToday(now.getDay() === 0);
    setIsFridaySaturdayToday([5, 6].includes(now.getDay()));
  }, []);

  const handleScheduleSubmit = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    setSubmittingSchedule(true);
    const weekStart = getNextWeekStart();
    const entries = Object.entries(scheduleForm).filter(
      ([, v]) => v.pickup_point_id && v.arrival_time && v.departure_time,
    );
    if (entries.length === 0) {
      setSubmittingSchedule(false);
      return;
    }
    await supabase.from('weekly_schedules').upsert(
      entries.map(([day, vals]) => ({
        student_id: session.user.id,
        week_start: weekStart,
        day_of_week: day,
        pickup_point_id: vals.pickup_point_id,
        arrival_time: vals.arrival_time,
        departure_time: vals.departure_time,
      })),
      { onConflict: 'student_id,week_start,day_of_week' },
    );
    const { data } = await supabase
      .from('weekly_schedules')
      .select('*, pickup_points(name)')
      .eq('student_id', session.user.id)
      .eq('week_start', weekStart);
    if (data) setSchedules(data);
    setScheduleSuccess(true);
    setTimeout(() => setScheduleSuccess(false), 3000);
    setSubmittingSchedule(false);
  };

  const handleTimeChange = async () => {
    if (!changeDay || !changeTime) return;
    setChangingTime(true);
    setChangeError('');
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const weekStart = getNextWeekStart();
    const schedule = schedules.find((s) => s.day_of_week === changeDay);
    if (!schedule) {
      setChangeError('No schedule found for this day.');
      setChangingTime(false);
      return;
    }
    if (schedule.change_count >= 1) {
      setChangeError(
        'You have already used your one allowed change for this day.',
      );
      setChangingTime(false);
      return;
    }
    const tripTime =
      changeType === 'arrival'
        ? schedule.arrival_time
        : schedule.departure_time;
    const { allowed, reason } = canChangeTime(tripTime);
    if (!allowed) {
      setChangeError(reason);
      setChangingTime(false);
      return;
    }
    const updateData =
      changeType === 'arrival'
        ? {
            arrival_time: changeTime,
            change_count: 1,
            last_changed_at: new Date().toISOString(),
          }
        : {
            departure_time: changeTime,
            change_count: 1,
            last_changed_at: new Date().toISOString(),
          };
    await supabase
      .from('weekly_schedules')
      .update(updateData)
      .eq('student_id', session.user.id)
      .eq('week_start', weekStart)
      .eq('day_of_week', changeDay);
    const { data } = await supabase
      .from('weekly_schedules')
      .select('*, pickup_points(name)')
      .eq('student_id', session.user.id)
      .eq('week_start', weekStart);
    if (data) setSchedules(data);
    setChangeSuccess(true);
    setChangeDay('');
    setChangeTime('');
    setTimeout(() => setChangeSuccess(false), 3000);
    setChangingTime(false);
  };

  const handleConfirmSeat = async () => {
    if (!assignment) return;
    setConfirmingSeat(true);
    await supabase
      .from('daily_assignments')
      .update({
        seat_confirmed: true,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', assignment.id);
    setAssignment((prev) => (prev ? { ...prev, seat_confirmed: true } : prev));
    setConfirmingSeat(false);
  };

  const handleSendHelp = async () => {
    if (!helpMessage.trim()) return;
    setSendingHelp(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from('help_messages')
      .insert({ student_id: session.user.id, message: helpMessage });
    setHelpMessage('');
    setHelpSuccess(true);
    setTimeout(() => setHelpSuccess(false), 3000);
    setSendingHelp(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    setPasswordError('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
      setChangingPassword(false);
      return;
    }
    setPasswordSuccess(true);
    setNewPassword('');
    setTimeout(() => setPasswordSuccess(false), 3000);
    setChangingPassword(false);
  };

  const handleSaveTimetable = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('student_timetables').upsert(
      {
        student_id: session.user.id,
        class_days: classDays,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id' },
    );
  };

  const todaySchedule = schedules.find((s) => s.day_of_week === todayName);
  const unpaidPayments = payments.filter((p) => p.status === 'unpaid');

  const summaryCards = [
    {
      label: 'Fee status',
      value: profile?.fee_status === 'paid' ? 'Paid' : 'Pending',
      hint: profile?.fee_status === 'paid' ? 'All clear' : 'Action needed',
      accent:
        profile?.fee_status === 'paid' ? 'text-emerald-300' : 'text-red-300',
      featured: true,
    },
    {
      label: 'Trips this week',
      value: `${schedules.length || 0}`,
      hint: 'Schedule entries',
      accent: 'text-yellow-300',
      featured: false,
    },
    {
      label: 'Class days',
      value: `${classDays.length || 0}`,
      hint: 'Selected days',
      accent: 'text-cyan-300',
      featured: false,
    },
  ];

  const tabs = [
    { key: 'home', label: 'Home' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'payments', label: 'Payments' },
    { key: 'help', label: 'Help' },
    { key: 'profile', label: 'Profile' },
  ];

  if (loading)
    return (
      <div className="min-h-screen bg-[#07090d] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_10px_30px_rgba(250,204,21,0.35)] animate-pulse">
            <span className="text-black font-black text-lg">EE</span>
          </div>
          <p className="text-zinc-300 text-sm tracking-[0.2em] uppercase">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#07090d] text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="absolute top-1/3 right-10 h-80 w-80 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/8 blur-3xl" />
      </div>

      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0b0f14]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-yellow-400/20 bg-gradient-to-br from-yellow-300/20 to-yellow-500/10 text-[11px] font-black tracking-[0.12em] text-yellow-200">
              EE
            </div>
            <div>
              <p className="text-[13px] font-semibold tracking-[0.18em] text-white uppercase">
                Eagle Elites
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setUnreadCount(0);
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.02] text-sm text-zinc-300 transition hover:border-yellow-400/20 hover:text-yellow-200"
              >
                <span>🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-bold text-black">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#10161d] shadow-2xl">
                  <div className="border-b border-white/5 p-4">
                    <p className="text-sm font-bold text-white">
                      Announcements
                    </p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-sm text-zinc-500">
                          No announcements yet
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="border-b border-white/5 p-4 transition hover:bg-white/3"
                        >
                          <p className="text-sm font-medium text-white">
                            {n.title}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            {n.message}
                          </p>
                          <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                            {formatDate(n.created_at)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-2.5 py-1.5 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-white/10 to-yellow-400/10 text-[11px] font-semibold text-white">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div className="text-left">
                <p className="text-[11px] font-medium leading-none text-white">
                  {profile?.full_name}
                </p>
                <span
                  className={`mt-1 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.12em] ${
                    profile?.fee_status === 'paid'
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/20 bg-red-500/10 text-red-300'
                  }`}
                >
                  {profile?.fee_status === 'paid' ? 'Paid' : 'Unpaid'}
                </span>
              </div>
            </div>

            <button
              onClick={async () => {
                localStorage.removeItem('ee_demo_session');
                await supabase.auth.signOut();
                router.push('/auth/login');
              }}
              className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-zinc-200 uppercase transition hover:border-yellow-400/20 hover:text-yellow-200"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-6xl space-y-5 px-4 py-6 sm:py-8">
        {isFridaySaturdayToday && (
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 flex items-center gap-3 shadow-[0_0_0_1px_rgba(250,204,21,0.04)]">
            <span className="text-xl">⏰</span>
            <p className="text-yellow-200 text-sm font-medium">
              Reminder: Submit your schedule for next week before Sunday
              midnight.
            </p>
          </div>
        )}

        {unpaidPayments.length > 0 && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 flex items-center gap-3">
            <span className="text-xl">💳</span>
            <p className="text-red-200 text-sm font-medium">
              You have {unpaidPayments.length} unpaid payment
              {unpaidPayments.length > 1 ? 's' : ''}. Please clear your dues.
            </p>
            <button
              onClick={() => setActiveTab('payments')}
              className="ml-auto text-xs bg-red-500 hover:bg-red-400 text-white px-3 py-1.5 rounded-lg transition"
            >
              View
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {summaryCards.map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl border p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_32px_rgba(0,0,0,0.18)] ${
                item.featured
                  ? 'border-yellow-500/20 bg-gradient-to-br from-yellow-500/12 via-transparent to-emerald-500/10 sm:col-span-2'
                  : 'border-white/8 bg-gradient-to-br from-white/5 to-white/[0.02]'
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                {item.label}
              </p>
              <p className={`mt-3 text-2xl font-black ${item.accent}`}>
                {item.value}
              </p>
              <p className="mt-1 text-xs text-zinc-400">{item.hint}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 via-transparent to-cyan-500/10 p-3.5 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-400">
                Service snapshot
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">
                {profile?.fee_status === 'paid'
                  ? 'All tuition and service checks are clear.'
                  : 'Fee action is still required before the next trip.'}
              </h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {profile?.fee_status === 'paid' ? 'Ready' : 'Needs attention'}
            </div>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/8 bg-white/3 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-yellow-400 text-black shadow-[0_8px_18px_rgba(250,204,21,0.35)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/4'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'home' && (
          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.18),_transparent_28%),linear-gradient(135deg,_rgba(18,22,30,0.96),_rgba(9,12,17,0.96))] p-5 shadow-[0_28px_60px_rgba(0,0,0,0.25)] sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-400">
                    Welcome back
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                    {profile?.full_name} 👋
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {profile?.email}
                  </p>
                  {profile?.destination && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-sm text-yellow-200">
                      <span>📍</span>
                      <span>{profile.destination}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                      profile?.fee_status === 'paid'
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                        : 'border-red-500/25 bg-red-500/10 text-red-300'
                    }`}
                  >
                    {profile?.fee_status === 'paid'
                      ? 'Fees Paid'
                      : 'Fees Pending'}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
                    {todayName}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-[28px] border border-white/10 bg-[#0d131c] p-5 shadow-[0_24px_50px_rgba(0,0,0,0.2)]">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">
                    Today&apos;s trip
                  </h3>
                  {todaySchedule && (
                    <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-yellow-300">
                      live
                    </span>
                  )}
                </div>

                {todaySchedule ? (
                  <>
                    <div className="relative mb-5 h-24 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/90">
                      <div className="absolute inset-0 flex items-center px-4">
                        <div className="h-0.5 w-full bg-zinc-700" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-around px-8">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="h-2 w-2 rounded-full bg-yellow-400/30"
                          />
                        ))}
                      </div>
                      <div className="absolute left-3 top-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        home
                      </div>
                      <div className="absolute right-3 top-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        {profile?.destination || 'destination'}
                      </div>
                      <div
                        className="absolute top-1/2 -translate-y-1/2"
                        style={{ animation: 'drive 5s linear infinite' }}
                      >
                        <span className="text-3xl">🚌</span>
                      </div>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl">
                        🏫
                      </div>
                    </div>

                    <style>{`
                      @keyframes drive {
                        0% { left: -60px; }
                        100% { left: 100%; }
                      }
                    `}</style>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-white/3 p-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                          Pickup
                        </p>
                        <p className="mt-2 text-xl font-black text-white">
                          {formatTime(todaySchedule.arrival_time)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/3 p-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                          Return
                        </p>
                        <p className="mt-2 text-xl font-black text-white">
                          {formatTime(todaySchedule.departure_time)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/3 p-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                          Pickup point
                        </p>
                        <p className="mt-2 text-sm font-bold text-white">
                          {todaySchedule.pickup_points?.name}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/3 p-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                          Time changes
                        </p>
                        <p
                          className={`mt-2 text-sm font-bold ${todaySchedule.change_count >= 1 ? 'text-red-400' : 'text-emerald-400'}`}
                        >
                          {todaySchedule.change_count}/1 used
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/60 p-5 text-center sm:p-6">
                    <p className="mb-3 text-3xl">🚌</p>
                    <p className="text-base font-medium text-zinc-300">
                      No trip scheduled for today
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Submit your schedule every Sunday for the next week.
                    </p>
                  </div>
                )}
              </div>

              {todaySchedule && assignment && (
                <div className="space-y-4">
                  <div className="rounded-[28px] border border-white/10 bg-[#0d131c] p-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      Driver & vehicle
                    </p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-zinc-500 text-xs">Vehicle</p>
                        <p className="mt-1 text-2xl font-black text-yellow-300">
                          #{assignment.coasters?.coaster_number}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs">Assigned driver</p>
                        <p className="mt-1 text-base font-bold text-white">
                          {assignment.driver_name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          📞 {assignment.driver_contact}
                        </p>
                      </div>
                    </div>
                  </div>

                  {assignment && (
                    <div
                      className={`rounded-[28px] border p-5 ${
                        assignment.seat_confirmed
                          ? 'border-emerald-500/20 bg-emerald-500/10'
                          : 'border-white/10 bg-[#0d131c]'
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        Seat status
                      </p>
                      <p className="mt-3 text-sm font-medium text-white">
                        {assignment.seat_confirmed
                          ? `Confirmed on ${formatDate(assignment.confirmed_at)}`
                          : 'Seat not confirmed yet'}
                      </p>
                      {!assignment.seat_confirmed && (
                        <button
                          onClick={handleConfirmSeat}
                          disabled={confirmingSeat}
                          className="mt-4 w-full rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:opacity-45"
                        >
                          {confirmingSeat ? 'Confirming...' : 'Confirm Seat'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {holidays.length > 0 && (
              <div className="rounded-[28px] border border-white/10 bg-[#0d131c] p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  Upcoming no-service days
                </p>
                <div className="mt-4 space-y-3">
                  {holidays.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/3 px-3 py-2.5"
                    >
                      <span className="text-sm text-zinc-300">{h.reason}</span>
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-yellow-300">
                        {formatDate(h.date)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-[#0d131c] p-2">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'change', label: 'Change time' },
                  { key: 'timetable', label: 'Timetable' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setScheduleView(item.key as any)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                      scheduleView === item.key
                        ? 'bg-yellow-400 text-black'
                        : 'text-zinc-400 hover:bg-white/4 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {scheduleView === 'overview' && (
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-white font-bold text-lg">
                    Weekly Schedule
                  </h3>
                  <p className="text-zinc-500 text-sm mt-1">
                    {isSundayToday
                      ? '✅ Today is Sunday — submit your schedule for next week'
                      : '⚠️ Submission opens every Sunday'}
                  </p>
                </div>

                {schedules.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold">
                      Next Week&apos;s Schedule
                    </p>
                    {schedules.map((s) => (
                      <div
                        key={s.id}
                        className="bg-zinc-800 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-white font-medium text-sm">
                            {s.day_of_week}
                          </p>
                          <p className="text-zinc-500 text-xs">
                            📍 {s.pickup_points?.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-zinc-300 text-xs">
                            🌅 Pickup: {formatTime(s.arrival_time)}
                          </p>
                          <p className="text-zinc-300 text-xs">
                            🌆 Return: {formatTime(s.departure_time)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isSundayToday ? (
                  <div className="space-y-4">
                    <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold">
                      Submit Next Week
                    </p>
                    {DAYS.map((day) => (
                      <div
                        key={day}
                        className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 space-y-3"
                      >
                        <p className="text-white font-semibold text-sm">
                          {day}
                        </p>
                        <select
                          value={scheduleForm[day]?.pickup_point_id || ''}
                          onChange={(e) =>
                            setScheduleForm((prev) => ({
                              ...prev,
                              [day]: {
                                ...prev[day],
                                pickup_point_id: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-3 py-2.5 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400 transition"
                        >
                          <option value="">No class / skip this day</option>
                          {pickupPoints.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-zinc-500 text-xs mb-1">
                              🌅 Pickup time
                            </p>
                            <input
                              type="time"
                              value={scheduleForm[day]?.arrival_time || ''}
                              onChange={(e) =>
                                setScheduleForm((prev) => ({
                                  ...prev,
                                  [day]: {
                                    ...prev[day],
                                    arrival_time: e.target.value,
                                  },
                                }))
                              }
                              className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400 transition"
                            />
                          </div>
                          <div>
                            <p className="text-zinc-500 text-xs mb-1">
                              🌆 Return time
                            </p>
                            <input
                              type="time"
                              value={scheduleForm[day]?.departure_time || ''}
                              onChange={(e) =>
                                setScheduleForm((prev) => ({
                                  ...prev,
                                  [day]: {
                                    ...prev[day],
                                    departure_time: e.target.value,
                                  },
                                }))
                              }
                              className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400 transition"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {scheduleSuccess && (
                      <div className="bg-green-950/60 border border-green-800 text-green-400 px-4 py-3 rounded-xl text-sm">
                        ✅ Schedule submitted!
                      </div>
                    )}

                    <button
                      onClick={handleScheduleSubmit}
                      disabled={submittingSchedule}
                      className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3.5 rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {submittingSchedule ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8z"
                            />
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        'Submit Schedule →'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="bg-zinc-800/40 border border-zinc-700 rounded-xl p-6 text-center">
                    <p className="text-3xl mb-3">📅</p>
                    <p className="text-zinc-400 font-medium">
                      Schedule submission opens on Sunday
                    </p>
                    <p className="text-zinc-600 text-sm mt-1">
                      Come back this Sunday to submit next week&apos;s schedule
                    </p>
                  </div>
                )}
              </div>
            )}

            {scheduleView === 'change' && (
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-white font-bold text-lg">
                    Change Trip Time
                  </h3>
                  <p className="text-zinc-500 text-sm mt-1">
                    One change per day, at least 8 hours before the trip
                  </p>
                </div>

                {schedules.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-3xl mb-3">📅</p>
                    <p className="text-zinc-400">
                      No schedule found for this week
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                        Select Day
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {schedules.map((s) => (
                          <button
                            key={s.id}
                            onClick={() =>
                              s.change_count < 1 && setChangeDay(s.day_of_week)
                            }
                            className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                              changeDay === s.day_of_week
                                ? 'bg-yellow-400 text-black border-yellow-400'
                                : s.change_count >= 1
                                  ? 'bg-zinc-800 text-zinc-600 border-zinc-700 cursor-not-allowed'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                            }`}
                          >
                            <p>{s.day_of_week.slice(0, 3)}</p>
                            <p
                              className={`text-xs mt-0.5 ${s.change_count >= 1 ? 'text-red-500' : 'text-green-500'}`}
                            >
                              {s.change_count >= 1 ? 'Used' : 'Available'}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {changeDay && (
                      <>
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                            Which Trip
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {(['arrival', 'departure'] as const).map((type) => (
                              <button
                                key={type}
                                onClick={() => setChangeType(type)}
                                className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all ${changeType === type ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
                              >
                                {type === 'arrival'
                                  ? '🌅 Pickup (Arrival)'
                                  : '🌆 Return (Departure)'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                            New Time
                          </label>
                          <input
                            type="time"
                            value={changeTime}
                            onChange={(e) => setChangeTime(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400 transition"
                          />
                        </div>
                      </>
                    )}

                    {changeError && (
                      <div className="bg-red-950/60 border border-red-800 text-red-400 px-4 py-3 rounded-xl text-sm">
                        ⚠️ {changeError}
                      </div>
                    )}
                    {changeSuccess && (
                      <div className="bg-green-950/60 border border-green-800 text-green-400 px-4 py-3 rounded-xl text-sm">
                        ✅ Time updated successfully!
                      </div>
                    )}

                    <button
                      onClick={handleTimeChange}
                      disabled={!changeDay || !changeTime || changingTime}
                      className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3.5 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {changingTime ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8z"
                            />
                          </svg>
                          Updating...
                        </>
                      ) : (
                        'Confirm Change →'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {scheduleView === 'timetable' && (
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-white font-bold text-lg">
                    University Timetable
                  </h3>
                  <p className="text-zinc-500 text-sm mt-1">
                    Select your class days so admin can plan your schedule
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      onClick={() =>
                        setClassDays((prev) =>
                          prev.includes(day)
                            ? prev.filter((d) => d !== day)
                            : [...prev, day],
                        )
                      }
                      className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all text-left ${
                        classDays.includes(day)
                          ? 'bg-yellow-400 text-black border-yellow-400'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      <span className="mr-2">
                        {classDays.includes(day) ? '✓' : '○'}
                      </span>
                      {day}
                    </button>
                  ))}
                </div>

                {classDays.length > 0 && (
                  <div className="bg-zinc-800 rounded-xl p-3">
                    <p className="text-zinc-400 text-xs mb-1">Selected days</p>
                    <p className="text-white font-medium text-sm">
                      {classDays.join(', ')}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSaveTimetable}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3.5 rounded-xl transition"
                >
                  Save Timetable →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'change' && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-white font-bold text-lg">Change Trip Time</h3>
              <p className="text-zinc-500 text-sm mt-1">
                One change per day, at least 8 hours before the trip
              </p>
            </div>

            {schedules.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-3">📅</p>
                <p className="text-zinc-400">No schedule found for this week</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                    Select Day
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {schedules.map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          s.change_count < 1 && setChangeDay(s.day_of_week)
                        }
                        className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                          changeDay === s.day_of_week
                            ? 'bg-yellow-400 text-black border-yellow-400'
                            : s.change_count >= 1
                              ? 'bg-zinc-800 text-zinc-600 border-zinc-700 cursor-not-allowed'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                        }`}
                      >
                        <p>{s.day_of_week.slice(0, 3)}</p>
                        <p
                          className={`text-xs mt-0.5 ${s.change_count >= 1 ? 'text-red-500' : 'text-green-500'}`}
                        >
                          {s.change_count >= 1 ? 'Used' : 'Available'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {changeDay && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                        Which Trip
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['arrival', 'departure'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => setChangeType(type)}
                            className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all ${changeType === type ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
                          >
                            {type === 'arrival'
                              ? '🌅 Pickup (Arrival)'
                              : '🌆 Return (Departure)'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                        New Time
                      </label>
                      <input
                        type="time"
                        value={changeTime}
                        onChange={(e) => setChangeTime(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400 transition"
                      />
                    </div>
                  </>
                )}

                {changeError && (
                  <div className="bg-red-950/60 border border-red-800 text-red-400 px-4 py-3 rounded-xl text-sm">
                    ⚠️ {changeError}
                  </div>
                )}
                {changeSuccess && (
                  <div className="bg-green-950/60 border border-green-800 text-green-400 px-4 py-3 rounded-xl text-sm">
                    ✅ Time updated successfully!
                  </div>
                )}

                <button
                  onClick={handleTimeChange}
                  disabled={!changeDay || !changeTime || changingTime}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3.5 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {changingTime ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Confirm Change →'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-white font-bold text-lg">Payment History</h3>
              <p className="text-zinc-500 text-sm mt-1">
                Monthly transport fee receipts
              </p>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-3">💳</p>
                <p className="text-zinc-400 font-medium">
                  No payment records yet
                </p>
                <p className="text-zinc-600 text-sm mt-1">
                  Your payment history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {p.month}
                      </p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {p.paid_at
                          ? `Paid on ${formatDate(p.paid_at)}`
                          : 'Not yet paid'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 font-bold">
                        PKR {p.amount.toLocaleString()}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.status === 'paid'
                            ? 'bg-green-950 text-green-400 border border-green-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        {p.status === 'paid' ? '✓ Paid' : '⚠ Unpaid'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'timetable' && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-white font-bold text-lg">
                University Timetable
              </h3>
              <p className="text-zinc-500 text-sm mt-1">
                Select your class days so admin can plan your schedule
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() =>
                    setClassDays((prev) =>
                      prev.includes(day)
                        ? prev.filter((d) => d !== day)
                        : [...prev, day],
                    )
                  }
                  className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all text-left ${
                    classDays.includes(day)
                      ? 'bg-yellow-400 text-black border-yellow-400'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <span className="mr-2">
                    {classDays.includes(day) ? '✓' : '○'}
                  </span>
                  {day}
                </button>
              ))}
            </div>

            {classDays.length > 0 && (
              <div className="bg-zinc-800 rounded-xl p-3">
                <p className="text-zinc-400 text-xs mb-1">Selected days</p>
                <p className="text-white font-medium text-sm">
                  {classDays.join(', ')}
                </p>
              </div>
            )}

            <button
              onClick={handleSaveTimetable}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3.5 rounded-xl transition"
            >
              Save Timetable →
            </button>
          </div>
        )}

        {activeTab === 'help' && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-white font-bold text-lg">Contact Admin</h3>
              <p className="text-zinc-500 text-sm mt-1">
                Send a message to the Eagle Elites admin team
              </p>
            </div>

            <textarea
              value={helpMessage}
              onChange={(e) => setHelpMessage(e.target.value)}
              rows={5}
              placeholder="Describe your issue or question..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition resize-none"
            />

            {helpSuccess && (
              <div className="bg-green-950/60 border border-green-800 text-green-400 px-4 py-3 rounded-xl text-sm">
                ✅ Message sent! Admin will respond shortly.
              </div>
            )}

            <button
              onClick={handleSendHelp}
              disabled={!helpMessage.trim() || sendingHelp}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3.5 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sendingHelp ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Sending...
                </>
              ) : (
                'Send Message →'
              )}
            </button>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-bold text-lg">My Profile</h3>
              <div className="space-y-3">
                {[
                  { label: 'Full Name', value: profile?.full_name },
                  { label: 'Email', value: profile?.email },
                  { label: 'Role', value: profile?.role },
                  {
                    label: 'Destination',
                    value: profile?.destination || 'Not assigned yet',
                  },
                  { label: 'Fee Status', value: profile?.fee_status },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2 border-b border-zinc-800"
                  >
                    <p className="text-zinc-500 text-sm">{item.label}</p>
                    <p className="text-white text-sm font-medium capitalize">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-bold">Change Password</h3>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                  🔒
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 characters)"
                  className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-400 transition"
                />
              </div>

              {passwordError && (
                <p className="text-red-400 text-sm">⚠️ {passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-green-400 text-sm">
                  ✅ Password updated successfully!
                </p>
              )}

              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-xl transition disabled:opacity-30"
              >
                {changingPassword ? 'Updating...' : 'Update Password →'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
