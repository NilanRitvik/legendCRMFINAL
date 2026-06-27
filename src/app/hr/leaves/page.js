'use client';
import { useState, useEffect } from 'react';

const LEAVE_TYPES = ['casual', 'sick', 'annual', 'maternity', 'unpaid'];
const LEAVE_MAX = { casual: 12, sick: 12, annual: 15, maternity: 90, unpaid: 999 };

export default function LeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEmp, setFilterEmp] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee: '', leave_type: 'casual', from_date: '', to_date: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [lr, er] = await Promise.all([fetch('/api/hr/leaves'), fetch('/api/hr/employees')]);
    const [lv, emp] = await Promise.all([lr.json(), er.json()]);
    setLeaves(Array.isArray(lv) ? lv : []);
    setEmployees(Array.isArray(emp) ? emp : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = leaves.filter(l => {
    const matchEmp = !filterEmp || l.employee?._id === filterEmp;
    const matchStatus = !filterStatus || l.status === filterStatus;
    const matchSearch = !search || l.employee?.name?.toLowerCase().includes(search.toLowerCase());
    return matchEmp && matchStatus && matchSearch;
  });

  const updateStatus = async (id, status, remarks = '') => {
    await fetch(`/api/hr/leaves/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, remarks }) });
    load();
  };

  const handleAdd = async () => {
    if (!form.employee || !form.from_date || !form.to_date) return alert('Please fill all required fields.');
    setSaving(true);
    const res = await fetch('/api/hr/leaves', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { setShowModal(false); setForm({ employee: '', leave_type: 'casual', from_date: '', to_date: '', reason: '' }); load(); }
    setSaving(false);
  };

  const statusBadge = (s) => {
    const cfg = { pending: { bg: '#fef3c7', color: '#d97706' }, approved: { bg: '#ecfdf5', color: '#10b981' }, rejected: { bg: '#fef2f2', color: '#ef4444' } };
    return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: cfg[s]?.bg, color: cfg[s]?.color }}>{s?.toUpperCase()}</span>;
  };

  // Leave balance per employee (approved leaves this year)
  const leaveBalance = {};
  leaves.filter(l => l.status === 'approved' && new Date(l.from_date).getFullYear() === new Date().getFullYear()).forEach(l => {
    const eid = l.employee?._id;
    if (!leaveBalance[eid]) leaveBalance[eid] = {};
    leaveBalance[eid][l.leave_type] = (leaveBalance[eid][l.leave_type] || 0) + l.days;
  });

  return (
    <div style={{ padding: '28px', maxWidth: '1300px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>🏖️ Leave Management</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Manage and approve employee leave requests</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
          ➕ Add Leave Request
        </button>
      </div>

      {/* Leave Balance Cards */}
      {employees.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '10px' }}>📊 Leave Balance (This Year)</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {employees.filter(e => e.type === 'employee' && e.status === 'active').slice(0, 5).map(emp => (
              <div key={emp._id} style={{ background: '#fff', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '12px 16px', minWidth: '200px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px', color: 'var(--text-main)' }}>{emp.name}</div>
                {['casual', 'sick', 'annual'].map(lt => {
                  const used = leaveBalance[emp._id]?.[lt] || 0;
                  const max = LEAVE_MAX[lt];
                  const pct = Math.min(100, Math.round(used / max * 100));
                  return (
                    <div key={lt} style={{ marginBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        <span>{lt.toUpperCase()}</span><span>{used}/{max} days</span>
                      </div>
                      <div style={{ height: '5px', background: '#f3f4f6', borderRadius: '3px' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#ef4444' : '#10b981', borderRadius: '3px', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '13px', background: '#fff', color: 'var(--text-main)', outline: 'none' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '13px', background: '#fff', color: 'var(--text-main)' }}>
          <option value="">All Statuses</option>
          {['pending', 'approved', 'rejected'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '13px', background: '#fff', color: 'var(--text-main)' }}>
          <option value="">All Employees</option>
          {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
        </select>
      </div>

      {/* Leaves Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        {loading ? <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div> : filtered.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>No leave requests found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--card-bg)' }}>
                {['Employee', 'Leave Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid var(--card-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{l.employee?.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.employee?.designation}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: 'var(--primary-light)', color: 'var(--primary)' }}>{l.leave_type?.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>{l.from_date ? new Date(l.from_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>{l.to_date ? new Date(l.to_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: '11px 14px', fontWeight: '800', color: 'var(--text-main)' }}>{l.days}</td>
                  <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason || '—'}</td>
                  <td style={{ padding: '11px 14px' }}>{statusBadge(l.status)}</td>
                  <td style={{ padding: '11px 14px' }}>
                    {l.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => updateStatus(l._id, 'approved')} style={{ padding: '4px 10px', background: '#ecfdf5', color: '#10b981', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>✓ Approve</button>
                        <button onClick={() => updateStatus(l._id, 'rejected')} style={{ padding: '4px 10px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>✗ Reject</button>
                      </div>
                    ) : (
                      <button onClick={() => updateStatus(l._id, 'pending')} style={{ padding: '4px 10px', background: 'var(--card-bg)', color: 'var(--text-muted)', border: '1px solid var(--card-border)', borderRadius: '6px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Reset</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', width: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800' }}>Add Leave Request</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { key: 'employee', label: 'Employee', type: 'select', opts: employees.map(e => ({ v: e._id, l: e.name })) },
                { key: 'leave_type', label: 'Leave Type', type: 'select', opts: LEAVE_TYPES.map(t => ({ v: t, l: t.charAt(0).toUpperCase() + t.slice(1) })) },
                { key: 'from_date', label: 'From Date', type: 'date' },
                { key: 'to_date', label: 'To Date', type: 'date' },
                { key: 'reason', label: 'Reason', type: 'text' }
              ].map(({ key, label, type, opts }) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</label>
                  {type === 'select' ? (
                    <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ padding: '9px 12px', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '13px', background: '#fff', color: 'var(--text-main)' }}>
                      <option value="">Select...</option>
                      {opts?.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ padding: '9px 12px', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '13px', background: '#fff', color: 'var(--text-main)', outline: 'none' }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
              <button onClick={handleAdd} disabled={saving} style={{ padding: '10px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
