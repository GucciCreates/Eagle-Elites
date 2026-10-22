'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getPakistanDate, getPakistanWeekStart } from '@/lib/date/pakistan';
import PaymentSettingsTab from '@/components/admin/payment-settings-tab';
import TimeOptionsTab from '@/components/admin/time-options-tab';
import WhatsAppTab from '@/components/admin/whatsapp-tab';
import ApplicationsTab, { type ApplicationRow } from '@/components/admin/applications-tab';
import ProofViewer from '@/components/admin/proof-viewer';
import SectionLoading from '@/components/section-loading';
import { notifyWhatsApp, type NotifyResponse } from '@/lib/whatsapp/client';
import { normalizePkPhone } from '@/lib/phone';

function describeWhatsApp(result: NotifyResponse) {
  if (!result.ok) return `WhatsApp: ${result.error ?? 'failed'}`;
  if (result.configured === false)
    return 'WhatsApp is not configured; nothing sent.';
  return `WhatsApp: ${result.sent ?? 0} sent, ${result.failed ?? 0} failed, ${result.skipped ?? 0} skipped.`;
}

type Student = {
  id: string;
  full_name: string;
  email: string;
  status?: string;
  fee_status: string;
  institution: string | null;
  route_id: string | null;
  departure_group_id?: string | null;
  cnic_last4?: string | null;
  user_type?: string | null;
  department?: string | null;
  pickup_area?: string | null;
  payment_proof_url?: string | null;
  phone?: string | null;
  fee_due_date?: string | null;
  coaster_number?: string;
  driver_name?: string;
  driver_contact?: string;
  routes?: { name: string };
};

type Route = { id: string; name: string; price: number };
type Coaster = { id: string; coaster_number: string; vehicle_type?: string; seat_capacity?: number; maintenance_status?: string; default_route_id?: string | null };
type Driver = { id: string; email: string; full_name: string; phone: string | null; cnic?: string | null; usual_vehicle_id?: string | null; active: boolean };
type HelpMessage = {
  id: string;
  message: string;
  status: string;
  reply: string | null;
  created_at: string;
  is_urgent?: boolean;
  admin_read_at?: string | null;
  profiles?: { full_name: string; email: string };
};
type ActivityEntry = { id: string; action: string; details: Record<string, unknown>; created_at: string };
type Holiday = { id: string; date: string; reason: string };
type Notification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  target_type?: string;
  target_value?: string | null;
};
type DepartureSelection = { student_id: string; slot_id: string; selection_date: string };
type AttendanceRecord = { student_id: string; assignment_date: string; driver_id?: string | null; driver_name?: string | null; attendance_status: 'present' | 'absent' | null; attendance_marked_at?: string | null };
type Application = ApplicationRow;
type DepartureGroup = {
  id: string;
  university: string;
  department: string;
  description: string;
  active: boolean;
};
type DepartureSlot = {
  id: string;
  group_id: string;
  slot_date: string;
  slot_number: number;
  pickup_time: string;
  departure_time: string;
  notes: string;
  status: string;
};
type SlotDraft = {
  slot_number: number;
  pickup_time: string;
  departure_time: string;
  notes: string;
  status: string;
};
type DailyGroup = {
  route_id: string;
  route_name: string;
  students: Student[];
};
type AssignmentGroup = {
  coaster_id?: string;
  driver_id?: string;
};
type DailyAssignment = { id: string; student_id: string; assignment_date: string; route_id?: string | null; coaster_id: string | null; driver_id: string | null; seat_confirmed: boolean; profiles?: { full_name: string; route_id: string | null } | null; coasters?: { coaster_number: string; seat_capacity: number } | null };
type WeeklyPlanRow = { student_id: string; week_start: string; day_of_week: string; profiles?: { full_name: string; route_id: string | null; routes?: { name: string } | null } | null; pickup_points?: { name: string } | null };
type FeePayment = { student_id: string; fee_month: string; amount: number; recorded_at: string };

const ADMIN_NAV_GROUPS = [
  { key: 'workspace', label: 'Workspace', tabs: ['overview', 'activity'] },
  { key: 'people', label: 'People', tabs: ['students', 'applications', 'drivers', 'messages'] },
  { key: 'operations', label: 'Operations', tabs: ['schedule', 'assignments', 'departures', 'attendance', 'vehicles', 'holidays', 'times'] },
  { key: 'finance', label: 'Finance', tabs: ['fees', 'pricing', 'settings'] },
  { key: 'communications', label: 'Communications', tabs: ['announcements', 'whatsapp'] },
] as const;

const ADMIN_TAB_GROUP = Object.fromEntries(
  ADMIN_NAV_GROUPS.flatMap((group) => group.tabs.map((tab) => [tab, group.key])),
) as Record<string, string>;

