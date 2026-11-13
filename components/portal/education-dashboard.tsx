'use client';

import { useState } from 'react';

type Role = 'student' | 'teacher' | 'admin';

type NavItem = {
  label: string;
  key: string;
  icon: React.ReactNode;
};

type Stat = {
  label: string;
  value: string;
  trend: string;
  tone: 'indigo' | 'emerald' | 'amber' | 'slate';
};

type Course = {
  code: string;
  title: string;
  instructor: string;
  progress: number;
  next: string;
  color: string;
};

type Assignment = {
  title: string;
  due: string;
  type: string;
  status: 'Due soon' | 'Submitted' | 'Needs review';
};

type Notice = {
  title: string;
  detail: string;
  time: string;
};

const roleConfig: Record<
  Role,
  {
    name: string;
    nav: NavItem[];
    greeting: string;
    primaryAction: string;
    metrics: Stat[];
    courses: Course[];
    assignments: Assignment[];
    notices: Notice[];
    focusTitle: string;
    focusDetail: string;
  }
> = {
  student: {
    name: 'Student',
    nav: [
      { label: 'Home', key: 'home', icon: <HomeIcon /> },
      { label: 'Courses', key: 'courses', icon: <BookIcon /> },
      { label: 'Assignments', key: 'assignments', icon: <CheckIcon /> },
      { label: 'Schedule', key: 'schedule', icon: <CalendarIcon /> },
      { label: 'Grades', key: 'grades', icon: <ChartIcon /> },
      { label: 'Resources', key: 'resources', icon: <FolderIcon /> },
      { label: 'Messages', key: 'messages', icon: <MessageIcon /> },
    ],
    greeting: 'Good morning, Aisha',
    primaryAction: 'View timetable',
    metrics: [
      { label: 'Attendance', value: '96.4%', trend: '+2.1%', tone: 'emerald' },
      { label: 'Current GPA', value: '3.82', trend: '+0.14', tone: 'indigo' },
      {
        label: 'Pending work',
        value: '03',
        trend: '2 due this week',
        tone: 'amber',
      },
      {
        label: 'Unread updates',
        value: '08',
        trend: '4 from faculty',
        tone: 'slate',
      },
    ],
    courses: [
      {
        code: 'ECO 201',
        title: 'Microeconomics',
        instructor: 'Dr. Ali',
        progress: 74,
        next: 'Quiz due Wed',
        color: 'bg-indigo-100 text-indigo-700',
      },
      {
        code: 'MAT 102',
        title: 'Calculus II',
        instructor: 'Ms. Rahman',
        progress: 61,
        next: 'Tutorial due Fri',
        color: 'bg-emerald-100 text-emerald-700',
      },
      {
        code: 'ENG 210',
        title: 'Academic Writing',
        instructor: 'Mr. Saleem',
        progress: 88,
        next: 'Essay review',
        color: 'bg-amber-100 text-amber-700',
      },
    ],
    assignments: [
      {
        title: 'Elasticity worksheet',
        due: 'Today, 5:00 PM',
        type: 'Homework',
        status: 'Due soon',
      },
      {
        title: 'Lab report submission',
        due: 'Thu, 9:00 AM',
        type: 'Assessment',
        status: 'Submitted',
      },
      {
        title: 'Research reflection',
        due: 'Fri, 4:00 PM',
        type: 'Journal',
        status: 'Needs review',
      },
    ],
    notices: [
      {
        title: 'Career seminar',
        detail: 'Thursday, 4:30 PM in Lecture Hall A.',
        time: '1h ago',
      },
      {
        title: 'Library access extended',
        detail: 'Study zone remains open until 10 PM during exam week.',
        time: 'Today',
      },
      {
        title: 'Fee reminder',
        detail: 'Final semester installment due by Saturday.',
        time: '2d ago',
      },
    ],
    focusTitle: 'Today at a glance',
    focusDetail: '3 classes, 1 submission due, and 2 faculty updates.',
  },
  teacher: {
    name: 'Teacher',
    nav: [
      { label: 'Home', key: 'home', icon: <HomeIcon /> },
      { label: 'Classes', key: 'classes', icon: <BookIcon /> },
      { label: 'Grading', key: 'grading', icon: <CheckIcon /> },
      { label: 'Attendance', key: 'attendance', icon: <CalendarIcon /> },
      { label: 'Students', key: 'students', icon: <UsersIcon /> },
      { label: 'Resources', key: 'resources', icon: <FolderIcon /> },
      { label: 'Messages', key: 'messages', icon: <MessageIcon /> },
    ],
    greeting: 'Good morning, Mr. Khan',
    primaryAction: 'Create assignment',
    metrics: [
      {
        label: 'Classes today',
        value: '06',
        trend: '3 online',
        tone: 'indigo',
      },
      {
        label: 'Awaiting grading',
        value: '42',
        trend: '+8 this week',
        tone: 'amber',
      },
      { label: 'Attendance', value: '91.2%', trend: '+1.4%', tone: 'emerald' },
      {
        label: 'At risk',
        value: '07',
        trend: '2 flagged today',
        tone: 'slate',
      },
    ],
    courses: [
      {
        code: 'BBA 404',
        title: 'Business Strategy',
        instructor: 'Faculty team',
        progress: 63,
        next: 'Case review',
        color: 'bg-violet-100 text-violet-700',
      },
      {
        code: 'ECO 112',
        title: 'Principles of Economics',
        instructor: 'Semester block',
        progress: 81,
        next: 'Lecture 8',
        color: 'bg-indigo-100 text-indigo-700',
      },
      {
        code: 'ACC 220',
        title: 'Managerial Accounting',
        instructor: 'Workshop gradebook',
        progress: 56,
        next: 'Lab check-in',
        color: 'bg-emerald-100 text-emerald-700',
      },
    ],
    assignments: [
      {
        title: 'Midterm essays',
        due: 'Today, 3:30 PM',
        type: 'Review queue',
        status: 'Needs review',
      },
      {
        title: 'Problem set 5',
        due: 'Tomorrow',
        type: 'Submission',
        status: 'Due soon',
      },
      {
        title: 'Attendance report',
        due: 'Thu, 12:00 PM',
        type: 'Admin',
        status: 'Submitted',
      },
    ],
    notices: [
      {
        title: 'Three students need support',
        detail: 'Attendance and assignment completion both trending down.',
        time: '15m ago',
      },
      {
        title: 'Department meeting',
        detail: 'Curriculum review is scheduled for Friday at 2 PM.',
        time: 'Today',
      },
      {
        title: 'New resource upload',
        detail: 'Lecture slides have been added to the shared drive.',
        time: '2d ago',
      },
    ],
    focusTitle: 'Teacher focus',
    focusDetail: '12 submissions need quick attention before tomorrow morning.',
  },
  admin: {
    name: 'Admin',
    nav: [
      { label: 'Home', key: 'home', icon: <HomeIcon /> },
      { label: 'Users', key: 'users', icon: <UsersIcon /> },
      { label: 'Courses', key: 'courses', icon: <BookIcon /> },
      { label: 'Timetable', key: 'timetable', icon: <CalendarIcon /> },
      { label: 'Reports', key: 'reports', icon: <ChartIcon /> },
      { label: 'Finance', key: 'finance', icon: <FolderIcon /> },
      { label: 'Settings', key: 'settings', icon: <SettingsIcon /> },
    ],
    greeting: 'Welcome back, admin',
    primaryAction: 'Generate report',
    metrics: [
      { label: 'Enrollment', value: '1,482', trend: '+5.8%', tone: 'indigo' },
      {
        label: 'Attendance rate',
        value: '88.6%',
        trend: '+1.2%',
        tone: 'emerald',
      },
      {
        label: 'Fee collection',
        value: '92.3%',
        trend: 'PKR 4.8M',
        tone: 'amber',
      },
      { label: 'Open alerts', value: '13', trend: '5 critical', tone: 'slate' },
    ],
    courses: [
      {
        code: 'Ops 01',
        title: 'Enrollment health',
        instructor: 'Admissions',
        progress: 76,
        next: 'Review intake',
        color: 'bg-indigo-100 text-indigo-700',
      },
      {
        code: 'Ops 02',
        title: 'Academic support',
        instructor: 'Student services',
        progress: 68,
        next: 'Tutor allocations',
        color: 'bg-emerald-100 text-emerald-700',
      },
      {
        code: 'Fin 02',
        title: 'Payment tracking',
        instructor: 'Finance team',
        progress: 82,
        next: 'Reconcile batch',
        color: 'bg-amber-100 text-amber-700',
      },
    ],
    assignments: [
      {
        title: 'Semester fee reminders',
        due: 'Today',
        type: 'Finance',
        status: 'Due soon',
      },
      {
        title: 'Teacher onboarding',
        due: 'Tomorrow',
        type: 'HR',
        status: 'Needs review',
      },
      {
        title: 'Bursary review',
        due: 'Fri, 2:00 PM',
        type: 'Requests',
        status: 'Submitted',
      },
    ],
    notices: [
      {
        title: 'Attendance dip in 2nd year',
        detail: 'Five classes are below target this week.',
        time: '25m ago',
      },
      {
        title: 'System maintenance',
        detail: 'Reports dashboard will be read-only on Sunday 11 PM.',
        time: 'Today',
      },
      {
        title: 'Fee status summary',
        detail: 'Three students are overdue by more than 14 days.',
        time: '2d ago',
      },
    ],
    focusTitle: 'Operational focus',
    focusDetail:
      'Finance, enrollment, and attendance need coordinated attention this week.',
  },
};

