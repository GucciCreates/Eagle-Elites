'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Student = {
  id: string;
  full_name: string;
  email: string;
  fee_status: string;
  destination: string;
  route_id: string | null;
  coaster_number?: string;
  driver_name?: string;
  driver_contact?: string;
  routes?: { name: string };
};

type Route = { id: string; name: string; price: number };
type Coaster = { id: string; coaster_number: string };
type HelpMessage = {
  id: string;
  message: string;
  status: string;
  reply: string | null;
  created_at: string;
  profiles?: { full_name: string; email: string };
};
type Holiday = { id: string; date: string; reason: string };
type Notification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};
type Application = {
  id: string;
  full_name: string;
  email: string;
  user_type: string;
  institution: string;
  cnic_last4: string;
  phone: string;
  pickup_area: string;
  preferred_morning: string;
  preferred_evening: string;
  payment_transaction_id: string;
  payment_proof_url: string;
  applied_at: string;
  status: string;
};
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
  driver_name?: string;
  driver_contact?: string;
};

export default function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [coasters, setCoasters] = useState<Coaster[]>([]);
  const [helpMessages, setHelpMessages] = useState<HelpMessage[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [processingApp, setProcessingApp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [assignDate, setAssignDate] = useState(() =>
    typeof window === 'undefined' ? '' : new Date().toISOString().split('T')[0],
  );
  const [groupAssignments, setGroupAssignments] = useState<
    Record<string, AssignmentGroup>
  >({});
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);

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

  const [holidayDate, setHolidayDate] = useState('');
  const [holidayReason, setHolidayReason] = useState('');
  const [addingHoliday, setAddingHoliday] = useState(false);

  const [newVehicle, setNewVehicle] = useState('');
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [newRoutePrice, setNewRoutePrice] = useState('');
  const [departureGroups, setDepartureGroups] = useState<DepartureGroup[]>([]);
  const [departureSlots, setDepartureSlots] = useState<DepartureSlot[]>([]);
  const [slotDate, setSlotDate] = useState(() =>
    typeof window === 'undefined' ? '' : new Date().toISOString().split('T')[0],
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
  const supabase = createClient();

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

      const [
        { data: studentsData },
        { data: routesData },
        { data: coastersData },
        { data: helpData },
        { data: holidaysData },
        { data: notificationsData },
        { data: applicationsData },
        { data: departureGroupsData },
        { data: departureSlotsData },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, routes(name)')
          .eq('role', 'student')
          .order('full_name'),
        supabase.from('routes').select('*'),
        supabase.from('coasters').select('*'),
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
          .order('applied_at', { ascending: false }),
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
      ]);

      if (studentsData) setStudents(studentsData as Student[]);
      if (routesData) setRoutes(routesData as Route[]);
      if (coastersData) setCoasters(coastersData as Coaster[]);
      if (helpData) setHelpMessages(helpData as HelpMessage[]);
      if (holidaysData) setHolidays(holidaysData as Holiday[]);
      if (notificationsData)
        setNotifications(notificationsData as Notification[]);
      if (applicationsData) setApplications(applicationsData as Application[]);
      if (departureGroupsData)
        setDepartureGroups(departureGroupsData as DepartureGroup[]);
      if (departureSlotsData)
        setDepartureSlots(departureSlotsData as DepartureSlot[]);
      setLoading(false);
    };

    void init();
  }, [router, supabase]);

  const dailyGroups: DailyGroup[] = routes
    .map((route) => ({
      route_id: route.id,
      route_name: route.name,
      students: students.filter((s) => s.route_id === route.id),
    }))
    .filter((group) => group.students.length > 0);

  const unassignedStudents = students.filter((student) => !student.route_id);

  const handleSaveAssignments = async () => {
    setSavingAssignment(true);
    const inserts: Record<string, unknown>[] = [];

    for (const [routeId, assignment] of Object.entries(groupAssignments)) {
      if (!assignment.coaster_id || !assignment.driver_name) continue;

      const group = dailyGroups.find((item) => item.route_id === routeId);
      if (!group) continue;

      for (const student of group.students) {
        inserts.push({
          student_id: student.id,
          coaster_id: assignment.coaster_id,
          driver_name: assignment.driver_name,
          driver_contact: assignment.driver_contact || '',
          assignment_date: assignDate,
          seat_confirmed: false,
        });
      }
    }

    if (inserts.length > 0) {
      await supabase
        .from('daily_assignments')
        .upsert(inserts, { onConflict: 'student_id,assignment_date' });
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
        destination: editingStudent.destination,
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
      await supabase
        .from('departure_slots')
        .upsert(entries, { onConflict: 'group_id,slot_date,slot_number' });
    }

    const { data } = await supabase
      .from('departure_slots')
      .select('*')
      .order('slot_date', { ascending: false })
      .order('slot_number', { ascending: true });

    if (data) setDepartureSlots(data as DepartureSlot[]);

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

    await supabase
      .from('help_messages')
      .update({
        reply: replyText[messageId],
        replied_at: new Date().toISOString(),
        status: 'resolved',
      })
      .eq('id', messageId);

    setHelpMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, reply: replyText[messageId], status: 'resolved' }
          : message,
      ),
    );

    setReplyText((prev) => ({ ...prev, [messageId]: '' }));
    setSendingReply(null);
  };

  const handleSendAnnouncement = async () => {
    if (!announcementTitle || !announcementMessage) return;
    setSendingAnnouncement(true);

    const { data } = await supabase
      .from('notifications')
      .insert({
        title: announcementTitle,
        message: announcementMessage,
        type: 'general',
      })
      .select()
      .single();

    if (data) setNotifications((prev) => [data as Notification, ...prev]);

    setAnnouncementTitle('');
    setAnnouncementMessage('');
    setAnnouncementSuccess(true);
    setTimeout(() => setAnnouncementSuccess(false), 3000);
    setSendingAnnouncement(false);
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
      .insert({ coaster_number: newVehicle })
      .select()
      .single();

    if (data) setCoasters((prev) => [...prev, data as Coaster]);

    setNewVehicle('');
    setAddingVehicle(false);
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

  const handleApprove = async (studentId: string) => {
    setProcessingApp(studentId);
    await supabase
      .from('profiles')
      .update({
        status: 'active',
        approved_at: new Date().toISOString(),
      })
      .eq('id', studentId);
    setApplications((prev) => prev.filter((a) => a.id !== studentId));
    setProcessingApp(null);
  };

  const handleReject = async (studentId: string) => {
    setProcessingApp(studentId);
    await supabase
      .from('profiles')
      .update({
        status: 'rejected',
        rejected_reason: rejectReason[studentId] || 'Application not approved.',
      })
      .eq('id', studentId);
    setApplications((prev) => prev.filter((a) => a.id !== studentId));
    setProcessingApp(null);
  };

  const unpaidCount = students.filter(
    (student) => student.fee_status !== 'paid',
  ).length;
  const openMessages = helpMessages.filter(
    (message) => message.status === 'open',
  ).length;
  const today = assignDate || '';
  const upcomingHoliday = holidays.find((holiday) => holiday.date >= today);

  const tabs = [
    { key: 'overview', label: '📊', title: 'Overview' },
    { key: 'students', label: '👥', title: 'Students' },
    { key: 'applications', label: '📋', title: 'Applications' },
    { key: 'assignments', label: '🚐', title: 'Daily Assignments' },
    { key: 'departures', label: '🚍', title: 'Departures' },
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
  ];

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
    <div className="min-h-screen bg-[#05070b] text-white">
      <nav className="border-b border-zinc-800 bg-[#090d13]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#facc15] via-[#fbbf24] to-[#f59e0b] text-lg font-black text-slate-950 shadow-[0_15px_30px_rgba(250,204,21,0.35)]">
              EE
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#facc15]/80">
                Eagle Elites
              </p>
              <h1 className="text-lg font-semibold">Admin Panel</h1>
            </div>
          </div>

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
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-[#facc15] text-black shadow-[0_12px_25px_rgba(250,204,21,0.25)]'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span className="mr-1.5">{tab.label}</span>
              {tab.title}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Total Students',
                  value: students.length,
                  icon: '👥',
                  color: 'text-white',
                },
                {
                  label: 'Pending Applications',
                  value: applications.length,
                  icon: '📋',
                  color: 'text-yellow-400',
                },
                {
                  label: 'Unpaid Fees',
                  value: unpaidCount,
                  icon: '⚠️',
                  color: 'text-red-400',
                },
                {
                  label: 'Open Messages',
                  value: openMessages,
                  icon: '💬',
                  color: 'text-yellow-400',
                },
                {
                  label: 'Total Vehicles',
                  value: coasters.length,
                  icon: '🚐',
                  color: 'text-white',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[24px] border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`text-lg ${stat.color}`}>{stat.icon}</span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                      {stat.label}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
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

            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <h2 className="mb-4 text-xl font-semibold text-white">
                Routes Summary
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {routes.map((route) => {
                  const count = students.filter(
                    (student) => student.route_id === route.id,
                  ).length;
                  const unpaid = students.filter(
                    (student) =>
                      student.route_id === route.id &&
                      student.fee_status !== 'paid',
                  ).length;

                  return (
                    <div
                      key={route.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-white">
                          {route.name}
                        </h3>
                        <span className="text-xs text-zinc-400">
                          PKR {route.price.toLocaleString()}/month
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400">
                        {count} students
                        {unpaid > 0 && (
                          <span className="ml-2 text-red-400">
                            {unpaid} unpaid
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
              <h2 className="mb-5 text-xl font-semibold text-white">
                All Students ({students.length})
              </h2>

              <div className="space-y-5">
                {routes.map((route) => {
                  const routeStudents = students.filter(
                    (student) => student.route_id === route.id,
                  );
                  if (routeStudents.length === 0) return null;

                  return (
                    <div
                      key={route.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                    >
                      <h3 className="mb-3 font-semibold text-white">
                        {route.name} ({routeStudents.length} students)
                      </h3>

                      <div className="space-y-3">
                        {routeStudents.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3"
                          >
                            <div>
                              <p className="font-medium text-white">
                                {student.full_name}
                              </p>
                              <p className="text-xs text-zinc-400">
                                {student.email}
                              </p>
                              {student.destination && (
                                <p className="mt-1 text-xs text-zinc-500">
                                  📍 {student.destination}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                                  student.fee_status === 'paid'
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : 'bg-red-500/15 text-red-300'
                                }`}
                              >
                                {student.fee_status === 'paid'
                                  ? '✓ Paid'
                                  : '⚠ Unpaid'}
                              </span>

                              <button
                                type="button"
                                onClick={() => setEditingStudent(student)}
                                className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-600"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {unassignedStudents.length > 0 && (
                  <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                    <h3 className="mb-3 font-semibold text-yellow-200">
                      ⚠ Unassigned to Route ({unassignedStudents.length})
                    </h3>
                    <div className="space-y-3">
                      {unassignedStudents.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between rounded-xl border border-yellow-500/20 bg-zinc-950/60 px-3 py-3"
                        >
                          <div>
                            <p className="font-medium text-white">
                              {student.full_name}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {student.email}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingStudent(student)}
                            className="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-yellow-300"
                          >
                            Assign Route
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                      value={editingStudent.destination}
                      onChange={(event) =>
                        setEditingStudent({
                          ...editingStudent,
                          destination: event.target.value,
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
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-white">
                New Applications
              </h2>
              <p className="text-sm text-zinc-400">
                {applications.length} pending approval
              </p>
            </div>

            {applications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-8 text-center text-zinc-400">
                <p className="text-3xl">📋</p>
                <p className="mt-3 text-lg text-white">
                  No pending applications
                </p>
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  className="mb-4 rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {app.full_name}
                      </h3>
                      <p className="text-sm text-zinc-400">{app.email}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Applied:{' '}
                        {new Date(app.applied_at).toLocaleDateString('en-PK', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[10px] font-medium text-yellow-300">
                      {app.user_type === 'student'
                        ? '🎓 Student'
                        : '👨‍🏫 Faculty'}
                    </span>
                  </div>

                  <div className="mb-4 grid gap-3 md:grid-cols-2">
                    {[
                      { label: 'Institution', value: app.institution },
                      {
                        label:
                          app.user_type === 'student'
                            ? 'Enrollment No.'
                            : 'Employee Code',
                        value: app.cnic_last4,
                      },
                      { label: 'Phone', value: app.phone },
                      { label: 'Pickup Area', value: app.pickup_area },
                      {
                        label: 'Morning',
                        value: app.preferred_morning?.slice(0, 5) || '—',
                      },
                      {
                        label: 'Evening',
                        value: app.preferred_evening?.slice(0, 5) || '—',
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3"
                      >
                        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm font-medium text-white">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      Transaction ID
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">
                      {app.payment_transaction_id}
                    </p>
                  </div>

                  {app.payment_proof_url && (
                    <div className="mb-4">
                      <a
                        href={app.payment_proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-3 text-sm text-yellow-300 transition hover:border-yellow-400"
                      >
                        <span>Payment Proof</span>
                        <span className="text-xs text-zinc-400">
                          Tap to open full image
                        </span>
                      </a>
                    </div>
                  )}

                  <textarea
                    value={rejectReason[app.id] ?? ''}
                    onChange={(event) =>
                      setRejectReason((prev) => ({
                        ...prev,
                        [app.id]: event.target.value,
                      }))
                    }
                    placeholder="Rejection reason (optional)"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-400 transition"
                  />

                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleReject(app.id)}
                      disabled={processingApp === app.id}
                      className="flex-1 rounded-xl border border-red-800 bg-red-950 px-3 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-900 disabled:opacity-40"
                    >
                      {processingApp === app.id ? '...' : '❌ Reject'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprove(app.id)}
                      disabled={processingApp === app.id}
                      className="flex-1 rounded-xl bg-yellow-400 px-3 py-3 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:opacity-40"
                    >
                      {processingApp === app.id ? '...' : '✅ Approve'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'assignments' && (
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
                          {coasters.map((coaster) => (
                            <option key={coaster.id} value={coaster.id}>
                              Vehicle #{coaster.coaster_number}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-zinc-400">
                          Driver Name
                        </label>
                        <input
                          value={
                            groupAssignments[group.route_id]?.driver_name ?? ''
                          }
                          onChange={(event) =>
                            setGroupAssignments((prev) => ({
                              ...prev,
                              [group.route_id]: {
                                ...prev[group.route_id],
                                driver_name: event.target.value,
                              },
                            }))
                          }
                          placeholder="Driver name"
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-zinc-400">
                          Driver Contact
                        </label>
                        <input
                          value={
                            groupAssignments[group.route_id]?.driver_contact ??
                            ''
                          }
                          onChange={(event) =>
                            setGroupAssignments((prev) => ({
                              ...prev,
                              [group.route_id]: {
                                ...prev[group.route_id],
                                driver_contact: event.target.value,
                              },
                            }))
                          }
                          placeholder="Driver contact"
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>
                  </div>
                ))}

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
        )}

        {activeTab === 'departures' && (
          <div className="space-y-6">
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

        {activeTab === 'fees' && (
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Fee Management
                </h2>
                <p className="text-sm text-zinc-400">
                  {unpaidCount} students have unpaid fees
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-white">
                      {student.full_name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {student.routes?.name || 'No route'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                        student.fee_status === 'paid'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-red-500/15 text-red-300'
                      }`}
                    >
                      {student.fee_status === 'paid' ? '✓ Paid' : '⚠ Unpaid'}
                    </span>

                    <button
                      type="button"
                      onClick={async () => {
                        const newStatus =
                          student.fee_status === 'paid' ? 'unpaid' : 'paid';
                        await supabase
                          .from('profiles')
                          .update({ fee_status: newStatus })
                          .eq('id', student.id);
                        setStudents((prev) =>
                          prev.map((item) =>
                            item.id === student.id
                              ? { ...item, fee_status: newStatus }
                              : item,
                          ),
                        );
                      }}
                      className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-600"
                    >
                      Toggle
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                  {openMessages} open messages
                </p>
              </div>
            </div>

            {helpMessages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-8 text-center text-zinc-400">
                <p className="text-3xl">💬</p>
                <p className="mt-3 text-lg text-white">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {helpMessages.map((message) => (
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
          </div>
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

                {announcementSuccess && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    ✅ Announcement sent to all students!
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSendAnnouncement}
                  className="rounded-xl bg-gradient-to-r from-[#facc15] via-[#fbbf24] to-[#f59e0b] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_15px_30px_rgba(250,204,21,0.3)]"
                >
                  {sendingAnnouncement
                    ? 'Sending...'
                    : 'Send to All Students →'}
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
                      <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        {new Date(item.created_at).toLocaleDateString('en-PK', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
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
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={newVehicle}
                onChange={(event) => setNewVehicle(event.target.value)}
                placeholder="Vehicle number e.g. C-01, V-05"
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400"
              />
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
                      🚐 #{coaster.coaster_number}
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