export default function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [coasters, setCoasters] = useState<Coaster[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [helpMessages, setHelpMessages] = useState<HelpMessage[]>([]);
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTabPending, startTabTransition] = useTransition();
  const [adminReady, setAdminReady] = useState(false);
  const [departureStatusError, setDepartureStatusError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [activeNavGroup, setActiveNavGroup] = useState('workspace');
  const [messageFilter, setMessageFilter] = useState<'open' | 'resolved' | 'all' | 'unread'>('open');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return window.localStorage.getItem('eagle-admin-theme') === 'light' ? 'light' : 'dark';
  });
  const [studentSearch, setStudentSearch] = useState('');
  const [studentRouteFilter, setStudentRouteFilter] = useState('all');
  const [studentFeeFilter, setStudentFeeFilter] = useState('all');
  const [studentUniversityFilter, setStudentUniversityFilter] = useState('all');
  const [studentDepartmentFilter, setStudentDepartmentFilter] = useState('all');
  const [studentPickupFilter, setStudentPickupFilter] = useState('all');
  const [studentSort, setStudentSort] = useState('name');
  const [studentSortDirection, setStudentSortDirection] = useState<'asc' | 'desc'>('asc');
  const [studentPage, setStudentPage] = useState(0);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkUpdatingFees, setBulkUpdatingFees] = useState(false);
  const [savingFeeStudent, setSavingFeeStudent] = useState<string | null>(null);
  const [studentListNotice, setStudentListNotice] = useState('');
  const [selectedDepartureIds, setSelectedDepartureIds] = useState<string[]>([]);
  const [departureSelections, setDepartureSelections] = useState<DepartureSelection[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(() => typeof window === 'undefined' ? '' : getPakistanDate());
  const [attendanceMonth, setAttendanceMonth] = useState(() => typeof window === 'undefined' ? '' : getPakistanDate().slice(0, 7));
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRecord[]>([]);
  const [attendanceMonthRows, setAttendanceMonthRows] = useState<AttendanceRecord[]>([]);
  const [attendanceError, setAttendanceError] = useState('');

  const [assignDate, setAssignDate] = useState(() =>
    typeof window === 'undefined' ? '' : getPakistanDate(),
  );
  const [groupAssignments, setGroupAssignments] = useState<
    Record<string, AssignmentGroup>
  >({});
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');
  const [driverForm, setDriverForm] = useState({ fullName: '', email: '', phone: '', cnic: '', usualVehicleId: '' });
  const [creatingDriver, setCreatingDriver] = useState(false);
  const [driverNotice, setDriverNotice] = useState('');
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [weeklyAssignments, setWeeklyAssignments] = useState<DailyAssignment[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanRow[]>([]);
  const [todayAssignments, setTodayAssignments] = useState<DailyAssignment[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [feeSearch, setFeeSearch] = useState('');
  const [newVehicleDetails, setNewVehicleDetails] = useState({ type: 'van', capacity: '28', routeId: '' });

  const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});
  const [savingPrice, setSavingPrice] = useState<string | null>(null);
  const [priceSuccess, setPriceSuccess] = useState<string | null>(null);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [savingStudent, setSavingStudent] = useState(false);

  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);

  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [announcementSuccess, setAnnouncementSuccess] = useState(false);
  const [announcementWhatsApp, setAnnouncementWhatsApp] = useState(false);
  const [announcementTargetType, setAnnouncementTargetType] = useState('all');
  const [announcementTargetValue, setAnnouncementTargetValue] = useState('');
  const [holidayWhatsApp, setHolidayWhatsApp] = useState(true);
  const [whatsAppNotice, setWhatsAppNotice] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);

  const [holidayDate, setHolidayDate] = useState('');
  const [holidayReason, setHolidayReason] = useState('');
  const [addingHoliday, setAddingHoliday] = useState(false);

  const [newVehicle, setNewVehicle] = useState('');
  const [feeReportMonth, setFeeReportMonth] = useState(() => typeof window === 'undefined' ? '' : getPakistanDate().slice(0, 7));
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [newRoutePrice, setNewRoutePrice] = useState('');
  const [departureGroups, setDepartureGroups] = useState<DepartureGroup[]>([]);
  const [departureSlots, setDepartureSlots] = useState<DepartureSlot[]>([]);
  const [slotDate, setSlotDate] = useState(() =>
    typeof window === 'undefined' ? '' : getPakistanDate(),
  );
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [slotInputs, setSlotInputs] = useState<Record<number, SlotDraft>>({
    1: {
      slot_number: 1,
      pickup_time: '',
      departure_time: '',
      notes: '',
      status: 'available',
    },
    2: {
      slot_number: 2,
      pickup_time: '',
      departure_time: '',
      notes: '',
      status: 'available',
    },
    3: {
      slot_number: 3,
      pickup_time: '',
      departure_time: '',
      notes: '',
      status: 'available',
    },
    4: {
      slot_number: 4,
      pickup_time: '',
      departure_time: '',
      notes: '',
      status: 'available',
    },
    5: {
      slot_number: 5,
      pickup_time: '',
      departure_time: '',
      notes: '',
      status: 'available',
    },
  });
  const [savingSlots, setSavingSlots] = useState(false);
  const [slotsSuccess, setSlotsSuccess] = useState(false);
  const [newGroup, setNewGroup] = useState({
    university: '',
    department: '',
    description: '',
  });
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupSuccess, setGroupSuccess] = useState(false);

  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const changeTab = (tab: string) => {
    setActiveNavGroup(ADMIN_TAB_GROUP[tab] ?? 'workspace');
    startTabTransition(() => setActiveTab(tab));
  };

  const logAdminActivity = async (action: string, details: Record<string, unknown>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('admin_activity_log')
      .insert({ admin_id: user.id, action, details: { ...details, admin: user.email ?? 'Admin' } }).select('id, action, details, created_at').single();
    if (data) setActivityEntries((current) => [data as ActivityEntry, ...current].slice(0, 100));
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/admin/login');
        return;
      }

      const { data: adminCheck } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (!adminCheck) {
        router.push('/admin/login');
        return;
      }
      setAdminReady(true);

      const [
        { data: studentsData },
        { data: routesData },
        { data: coastersData },
        { data: driversData },
        { data: helpData },
        { data: holidaysData },
        { data: notificationsData },
        { data: applicationsData },
        { data: departureGroupsData },
        { data: departureSlotsData, error: departureSlotsError },
        { data: departureSelectionsData, error: departureSelectionsError },
        { data: activityData },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, routes!profiles_route_id_fkey(name)')
          .eq('role', 'student')
          .order('full_name'),
        supabase.from('routes').select('*'),
        supabase.from('coasters').select('*'),
        supabase.from('drivers').select('id, email, full_name, phone, cnic, usual_vehicle_id, active').order('full_name'),
        supabase
          .from('help_messages')
          .select('*, profiles(full_name, email)')
          .order('created_at', { ascending: false }),
        supabase.from('holidays').select('*').order('date'),
        supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .eq('status', 'pending')
          .order('applied_at', { ascending: true }),
        supabase
          .from('departure_groups')
          .select('*')
          .eq('active', true)
          .order('university'),
        supabase
          .from('departure_slots')
          .select('*')
          .order('slot_date', { ascending: false })
          .order('slot_number', { ascending: true }),
        supabase
          .from('departure_selections')
          .select('student_id, slot_id, selection_date')
          .eq('selection_date', getPakistanDate()),
        supabase.from('admin_activity_log').select('id, action, details, created_at').order('created_at', { ascending: false }).limit(100),
      ]);

      if (studentsData) setStudents(studentsData as Student[]);
      if (routesData) setRoutes(routesData as Route[]);
      if (coastersData) setCoasters(coastersData as Coaster[]);
      if (driversData) setDrivers(driversData as Driver[]);
      if (helpData) setHelpMessages(helpData as HelpMessage[]);
      if (holidaysData) setHolidays(holidaysData as Holiday[]);
      if (notificationsData)
        setNotifications(notificationsData as Notification[]);
      if (applicationsData) setApplications(applicationsData as Application[]);
      if (activityData) setActivityEntries(activityData as ActivityEntry[]);
      if (departureGroupsData)
        setDepartureGroups(departureGroupsData as DepartureGroup[]);
      if (departureSlotsData)
        setDepartureSlots(departureSlotsData as DepartureSlot[]);
      if (departureSlotsError || departureSelectionsError) {
        setDepartureStatusError(
          departureSlotsError?.message ?? departureSelectionsError?.message ??
            'Departure selection data is temporarily unavailable.',
        );
      }
      if (departureSelectionsData)
        setSelectedDepartureIds(
          departureSelectionsData.map((selection) => selection.student_id),
        );
      if (departureSelectionsData)
        setDepartureSelections(departureSelectionsData as DepartureSelection[]);
      setLoading(false);
    };

    void init();
  }, [router, supabase]);

  useEffect(() => {
    if (!adminReady) return;
    const refreshApplications = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('applied_at', { ascending: true });
      if (!error && data) setApplications(data as Application[]);
    };

    const channel = supabase
      .channel('admin-application-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => void refreshApplications(),
      )
      .subscribe();
    const interval = window.setInterval(() => void refreshApplications(), 60_000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [adminReady, supabase]);

  useEffect(() => {
    if (!adminReady || !attendanceDate || !attendanceMonth) return;
    let cancelled = false;
    const monthStart = `${attendanceMonth}-01`;
    const [year, month] = attendanceMonth.split('-').map(Number);
    const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    void Promise.all([
      supabase.from('daily_assignments').select('student_id, assignment_date, driver_id, driver_name, attendance_status, attendance_marked_at').eq('assignment_date', attendanceDate),
      supabase.from('daily_assignments').select('student_id, assignment_date, driver_id, driver_name, attendance_status, attendance_marked_at').gte('assignment_date', monthStart).lt('assignment_date', nextMonth),
    ]).then(([daily, monthly]) => {
      if (cancelled) return;
      const error = daily.error ?? monthly.error;
      setAttendanceError(error?.message ?? '');
      if (daily.data) setAttendanceRows(daily.data as AttendanceRecord[]);
      if (monthly.data) setAttendanceMonthRows(monthly.data as AttendanceRecord[]);
    });
    return () => { cancelled = true; };
  }, [adminReady, attendanceDate, attendanceMonth, supabase]);

  useEffect(() => {
    if (!adminReady || !assignDate) return;
    const weekStart = getPakistanWeekStart();
    const weekEndDate = new Date(`${weekStart}T00:00:00Z`);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
    const weekEnd = weekEndDate.toISOString().slice(0, 10);
    void Promise.all([
      supabase.from('daily_assignments').select('id, student_id, assignment_date, route_id, coaster_id, driver_id, seat_confirmed, profiles!inner(full_name, route_id), coasters(coaster_number, seat_capacity)').gte('assignment_date', weekStart).lte('assignment_date', weekEnd),
      supabase.from('daily_assignments').select('id, student_id, assignment_date, route_id, coaster_id, driver_id, seat_confirmed, profiles!inner(full_name, route_id), coasters(coaster_number, seat_capacity)').eq('assignment_date', assignDate),
      supabase.from('weekly_schedules').select('student_id, week_start, day_of_week, profiles!inner(full_name, route_id, routes(name)), pickup_points(name)').eq('week_start', getPakistanWeekStart(1)),
    ]).then(([week, today, plan]) => {
      if (week.data) setWeeklyAssignments(week.data as unknown as DailyAssignment[]);
      if (today.data) setTodayAssignments(today.data as unknown as DailyAssignment[]);
      if (plan.data) setWeeklyPlan(plan.data as unknown as WeeklyPlanRow[]);
    });
  }, [adminReady, assignDate, supabase]);

  useEffect(() => {
    if (!adminReady || !feeReportMonth) return;
    void supabase.from('fee_payments').select('student_id, fee_month, amount, recorded_at').order('fee_month', { ascending: false }).limit(5000)
      .then(({ data }) => { if (data) setFeePayments(data as FeePayment[]); });
  }, [adminReady, feeReportMonth, supabase]);

  useEffect(() => {
    if (!adminReady) return;
    const refreshSelections = async () => {
      const { data, error } = await supabase
        .from('departure_selections')
        .select('student_id, slot_id, selection_date')
        .eq('selection_date', getPakistanDate());
      if (error || !data) return;
      setDepartureSelections(data as DepartureSelection[]);
      setSelectedDepartureIds(data.map((selection) => selection.student_id));
    };
    const channel = supabase
      .channel('admin-departure-selection-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departure_selections' }, () => void refreshSelections())
      .subscribe();
    const interval = window.setInterval(() => void refreshSelections(), 60_000);
    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [adminReady, supabase]);

  const dailyGroups: DailyGroup[] = routes
    .map((route) => ({
      route_id: route.id,
      route_name: route.name,
      students: students.filter((s) => s.route_id === route.id),
    }))
    .filter((group) => group.students.length > 0);

  const matchingStudents = students.filter((student) => {
    const query = studentSearch.trim().toLocaleLowerCase();
    const matchesSearch =
      !query ||
      [student.full_name, student.email, student.institution, student.routes?.name, student.cnic_last4, student.department, student.pickup_area]
        .some((value) => value?.toLocaleLowerCase().includes(query));
    const matchesRoute =
      studentRouteFilter === 'all' ||
      (studentRouteFilter === 'unassigned'
        ? !student.route_id
        : student.route_id === studentRouteFilter);
    const matchesFee =
      studentFeeFilter === 'all' || student.fee_status === studentFeeFilter;
    const group = departureGroups.find((item) => item.id === student.departure_group_id);
    const matchesUniversity = studentUniversityFilter === 'all' ||
      (studentUniversityFilter === 'unassigned' ? !student.institution : student.institution === studentUniversityFilter || group?.university === studentUniversityFilter);
    const matchesDepartment = studentDepartmentFilter === 'all' || group?.department === studentDepartmentFilter || student.department === studentDepartmentFilter;
    const matchesPickup = studentPickupFilter === 'all' || student.pickup_area === studentPickupFilter;
    return matchesSearch && matchesRoute && matchesFee && matchesUniversity && matchesDepartment && matchesPickup;
  }).sort((a, b) => {
    const groupA = departureGroups.find((item) => item.id === a.departure_group_id);
    const groupB = departureGroups.find((item) => item.id === b.departure_group_id);
    const value = (student: Student, group: DepartureGroup | undefined) => ({
      name: student.full_name, enrollment: student.cnic_last4 ?? '', university: student.institution ?? group?.university ?? '',
      department: student.department ?? group?.department ?? '', pickup: student.pickup_area ?? '', fee: student.fee_status ?? '', route: student.routes?.name ?? '',
    })[studentSort as 'name' | 'enrollment' | 'university' | 'department' | 'pickup' | 'fee' | 'route'];
    const compared = String(value(a, groupA)).localeCompare(String(value(b, groupB)), undefined, { numeric: true, sensitivity: 'base' });
    return studentSortDirection === 'asc' ? compared : -compared;
  });
  const uniqueOptions = (values: (string | null | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
  const universities = uniqueOptions([...departureGroups.map((group) => group.university), ...students.map((student) => student.institution)]);
  const departments = uniqueOptions([...departureGroups.map((group) => group.department), ...students.map((student) => student.department)]);
  const pickupAreas = uniqueOptions(students.map((student) => student.pickup_area));
  const studentsPerPage = 50;
  const pageCount = Math.max(1, Math.ceil(matchingStudents.length / studentsPerPage));
  const visibleStudents = matchingStudents.slice(
    studentPage * studentsPerPage,
    (studentPage + 1) * studentsPerPage,
  );
  const allVisibleSelected =
    visibleStudents.length > 0 &&
    visibleStudents.every((student) => selectedStudentIds.includes(student.id));
  const todaySlotGroups = new Set(
    departureSlots
      .filter((slot) => slot.slot_date === getPakistanDate())
      .map((slot) => slot.group_id),
  );
  const studentsWithoutDepartureSelection = students.filter(
    (student) =>
      student.departure_group_id &&
      todaySlotGroups.has(student.departure_group_id) &&
      !selectedDepartureIds.includes(student.id),
  );

  const handleSaveAssignments = async () => {
    setSavingAssignment(true);
    setAssignmentError('');
    const inserts: Record<string, unknown>[] = [];

    for (const [routeId, assignment] of Object.entries(groupAssignments)) {
      if (!assignment.coaster_id || !assignment.driver_id) continue;
      const driver = drivers.find((item) => item.id === assignment.driver_id);
      if (!driver) continue;

      const group = dailyGroups.find((item) => item.route_id === routeId);
      if (!group) continue;

      for (const student of group.students) {
        inserts.push({
          student_id: student.id,
          route_id: group.route_id,
          coaster_id: assignment.coaster_id,
          driver_name: driver.full_name,
          driver_contact: driver.phone || '',
          driver_id: driver.id,
          assignment_date: assignDate,
          seat_confirmed: false,
        });
      }
    }

    if (inserts.length === 0) {
      setAssignmentError('Choose an active vehicle and driver account for at least one route.');
      setSavingAssignment(false);
      return;
    }
    {
      const { error } = await supabase
        .from('daily_assignments')
        .upsert(inserts, { onConflict: 'student_id,assignment_date' });

      if (error) {
        setAssignmentError(`Could not save assignments: ${error.message}`);
        setSavingAssignment(false);
        return;
      }
      // Only students whose vehicle/driver changed get a new message.
      void notifyWhatsApp({
        event: 'assignment',
        date: assignDate,
        studentIds: inserts.map((row) => String(row.student_id)),
      }).then((result) => setWhatsAppNotice(describeWhatsApp(result)));
    }

    setAssignSuccess(true);
    setTimeout(() => setAssignSuccess(false), 3000);
    setSavingAssignment(false);
  };

  const handleSaveStudent = async () => {
    if (!editingStudent) return;
    setSavingStudent(true);

    await supabase
      .from('profiles')
      .update({
        institution: editingStudent.institution,
        route_id: editingStudent.route_id,
        fee_status: editingStudent.fee_status,
      })
      .eq('id', editingStudent.id);

    setStudents((prev) =>
      prev.map((student) =>
        student.id === editingStudent.id
          ? { ...student, ...editingStudent }
          : student,
      ),
    );
    setEditingStudent(null);
    setSavingStudent(false);
  };

  const handleMarkSelectedPaid = async () => {
    if (!selectedStudentIds.length) return;
    setBulkUpdatingFees(true);
    setStudentListNotice('');
    const { error } = await supabase
      .from('profiles')
      .update({ fee_status: 'paid' })
      .in('id', selectedStudentIds);
    if (error) {
      setStudentListNotice(`Couldn’t update fees: ${error.message}`);
    } else {
      const selected = new Set(selectedStudentIds);
      setStudents((prev) =>
        prev.map((student) =>
          selected.has(student.id) ? { ...student, fee_status: 'paid' } : student,
        ),
      );
      setStudentListNotice(
        `Marked ${selectedStudentIds.length} student${selectedStudentIds.length === 1 ? '' : 's'} as paid.`,
      );
      void logAdminActivity('Marked students as paid', { count: selectedStudentIds.length, student_ids: selectedStudentIds });
      const { data: paymentRows } = await supabase.from('fee_payments').select('student_id, fee_month, amount, recorded_at').order('fee_month', { ascending: false }).limit(5000);
      if (paymentRows) setFeePayments(paymentRows as FeePayment[]);
      setSelectedStudentIds([]);
      setStudentPage(0);
    }
    setBulkUpdatingFees(false);
  };

  const handleMarkStudentPaid = async (studentId: string) => {
    setSavingFeeStudent(studentId);
    const { error } = await supabase.from('profiles').update({ fee_status: 'paid' }).eq('id', studentId);
    if (error) setStudentListNotice(`Couldn’t record payment: ${error.message}`);
    else {
      const student = students.find((item) => item.id === studentId);
      void logAdminActivity('Marked student as paid', { student_id: studentId, student_name: student?.full_name });
      setStudents((current) => current.map((student) => student.id === studentId ? { ...student, fee_status: 'paid' } : student));
      const { data } = await supabase.from('fee_payments').select('student_id, fee_month, amount, recorded_at').order('fee_month', { ascending: false }).limit(5000);
      if (data) setFeePayments(data as FeePayment[]);
    }
    setSavingFeeStudent(null);
  };

  const handleCreateDriver = async () => {
    if (creatingDriver) return;
    setCreatingDriver(true);
    setDriverNotice('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Your session expired. Sign in again.');
      const response = await fetch('/api/admin/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(driverForm),
      });
      const result = await response.json() as { driver?: Driver; error?: string };
      if (!response.ok || !result.driver) throw new Error(result.error ?? 'Could not create the driver account.');
      setDrivers((current) => [...current, result.driver!].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setDriverForm({ fullName: '', email: '', phone: '', cnic: '', usualVehicleId: '' });
      setDriverNotice('Driver account created. An invitation email was sent so they can set their password.');
    } catch (error) {
      setDriverNotice(error instanceof Error ? error.message : 'Could not create the driver account.');
    } finally {
      setCreatingDriver(false);
    }
  };

  const handleToggleDriver = async (driver: Driver) => {
    const { error } = await supabase.from('drivers').update({ active: !driver.active }).eq('id', driver.id);
    if (error) setDriverNotice(`Could not update driver: ${error.message}`);
    else setDrivers((current) => current.map((item) => item.id === driver.id ? { ...item, active: !driver.active } : item));
  };

  const handleAddDepartureGroup = async () => {
    if (!newGroup.university || !newGroup.department) return;
    setAddingGroup(true);

    const { data, error } = await supabase
      .from('departure_groups')
      .insert({
        university: newGroup.university,
        department: newGroup.department,
        description: newGroup.description,
        active: true,
      })
      .select()
      .single();

    if (!error && data) {
      setDepartureGroups((prev) => [data as DepartureGroup, ...prev]);
      setSelectedGroupId(data.id);
      setNewGroup({ university: '', department: '', description: '' });
      setGroupSuccess(true);
      setTimeout(() => setGroupSuccess(false), 3000);
    }

    setAddingGroup(false);
  };

  const handleSaveDepartureSlots = async () => {
    if (!selectedGroupId || !slotDate) return;
    setSavingSlots(true);

    const entries = Array.from({ length: 5 }, (_, index) => index + 1)
      .map((slotNumber) => slotInputs[slotNumber])
      .filter(
        (entry) =>
          Boolean(entry?.pickup_time) ||
          Boolean(entry?.departure_time) ||
          Boolean(entry?.notes),
      )
      .map((entry) => ({
        group_id: selectedGroupId,
        slot_date: slotDate,
        slot_number: entry.slot_number,
        pickup_time: entry.pickup_time || '08:00',
        departure_time: entry.departure_time || '09:00',
        notes: entry.notes || '',
        status: entry.status || 'available',
      }));

    if (entries.length > 0) {
      const { error } = await supabase
        .from('departure_slots')
        .upsert(entries, { onConflict: 'group_id,slot_date,slot_number' });
      if (error) {
        setWhatsAppNotice(`Could not post departure slots: ${error.message}`);
        setSavingSlots(false);
        return;
      }
    }

    const { data } = await supabase
      .from('departure_slots')
      .select('*')
      .order('slot_date', { ascending: false })
      .order('slot_number', { ascending: true });

    if (data) setDepartureSlots(data as DepartureSlot[]);
    if (entries.length) void logAdminActivity('Posted departure slots', { group: departureGroups.find((group) => group.id === selectedGroupId)?.university, date: slotDate, count: entries.length });

    setSlotsSuccess(true);
    setTimeout(() => setSlotsSuccess(false), 3000);
    setSavingSlots(false);
  };

  const handleToggleDepartureSlotStatus = async (
    slotId: string,
    currentStatus: string,
  ) => {
    const nextStatus =
      currentStatus === 'available' ? 'unavailable' : 'available';
    await supabase
      .from('departure_slots')
      .update({ status: nextStatus })
      .eq('id', slotId);

    setDepartureSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, status: nextStatus } : slot,
      ),
    );
  };

  const handleSendReply = async (messageId: string) => {
    if (!replyText[messageId]?.trim()) return;
    setSendingReply(messageId);

    const { error } = await supabase
      .from('help_messages')
      .update({
        reply: replyText[messageId],
        replied_at: new Date().toISOString(),
        status: 'resolved',
      })
      .eq('id', messageId);
    if (error) { setSendingReply(null); setWhatsAppNotice(`Could not send reply: ${error.message}`); return; }

    setHelpMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, reply: replyText[messageId], status: 'resolved' }
          : message,
      ),
    );

    setReplyText((prev) => ({ ...prev, [messageId]: '' }));
    void logAdminActivity('Resolved help message', { message_id: messageId });
    setSendingReply(null);
  };

  const updateHelpMessage = async (message: HelpMessage, changes: Partial<HelpMessage>) => {
    const { error } = await supabase.from('help_messages').update(changes).eq('id', message.id);
    if (error) { setWhatsAppNotice(`Could not update message: ${error.message}`); return; }
    setHelpMessages((current) => current.map((row) => row.id === message.id ? { ...row, ...changes } : row));
    if ('is_urgent' in changes) void logAdminActivity(changes.is_urgent ? 'Marked help message urgent' : 'Cleared help message urgency', { message_id: message.id });
    if ('admin_read_at' in changes) void logAdminActivity(changes.admin_read_at ? 'Read help message' : 'Marked help message unread', { message_id: message.id });
  };

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) return;
    setSendingAnnouncement(true);

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        title: announcementTitle,
        message: announcementMessage,
        type: 'general',
        target_type: announcementTargetType,
        target_value: ['university', 'departure_group'].includes(announcementTargetType) ? announcementTargetValue : null,
      })
      .select()
      .single();

    if (error || !data) {
      setWhatsAppNotice(`Announcement failed: ${error?.message ?? 'Could not save the announcement.'}`);
      setSendingAnnouncement(false);
      return;
    }
    void logAdminActivity('Posted announcement', { title: announcementTitle, audience: announcementTargetType });
    setNotifications((prev) => [data as Notification, ...prev]);

    if (data && announcementWhatsApp) {
      const result = await notifyWhatsApp({
        event: 'announcement',
        title: announcementTitle,
        message: announcementMessage,
        targetType: announcementTargetType,
        targetValue: announcementTargetValue || null,
      });
      setWhatsAppNotice(describeWhatsApp(result));
    }

    setAnnouncementTitle('');
    setAnnouncementMessage('');
    setAnnouncementSuccess(true);
    setTimeout(() => setAnnouncementSuccess(false), 3000);
    setSendingAnnouncement(false);
  };

  const handleResendAnnouncement = async (item: Notification) => {
    if (
      !window.confirm(
        'Send this announcement to its saved audience on WhatsApp?',
      )
    )
      return;
    setResendingId(item.id);
    const result = await notifyWhatsApp({
      event: 'announcement',
      title: item.title,
      message: item.message,
      targetType: item.target_type ?? 'all',
      targetValue: item.target_value ?? null,
    });
    setWhatsAppNotice(describeWhatsApp(result));
    setResendingId(null);
  };

  const handleAddHoliday = async () => {
    if (!holidayDate || !holidayReason) return;
    setAddingHoliday(true);

    const { data } = await supabase
      .from('holidays')
      .insert({ date: holidayDate, reason: holidayReason })
      .select()
      .single();

    if (data) {
      setHolidays((prev) =>
        [...prev, data as Holiday].sort((a, b) => a.date.localeCompare(b.date)),
      );
      if (holidayWhatsApp) {
        void notifyWhatsApp({
          event: 'holiday',
          date: holidayDate,
          reason: holidayReason,
        }).then((result) => setWhatsAppNotice(describeWhatsApp(result)));
      }
    }

    setHolidayDate('');
    setHolidayReason('');
    setAddingHoliday(false);
  };

  const handleDeleteHoliday = async (id: string) => {
    await supabase.from('holidays').delete().eq('id', id);
    setHolidays((prev) => prev.filter((holiday) => holiday.id !== id));
  };

  const handleAddVehicle = async () => {
    if (!newVehicle.trim()) return;
    setAddingVehicle(true);

    const { data } = await supabase
      .from('coasters')
      .insert({
        coaster_number: newVehicle.trim(),
        vehicle_type: newVehicleDetails.type,
        seat_capacity: Number(newVehicleDetails.capacity) || 28,
        default_route_id: newVehicleDetails.routeId || null,
      })
      .select()
      .single();

    if (data) setCoasters((prev) => [...prev, data as Coaster]);

    setNewVehicle('');
    setAddingVehicle(false);
  };

  const handleUpdateVehicle = async (vehicle: Coaster, changes: Partial<Coaster>) => {
    const { error } = await supabase.from('coasters').update(changes).eq('id', vehicle.id);
    if (!error) setCoasters((current) => current.map((item) => item.id === vehicle.id ? { ...item, ...changes } : item));
  };

  const handleSeatReminder = async () => {
    const unconfirmedIds = todayAssignments.filter((item) => !item.seat_confirmed).map((item) => item.student_id);
    if (!unconfirmedIds.length) return;
    const result = await notifyWhatsApp({ event: 'announcement_students', studentIds: unconfirmedIds, title: 'Confirm your seat', message: `Please confirm your seat for your trip on ${assignDate}. Open the Eagle Elites student dashboard to confirm.` });
    setWhatsAppNotice(describeWhatsApp(result));
  };

  const handleFeeReminders = async (studentIds: string[]) => {
    if (!studentIds.length) return;
    const result = await notifyWhatsApp({ event: 'announcement_students', studentIds, title: 'Monthly fee reminder', message: `Our records show your ${feeReportMonth} transport fee is unpaid. Please contact Eagle Elites if you have already paid.` });
    setWhatsAppNotice(describeWhatsApp(result));
  };

  const downloadMonthlyInvoice = () => {
    const monthStart = `${feeReportMonth}-01`;
    const paidByStudent = new Map(feePayments.filter((payment) => payment.fee_month === monthStart).map((payment) => [payment.student_id, payment]));
    const rows = students.filter((student) => student.status === 'active').map((student) => {
      const paid = paidByStudent.get(student.id);
      const expected = routes.find((route) => route.id === student.route_id)?.price ?? 0;
      const due = student.fee_due_date ?? `${feeReportMonth}-01`;
      const overdue = student.fee_status !== 'paid' ? Math.max(0, Math.floor((Date.now() - new Date(`${due}T00:00:00`).getTime()) / 86400000)) : 0;
      return [student.full_name, student.email, student.institution ?? '', student.routes?.name ?? '', expected, paid ? paid.amount : 0, paid ? 'Paid' : 'Unpaid', overdue];
    });
    const csv = [['Student', 'Email', 'University', 'Route', 'Expected PKR', 'Collected PKR', 'Status', 'Days overdue'], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `eagle-elites-fees-${feeReportMonth}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleUpdatePrice = async (routeId: string) => {
    const rawValue = editingPrice[routeId];
    const newPrice = Number(rawValue);

    if (!rawValue || !Number.isFinite(newPrice) || newPrice <= 0) {
      return;
    }

    setSavingPrice(routeId);

    const { error } = await supabase
      .from('routes')
      .update({ price: newPrice })
      .eq('id', routeId);

    if (!error) {
      setRoutes((prev) =>
        prev.map((route) =>
          route.id === routeId ? { ...route, price: newPrice } : route,
        ),
      );
      setPriceSuccess(routeId);
      setTimeout(() => setPriceSuccess(null), 3000);
    }

    setSavingPrice(null);
  };

  const handleAddRoute = async () => {
    if (!newRouteName.trim() || !newRoutePrice.trim()) return;

    const parsedPrice = Number(newRoutePrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return;

    const { data } = await supabase
      .from('routes')
      .insert({ name: newRouteName.trim(), price: parsedPrice })
      .select()
      .single();

    if (data) setRoutes((prev) => [...prev, data as Route]);

    setNewRouteName('');
    setNewRoutePrice('');
  };

  const unpaidCount = students.filter(
    (student) => student.fee_status !== 'paid',
  ).length;
  const openMessages = helpMessages.filter(
    (message) => message.status === 'open',
  ).length;
  const unreadMessages = helpMessages.filter((message) => !message.admin_read_at).length;
  const urgentMessages = helpMessages.filter((message) => message.is_urgent && message.status !== 'resolved').length;
  const today = assignDate || '';
  const activeStudentCount = students.filter((student) => student.status === 'active').length;
  const studentsWithoutSelection = Math.max(0, activeStudentCount - selectedDepartureIds.length);
  const awaitingSeatConfirmations = todayAssignments.filter((assignment) => !assignment.seat_confirmed).length;
  const upcomingHoliday = holidays.find((holiday) => holiday.date >= today);
  const routeSummaries = routes.map((route) => {
    const routeStudents = students.filter((student) => student.route_id === route.id);
    const activeStudents = routeStudents.filter((student) => student.status === 'active').length;
    const unpaidStudents = routeStudents.filter((student) => student.fee_status !== 'paid').length;
    const routeAssignments = todayAssignments.filter((assignment) =>
      (assignment.route_id ?? assignment.profiles?.route_id) === route.id,
    );
    const vehicle = routeAssignments[0]?.coasters ?? coasters.find(
      (item) => item.default_route_id === route.id && item.maintenance_status !== 'maintenance' && item.maintenance_status !== 'retired',
    );
    const assignedCount = routeAssignments.length;
    const capacity = vehicle?.seat_capacity ?? 0;
    return { route, routeStudents, activeStudents, unpaidStudents, routeAssignments, vehicle, assignedCount, capacity };
  });
  const unassignedActiveStudents = students.filter((student) => student.status === 'active' && !student.route_id).length;

  const tabs = [
    { key: 'overview', label: '📊', title: 'Overview' },
    { key: 'schedule', label: '🗓️', title: 'Weekly Schedule' },
    { key: 'students', label: '👥', title: 'Students' },
    {
      key: 'applications',
      label: '📋',
      title: 'Applications',
    },
    { key: 'assignments', label: '🚐', title: 'Daily Assignments' },
    { key: 'drivers', label: '🪪', title: 'Driver Accounts' },
    { key: 'departures', label: '🚍', title: 'Departures' },
    { key: 'attendance', label: '✅', title: 'Attendance' },
    { key: 'fees', label: '💳', title: 'Fees' },
    {
      key: 'messages',
      label: '💬',
      title: `Messages${openMessages > 0 ? ` (${openMessages})` : ''}`,
    },
    { key: 'announcements', label: '📢', title: 'Announcements' },
    { key: 'holidays', label: '📆', title: 'Holidays' },
    { key: 'vehicles', label: '🚌', title: 'Vehicles' },
    { key: 'pricing', label: '💰', title: 'Pricing' },
    { key: 'times', label: '🕒', title: 'Times' },
    { key: 'whatsapp', label: '🟢', title: 'WhatsApp' },
    { key: 'settings', label: '⚙️', title: 'Settings' },
    { key: 'activity', label: '🧾', title: 'Activity Log' },
  ];

  const tabBadge = (key: string) => ({
    overview: students.length,
    schedule: weeklyAssignments.length,
    applications: applications.length,
    students: students.length,
    assignments: todayAssignments.length,
    fees: unpaidCount,
    messages: unreadMessages,
    announcements: notifications.length,
    departures: Math.max(0, students.filter((student) => student.status === 'active').length - selectedDepartureIds.length),
    drivers: drivers.filter((driver) => driver.active).length,
    attendance: attendanceRows.filter((row) => row.attendance_status === null).length,
    activity: activityEntries.length,
    holidays: holidays.length,
    vehicles: coasters.length,
    pricing: routes.length,
    times: departureGroups.length,
    whatsapp: students.filter((student) => Boolean(normalizePkPhone(student.phone))).length,
    settings: 1,
  }[key] ?? 0);
  const navGroupAttention = (groupKey: string) => ({
    workspace: 0,
    people: applications.length + unreadMessages,
    operations: Math.max(0, students.filter((student) => student.status === 'active').length - selectedDepartureIds.length) + attendanceRows.filter((row) => row.attendance_status === null).length,
    finance: unpaidCount,
    communications: 0,
  }[groupKey] ?? 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070b] px-4 text-white">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#facc15] via-[#fbbf24] to-[#f59e0b] text-xl font-black text-slate-950">
            EE
          </div>
          <p className="text-lg font-medium text-zinc-200">
            Loading admin panel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen bg-[#080b10] text-white" data-admin-theme={theme}>
      <nav className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0b0f14]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-yellow-400/20 bg-gradient-to-br from-yellow-300/20 to-yellow-500/10 text-[11px] font-black tracking-[0.12em] text-yellow-200 shadow-[0_0_24px_rgba(250,204,21,0.12)]">
              EE
            </div>
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white">Eagle Elites</p>
              <h1 className="mt-0.5 text-[10px] font-medium tracking-wide text-zinc-500">Admin portal</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={() => setTheme((current) => { const next = current === 'dark' ? 'light' : 'dark'; window.localStorage.setItem('eagle-admin-theme', next); return next; })}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/admin/login');
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-2 shadow-[0_16px_38px_rgba(0,0,0,0.18)]">
          <nav aria-label="Admin workspaces" className="flex gap-1 overflow-x-auto border-b border-zinc-800 pb-2">
            {ADMIN_NAV_GROUPS.map((group) => {
              const selected = activeNavGroup === group.key;
              const attention = navGroupAttention(group.key);
              return <button key={group.key} type="button" aria-pressed={selected} onClick={() => changeTab(group.tabs[0])} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition ${selected ? 'bg-[#facc15] text-black shadow-[0_8px_20px_rgba(250,204,21,0.16)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                {group.label}
                {attention > 0 && <span className={`inline-flex min-w-5 justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ${selected ? 'bg-black/75' : 'bg-red-500'}`}>{attention > 99 ? '99+' : attention}</span>}
              </button>;
            })}
          </nav>
          <nav aria-label={`${activeNavGroup} sections`} className="flex gap-2 overflow-x-auto pt-2">
            {tabs.filter((tab) => ADMIN_TAB_GROUP[tab.key] === activeNavGroup).map((tab) => (
              <button key={tab.key} type="button" aria-current={activeTab === tab.key ? 'page' : undefined} onClick={() => changeTab(tab.key)} className={`flex min-h-9 shrink-0 items-center rounded-lg px-3 text-xs font-medium transition ${activeTab === tab.key ? 'bg-white/[0.1] text-white ring-1 ring-white/10' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'}`}>
                <span className="mr-1.5">{tab.label}</span>{tab.title}
                <span aria-label={`${tabBadge(tab.key)} ${tab.title.toLowerCase()}`} className={`ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ${['applications', 'fees', 'messages'].includes(tab.key) && tabBadge(tab.key) > 0 ? 'bg-red-500' : 'bg-zinc-700'}`}>{tabBadge(tab.key) > 99 ? '99+' : tabBadge(tab.key)}</span>
              </button>
            ))}
          </nav>
        </div>

        {isTabPending && <SectionLoading />}

        {whatsAppNotice && (
          <div
            role="status"
            className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300"
          >
            <span>{whatsAppNotice}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setWhatsAppNotice('')}
              className="text-zinc-500 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {activeTab === 'times' && <TimeOptionsTab groups={departureGroups} />}
        {activeTab === 'whatsapp' && <WhatsAppTab />}
        {activeTab === 'settings' && <PaymentSettingsTab />}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
              {[
                {
                  label: 'Total Students',
                  value: students.length,
                  icon: '👥',
                  color: 'text-white',
                  tab: 'students',
                },
                {
                  label: 'Pending Applications',
                  value: applications.length,
                  icon: '📋',
                  color: 'text-yellow-400',
                  tab: 'applications',
                },
                {
                  label: 'Unpaid Fees',
                  value: unpaidCount,
                  icon: '⚠️',
                  color: 'text-red-400',
                  tab: 'fees',
                },
                {
                  label: 'Open Messages',
                  value: openMessages,
                  icon: '💬',
                  color: 'text-yellow-400',
                  tab: 'messages',
                },
                {
                  label: 'Total Vehicles',
                  value: coasters.length,
                  icon: '🚐',
                  color: 'text-white',
                  tab: 'vehicles',
                },
              ].map((stat) => (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => changeTab(stat.tab)}
                  className="group rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-left shadow-lg transition hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-900 sm:rounded-[24px] sm:p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`text-lg ${stat.color}`}>{stat.icon}</span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                      {stat.label}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="mt-2 text-[11px] font-medium text-zinc-500 transition group-hover:text-yellow-300">Open section <span aria-hidden="true">↗</span></p>
                </button>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-[26px] border border-zinc-800 bg-zinc-900/75 p-5">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-300">Daily control center</p><h2 className="mt-1 text-lg font-semibold text-white">Operations snapshot</h2></div>
                  <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1.5 text-xs text-zinc-400">Selected date · {today || 'Date unavailable'}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"><p className="text-xs text-zinc-500">Departure choices</p><p className="mt-2 text-2xl font-bold text-white">{selectedDepartureIds.length}<span className="ml-1 text-sm font-medium text-zinc-500">/ {activeStudentCount}</span></p><p className="mt-1 text-xs text-zinc-500">{studentsWithoutSelection} still to choose</p></div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"><p className="text-xs text-zinc-500">Students assigned today</p><p className="mt-2 text-2xl font-bold text-white">{todayAssignments.length}</p><p className="mt-1 text-xs text-zinc-500">Across current vehicle assignments</p></div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"><p className="text-xs text-zinc-500">Seats awaiting confirmation</p><p className={`mt-2 text-2xl font-bold ${awaitingSeatConfirmations ? 'text-amber-200' : 'text-emerald-300'}`}>{awaitingSeatConfirmations}</p><p className="mt-1 text-xs text-zinc-500">From today&apos;s assignments</p></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => changeTab('departures')} className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300">Review departures <span aria-hidden="true">→</span></button><button type="button" onClick={() => changeTab('assignments')} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-white/[0.04]">Manage vehicle assignments</button></div>
              </section>
              <section className="rounded-[26px] border border-zinc-800 bg-zinc-900/75 p-5">
                <div className="mb-4"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Needs attention</p><h2 className="mt-1 text-lg font-semibold text-white">Priority queue</h2></div>
                <div className="space-y-2">
                  {[
                    { label: 'Applications to review', value: applications.length, tab: 'applications', tone: 'text-amber-200' },
                    { label: 'Unpaid fee records', value: unpaidCount, tab: 'fees', tone: 'text-red-300' },
                    { label: 'Unread help messages', value: unreadMessages, tab: 'messages', tone: 'text-sky-200' },
                    { label: 'Urgent open messages', value: urgentMessages, tab: 'messages', tone: 'text-red-300' },
                  ].map((item) => <button key={item.label} type="button" onClick={() => changeTab(item.tab)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3.5 py-3 text-left transition hover:border-zinc-600 hover:bg-zinc-950"><span className="text-sm text-zinc-300">{item.label}</span><span className={`inline-flex items-center gap-2 text-sm font-semibold ${item.tone}`}>{item.value}<span aria-hidden="true" className="text-zinc-600">→</span></span></button>)}
                </div>
              </section>
            </div>

            {upcomingHoliday && (
              <div className="rounded-[24px] border border-[#facc15]/20 bg-[#facc15]/8 p-4 text-sm text-[#fef3c7]">
                <span className="mr-2">📆</span>
                Upcoming no-service day: {upcomingHoliday.reason} on{' '}
                {new Date(upcomingHoliday.date).toLocaleDateString('en-PK', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            )}

            <section className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-900/80">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800 px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-300">Route health</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Route overview</h2>
                  <p className="mt-1 text-sm text-zinc-400">Student totals, fee follow-up, and today&apos;s vehicle load in one view.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1.5 text-zinc-300">{routeSummaries.length} routes</span>
                  {unassignedActiveStudents > 0 && <button type="button" onClick={() => { setStudentRouteFilter('unassigned'); changeTab('students'); }} className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 font-medium text-amber-200">{unassignedActiveStudents} active students need a route · View</button>}
                </div>
              </div>
              {routeSummaries.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-zinc-500">No routes have been added yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="bg-zinc-950/60 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      <tr><th className="px-5 py-3">Route</th><th className="px-4 py-3">Students</th><th className="px-4 py-3">Fee follow-up</th><th className="px-4 py-3">Today&apos;s load</th><th className="px-4 py-3">Monthly fee</th><th className="px-5 py-3 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {routeSummaries.map(({ route, activeStudents: activeCount, routeStudents, unpaidStudents: unpaid, assignedCount, capacity, vehicle }) => {
                        const overCapacity = capacity > 0 && assignedCount > capacity;
                        return <tr key={route.id} className="transition hover:bg-white/[0.025]">
                          <td className="px-5 py-4"><p className="font-semibold text-white">{route.name}</p><p className="mt-1 text-xs text-zinc-500">{routeStudents.length} enrolled · {activeCount} active</p></td>
                          <td className="px-4 py-4"><span className="text-lg font-semibold text-white">{activeCount}</span><span className="ml-1 text-xs text-zinc-500">active</span></td>
                          <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${unpaid ? 'bg-red-400/10 text-red-200' : 'bg-emerald-400/10 text-emerald-200'}`}>{unpaid} unpaid</span></td>
                          <td className="px-4 py-4"><p className={`text-sm font-medium ${overCapacity ? 'text-red-300' : 'text-zinc-200'}`}>{assignedCount} assigned{capacity ? ` / ${capacity} seats` : ''}</p><p className={`mt-1 text-xs ${vehicle ? 'text-zinc-500' : 'text-amber-200'}`}>{vehicle ? `Vehicle ${vehicle.coaster_number}` : 'Vehicle not assigned'}</p>{overCapacity && <p className="mt-1 text-xs font-medium text-red-300">Over capacity by {assignedCount - capacity}</p>}</td>
                          <td className="px-4 py-4 text-sm text-zinc-300">PKR {route.price.toLocaleString()}<span className="text-xs text-zinc-500"> / month</span></td>
                          <td className="px-5 py-4 text-right"><button type="button" onClick={() => { setStudentRouteFilter(route.id); setStudentPage(0); changeTab('students'); }} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-yellow-400/60 hover:text-yellow-200">View students <span aria-hidden="true">→</span></button></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'schedule' && (
          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Operations · Monday to Sunday</p><h2 className="mt-1 text-xl font-semibold text-white">Weekly travel schedule</h2><p className="mt-1 text-sm text-zinc-400">Daily headcounts by route, with scheduled vehicles and drivers.</p></div>
              <button type="button" onClick={() => changeTab('assignments')} className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-yellow-400">Manage assignments →</button>
            </div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Next week student plan · {getPakistanWeekStart(1)}</h3>
            <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((weekday) => {
                const rows = weeklyPlan.filter((row) => row.day_of_week.toLowerCase() === weekday.toLowerCase());
                const routesForDay = routes.map((route) => ({ route, students: rows.filter((row) => row.profiles?.route_id === route.id) })).filter((group) => group.students.length);
                return (
                  <article key={weekday} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <div className="mb-2 flex items-center justify-between"><h4 className="font-semibold text-white">{weekday}</h4><span className="text-xs text-zinc-500">{rows.length} planned</span></div>
                    {routesForDay.length ? <div className="space-y-2">{routesForDay.map(({ route, students: routeStudents }) => {
                      const vehicle = coasters.find((item) => item.default_route_id === route.id && item.maintenance_status !== 'maintenance' && item.maintenance_status !== 'retired');
                      const capacity = vehicle?.seat_capacity ?? 0;
                      const overCapacity = capacity > 0 && routeStudents.length > capacity;
                      const underused = capacity > 0 && routeStudents.length <= capacity / 2;
                      return <div key={route.id} className="rounded-xl border border-zinc-800 px-3 py-2">
                        <div className="flex justify-between gap-2"><span className="text-sm text-zinc-200">{route.name}</span><span className="text-xs text-zinc-400">{routeStudents.length} riders</span></div>
                        <p className="mt-1 text-xs text-zinc-500">Pickup points: {[...new Set(routeStudents.map((row) => row.pickup_points?.name).filter(Boolean))].join(', ') || 'not set'}</p>
                        {overCapacity ? <p className="mt-1 text-xs font-medium text-red-300">Capacity warning: {routeStudents.length} riders for {capacity} seats</p> : vehicle ? <p className="mt-1 text-xs text-zinc-500">Usual vehicle {vehicle.coaster_number} · {capacity} seats</p> : <p className="mt-1 text-xs text-amber-200">No available usual vehicle</p>}
                        {underused && <p className="mt-1 text-xs text-amber-200">Low utilisation · {capacity - routeStudents.length} seats would be unused</p>}
                        <details className="mt-2"><summary className="cursor-pointer text-xs text-yellow-300">View students</summary><p className="mt-1 text-xs leading-5 text-zinc-400">{routeStudents.map((row) => row.profiles?.full_name ?? 'Student').join(', ')}</p></details>
                      </div>;
                    })}</div> : <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-5 text-center text-xs text-zinc-500">No students scheduled</p>}
                  </article>
                );
              })}
            </div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Assigned vehicles this week</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 7 }, (_, index) => {
                const start = new Date(`${getPakistanWeekStart()}T00:00:00Z`);
                start.setUTCDate(start.getUTCDate() + index);
                const date = start.toISOString().slice(0, 10);
                const dayRows = weeklyAssignments.filter((row) => row.assignment_date === date);
                const byRoute = routes.map((route) => ({ route, rows: dayRows.filter((row) => row.route_id === route.id || row.profiles?.route_id === route.id) })).filter((group) => group.rows.length);
                const weekday = start.toLocaleDateString('en-PK', { weekday: 'long', timeZone: 'UTC' });
                return <article key={date} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold text-white">{weekday}</h3><p className="text-xs text-zinc-500">{date}</p></div><span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">{dayRows.length} students</span></div>
                  {!byRoute.length ? <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-5 text-center text-xs text-zinc-500">No trips assigned</p> : <div className="space-y-3">{byRoute.map(({ route, rows }) => {
                    const vehicle = coasters.find((item) => item.id === rows[0]?.coaster_id);
                    const full = vehicle?.seat_capacity ? rows.length > vehicle.seat_capacity : false;
                    return <div key={route.id} className="rounded-xl border border-zinc-800 px-3 py-2.5"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-zinc-200">{route.name}</p><span className="text-xs text-zinc-400">{rows.length} riders</span></div><p className="mt-1 text-xs text-zinc-500">{vehicle?.coaster_number ?? 'Vehicle pending'} · {rows.filter((row) => row.seat_confirmed).length} confirmed</p>{full && <p className="mt-1 text-xs font-semibold text-red-300">Capacity exceeded · {vehicle?.seat_capacity} seats</p>}</div>;
                  })}</div>}
                </article>;
              })}
            </div>
          </section>
        )}

        {activeTab === 'students' && (
          <div className="grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <h2 className="mb-5 text-xl font-semibold text-white">
                All Students ({students.length})
              </h2>

              <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <label className="sr-only" htmlFor="student-search">Search students</label>
                <input
                  id="student-search"
                  type="search"
                  value={studentSearch}
                  onChange={(event) => {
                    setStudentSearch(event.target.value);
                    setStudentPage(0);
                    setSelectedStudentIds([]);
                  }}
                  placeholder="Search name, enrolment no., email, or pickup area…"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
                />
                <label className="sr-only" htmlFor="student-route-filter">Filter by route</label>
                <select
                  id="student-route-filter"
                  value={studentRouteFilter}
                  onChange={(event) => {
                    setStudentRouteFilter(event.target.value);
                    setStudentPage(0);
                    setSelectedStudentIds([]);
                  }}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                >
                  <option value="all">All routes</option>
                  <option value="unassigned">No route assigned</option>
                  {routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
                </select>
                <label className="sr-only" htmlFor="student-fee-filter">Filter by fee status</label>
                <select
                  id="student-fee-filter"
                  value={studentFeeFilter}
                  onChange={(event) => {
                    setStudentFeeFilter(event.target.value);
                    setStudentPage(0);
                    setSelectedStudentIds([]);
                  }}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                >
                  <option value="all">All fee statuses</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
                <label className="sr-only" htmlFor="student-university-filter">Filter by university</label>
                <select id="student-university-filter" value={studentUniversityFilter} onChange={(event) => { setStudentUniversityFilter(event.target.value); setStudentPage(0); setSelectedStudentIds([]); }} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400">
                  <option value="all">All universities</option><option value="unassigned">No university</option>
                  {universities.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <label className="sr-only" htmlFor="student-department-filter">Filter by department</label>
                <select id="student-department-filter" value={studentDepartmentFilter} onChange={(event) => { setStudentDepartmentFilter(event.target.value); setStudentPage(0); setSelectedStudentIds([]); }} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400">
                  <option value="all">All departments</option>{departments.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <label className="sr-only" htmlFor="student-pickup-filter">Filter by pickup area</label>
                <select id="student-pickup-filter" value={studentPickupFilter} onChange={(event) => { setStudentPickupFilter(event.target.value); setStudentPage(0); setSelectedStudentIds([]); }} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400">
                  <option value="all">All pickup areas</option>{pickupAreas.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <label className="sr-only" htmlFor="student-sort">Sort students</label>
                <select id="student-sort" value={studentSort} onChange={(event) => setStudentSort(event.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400">
                  <option value="name">Sort: Name</option><option value="enrollment">Sort: Enrolment no.</option><option value="university">Sort: University</option><option value="department">Sort: Department</option><option value="pickup">Sort: Pickup area</option><option value="fee">Sort: Fee status</option><option value="route">Sort: Route</option>
                </select>
                <button type="button" onClick={() => setStudentSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 hover:border-yellow-400">{studentSortDirection === 'asc' ? 'Ascending ↑' : 'Descending ↓'}</button>
              </div>

              <div className="mb-3 flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() => {
                      const pageIds = visibleStudents.map((student) => student.id);
                      setSelectedStudentIds((current) =>
                        allVisibleSelected
                          ? current.filter((id) => !pageIds.includes(id))
                          : [...new Set([...current, ...pageIds])],
                      );
                    }}
                    className="h-4 w-4 accent-yellow-400"
                  />
                  Select this page ({visibleStudents.length})
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-zinc-500">{selectedStudentIds.length} selected</span>
                  <button
                    type="button"
                    disabled={!selectedStudentIds.length || bulkUpdatingFees}
                    onClick={() => void handleMarkSelectedPaid()}
                    className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {bulkUpdatingFees ? 'Updating…' : 'Mark selected paid'}
                  </button>
                </div>
              </div>

              {studentListNotice && (
                <p role="status" className="mb-3 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">{studentListNotice}</p>
              )}

              <div className="mb-2 hidden grid-cols-[2rem_minmax(9rem,1.2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_5rem_5rem] gap-3 px-3 text-[10px] uppercase tracking-wide text-zinc-500 lg:grid">
                <span></span><span>Name / enrolment</span><span>University / department</span><span>Pickup / route</span><span>Fee</span><span></span>
              </div>
              <div className="space-y-2">
                {visibleStudents.map((student) => (
                  <div key={student.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 lg:grid lg:grid-cols-[2rem_minmax(9rem,1.2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_5rem_5rem]">
                    <input
                      type="checkbox"
                      aria-label={`Select ${student.full_name}`}
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={(event) => setSelectedStudentIds((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))}
                      className="h-4 w-4 shrink-0 accent-yellow-400"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{student.full_name}</p>
                      <p className="truncate text-xs text-zinc-400">{student.email}</p>
                      <p className="truncate text-xs text-zinc-500">Enrolment: {student.cnic_last4 || '—'}</p>
                    </div>
                    <div className="hidden min-w-0 text-xs text-zinc-300 sm:block"><p className="truncate">{student.institution || '—'}</p><p className="truncate text-zinc-500">{student.department || departureGroups.find((group) => group.id === student.departure_group_id)?.department || '—'}</p></div>
                    <div className="hidden min-w-0 text-xs text-zinc-300 sm:block"><p className="truncate">{student.pickup_area || 'Pickup not set'}</p><p className="truncate text-zinc-500">{student.routes?.name || 'No route'}</p></div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${student.fee_status === 'paid' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                      {student.fee_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                    <div className="flex shrink-0 gap-2">
                      {normalizePkPhone(student.phone) && <a href={`https://wa.me/${normalizePkPhone(student.phone)}?text=${encodeURIComponent(`Hello ${student.full_name}, this is Eagle Elites transport.`)}`} target="_blank" rel="noreferrer" aria-label={`Message ${student.full_name} on WhatsApp`} className="rounded-lg border border-emerald-700/60 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20">WhatsApp</a>}
                      <button type="button" onClick={() => setEditingStudent(student)} className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-600">Edit</button>
                    </div>
                    {student.payment_proof_url && <details className="basis-full lg:col-span-full"><summary className="cursor-pointer text-xs font-medium text-yellow-300">View payment proof</summary><div className="mt-3 max-w-xl"><ProofViewer value={student.payment_proof_url} label={`${student.full_name} payment proof`} /></div></details>}
                  </div>
                ))}
                {matchingStudents.length === 0 && (
                  <div className="rounded-xl border border-dashed border-zinc-700 px-4 py-10 text-center text-sm text-zinc-400">No students match these search and filter settings.</div>
                )}
              </div>

              {matchingStudents.length > studentsPerPage && (
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                  <p className="text-xs text-zinc-500">Showing {studentPage * studentsPerPage + 1}–{Math.min((studentPage + 1) * studentsPerPage, matchingStudents.length)} of {matchingStudents.length}</p>
                  <div className="flex gap-2">
                    <button type="button" disabled={studentPage === 0} onClick={() => { setStudentPage((page) => page - 1); setSelectedStudentIds([]); }} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40">Previous</button>
                    <button type="button" disabled={studentPage + 1 >= pageCount} onClick={() => { setStudentPage((page) => page + 1); setSelectedStudentIds([]); }} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </div>

            {editingStudent && (
              <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    Edit Student
                  </h2>
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="text-xl text-zinc-500 transition hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-zinc-400">Name</p>
                    <p className="text-lg font-medium text-white">
                      {editingStudent.full_name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {editingStudent.email}
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-zinc-300">
                      Destination
                    </label>
                    <input
                      value={editingStudent.institution ?? ''}
                      onChange={(event) =>
                        setEditingStudent({
                          ...editingStudent,
                          institution: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                      placeholder="e.g. Bahria University, PIMS Hospital"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-zinc-300">
                      Route
                    </label>
                    <select
                      value={editingStudent.route_id ?? ''}
                      onChange={(event) =>
                        setEditingStudent({
                          ...editingStudent,
                          route_id: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                    >
                      <option value="">No route assigned</option>
                      {routes.map((route) => (
                        <option key={route.id} value={route.id}>
                          {route.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-zinc-300">
                      Fee Status
                    </label>
                    <select
                      value={editingStudent.fee_status}
                      onChange={(event) =>
                        setEditingStudent({
                          ...editingStudent,
                          fee_status: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveStudent}
                    className="w-full rounded-xl bg-gradient-to-r from-[#facc15] via-[#fbbf24] to-[#f59e0b] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_15px_30px_rgba(250,204,21,0.3)]"
                  >
                    {savingStudent ? 'Saving...' : 'Save Changes →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <ApplicationsTab
            applications={applications}
            onRemove={(ids) =>
              setApplications((prev) => prev.filter((a) => !ids.includes(a.id)))
            }
            routes={routes}
            groups={departureGroups}
            allTransactions={students as unknown as { id: string; payment_transaction_id: string | null }[]}
            onWhatsApp={(result) => setWhatsAppNotice(describeWhatsApp(result))}
            onActivity={(action, details) => void logAdminActivity(action, details)}
          />
        )}

        {activeTab === 'drivers' && (
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <h2 className="text-xl font-semibold text-white">Create driver login</h2>
              <p className="mt-1 text-sm text-zinc-400">Drivers receive an email invitation to set a password and sign in to record attendance for assigned trips.</p>
              {driverNotice && <p role="status" className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">{driverNotice}</p>}
              <div className="mt-4 space-y-3">
                <input value={driverForm.fullName} onChange={(event) => setDriverForm((value) => ({ ...value, fullName: event.target.value }))} placeholder="Driver full name" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white" />
                <input type="email" autoComplete="email" value={driverForm.email} onChange={(event) => setDriverForm((value) => ({ ...value, email: event.target.value }))} placeholder="Driver email" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white" />
                <input type="tel" value={driverForm.phone} onChange={(event) => setDriverForm((value) => ({ ...value, phone: event.target.value }))} placeholder="Phone (optional)" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white" />
                <input type="text" value={driverForm.cnic} onChange={(event) => setDriverForm((value) => ({ ...value, cnic: event.target.value }))} placeholder="CNIC (optional)" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white" />
                <select value={driverForm.usualVehicleId} onChange={(event) => setDriverForm((value) => ({ ...value, usualVehicleId: event.target.value }))} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value="">Usual vehicle (optional)</option>{coasters.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.coaster_number} · {vehicle.vehicle_type ?? 'van'}</option>)}</select>
                <button type="button" disabled={creatingDriver || !driverForm.fullName.trim() || !driverForm.email.trim()} onClick={() => void handleCreateDriver()} className="rounded-xl bg-yellow-400 px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50">{creatingDriver ? 'Sending invitation…' : 'Create driver account'}</button>
                <p className="text-xs text-zinc-500">The invitation link lets the driver set a password securely. No password is stored or shared here.</p>
              </div>
            </section>
            <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <h2 className="mb-4 text-xl font-semibold text-white">Driver accounts ({drivers.length})</h2>
              {drivers.length === 0 ? <p className="rounded-xl border border-dashed border-zinc-700 px-4 py-8 text-center text-sm text-zinc-400">No driver accounts yet. Create an account to assign trips and enable driver attendance.</p> : <div className="space-y-2">{drivers.map((driver) => { const trips = attendanceMonthRows.filter((row) => row.driver_id === driver.id && row.attendance_status !== null).length; const vehicle = coasters.find((item) => item.id === driver.usual_vehicle_id); return <div key={driver.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"><div><p className="font-medium text-white">{driver.full_name}</p><p className="text-xs text-zinc-400">{driver.email}{driver.phone ? ` · ${driver.phone}` : ''}{driver.cnic ? ` · CNIC ${driver.cnic}` : ''}</p><p className="mt-1 text-xs text-zinc-500">Usual vehicle: {vehicle?.coaster_number ?? 'Not set'} · {trips} completed trips this month</p></div><button type="button" onClick={() => void handleToggleDriver(driver)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${driver.active ? 'bg-emerald-500/15 text-emerald-200' : 'bg-zinc-800 text-zinc-400'}`}>{driver.active ? 'Active · deactivate' : 'Inactive · activate'}</button></div>; })}</div>}
            </section>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="space-y-5">
          <section className="rounded-[28px] border border-yellow-500/20 bg-zinc-900/80 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Seat confirmation · {assignDate}</p><h2 className="mt-1 text-xl font-semibold text-white">{todayAssignments.filter((row) => row.seat_confirmed).length} confirmed · {todayAssignments.filter((row) => !row.seat_confirmed).length} awaiting</h2></div><button type="button" disabled={!todayAssignments.some((row) => !row.seat_confirmed)} onClick={() => void handleSeatReminder()} className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-40">Remind unconfirmed students</button></div>
            {todayAssignments.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{todayAssignments.filter((row) => !row.seat_confirmed).map((row) => <p key={row.student_id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-300">{students.find((student) => student.id === row.student_id)?.full_name ?? 'Student'}</p>)}</div>}
            {todayAssignments.length === 0 && <p className="mt-3 text-sm text-zinc-500">Save vehicle assignments for this day to track seat confirmations.</p>}
          </section>
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Daily Vehicle Assignments
                </h2>
                <p className="text-sm text-zinc-400">
                  Assign one vehicle and driver per route group
                </p>
              </div>

              <div className="w-full max-w-[220px]">
                <label className="mb-1 block text-sm text-zinc-300">
                  Assignment Date
                </label>
                <input
                  type="date"
                  value={assignDate}
                  onChange={(event) => setAssignDate(event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            {dailyGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-8 text-center text-zinc-400">
                <p className="text-lg font-medium text-white">
                  No students assigned to routes yet
                </p>
                <p className="mt-2">
                  Go to Students tab and assign routes first
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {dailyGroups.map((group) => (
                  <div
                    key={group.route_id}
                    className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {group.route_name}
                        </h3>
                        <p className="text-xs text-zinc-400">
                          {group.students.length} students on this route
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 space-y-2">
                      {group.students.map((student) => (
                        <div
                          key={student.id}
                          className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300"
                        >
                          {student.full_name}
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs text-zinc-400">
                          Vehicle
                        </label>
                        <select
                          value={
                            groupAssignments[group.route_id]?.coaster_id ?? ''
                          }
                          onChange={(event) =>
                            setGroupAssignments((prev) => ({
                              ...prev,
                              [group.route_id]: {
                                ...prev[group.route_id],
                                coaster_id: event.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                        >
                          <option value="">Select vehicle...</option>
                          {coasters.filter((coaster) => (coaster.maintenance_status ?? 'active') === 'active').map((coaster) => (
                            <option key={coaster.id} value={coaster.id}>
                              {coaster.coaster_number} · {coaster.vehicle_type ?? 'Vehicle'} · {coaster.seat_capacity ?? '—'} seats
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs text-zinc-400">Driver account</label>
                        <select value={groupAssignments[group.route_id]?.driver_id ?? ''} onChange={(event) => setGroupAssignments((prev) => ({ ...prev, [group.route_id]: { ...prev[group.route_id], driver_id: event.target.value } }))} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400">
                          <option value="">Select driver account…</option>{drivers.filter((driver) => driver.active).map((driver) => <option key={driver.id} value={driver.id}>{driver.full_name}{driver.phone ? ` · ${driver.phone}` : ''}</option>)}
                        </select>
                      </div>
                    </div>
                    {(() => {
                      const selectedVehicle = coasters.find((item) => item.id === groupAssignments[group.route_id]?.coaster_id);
                      return selectedVehicle && selectedVehicle.seat_capacity && group.students.length > selectedVehicle.seat_capacity ? <p role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200">Capacity warning: {group.students.length} students for {selectedVehicle.seat_capacity} seats. Choose a larger vehicle or split this route.</p> : null;
                    })()}
                  </div>
                ))}

                {assignmentError && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm text-red-200">{assignmentError}</p>}

                {assignSuccess && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    ✅ Assignments saved! All students on each route can now see
                    their vehicle and driver.
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveAssignments}
                  className="rounded-xl bg-gradient-to-r from-[#facc15] via-[#fbbf24] to-[#f59e0b] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_15px_30px_rgba(250,204,21,0.3)]"
                >
                  {savingAssignment ? 'Saving...' : 'Save All Assignments →'}
                </button>
              </div>
            )}
          </div>
          </div>
        )}

        {activeTab === 'departures' && (
          <div className="space-y-6">
            <section className="rounded-[28px] border border-yellow-500/20 bg-zinc-900/80 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Today · {getPakistanDate()}</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Today&apos;s departure overview</h2>
                  <p className="mt-1 text-sm text-zinc-400">Vehicle planning by university, department, and departure slot.</p>
                </div>
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-200">{departureSelections.length} selected students</span>
              </div>
              {departureStatusError ? <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-4 text-sm text-red-200">Couldn&apos;t load departure selections: {departureStatusError}</p> : todaySlotGroups.size === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 px-5 py-8 text-center"><p className="font-medium text-zinc-200">No departures posted for today yet</p><p className="mt-1 text-sm text-zinc-500">Once slots are posted, their student lists and headcounts will appear here.</p></div>
              ) : (
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {departureGroups.filter((group) => todaySlotGroups.has(group.id)).map((group) => {
                    const slots = departureSlots.filter((slot) => slot.slot_date === getPakistanDate() && slot.group_id === group.id).sort((a, b) => a.slot_number - b.slot_number);
                    return <div key={group.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{group.university}</h3><p className="text-xs text-zinc-500">{group.department}</p></div><span className="text-xs text-zinc-400">{slots.reduce((total, slot) => total + departureSelections.filter((selection) => selection.slot_id === slot.id).length, 0)} students</span></div>
                      <div className="space-y-3">{slots.map((slot) => {
                        const slotSelections = departureSelections.filter((selection) => selection.slot_id === slot.id);
                        return <div key={slot.id} className="rounded-xl border border-zinc-800 px-3 py-3"><div className="flex items-center justify-between gap-3"><p className="font-medium text-zinc-100">Slot {slot.slot_number} <span className="font-normal text-zinc-400">· depart {slot.departure_time}</span></p><span className="rounded-full bg-yellow-400/10 px-2.5 py-1 text-xs font-semibold text-yellow-200">{slotSelections.length} {slotSelections.length === 1 ? 'student' : 'students'}</span></div>{slot.notes && <p className="mt-1 text-xs text-zinc-500">{slot.notes}</p>}{slotSelections.length ? <ul className="mt-3 divide-y divide-zinc-800">{slotSelections.map((selection) => { const student = students.find((item) => item.id === selection.student_id); return <li key={selection.student_id} className="flex justify-between gap-3 py-2 text-sm"><span className="text-zinc-200">{student?.full_name ?? 'Student record unavailable'}</span><span className="shrink-0 text-xs text-zinc-500">{student?.cnic_last4 || student?.email || ''}</span></li>; })}</ul> : <p className="mt-3 text-sm text-zinc-500">No students selected this slot yet.</p>}</div>;
                      })}</div>
                    </div>;
                  })}
                </div>
              )}
            </section>
            <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Today · {getPakistanDate()}</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Students without a departure selection</h2>
                  <p className="mt-1 text-sm text-zinc-400">Only students in groups with slots posted for today are included.</p>
                </div>
                <span className="inline-flex w-fit items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-200">
                  {studentsWithoutDepartureSelection.length} remaining
                </span>
              </div>
              {departureStatusError ? (
                <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-5 text-sm text-red-200">Couldn&apos;t load today&apos;s departure status: {departureStatusError}</p>
              ) : todaySlotGroups.size === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-zinc-700 px-4 py-5 text-sm text-zinc-400">No departure slots have been posted for today yet, so students cannot make a selection.</p>
              ) : studentsWithoutDepartureSelection.length === 0 ? (
                <p className="mt-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-5 text-sm text-emerald-200">All students in today&apos;s groups have selected a slot.</p>
              ) : (
                <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                  {studentsWithoutDepartureSelection.map((student) => {
                    const group = departureGroups.find((item) => item.id === student.departure_group_id);
                    return (
                      <div key={student.id} className="flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{student.full_name}</p>
                          <p className="truncate text-xs text-zinc-400">{student.email}</p>
                        </div>
                        <p className="shrink-0 text-xs text-zinc-500">{group ? `${group.university} · ${group.department}` : 'Departure group'}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <h2 className="mb-3 text-xl font-semibold text-white">
                Departure Groups
              </h2>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                <input
                  value={newGroup.university}
                  onChange={(event) =>
                    setNewGroup((prev) => ({
                      ...prev,
                      university: event.target.value,
                    }))
                  }
                  placeholder="University"
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400"
                />
                <input
                  value={newGroup.department}
                  onChange={(event) =>
                    setNewGroup((prev) => ({
                      ...prev,
                      department: event.target.value,
                    }))
                  }
                  placeholder="Department"
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400"
                />
                <input
                  value={newGroup.description}
                  onChange={(event) =>
                    setNewGroup((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Optional note"
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400"
                />
                <button
                  type="button"
                  onClick={handleAddDepartureGroup}
                  disabled={addingGroup}
                  className="rounded-xl bg-gradient-to-r from-[#facc15] via-[#fbbf24] to-[#f59e0b] px-4 py-3 text-sm font-semibold text-slate-950"
                >
                  {addingGroup ? 'Adding...' : 'Add'}
                </button>
              </div>

              {groupSuccess && (
                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  ✅ Departure group added successfully.
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Post Departure Slots
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Assign slot times by university and department group.
                  </p>
                </div>

                <div className="w-full max-w-[220px]">
                  <label className="mb-1 block text-sm text-zinc-300">
                    Slot Date
                  </label>
                  <input
                    type="date"
                    value={slotDate}
                    onChange={(event) => setSlotDate(event.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-sm text-zinc-300">
                  Select Group
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                >
                  <option value="">Choose a department group...</option>
                  {departureGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.university} — {group.department}
                    </option>
                  ))}
                </select>
              </div>

              {selectedGroupId && (
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, index) => index + 1).map(
                    (slotNumber) => {
                      const draft = slotInputs[slotNumber] ?? {
                        slot_number: slotNumber,
                        pickup_time: '',
                        departure_time: '',
                        notes: '',
                        status: 'available',
                      };

                      return (
                        <div
                          key={slotNumber}
                          className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <h3 className="font-semibold text-white">
                              Slot {slotNumber}
                            </h3>
                            <select
                              value={draft.status}
                              onChange={(event) =>
                                setSlotInputs((prev) => ({
                                  ...prev,
                                  [slotNumber]: {
                                    ...draft,
                                    status: event.target.value,
                                  },
                                }))
                              }
                              className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white outline-none"
                            >
                              <option value="available">Available</option>
                              <option value="unavailable">Unavailable</option>
                            </select>
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            <input
                              type="time"
                              value={draft.pickup_time}
                              onChange={(event) =>
                                setSlotInputs((prev) => ({
                                  ...prev,
                                  [slotNumber]: {
                                    ...draft,
                                    pickup_time: event.target.value,
                                  },
                                }))
                              }
                              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                            />
                            <input
                              type="time"
                              value={draft.departure_time}
                              onChange={(event) =>
                                setSlotInputs((prev) => ({
                                  ...prev,
                                  [slotNumber]: {
                                    ...draft,
                                    departure_time: event.target.value,
                                  },
                                }))
                              }
                              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                            />
                            <input
                              value={draft.notes}
                              onChange={(event) =>
                                setSlotInputs((prev) => ({
                                  ...prev,
                                  [slotNumber]: {
                                    ...draft,
                                    notes: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Notes"
                              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-yellow-400"
                            />
                          </div>
                        </div>
                      );
                    },
                  )}

                  {slotsSuccess && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                      ✅ Departure slots posted for the selected date.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveDepartureSlots}
                    disabled={savingSlots}
                    className="rounded-xl bg-gradient-to-r from-[#facc15] via-[#fbbf24] to-[#f59e0b] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_15px_30px_rgba(250,204,21,0.3)]"
                  >
                    {savingSlots ? 'Posting...' : 'Post Slots for This Group →'}
                  </button>
                </div>
              )}
            </div>

            {selectedGroupId && (
              <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
                <h2 className="mb-4 text-xl font-semibold text-white">
                  Posted Slots
                </h2>

                {departureSlots.filter(
                  (slot) =>
                    slot.group_id === selectedGroupId &&
                    slot.slot_date === slotDate,
                ).length === 0 ? (
                  <p className="text-zinc-400">
                    No slots posted for this group yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {departureSlots
                      .filter(
                        (slot) =>
                          slot.group_id === selectedGroupId &&
                          slot.slot_date === slotDate,
                      )
                      .map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
                        >
                          <div>
                            <p className="font-medium text-white">
                              Slot {slot.slot_number}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {slot.pickup_time} → {slot.departure_time}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleToggleDepartureSlotStatus(
                                slot.id,
                                slot.status,
                              )
                            }
                            className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                              slot.status === 'available'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-red-500/15 text-red-300'
                            }`}
                          >
                            {slot.status === 'available'
                              ? 'Available'
                              : 'Hidden'}
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Driver-reported trip record</p><h2 className="mt-1 text-xl font-semibold text-white">Trip attendance</h2><p className="mt-1 text-sm text-zinc-400">Record who boarded for each student assigned to the selected date.</p></div>
                <label className="text-xs text-zinc-400">Trip date<input aria-label="Trip date" type="date" value={attendanceDate} onChange={(event) => { setAttendanceDate(event.target.value); setAttendanceMonth(event.target.value.slice(0, 7)); }} className="mt-1 block rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" /></label>
              </div>
              {attendanceError && <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm text-red-200">{attendanceError}</p>}
              {attendanceRows.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-zinc-700 px-4 py-8 text-center text-sm text-zinc-400">No students have been assigned to a trip on this date.</p> : <div className="mt-4 space-y-2">{attendanceRows.map((row) => { const student = students.find((item) => item.id === row.student_id); return <div key={row.student_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"><div><p className="font-medium text-white">{student?.full_name ?? 'Student record unavailable'}</p><p className="text-xs text-zinc-500">{student?.routes?.name ?? 'Route not assigned'} · {student?.institution ?? 'Institution not set'} · {row.driver_name ?? 'Driver not assigned'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.attendance_status === 'present' ? 'bg-emerald-500/15 text-emerald-200' : row.attendance_status === 'absent' ? 'bg-red-500/15 text-red-200' : 'bg-zinc-800 text-zinc-400'}`}>{row.attendance_status ?? 'Awaiting driver'}</span></div>; })}</div>}
            </section>

            <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-white">Monthly attendance report</h2><p className="mt-1 text-sm text-zinc-400">Trip attendance totals for each student.</p></div><label className="text-xs text-zinc-400">Month<input aria-label="Report month" type="month" value={attendanceMonth} onChange={(event) => setAttendanceMonth(event.target.value)} className="mt-1 block rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" /></label></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[36rem] text-left text-sm"><thead className="text-xs uppercase text-zinc-500"><tr><th className="pb-2">Student</th><th className="pb-2">Trips recorded</th><th className="pb-2">Present</th><th className="pb-2">Absent</th></tr></thead><tbody className="divide-y divide-zinc-800">{students.map((student) => { const records = attendanceMonthRows.filter((row) => row.student_id === student.id); const present = records.filter((row) => row.attendance_status === 'present').length; const absent = records.filter((row) => row.attendance_status === 'absent').length; return <tr key={student.id}><td className="py-2.5"><p className="font-medium text-zinc-200">{student.full_name}</p><p className="text-xs text-zinc-500">{student.cnic_last4 || student.email}</p></td><td className="py-2.5 text-zinc-300">{present + absent} / {records.length}</td><td className="py-2.5 text-emerald-300">{present}</td><td className="py-2.5 text-red-300">{absent}</td></tr>; })}</tbody></table></div>
            </section>
          </div>
        )}

        {activeTab === 'fees' && (
          <div className="space-y-5">
            {(() => {
              const monthKey = `${feeReportMonth}-01`;
              const monthPayments = feePayments.filter((payment) => payment.fee_month === monthKey);
              const paidIds = new Set(monthPayments.map((payment) => payment.student_id));
              const activeStudents = students.filter((student) => student.status === 'active');
              const expected = activeStudents.reduce((sum, student) => sum + (routes.find((route) => route.id === student.route_id)?.price ?? 0), 0);
              const collected = monthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
              const unpaid = activeStudents.filter((student) => !paidIds.has(student.id));
              const visibleUnpaid = unpaid.filter((student) => `${student.full_name} ${student.email} ${student.institution ?? ''}`.toLowerCase().includes(feeSearch.toLowerCase()));
              const overdueDays = (student: Student) => {
                const due = student.fee_due_date ?? `${feeReportMonth}-01`;
                return Math.max(0, Math.floor((Date.now() - new Date(`${due}T00:00:00`).getTime()) / 86400000));
              };
              return <>
                <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Monthly collection</p><h2 className="mt-1 text-xl font-semibold text-white">Fee collection dashboard</h2><p className="mt-1 text-sm text-zinc-400">Expected fees are calculated from active route assignments.</p></div><label className="text-xs text-zinc-400">Month<input type="month" value={feeReportMonth} onChange={(event) => setFeeReportMonth(event.target.value)} className="mt-1 block rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" /></label></div>
                  <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"><p className="text-xs text-zinc-500">Expected</p><p className="mt-1 text-2xl font-bold text-white">PKR {expected.toLocaleString()}</p></div><div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"><p className="text-xs text-zinc-500">Collected this month</p><p className="mt-1 text-2xl font-bold text-emerald-300">PKR {collected.toLocaleString()}</p></div><div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"><p className="text-xs text-zinc-500">Unpaid</p><p className="mt-1 text-2xl font-bold text-amber-200">{unpaid.length} students</p></div></div>
                  <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={downloadMonthlyInvoice} className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-zinc-950">Export monthly invoice CSV</button><button type="button" onClick={() => void handleFeeReminders(unpaid.map((student) => student.id))} disabled={!unpaid.length} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 disabled:opacity-40">WhatsApp unpaid students</button></div>
                  {feeReportMonth !== getPakistanDate().slice(0, 7) && <p className="mt-3 text-xs text-zinc-500">Historical months are read-only. Payment updates are recorded in the current month.</p>}
                </section>
                <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-white">Unpaid students ({unpaid.length})</h2><p className="text-sm text-zinc-400">Days overdue are counted from the due date, or the first of the selected month.</p></div><input value={feeSearch} onChange={(event) => setFeeSearch(event.target.value)} placeholder="Search unpaid students" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600" /></div>
                  <div className="space-y-3">{visibleUnpaid.map((student) => <article key={student.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium text-white">{student.full_name}</p><p className="text-xs text-zinc-400">{student.institution ?? 'University not set'} · {student.routes?.name ?? 'No route'} · PKR {(routes.find((route) => route.id === student.route_id)?.price ?? 0).toLocaleString()}</p><p className={`mt-1 text-xs ${overdueDays(student) > 0 ? 'text-red-300' : 'text-amber-200'}`}>{overdueDays(student)} days overdue</p></div><div className="flex gap-2"><button type="button" onClick={() => void handleFeeReminders([student.id])} className="rounded-lg border border-emerald-700/60 px-3 py-2 text-xs font-semibold text-emerald-200">WhatsApp reminder</button><button type="button" disabled={savingFeeStudent === student.id || feeReportMonth !== getPakistanDate().slice(0, 7)} onClick={() => void handleMarkStudentPaid(student.id)} className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-40">{savingFeeStudent === student.id ? 'Saving…' : 'Mark paid'}</button></div></div>{student.payment_proof_url && <details className="mt-3"><summary className="cursor-pointer text-xs font-medium text-yellow-300">View payment proof</summary><div className="mt-3 max-w-xl"><ProofViewer value={student.payment_proof_url} label={`${student.full_name} payment proof`} /></div></details>}</article>)}{visibleUnpaid.length === 0 && <p className="rounded-xl border border-dashed border-zinc-700 px-4 py-8 text-center text-sm text-zinc-400">No unpaid students match this search.</p>}</div>
                </section>
                <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5"><h2 className="mb-3 text-xl font-semibold text-white">Payment history by student</h2><div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-sm"><thead className="text-xs uppercase text-zinc-500"><tr><th className="pb-2">Student</th><th className="pb-2">Fee month</th><th className="pb-2">Amount</th><th className="pb-2">Recorded</th></tr></thead><tbody className="divide-y divide-zinc-800">{feePayments.slice(0, 100).map((payment) => <tr key={payment.student_id + payment.fee_month}><td className="py-2.5 text-zinc-200">{students.find((student) => student.id === payment.student_id)?.full_name ?? 'Student'}</td><td className="py-2.5 text-zinc-300">{payment.fee_month.slice(0, 7)}</td><td className="py-2.5 text-emerald-300">PKR {Number(payment.amount).toLocaleString()}</td><td className="py-2.5 text-zinc-400">{new Date(payment.recorded_at).toLocaleDateString('en-PK')}</td></tr>)}</tbody></table>{feePayments.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No monthly payment history yet.</p>}</div></section>
              </>;
            })()}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Help Messages
                </h2>
                <p className="text-sm text-zinc-400">
                  {openMessages} open · {unreadMessages} unread · {urgentMessages} urgent
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['open', 'unread', 'resolved', 'all'] as const).map((filter) => <button key={filter} type="button" onClick={() => setMessageFilter(filter)} className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize ${messageFilter === filter ? 'bg-yellow-400 text-zinc-950' : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}>{filter}</button>)}
              </div>
            </div>

            {helpMessages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-8 text-center text-zinc-400">
                <p className="text-3xl">💬</p>
                <p className="mt-3 text-lg text-white">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {helpMessages.filter((message) => messageFilter === 'all' || (messageFilter === 'open' && message.status !== 'resolved') || (messageFilter === 'resolved' && message.status === 'resolved') || (messageFilter === 'unread' && !message.admin_read_at)).map((message) => (
                  <div
                    key={message.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {message.profiles?.full_name || 'Student'}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {message.profiles?.email || 'Unknown email'}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                          message.status === 'resolved'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-yellow-500/15 text-yellow-300'
                        }`}
                      >
                        {message.status}
                      </span>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void updateHelpMessage(message, { is_urgent: !message.is_urgent })} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${message.is_urgent ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-zinc-700 text-zinc-300'}`}>{message.is_urgent ? '⚠ Urgent' : 'Mark urgent'}</button>
                      <button type="button" onClick={() => void updateHelpMessage(message, { admin_read_at: message.admin_read_at ? null : new Date().toISOString() })} className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300">{message.admin_read_at ? 'Mark unread' : 'Mark read'}</button>
                      <button type="button" onClick={() => void updateHelpMessage(message, { status: message.status === 'resolved' ? 'open' : 'resolved' })} className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300">{message.status === 'resolved' ? 'Reopen' : 'Resolve'}</button>
                    </div>

                    <p className="mb-3 rounded-xl bg-zinc-900 px-3 py-3 text-sm text-zinc-200">
                      {message.message}
                    </p>

                    {message.reply && (
                      <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-300">
                        <p className="mb-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Your reply
                        </p>
                        {message.reply}
                      </div>
                    )}

                    {message.status !== 'resolved' && (
                      <div className="flex gap-2">
                        <input
                          value={replyText[message.id] ?? ''}
                          onChange={(event) =>
                            setReplyText((prev) => ({
                              ...prev,
                              [message.id]: event.target.value,
                            }))
                          }
                          placeholder="Type your reply..."
                          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-yellow-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendReply(message.id)}
                          disabled={sendingReply === message.id}
                          className="rounded-xl bg-[#facc15] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#fbbf24] disabled:opacity-60"
                        >
                          {sendingReply === message.id ? '...' : 'Reply'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {helpMessages.filter((message) => messageFilter === 'all' || (messageFilter === 'open' && message.status !== 'resolved') || (messageFilter === 'resolved' && message.status === 'resolved') || (messageFilter === 'unread' && !message.admin_read_at)).length === 0 && <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-400">No messages in this view.</p>}
          </div>
        )}

        {activeTab === 'activity' && (
          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
            <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-white">Admin activity</h2><p className="text-sm text-zinc-400">Recent actions recorded for the admin team.</p></div><button type="button" onClick={async () => { const { data } = await supabase.from('admin_activity_log').select('id, action, details, created_at').order('created_at', { ascending: false }).limit(100); if (data) setActivityEntries(data as ActivityEntry[]); }} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300">Refresh</button></div>
            {activityEntries.length === 0 ? <p className="rounded-xl border border-dashed border-zinc-700 px-4 py-8 text-center text-sm text-zinc-400">Activity will appear here as admins manage applications, fees, messages, and departure slots.</p> : <ol className="space-y-2">{activityEntries.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"><span className="text-sm text-zinc-200">{entry.action}{entry.details.count ? ` · ${entry.details.count} students` : ''}{entry.details.student_name ? ` · ${entry.details.student_name}` : ''}{entry.details.title ? ` · ${entry.details.title}` : ''}{entry.details.group ? ` · ${entry.details.group}` : ''}</span><span className="ml-auto flex flex-col items-end gap-1"><span className="text-[10px] text-zinc-500">{String(entry.details.admin ?? 'Admin')}</span><time className="text-xs text-zinc-500">{new Date(entry.created_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</time></span></li>)}</ol>}
          </section>
        )}

        {activeTab === 'announcements' && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <h2 className="mb-4 text-xl font-semibold text-white">
                Send Announcement
              </h2>

              <div className="space-y-4">
                <input
                  value={announcementTitle}
                  onChange={(event) => setAnnouncementTitle(event.target.value)}
                  placeholder="Announcement title"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400"
                />

                <textarea
                  value={announcementMessage}
                  onChange={(event) =>
                    setAnnouncementMessage(event.target.value)
                  }
                  rows={5}
                  placeholder="Write your announcement..."
                  className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="sr-only" htmlFor="announcement-audience">Announcement audience</label>
                  <select id="announcement-audience" value={announcementTargetType} onChange={(event) => { setAnnouncementTargetType(event.target.value); setAnnouncementTargetValue(''); }} className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white outline-none focus:border-yellow-400">
                    <option value="all">All students</option><option value="university">One university</option><option value="departure_group">One departure group</option><option value="unpaid">Unpaid students</option><option value="faculty">Faculty</option>
                  </select>
                  {announcementTargetType === 'university' ? <select aria-label="Choose university" value={announcementTargetValue} onChange={(event) => setAnnouncementTargetValue(event.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white outline-none focus:border-yellow-400"><option value="">Choose university</option>{universities.map((university) => <option key={university} value={university}>{university}</option>)}</select> : announcementTargetType === 'departure_group' ? <select aria-label="Choose departure group" value={announcementTargetValue} onChange={(event) => setAnnouncementTargetValue(event.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white outline-none focus:border-yellow-400"><option value="">Choose departure group</option>{departureGroups.map((group) => <option key={group.id} value={group.id}>{group.university} · {group.department}</option>)}</select> : <p className="self-center text-xs text-zinc-500">Audience: {announcementTargetType === 'all' ? 'every student' : announcementTargetType === 'unpaid' ? 'students with unpaid fees' : announcementTargetType}</p>}
                </div>

                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={announcementWhatsApp}
                    onChange={(event) =>
                      setAnnouncementWhatsApp(event.target.checked)
                    }
                    className="h-4 w-4 accent-yellow-400"
                  />
                  Also send on WhatsApp to opted-in students
                </label>

                {announcementSuccess && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  ✅ Announcement sent to the selected audience.
                  </div>
                )}
                {whatsAppNotice && <p role="status" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">{whatsAppNotice}</p>}

                <button
                  type="button"
                  onClick={handleSendAnnouncement}
                  disabled={sendingAnnouncement || !announcementTitle.trim() || !announcementMessage.trim() || (['university', 'departure_group'].includes(announcementTargetType) && !announcementTargetValue)}
                  className="rounded-xl bg-gradient-to-r from-[#facc15] via-[#fbbf24] to-[#f59e0b] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_15px_30px_rgba(250,204,21,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendingAnnouncement
                    ? 'Sending...'
                    : `Send to ${announcementTargetType === 'all' ? 'All Students' : announcementTargetType === 'unpaid' ? 'Unpaid Students' : announcementTargetType === 'faculty' ? 'Faculty' : 'Selected Group'} →`}
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <h2 className="mb-4 text-xl font-semibold text-white">
                Previous Announcements
              </h2>

              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <p className="text-zinc-400">No announcements yet</p>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3"
                    >
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-zinc-300">
                        {item.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                          {new Date(item.created_at).toLocaleDateString(
                            'en-PK',
                            {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            },
                          )}
                        </p>
                        <button
                          type="button"
                          disabled={resendingId === item.id}
                          onClick={() => handleResendAnnouncement(item)}
                          className="rounded-lg border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 transition hover:bg-zinc-800 hover:text-white disabled:opacity-50"
                        >
                          {resendingId === item.id
                            ? 'Sending…'
                            : 'Send on WhatsApp'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'holidays' && (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <h2 className="mb-4 text-xl font-semibold text-white">
                Add No-Service Day
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-zinc-300">
                    Date
                  </label>
                  <input
                    type="date"
                    value={holidayDate}
                    onChange={(event) => setHolidayDate(event.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-zinc-300">
                    Reason
                  </label>
                  <input
                    value={holidayReason}
                    onChange={(event) => setHolidayReason(event.target.value)}
                    placeholder="e.g. Eid Holiday"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-yellow-400"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={holidayWhatsApp}
                    onChange={(event) =>
                      setHolidayWhatsApp(event.target.checked)
                    }
                    className="h-4 w-4 accent-yellow-400"
                  />
                  Notify opted-in students on WhatsApp
                </label>

                <button
                  type="button"
                  onClick={handleAddHoliday}
                  className="rounded-xl bg-gradient-to-r from-[#facc15] via-[#fbbf24] to-[#f59e0b] px-5 py-3 text-sm font-semibold text-slate-950"
                >
                  {addingHoliday ? 'Adding...' : 'Add No-Service Day →'}
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <h2 className="mb-4 text-xl font-semibold text-white">
                Scheduled No-Service Days
              </h2>

              {holidays.length === 0 ? (
                <p className="text-zinc-400">No holidays added yet</p>
              ) : (
                <div className="space-y-3">
                  {holidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-3"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {holiday.reason}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {new Date(holiday.date).toLocaleDateString('en-PK', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        className="rounded-lg border border-red-800 bg-red-950 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-900"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'vehicles' && (
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <input
                value={newVehicle}
                onChange={(event) => setNewVehicle(event.target.value)}
                placeholder="Vehicle number e.g. C-01, V-05"
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400"
              />
              <select value={newVehicleDetails.type} onChange={(event) => setNewVehicleDetails((value) => ({ ...value, type: event.target.value }))} className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm text-white"><option value="coaster">Coaster</option><option value="hiace">Hiace</option><option value="van">Van</option><option value="bus">Bus</option><option value="other">Other</option></select>
              <input type="number" min="1" value={newVehicleDetails.capacity} onChange={(event) => setNewVehicleDetails((value) => ({ ...value, capacity: event.target.value }))} placeholder="Seat capacity" className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm text-white" />
              <select value={newVehicleDetails.routeId} onChange={(event) => setNewVehicleDetails((value) => ({ ...value, routeId: event.target.value }))} className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm text-white"><option value="">Usual route (optional)</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}</select>
              <button
                type="button"
                onClick={handleAddVehicle}
                className="rounded-xl bg-gradient-to-r from-[#facc15] via-[#fbbf24] to-[#f59e0b] px-5 py-3 text-sm font-semibold text-slate-950"
              >
                {addingVehicle ? 'Adding...' : 'Add'}
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <h2 className="mb-4 text-xl font-semibold text-white">
                All Vehicles ({coasters.length})
              </h2>

              {coasters.length === 0 ? (
                <p className="text-zinc-400">No vehicles added yet</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {coasters.map((coaster) => (
                    <div
                      key={coaster.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-white"
                    >
                      <div className="flex items-center justify-between"><p className="font-semibold">🚐 {coaster.coaster_number}</p><span className={`rounded-full px-2 py-1 text-[10px] ${coaster.maintenance_status === 'active' || !coaster.maintenance_status ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-200'}`}>{coaster.maintenance_status ?? 'active'}</span></div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <select aria-label={`${coaster.coaster_number} vehicle type`} value={coaster.vehicle_type ?? 'van'} onChange={(event) => void handleUpdateVehicle(coaster, { vehicle_type: event.target.value })} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-200"><option value="coaster">Coaster</option><option value="hiace">Hiace</option><option value="van">Van</option><option value="bus">Bus</option><option value="other">Other</option></select>
                        <input aria-label={`${coaster.coaster_number} seat capacity`} type="number" min="1" value={coaster.seat_capacity ?? 28} onChange={(event) => setCoasters((current) => current.map((item) => item.id === coaster.id ? { ...item, seat_capacity: Number(event.target.value) } : item))} onBlur={(event) => void handleUpdateVehicle(coaster, { seat_capacity: Number(event.target.value) || 1 })} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-200" />
                        <select aria-label={`${coaster.coaster_number} usual route`} value={coaster.default_route_id ?? ''} onChange={(event) => void handleUpdateVehicle(coaster, { default_route_id: event.target.value || null })} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-200"><option value="">No usual route</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}</select>
                        <select aria-label={`${coaster.coaster_number} maintenance status`} value={coaster.maintenance_status ?? 'active'} onChange={(event) => void handleUpdateVehicle(coaster, { maintenance_status: event.target.value })} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-200"><option value="active">Available</option><option value="maintenance">In maintenance</option><option value="retired">Retired</option></select>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">{coaster.seat_capacity ?? 28} seats · usual route {routes.find((route) => route.id === coaster.default_route_id)?.name ?? 'not set'}</p>
                      <p className="mt-1 text-xs text-zinc-400">Today&apos;s route: {routes.find((route) => route.id === todayAssignments.find((assignment) => assignment.coaster_id === coaster.id)?.route_id)?.name ?? 'not assigned'} · {todayAssignments.filter((assignment) => assignment.coaster_id === coaster.id).length} assigned</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <h2 className="mb-2 text-2xl font-semibold text-white">
                Route Pricing
              </h2>
              <p className="mb-4 text-sm text-zinc-400">
                Update prices here and they reflect instantly on the landing
                page and student portal.
              </p>

              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-100">
                <span className="mt-0.5 text-base">⚠️</span>
                <p>
                  Price changes are live immediately. Students will see updated
                  prices on the landing page right away.
                </p>
              </div>

              {routes.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 text-center">
                  <div className="mb-2 text-3xl">🗺️</div>
                  <p className="text-zinc-400">No routes found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {routes.map((route) => (
                    <div
                      key={route.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4"
                    >
                      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {route.name}
                          </h3>
                          <p className="text-sm text-zinc-400">
                            Current price:{' '}
                            <span className="font-medium text-yellow-300">
                              PKR {route.price.toLocaleString()}
                            </span>{' '}
                            / month
                          </p>
                        </div>

                        {priceSuccess === route.id && (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                            ✅ Updated!
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="relative flex-1">
                          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                            PKR
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={editingPrice[route.id] ?? route.price}
                            onChange={(event) =>
                              setEditingPrice((prev) => ({
                                ...prev,
                                [route.id]: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-12 pr-4 py-2.5 text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400"
                            placeholder="Enter new price"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUpdatePrice(route.id)}
                          disabled={savingPrice === route.id}
                          className="rounded-xl bg-gradient-to-r from-[#facc15] via-[#fbbf24] to-[#f59e0b] px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:brightness-105 disabled:opacity-40"
                        >
                          {savingPrice === route.id ? '...' : 'Update →'}
                        </button>
                      </div>

                      <p className="mt-3 text-xs text-zinc-500">
                        AC price auto-calculated as PKR{' '}
                        {(
                          Number(editingPrice[route.id] ?? route.price) + 500
                        ).toLocaleString()}{' '}
                        (base + PKR 500)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <h2 className="mb-4 text-xl font-semibold text-white">
                Add New Route
              </h2>

              <div className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
                <input
                  value={newRouteName}
                  onChange={(event) => setNewRouteName(event.target.value)}
                  placeholder="Route name"
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400"
                />
                <input
                  type="number"
                  value={newRoutePrice}
                  onChange={(event) => setNewRoutePrice(event.target.value)}
                  placeholder="Price"
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400"
                />
                <button
                  type="button"
                  onClick={handleAddRoute}
                  className="rounded-xl bg-zinc-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-zinc-600"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
