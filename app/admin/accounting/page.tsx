'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Route = { id: string; name: string; price: number };
type Expense = {
  id: string;
  route_id: string | null;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
  month: string;
};
type MonthlySummary = {
  month: string;
  total_revenue: number;
  total_collected: number;
  total_expenses: number;
  net_profit: number;
};
type Student = {
  id: string;
  full_name: string;
  fee_status: string;
  route_id: string | null;
  status: string;
};

type TabKey = 'overview' | 'routes' | 'expenses' | 'trends';

const CATEGORIES = [
  'Fuel',
  'Driver Salary',
  'Maintenance',
  'Tolls',
  'Rent',
  'Other',
];

function formatPKR(amount: number) {
  return `PKR ${amount.toLocaleString()}`;
}

function formatExpenseDate(dateString: string) {
  if (!dateString.includes('-')) return dateString;

  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return `${day} ${monthNames[month - 1]} ${year}`;
}

export default function AccountingDashboard() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'monthly' | 'weekly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [monthOptions, setMonthOptions] = useState<string[]>([]);
  const [week, setWeek] = useState({
    start: '',
    end: '',
    label: '',
  });

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    route_id: '',
    category: 'Fuel',
    amount: '',
    description: '',
    expense_date: '',
    month: '',
  });
  const [addingExpense, setAddingExpense] = useState(false);
  const [expenseSuccess, setExpenseSuccess] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const now = new Date();
    const monthName = now.toLocaleString('en-PK', {
      month: 'long',
      year: 'numeric',
    });
    const monthList = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toLocaleString('en-PK', { month: 'long', year: 'numeric' });
    });
    const start = new Date(now);
    const day = now.getDay();
    start.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    /* eslint-disable react-hooks/set-state-in-effect */
    setSelectedMonth((current) => current || monthName);
    setMonthOptions(monthList);
    setWeek({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      label: `${start.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`,
    });
    setExpenseForm((current) => ({
      ...current,
      expense_date: current.expense_date || now.toISOString().split('T')[0],
      month: current.month || monthName,
    }));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

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
        { data: routesData },
        { data: expensesData },
        { data: studentsData },
        { data: summariesData },
      ] = await Promise.all([
        supabase.from('routes').select('*'),
        supabase
          .from('expenses')
          .select('*')
          .order('expense_date', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, fee_status, route_id, status')
          .eq('role', 'student')
          .eq('status', 'active'),
        supabase
          .from('monthly_summaries')
          .select('*')
          .order('month', { ascending: true })
          .limit(6),
      ]);

      if (routesData) setRoutes(routesData);
      if (expensesData) setExpenses(expensesData);
      if (studentsData) setStudents(studentsData);
      if (summariesData) setSummaries(summariesData);
      setLoading(false);
    };
    void init();
  }, [router, supabase]);

  const handleAddExpense = async () => {
    if (!expenseForm.amount || !expenseForm.expense_date) return;
    setAddingExpense(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('expenses')
      .insert({
        route_id: expenseForm.route_id || null,
        category: expenseForm.category,
        amount: parseInt(expenseForm.amount),
        description: expenseForm.description,
        expense_date: expenseForm.expense_date,
        month: expenseForm.month,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (data) setExpenses((prev) => [data, ...prev]);

    setExpenseForm((current) => ({
      ...current,
      route_id: '',
      category: 'Fuel',
      amount: '',
      description: '',
      expense_date:
        current.expense_date || new Date().toISOString().split('T')[0],
      month:
        current.month ||
        new Date().toLocaleString('en-PK', {
          month: 'long',
          year: 'numeric',
        }),
    }));

    setExpenseSuccess(true);
    setTimeout(() => setExpenseSuccess(false), 3000);
    setAddingExpense(false);
  };

  const handleDeleteExpense = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Filter by period
  const filteredExpenses =
    view === 'monthly'
      ? expenses.filter((e) => e.month === selectedMonth)
      : expenses.filter(
          (e) => e.expense_date >= week.start && e.expense_date <= week.end,
        );

  // Revenue calculations
  const getRouteRevenue = (routeId: string) => {
    const route = routes.find((r) => r.id === routeId);
    const routeStudents = students.filter((s) => s.route_id === routeId);
    const paid = routeStudents.filter((s) => s.fee_status === 'paid').length;
    return {
      expected: (route?.price || 0) * routeStudents.length,
      collected: (route?.price || 0) * paid,
      students: routeStudents.length,
      paid,
      unpaid: routeStudents.length - paid,
    };
  };

  const totalExpected = routes.reduce(
    (sum, r) => sum + getRouteRevenue(r.id).expected,
    0,
  );
  const totalCollected = routes.reduce(
    (sum, r) => sum + getRouteRevenue(r.id).collected,
    0,
  );
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalCollected - totalExpenses;
  const leakage = totalExpected - totalCollected;

  // Expenses by category
  const expensesByCategory = CATEGORIES.map((cat) => ({
    category: cat,
    amount: filteredExpenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0),
  }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const maxExpense = Math.max(...expensesByCategory.map((c) => c.amount), 1);

  // Route P&L
  const routePnL = routes.map((route) => {
    const rev = getRouteRevenue(route.id);
    const routeExpenses = filteredExpenses
      .filter((e) => e.route_id === route.id)
      .reduce((sum, e) => sum + e.amount, 0);
    const sharedExpenses = filteredExpenses
      .filter((e) => !e.route_id)
      .reduce((sum, e) => sum + e.amount, 0);
    const sharedShare =
      routes.length > 0 ? Math.round(sharedExpenses / routes.length) : 0;
    const totalCost = routeExpenses + sharedShare;
    return {
      ...route,
      ...rev,
      expenses: totalCost,
      profit: rev.collected - totalCost,
      margin:
        rev.collected > 0
          ? Math.round(((rev.collected - totalCost) / rev.collected) * 100)
          : 0,
    };
  });

  const maxRevenue = Math.max(...routePnL.map((r) => r.collected), 1);

  // Trend data (last 6 months labels)
  const trendMonths =
    monthOptions.length > 0 ? [...monthOptions].reverse() : [];

  // Build trend from summaries or estimate from current data
  const trendData = trendMonths.map((label) => {
    const summary = summaries.find((s) => s.month === label);
    return {
      label: label.split(' ')[0].slice(0, 3),
      revenue: summary?.total_collected || 0,
      expenses: summary?.total_expenses || 0,
      profit: summary?.net_profit || 0,
    };
  });

  const maxTrend = Math.max(
    ...trendData.flatMap((d) => [d.revenue, d.expenses]),
    1,
  );

  if (loading)
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center animate-pulse">
          <span className="text-black font-black text-lg">EE</span>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Navbar */}
      <nav className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="w-9 h-9 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl flex items-center justify-center transition"
            >
              <span className="text-zinc-400 text-sm">←</span>
            </button>
            <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center">
              <span className="text-black font-black text-sm">EE</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">
                Accounting
              </p>
              <p className="text-yellow-400 text-xs font-semibold">
                Financial Dashboard
              </p>
            </div>
          </div>

          {/* Period toggle */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              {(['monthly', 'weekly'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${view === v ? 'bg-yellow-400 text-black' : 'text-zinc-400 hover:text-white'}`}
                >
                  {v === 'monthly' ? '📅 Monthly' : '📆 Weekly'}
                </button>
              ))}
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/admin/login');
              }}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded-lg transition border border-zinc-700"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Period selector */}
        {view === 'monthly' && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {monthOptions.map((month) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition whitespace-nowrap ${
                  selectedMonth === month
                    ? 'bg-yellow-400 text-black border-yellow-400'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {month}
              </button>
            ))}
          </div>
        )}

        {view === 'weekly' && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <span className="text-yellow-400 text-sm">📆</span>
            <p className="text-yellow-300 text-sm font-medium">
              Week of {week.label}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 overflow-x-auto">
          {[
            { key: 'overview', label: '📊 Overview' },
            { key: 'routes', label: '🗺️ Route P&L' },
            { key: 'expenses', label: '💸 Expenses' },
            { key: 'trends', label: '📈 Trends' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-yellow-400 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: 'Expected Revenue',
                  value: totalExpected,
                  icon: '💰',
                  color: 'text-white',
                  sub: `${students.length} active students`,
                },
                {
                  label: 'Collected',
                  value: totalCollected,
                  icon: '✅',
                  color: 'text-green-400',
                  sub: `${Math.round((totalCollected / (totalExpected || 1)) * 100)}% collection rate`,
                },
                {
                  label: 'Total Expenses',
                  value: totalExpenses,
                  icon: '💸',
                  color: 'text-red-400',
                  sub: `${filteredExpenses.length} entries`,
                },
                {
                  label: 'Net Profit',
                  value: netProfit,
                  icon: '📈',
                  color: netProfit >= 0 ? 'text-yellow-400' : 'text-red-400',
                  sub: netProfit >= 0 ? 'Profitable' : 'In loss',
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span>{kpi.icon}</span>
                    <p className="text-zinc-500 text-xs">{kpi.label}</p>
                  </div>
                  <p className={`text-2xl font-extrabold ${kpi.color}`}>
                    {formatPKR(kpi.value)}
                  </p>
                  <p className="text-zinc-600 text-xs mt-1">{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* Leakage warning */}
            {leakage > 0 && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-red-400 font-bold">
                    ⚠️ Revenue Leakage Detected
                  </p>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    {formatPKR(leakage)} uncollected from{' '}
                    {students.filter((s) => s.fee_status !== 'paid').length}{' '}
                    students
                  </p>
                </div>
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition"
                >
                  Fix Now
                </button>
              </div>
            )}

            {/* Revenue vs Collected bar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-white font-bold mb-4">Revenue Overview</p>
              <div className="space-y-3">
                {[
                  {
                    label: 'Expected',
                    value: totalExpected,
                    color: 'bg-zinc-600',
                    max: totalExpected,
                  },
                  {
                    label: 'Collected',
                    value: totalCollected,
                    color: 'bg-green-500',
                    max: totalExpected,
                  },
                  {
                    label: 'Expenses',
                    value: totalExpenses,
                    color: 'bg-red-500',
                    max: totalExpected,
                  },
                  {
                    label: 'Net Profit',
                    value: Math.max(netProfit, 0),
                    color: 'bg-yellow-400',
                    max: totalExpected,
                  },
                ].map((bar) => (
                  <div key={bar.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">{bar.label}</span>
                      <span className="text-white font-semibold">
                        {formatPKR(bar.value)}
                      </span>
                    </div>
                    <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bar.color} rounded-full transition-all duration-700`}
                        style={{
                          width: `${Math.min((bar.value / (bar.max || 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expense breakdown */}
            {expensesByCategory.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <p className="text-white font-bold mb-4">
                  Expenses by Category
                </p>
                <div className="space-y-3">
                  {expensesByCategory.map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">{cat.category}</span>
                        <span className="text-white font-semibold">
                          {formatPKR(cat.amount)}
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full transition-all duration-700"
                          style={{
                            width: `${(cat.amount / maxExpense) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ROUTE P&L ── */}
        {activeTab === 'routes' && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-white font-bold text-lg mb-1">
                Profit & Loss Per Route
              </p>
              <p className="text-zinc-500 text-sm mb-5">
                Shared expenses split equally across all routes
              </p>

              {routePnL.map((route) => (
                <div
                  key={route.id}
                  className="bg-zinc-800/60 border border-zinc-700/50 rounded-2xl p-4 mb-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold">{route.name}</p>
                      <p className="text-zinc-500 text-xs">
                        {route.students} students · {route.paid} paid ·{' '}
                        {route.unpaid} unpaid
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold px-3 py-1 rounded-full border ${
                        route.profit >= 0
                          ? 'bg-green-950 text-green-400 border-green-800'
                          : 'bg-red-950 text-red-400 border-red-800'
                      }`}
                    >
                      {route.profit >= 0 ? '+' : ''}
                      {formatPKR(route.profit)}
                    </span>
                  </div>

                  {/* Revenue bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Revenue collected</span>
                      <span className="text-green-400 font-semibold">
                        {formatPKR(route.collected)}
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${(route.collected / maxRevenue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-zinc-700/50 rounded-xl p-2">
                      <p className="text-zinc-500 text-xs">Expected</p>
                      <p className="text-white text-sm font-bold">
                        {formatPKR(route.expected)}
                      </p>
                    </div>
                    <div className="bg-zinc-700/50 rounded-xl p-2">
                      <p className="text-zinc-500 text-xs">Expenses</p>
                      <p className="text-red-400 text-sm font-bold">
                        {formatPKR(route.expenses)}
                      </p>
                    </div>
                    <div className="bg-zinc-700/50 rounded-xl p-2">
                      <p className="text-zinc-500 text-xs">Margin</p>
                      <p
                        className={`text-sm font-bold ${route.margin >= 0 ? 'text-yellow-400' : 'text-red-400'}`}
                      >
                        {route.margin}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EXPENSES ── */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {/* Add expense form */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <p className="text-white font-bold text-lg">Log Expense</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs text-zinc-400 uppercase tracking-widest">
                    Category
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-yellow-400 transition"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-zinc-800">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-zinc-400 uppercase tracking-widest">
                    Amount (PKR)
                  </label>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-yellow-400 transition"
                    placeholder="e.g. 15000"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-zinc-400 uppercase tracking-widest">
                    Route (optional)
                  </label>
                  <select
                    value={expenseForm.route_id}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({
                        ...prev,
                        route_id: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-yellow-400 transition"
                  >
                    <option value="" className="bg-zinc-800">
                      All routes (shared)
                    </option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id} className="bg-zinc-800">
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-zinc-400 uppercase tracking-widest">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expenseForm.expense_date}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({
                        ...prev,
                        expense_date: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-yellow-400 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs text-zinc-400 uppercase tracking-widest">
                  Month
                </label>
                <select
                  value={expenseForm.month}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      month: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-yellow-400 transition"
                >
                  {monthOptions.map((m) => (
                    <option key={m} value={m} className="bg-zinc-800">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Description (optional)"
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-yellow-400 transition"
              />

              {expenseSuccess && (
                <div className="bg-green-950/60 border border-green-800 text-green-400 px-4 py-3 rounded-xl text-sm">
                  ✅ Expense logged successfully!
                </div>
              )}

              <button
                onClick={handleAddExpense}
                disabled={!expenseForm.amount || addingExpense}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-xl transition disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {addingExpense ? (
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
                    Saving...
                  </>
                ) : (
                  'Log Expense →'
                )}
              </button>
            </div>

            {/* Expense list */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white font-bold">
                  {view === 'monthly' ? selectedMonth : `Week: ${week.label}`}
                </p>
                <p className="text-yellow-400 font-bold text-sm">
                  {formatPKR(totalExpenses)}
                </p>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-3">💸</p>
                  <p className="text-zinc-400">
                    No expenses logged for this period
                  </p>
                </div>
              ) : (
                filteredExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-zinc-700 rounded-lg flex items-center justify-center text-sm">
                        {exp.category === 'Fuel'
                          ? '⛽'
                          : exp.category === 'Driver Salary'
                            ? '👨‍✈️'
                            : exp.category === 'Maintenance'
                              ? '🔧'
                              : exp.category === 'Tolls'
                                ? '🛣️'
                                : exp.category === 'Rent'
                                  ? '🏢'
                                  : '📦'}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {exp.category}
                        </p>
                        <p className="text-zinc-500 text-xs">
                          {exp.description ||
                            routes.find((r) => r.id === exp.route_id)?.name ||
                            'All routes'}{' '}
                          · {formatExpenseDate(exp.expense_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-red-400 font-bold text-sm">
                        {formatPKR(exp.amount)}
                      </p>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="w-7 h-7 bg-zinc-700 hover:bg-red-950 text-zinc-400 hover:text-red-400 rounded-lg flex items-center justify-center transition text-xs"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TRENDS ── */}
        {activeTab === 'trends' && (
          <div className="space-y-4">
            {/* 6-month chart */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-white font-bold text-lg mb-1">6-Month Trend</p>
              <p className="text-zinc-500 text-sm mb-6">
                Revenue vs expenses over the last 6 months
              </p>

              {/* Chart */}
              <div className="flex items-end justify-between gap-2 h-40">
                {trendData.map((d, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full flex items-end gap-0.5 justify-center"
                      style={{ height: '120px' }}
                    >
                      <div
                        className="flex-1 bg-green-500/70 rounded-t-lg transition-all duration-700"
                        style={{
                          height: `${(d.revenue / maxTrend) * 100}%`,
                          minHeight: d.revenue > 0 ? '4px' : '0',
                        }}
                        title={`Revenue: ${formatPKR(d.revenue)}`}
                      />
                      <div
                        className="flex-1 bg-red-500/70 rounded-t-lg transition-all duration-700"
                        style={{
                          height: `${(d.expenses / maxTrend) * 100}%`,
                          minHeight: d.expenses > 0 ? '4px' : '0',
                        }}
                        title={`Expenses: ${formatPKR(d.expenses)}`}
                      />
                    </div>
                    <p className="text-zinc-500 text-xs">{d.label}</p>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-green-500/70 rounded" />
                  <p className="text-zinc-400 text-xs">Revenue</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-red-500/70 rounded" />
                  <p className="text-zinc-400 text-xs">Expenses</p>
                </div>
              </div>
            </div>

            {/* Month by month summary */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <p className="text-white font-bold">Monthly Breakdown</p>
              {trendData.reverse().map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-zinc-800/60 rounded-xl p-3"
                >
                  <p className="text-zinc-300 text-sm font-medium">{d.label}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-green-400">
                      {formatPKR(d.revenue)}
                    </span>
                    <span className="text-red-400">
                      -{formatPKR(d.expenses)}
                    </span>
                    <span
                      className={`font-bold ${d.profit >= 0 ? 'text-yellow-400' : 'text-red-400'}`}
                    >
                      {d.profit >= 0 ? '+' : ''}
                      {formatPKR(d.profit)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