const roleOrder: Role[] = ['student', 'teacher', 'admin'];

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function EducationDashboard() {
  const [role, setRole] = useState<Role>('student');
  const config = roleConfig[role];

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900">
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-5 lg:px-6">
        <aside className="hidden w-[280px] shrink-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-base font-bold text-white shadow-[0_10px_24px_rgba(109,40,217,0.22)]">
              E
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Academy
              </p>
              <p className="text-lg font-semibold text-slate-900">
                Economics Portal
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {config.nav.map((item) => (
              <button
                key={item.key}
                type="button"
                className={classNames(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  item.key === 'home'
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <span
                  className={classNames(
                    'h-4 w-4',
                    item.key === 'home' ? 'text-violet-600' : 'text-slate-500',
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Focus
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Semester status
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                On track
              </span>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>Completion</span>
                <span>78%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-200">
                <div className="h-full w-[78%] rounded-full bg-violet-600" />
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 lg:hidden"
                  aria-label="Open navigation menu"
                >
                  <span className="text-lg">☰</span>
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <SearchIcon />
                  <input
                    aria-label="Global search"
                    className="w-full border-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    placeholder="Search courses, students, tasks..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 self-end lg:self-auto">
                <div className="relative">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600"
                  >
                    <BellIcon />
                  </button>
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
                    4
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                    AS
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-semibold text-slate-900">
                      Aisha Shah
                    </p>
                    <p className="text-[11px] text-slate-500">Student</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {roleOrder.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => setRole(entry)}
                      className={classNames(
                        'rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
                        role === entry
                          ? 'bg-violet-600 text-white shadow-[0_10px_24px_rgba(109,40,217,0.18)]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                      )}
                    >
                      {roleConfig[entry].name}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Dashboard
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                  {config.greeting}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  {config.focusDetail}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-100"
                >
                  Export
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(109,40,217,0.22)] hover:bg-violet-500"
                >
                  {config.primaryAction}
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {config.metrics.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.02)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {stat.label}
                  </p>
                  <span
                    className={classNames(
                      'rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]',
                      stat.tone === 'indigo' && 'bg-violet-50 text-violet-700',
                      stat.tone === 'emerald' && 'bg-emerald-50 text-emerald-700',
                      stat.tone === 'amber' && 'bg-amber-50 text-amber-700',
                      stat.tone === 'slate' && 'bg-slate-100 text-slate-700',
                    )}
                  >
                    {stat.trend}
                  </span>
                </div>
                <p className="mt-5 text-3xl font-semibold tracking-[-0.06em] text-slate-900">
                  {stat.value}
                </p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Overview
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">
                      {config.focusTitle}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700"
                  >
                    This week
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {config.courses.map((course) => (
                    <div
                      key={course.code}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={classNames(
                            'inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                            course.color,
                          )}
                        >
                          {course.code}
                        </span>
                        <span className="text-xs text-slate-500">
                          {course.progress}%
                        </span>
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-slate-900">
                        {course.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {course.instructor}
                      </p>

                      <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-violet-600"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>

                      <p className="mt-3 text-xs text-slate-500">{course.next}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Performance
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">
                      Learning momentum
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700"
                  >
                    12 weeks
                  </button>
                </div>

                <div className="flex h-40 items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  {[52, 70, 64, 83, 78, 92, 88].map((value, index) => (
                    <div
                      key={value + index}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <div
                        className="flex w-full items-end justify-center rounded-t-xl bg-gradient-to-t from-violet-600 to-violet-300/90"
                        style={{ height: `${value}%` }}
                      />
                      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Priority
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">
                      Upcoming work
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700"
                  >
                    View all
                  </button>
                </div>

                <div className="space-y-3">
                  {config.assignments.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.type} · {item.due}
                        </p>
                      </div>

                      <span
                        className={classNames(
                          'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                          item.status === 'Due soon' && 'bg-amber-50 text-amber-700',
                          item.status === 'Submitted' && 'bg-emerald-50 text-emerald-700',
                          item.status === 'Needs review' && 'bg-slate-200 text-slate-700',
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Today
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {config.focusTitle}
                </h2>
                <p className="mt-2 text-sm text-slate-600">{config.focusDetail}</p>

                <div className="mt-5 space-y-3">
                  {[
                    {
                      time: '09:00',
                      label: 'Economics lecture',
                      detail: 'Room 204',
                    },
                    {
                      time: '11:30',
                      label: 'Workshop review',
                      detail: 'Faculty office',
                    },
                    {
                      time: '14:00',
                      label: 'Office hours',
                      detail: 'Student support desk',
                    },
                  ].map((entry) => (
                    <div
                      key={entry.time}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-xs font-semibold text-violet-700">
                        {entry.time}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {entry.label}
                        </p>
                        <p className="text-xs text-slate-500">{entry.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Snapshot
                  </p>
                  <button
                    type="button"
                    className="text-xs font-medium text-violet-600"
                  >
                    Details
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {[
                    { label: 'Participation', value: 82 },
                    { label: 'Assignments', value: 72 },
                    { label: 'Exams', value: 90 },
                    { label: 'Engagement', value: 68 },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600">
                        <span>{row.label}</span>
                        <span>{row.value}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-violet-600"
                          style={{ width: `${row.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Announcements
                  </p>
                  <button
                    type="button"
                    className="text-xs font-medium text-violet-600"
                  >
                    All
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {config.notices.map((notice) => (
                    <div
                      key={notice.title}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {notice.title}
                        </p>
                        <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                          {notice.time}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        {notice.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-2">
          {config.nav.slice(0, 5).map((item) => (
            <button
              key={item.key}
              type="button"
              className="flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <span className="h-4 w-4 text-slate-500">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4 text-slate-500"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16L20 20" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M9.5 18h5" strokeLinecap="round" />
      <path
        d="M6 9a6 6 0 0 1 12 0v4.5l1.5 3H4.5L6 13.5V9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path
        d="M3 10.5 12 3l9 7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 9.5V20h14V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 5.5V21M20 3v15.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path
        d="M7 12.5 10.5 16 17 9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="3" y="3" width="18" height="18" rx="4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path
        d="M8 3v4M16 3v4M3 9.5h18M8 13h.01M12 13h.01M16 13h.01"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path
        d="M4 18V7M10 18V4M16 18v-9M22 18V11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path
        d="M5 18.5V6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H9l-4 2.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path
        d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1"
        strokeLinecap="round"
      />
      <circle cx="10" cy="7" r="3" />
      <path
        d="M20 19v-1a4 4 0 0 0-3-3.87M16 4a3 3 0 0 1 0 6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <circle cx="12" cy="12" r="3.5" />
      <path
        d="M19.4 15a1.8 1.8 0 0 0 .36 1.97l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.8 1.8 0 0 0-1.97-.36 1.8 1.8 0 0 0-1.08 1.65V20a2 2 0 1 1-4 0v-.09a1.8 1.8 0 0 0-1.08-1.65 1.8 1.8 0 0 0-1.97.36l-.06.06A2 2 0 1 1 4.18 16.2l.06-.06a1.8 1.8 0 0 0 .36-1.97 1.8 1.8 0 0 0-1.65-1.08H3a2 2 0 1 1 0-4h.09A1.8 1.8 0 0 0 4.74 7.23a1.8 1.8 0 0 0-.36-1.97L4.32 5.2A2 2 0 1 1 7.15 2.37l.06.06a1.8 1.8 0 0 0 1.97.36A1.8 1.8 0 0 0 10.26 1.14V1a2 2 0 1 1 4 0v.09a1.8 1.8 0 0 0 1.08 1.65 1.8 1.8 0 0 0 1.97-.36l.06-.06A2 2 0 1 1 19.82 7.8l-.06.06a1.8 1.8 0 0 0-.36 1.97 1.8 1.8 0 0 0 1.65 1.08H21a2 2 0 1 1 0 4h-.09a1.8 1.8 0 0 0-1.65 1.08Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
