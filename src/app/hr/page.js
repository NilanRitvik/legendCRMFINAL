'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function StatCard({ icon, label, value, sub, color, bg, href }) {
  const inner = (
    <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: `1px solid ${color}20`, boxShadow: `0 2px 12px ${color}15`, display: 'flex', flexDirection: 'column', gap: '10px', cursor: href ? 'pointer' : 'default', transition: 'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { if (href) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${color}25`; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 2px 12px ${color}15`; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{icon}</div>
        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', lineHeight: '1.3' }}>{label}</div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '900', color, letterSpacing: '-1px' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{sub}</div>}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

export default function HRDashboardPage() {
  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const [employees, setEmployees] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [er, pr, lr, ar] = await Promise.all([
          fetch('/api/hr/employees'),
          fetch(`/api/hr/payroll?month=${month}&year=${year}`),
          fetch('/api/hr/leaves?status=pending'),
          fetch(`/api/hr/attendance?month=${month}&year=${year}`),
        ]);
        const [empList, payList, leaveList, attList] = await Promise.all([er.json(), pr.json(), lr.json(), ar.json()]);
        setEmployees(Array.isArray(empList) ? empList : []);
        setPayrolls(Array.isArray(payList) ? payList : []);
        setLeaves(Array.isArray(leaveList) ? leaveList : []);
        setAttendance(Array.isArray(attList) ? attList : []);
      } finally { setLoading(false); }
    }
    load();
  }, []);

  const empOnly = employees.filter(e => e.type === 'employee' && e.status === 'active');
  const freelancers = employees.filter(e => e.type === 'freelancer' && e.status === 'active');
  const consultants = employees.filter(e => e.type === 'consultant' && e.status === 'active');

  // Expected payroll payout: employees who have attendance this month but no processed payroll
  const processedEmpIds = payrolls.map(p => p.employee?._id || p.employee);
  const withAttButNoPay = attendance.filter(a => !processedEmpIds.includes(a.employee?._id || a.employee));
  const pendingPayoutEstimate = employees
    .filter(e => withAttButNoPay.find(a => (a.employee?._id || a.employee) === e._id))
    .reduce((sum, e) => sum + (e.basic_salary || 0), 0);

  // Freelancers with attendance this month → expected payout
  const freelancerPayout = payrolls
    .filter(p => p.employee?.type !== 'employee')
    .reduce((sum, p) => sum + (p.net_salary || 0), 0);

  // Payroll summary
  const totalNetPayroll = payrolls.reduce((s, p) => s + (p.net_salary || 0), 0);
  const totalGrossPayroll = payrolls.reduce((s, p) => s + (p.gross_salary || 0), 0);
  const paidPayrolls = payrolls.filter(p => p.status === 'paid');
  const unpaidPayrolls = payrolls.filter(p => p.status !== 'paid');
  const totalPaidOut = paidPayrolls.reduce((s, p) => s + (p.net_salary || 0), 0);
  const totalPending = unpaidPayrolls.reduce((s, p) => s + (p.net_salary || 0), 0);

  // Attendance summary
  const avgAttendance = attendance.length > 0
    ? Math.round(attendance.reduce((s, a) => s + (a.total_working_days > 0 ? (a.present_days / a.total_working_days) * 100 : 0), 0) / attendance.length)
    : 0;

  const statusColor = { draft: { bg: '#fef3c7', c: '#d97706' }, processed: { bg: '#eff6ff', c: '#3b82f6' }, paid: { bg: '#ecfdf5', c: '#10b981' } };

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
      Loading HR Dashboard...
    </div>
  );

  return (
    <div style={{ padding: '28px', maxWidth: '1300px' }}>

      {/* Page Title */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.5px' }}>👔 HR & Payroll</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            {MONTH_NAMES[month-1]} {year} · {employees.filter(e => e.status === 'active').length} active people
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/hr/payroll" style={{ padding: '9px 18px', background: 'var(--primary)', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '13px', textDecoration: 'none' }}>⚡ Run Payroll</Link>
          <Link href="/hr/employees" style={{ padding: '9px 18px', background: 'var(--card-bg)', color: 'var(--text-main)', borderRadius: '8px', fontWeight: '700', fontSize: '13px', textDecoration: 'none', border: '1px solid var(--card-border)' }}>➕ Add Person</Link>
        </div>
      </div>

      {/* ── Row 1: Headcount Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '20px' }}>
        <StatCard icon="👨‍💼" label="Total Employees" value={empOnly.length} sub={`${employees.filter(e=>e.type==='employee'&&e.status==='inactive').length} inactive`} color="#3b82f6" bg="#eff6ff" href="/hr/employees" />
        <StatCard icon="🧑‍💻" label="Freelancers" value={freelancers.length} sub="Active" color="#8b5cf6" bg="#f5f3ff" href="/hr/employees" />
        <StatCard icon="🤝" label="Consultants" value={consultants.length} sub="Active" color="#06b6d4" bg="#ecfeff" href="/hr/employees" />
        <StatCard icon="🏖️" label="Pending Leaves" value={leaves.length} sub="Awaiting approval" color="#f59e0b" bg="#fffbeb" href="/hr/leaves" />
        <StatCard icon="✅" label="Attendance Marked" value={attendance.length} sub={`${avgAttendance}% avg attendance`} color="#10b981" bg="#ecfdf5" href="/hr/attendance" />
      </div>

      {/* ── Row 2: Payroll Finance Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <StatCard icon="💰" label={`${MONTH_NAMES[month-1]} Gross Payroll`} value={`₹${totalGrossPayroll.toLocaleString()}`} sub="Before deductions" color="#6366f1" bg="#eef2ff" href="/hr/payroll" />
        <StatCard icon="💵" label={`${MONTH_NAMES[month-1]} Net Payroll`} value={`₹${totalNetPayroll.toLocaleString()}`} sub="After all deductions" color="#10b981" bg="#ecfdf5" href="/hr/payroll" />
        <StatCard icon="✅" label="Already Paid Out" value={`₹${totalPaidOut.toLocaleString()}`} sub={`${paidPayrolls.length} payslips paid`} color="#0ea5e9" bg="#f0f9ff" href="/hr/payroll" />
        <StatCard icon="⏳" label="Pending Payout" value={`₹${totalPending.toLocaleString()}`} sub={`${unpaidPayrolls.length} payslips pending`} color="#f59e0b" bg="#fffbeb" href="/hr/payroll" />
      </div>

      {/* ── Expected Payout Alert Banner ── */}
      {(pendingPayoutEstimate > 0 || freelancerPayout > 0) && (
        <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '1.5px solid #f59e0b', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '24px' }}>💡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '800', color: '#92400e', fontSize: '14px' }}>Expected Payout This Month</div>
            <div style={{ fontSize: '12px', color: '#78350f', marginTop: '3px' }}>
              Based on attendance marked — payroll not yet processed for some employees
            </div>
          </div>
          {pendingPayoutEstimate > 0 && (
            <div style={{ textAlign: 'center', background: '#fff', borderRadius: '8px', padding: '10px 18px' }}>
              <div style={{ fontSize: '11px', color: '#92400e', fontWeight: '600' }}>Employee Payout</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#d97706' }}>₹{pendingPayoutEstimate.toLocaleString()}</div>
            </div>
          )}
          {freelancerPayout > 0 && (
            <div style={{ textAlign: 'center', background: '#fff', borderRadius: '8px', padding: '10px 18px' }}>
              <div style={{ fontSize: '11px', color: '#92400e', fontWeight: '600' }}>Freelancer Payout</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#8b5cf6' }}>₹{freelancerPayout.toLocaleString()}</div>
            </div>
          )}
          <Link href="/hr/payroll" style={{ padding: '10px 18px', background: '#d97706', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '13px', textDecoration: 'none' }}>Run Payroll →</Link>
        </div>
      )}

      {/* ── Row 3: Payroll Table + Pending Leaves ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* Payroll Summary Table */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-main)' }}>💰 {MONTH_NAMES[month-1]} {year} Payroll</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Connected to company financials</div>
            </div>
            <Link href="/hr/payroll" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>View All →</Link>
          </div>
          {payrolls.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>💰</div>
              No payroll generated yet.<br />
              <Link href="/hr/payroll" style={{ color: 'var(--primary)', fontWeight: '700' }}>Run Payroll →</Link>
            </div>
          ) : (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--card-bg)' }}>
                    {['Employee', 'Gross', 'Net Pay', 'Status', 'Expense'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', borderBottom: '1px solid var(--card-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payrolls.slice(0, 8).map(p => (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{p.employee?.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.employee?.type}</div>
                      </td>
                      <td style={{ padding: '9px 12px', color: '#6b7280' }}>₹{(p.gross_salary||0).toLocaleString()}</td>
                      <td style={{ padding: '9px 12px', fontWeight: '800', color: 'var(--primary)' }}>₹{(p.net_salary||0).toLocaleString()}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: statusColor[p.status]?.bg, color: statusColor[p.status]?.c }}>{p.status?.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        {p.status === 'paid'
                          ? <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>✓ Booked</span>
                          : <span style={{ fontSize: '11px', color: '#9ca3af' }}>– Pending</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--primary-light)' }}>
                    <td colSpan="2" style={{ padding: '10px 12px', fontWeight: '800', color: 'var(--primary)', fontSize: '12px' }}>Total Payroll</td>
                    <td style={{ padding: '10px 12px', fontWeight: '900', color: 'var(--primary)', fontSize: '14px' }}>₹{totalNetPayroll.toLocaleString()}</td>
                    <td colSpan="2" style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>{paidPayrolls.length}/{payrolls.length} paid & booked to expenses</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Pending Leaves + Attendance Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Pending Leaves */}
          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '800', fontSize: '14px' }}>🏖️ Pending Leave Requests</div>
              <Link href="/hr/leaves" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>Manage →</Link>
            </div>
            {leaves.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>🎉 No pending requests</div>
            ) : (
              <div>
                {leaves.slice(0, 5).map(l => (
                  <div key={l._id} style={{ padding: '11px 18px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '12px' }}>{l.employee?.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {l.leave_type?.toUpperCase()} · {l.days} day{l.days > 1 ? 's' : ''} · {new Date(l.from_date).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <Link href="/hr/leaves" style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>Review</Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Financial Integration Note */}
          <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🔗</span>
              <div>
                <div style={{ fontWeight: '800', color: '#065f46', fontSize: '13px', marginBottom: '6px' }}>Connected to Company Finances</div>
                <div style={{ fontSize: '11px', color: '#047857', lineHeight: '1.7' }}>
                  ✓ Paid payslips auto-book to <strong>Salary Expenses</strong><br/>
                  ✓ Flows into Dashboard, Monthly Statements & Analytics<br/>
                  ✓ Freelancer payments tracked under Salary category
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
        {[
          { label: 'Add Employee', href: '/hr/employees', icon: '➕', color: '#3b82f6' },
          { label: 'Mark Attendance', href: '/hr/attendance', icon: '✅', color: '#10b981' },
          { label: 'Approve Leaves', href: '/hr/leaves', icon: '🏖️', color: '#f59e0b' },
          { label: 'Run Payroll', href: '/hr/payroll', icon: '⚡', color: 'var(--primary)' },
          { label: 'View Payslips', href: '/hr/payroll', icon: '🧾', color: '#8b5cf6' },
        ].map(a => (
          <Link key={a.href+a.label} href={a.href} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '13px 16px', borderRadius: '10px',
            background: '#fff', border: `1.5px solid ${a.color}25`,
            textDecoration: 'none', fontWeight: '700', fontSize: '12px', color: a.color,
            boxShadow: 'var(--shadow-sm)', transition: 'all 0.15s'
          }}>
            <span style={{ fontSize: '16px' }}>{a.icon}</span> {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
