// Minimal stand-in for Supabase's REST + Auth APIs used by the end-to-end tests.
// Sample data only; no real people. Run: node tests/e2e/fake-supabase.mjs
import http from 'node:http';

const PORT = Number(process.env.FAKE_SUPABASE_PORT || 54321);
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
const user = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'staff@example.test' };

const students = [
  ['s1', 'Ayesha Khan', 'Air University', 'active', 'paid'],
  ['s2', 'Bilal Ahmed', 'NUST', 'active', 'unpaid'],
  ['s3', 'Hira Malik', 'Bahria University', 'active', 'paid'],
  ['s4', 'Usman Tariq', 'FAST-NUCES', 'pending', 'unpaid'],
].map(([id, full_name, institution, status, fee_status], i) => ({
  id, full_name, institution, status, fee_status, role: 'student', email: `${id}@example.test`,
  route_id: `r${(i % 3) + 1}`, phone: `0300123456${i}`, cnic_last4: `12${i}4`, whatsapp_opt_in: true,
  created_at: '2026-11-01T08:00:00Z', applied_at: '2026-11-20T08:00:00Z', payment_reference: `EE-TEST${i}`, amount_due: 10500,
}));

const data = {
  routes: [
    { id: 'r1', name: 'Wah Cantt → Islamabad', price: 9500 },
    { id: 'r2', name: 'Rawalpindi → H-11 / NUST', price: 8000 },
    { id: 'r3', name: 'Hassan Abdal → E-9 / Air Uni', price: 11000 },
  ],
  'rpc/route_availability': [
    { route_id: 'r1', seats_left: 14 },
    { route_id: 'r2', seats_left: 3 },
    { route_id: 'r3', seats_left: 0 },
  ],
  pickup_zones: ['Hassan Abdal', 'Wah Cantt (Br 1–3)', 'GT Road / Taxila', 'B-17 MultiGardens', 'Saddar'].map((name) => ({ name })),
  departure_groups: ['Air University', 'Bahria University', 'NUST', 'FAST-NUCES'].map((university, i) => ({
    id: `g${i}`, university, department: 'All programs', active: true,
  })),
  admin_users: [{ id: 'u1' }],
  drivers: [{ id: 'u1', email: 'driver@example.test', full_name: 'Imran Ali', phone: '03001112223', active: true }],
  profiles: students,
  coasters: [{ id: 'c1', coaster_number: 'EE-12', vehicle_type: 'Coaster', seat_capacity: 26, maintenance_status: 'active', default_route_id: 'r1' }],
  daily_assignments: students.slice(0, 3).map((s, i) => ({
    id: `a${i}`, student_id: s.id, assignment_date: today, driver_id: 'u1', driver_name: 'Imran Ali',
    driver_contact: '03001112223', coaster_id: 'c1', seat_confirmed: i === 0,
    attendance_status: i === 0 ? 'present' : null, coasters: { coaster_number: 'EE-12', seat_capacity: 26 },
    profiles: { full_name: s.full_name, route_id: s.route_id },
  })),
  'rpc/driver_trip_roster': students.slice(0, 3).map((s) => ({
    student_id: s.id, full_name: s.full_name, institution: s.institution, cnic_last4: s.cnic_last4,
  })),
  pickup_points: [
    ['B-17 MultiGardens', 'r2'], ['D-17 Society', 'r2'], ['Saddar', 'r2'],
    ['Wah Model Town', 'r1'], ['GT Road / Taxila', 'r1'], ['New City Phase II', 'r1'],
    ['Hassan Abdal', 'r3'], ['GT Road / Taxila', 'r3'],
  ].map(([name, route_id], i) => ({ id: `p${i}`, name, route_id })),
  'rpc/driver_trip_stops': students.slice(0, 3).map((s, i) => ({
    student_id: s.id, full_name: s.full_name, institution: s.institution, cnic_last4: s.cnic_last4,
    pickup_point: ['B-17 MultiGardens', 'Saddar', null][i], morning_time: ['07:10:00', '07:25:00', null][i], evening_time: '16:30:00',
  })),
  trip_events: [],
  vehicle_checks: [],
  holidays: [{ id: 'h1', date: '2026-12-25', reason: 'Quaid-e-Azam Day' }],
  notifications: [{ id: 'n1', title: 'Winter timings', message: 'Pickups move 15 minutes later.', created_at: '2026-11-25T09:00:00Z' }],
};

http
  .createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    if (req.method === 'OPTIONS') return res.end();
    if (req.url.startsWith('/auth/v1/user')) return res.end(JSON.stringify(user));
    if (req.url.startsWith('/auth/v1/logout')) {
      res.statusCode = 204;
      return res.end();
    }
    const match = req.url.match(/^\/rest\/v1\/([a-z_/]+)/);
    if (!match) {
      res.statusCode = 404;
      return res.end('{}');
    }
    const rows = data[match[1]] ?? [];
    if (req.method === 'HEAD') return res.end();
    if (String(req.headers.accept || '').includes('vnd.pgrst.object')) {
      if (!rows.length) {
        res.statusCode = 406;
        return res.end(JSON.stringify({ code: 'PGRST116', message: 'no rows' }));
      }
      return res.end(JSON.stringify(rows[0]));
    }
    res.end(JSON.stringify(rows));
  })
  .listen(PORT, '127.0.0.1', () => console.log(`fake supabase on ${PORT}`));
