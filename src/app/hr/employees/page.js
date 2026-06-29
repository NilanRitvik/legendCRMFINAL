'use client';
import { useState, useEffect } from 'react';

const DEPT_OPTIONS = ['Design', 'Sales', 'Marketing', 'Operations', 'Production', 'Site', 'Purchase', 'Finance', 'HR', 'Administration', 'Management', 'Other'];

const DESIGNATION_OPTIONS = [
  'Accounts Executive',
  'Designer',
  'Office Administrator',
  'Human Resources Executive',
  'Project Manager',
  'Site Manager',
  'Site Supervisor',
  'Installation Helper',
  'Machine Operator',
  'Purchase Executive',
  'Purchase Manager',
  'Production Manager',
  'Production Helper',
  'Production Executive',
  'Sales Executive',
  'Sales Manager',
  'Marketing Executive',
  'Data Entry Officer',
  'Operations Manager',
  'Vice President – Operations',
  'Office Assistant',
];
const emptyForm = {
  name: '', designation: DESIGNATION_OPTIONS[0], department: DEPT_OPTIONS[0], type: 'employee', employment_type: 'full_time',
  join_date: '', basic_salary: '', rate_type: 'monthly', email: '', phone: '',
  bank_name: '', bank_account: '', ifsc: '', pan_number: '', uan_number: '',
  address: '', emergency_contact: '', status: 'active',
  hra_percent: 40, transport_allowance: 0, other_allowance: 0,
  pf_applicable: false, esi_applicable: false, tds_percent: 0
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('employee'); // employee | freelancer | consultant
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchEmployees = async () => {
    const res = await fetch('/api/hr/employees');
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const filtered = employees.filter(e => {
    const matchTab = e.type === tab;
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.designation.toLowerCase().includes(search.toLowerCase()) ||
      (e.department || '').toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const handleOpen = (emp = null) => {
    setEditing(emp);
    setForm(emp ? { ...emptyForm, ...emp } : emptyForm);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.designation || !form.basic_salary) {
      return alert(`Name, designation and salary are required.\n\nDiagnostic info:\n- Name: "${form.name || 'MISSING'}"\n- Designation: "${form.designation || 'MISSING'}"\n- Salary: "${form.basic_salary || 'MISSING'}"`);
    }
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/hr/employees/${editing._id}` : '/api/hr/employees';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { setShowModal(false); fetchEmployees(); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await fetch(`/api/hr/employees/${id}`, { method: 'DELETE' });
    setDeleteId(null);
    fetchEmployees();
  };

  const typeColor = { employee: { bg: '#eff6ff', color: '#3b82f6' }, freelancer: { bg: '#f5f3ff', color: '#8b5cf6' }, consultant: { bg: '#ecfdf5', color: '#10b981' } };

  const F = (key, label, type = 'text', opts = null) => {
    let finalLabel = label;
    if (key === 'basic_salary' && (form.type === 'freelancer' || form.type === 'consultant')) {
      finalLabel = 'Hourly Rate / Payment (₹)';
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{finalLabel}</label>
        {opts ? (
          <select 
            value={form[key]} 
            onChange={e => {
              const val = e.target.value;
              setForm(f => {
                const next = { ...f, [key]: val };
                if (key === 'type') {
                  if (val === 'freelancer' || val === 'consultant') {
                    next.rate_type = 'hourly';
                  } else {
                    next.rate_type = 'monthly';
                  }
                }
                return next;
              });
            }}
            style={{ padding: '8px 10px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', background: '#fff', color: 'var(--text-main)' }}
          >
            {opts.map(o => <option key={o.v || o} value={o.v || o}>{o.l || o}</option>)}
          </select>
        ) : type === 'checkbox' ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', paddingTop: '4px' }}>
            <input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} style={{ width: '16px', height: '16px' }} />
            <span style={{ color: 'var(--text-main)' }}>Enable</span>
          </label>
        ) : (
          <input type={type} value={form[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            style={{ padding: '8px 10px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', background: '#fff', color: 'var(--text-main)', outline: 'none' }} />
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1300px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>👥 Employee & Freelancer Directory</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{employees.length} total people in your organisation</p>
        </div>
        <button onClick={() => handleOpen()} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
          ➕ Add Person
        </button>
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[{ key: 'employee', label: '👨‍💼 Employees' }, { key: 'freelancer', label: '🧑‍💻 Freelancers' }, { key: 'consultant', label: '🤝 Consultants' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', border: 'none',
              background: tab === t.key ? 'var(--primary)' : 'var(--card-bg)',
              color: tab === t.key ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s'
            }}>{t.label}</button>
          ))}
        </div>
        <input placeholder="Search by name, designation, department..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '13px', width: '280px', background: '#fff', color: 'var(--text-main)', outline: 'none' }} />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontWeight: '700', marginBottom: '8px' }}>No {tab}s found</div>
            <button onClick={() => handleOpen()} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              ➕ Add First {tab}
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--card-bg)' }}>
                {['Name & Role', 'Department', tab === 'employee' ? 'Monthly Salary' : 'Rate', 'Contact', 'Join Date', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid var(--card-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr key={emp._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: typeColor[emp.type]?.bg || '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', color: typeColor[emp.type]?.color || '#6b7280', flexShrink: 0 }}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {emp.name} 
                          {emp.employee_code && (
                            <span style={{ fontSize: '10px', color: 'var(--primary)', background: 'var(--primary-light)', padding: '1px 5px', borderRadius: '4px', fontWeight: '800' }}>
                              #{emp.employee_code}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.designation}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>{emp.department || '—'}</td>
                  <td style={{ padding: '12px 14px', fontWeight: '800', color: '#10b981' }}>
                    ₹{(emp.basic_salary||0).toLocaleString()}
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '500', marginLeft: '3px' }}>
                      {emp.rate_type === 'monthly' ? '/mo' : emp.rate_type === 'hourly' ? '/hr' : '/project'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <div>{emp.phone || '—'}</div>
                    <div>{emp.email || ''}</div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>{emp.join_date ? new Date(emp.join_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: emp.status === 'active' ? '#ecfdf5' : '#fef2f2', color: emp.status === 'active' ? '#10b981' : '#ef4444' }}>
                        {emp.status?.toUpperCase()}
                      </span>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '800',
                        display: 'inline-block',
                        background: emp.approval_status === 'approved' ? '#ecfdf5' : emp.approval_status === 'rejected' ? '#fef2f2' : '#fefce8',
                        color: emp.approval_status === 'approved' ? '#10b981' : emp.approval_status === 'rejected' ? '#ef4444' : '#b45309',
                        border: '1px solid currentColor'
                      }}>
                        {emp.approval_status ? emp.approval_status.toUpperCase() : 'PENDING'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleOpen(emp)} style={{ padding: '5px 10px', background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => setDeleteId(emp._id)} style={{ padding: '5px 10px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '780px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800' }}>{editing ? 'Edit' : 'Add'} Employee / Freelancer</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              {/* Section: Basic Info */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '6px', borderBottom: '2px solid var(--primary-light)' }}>Basic Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {editing && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Employee ID / Number</label>
                      <input 
                        type="text" disabled 
                        value={form.employee_code || ''}
                        style={{ padding: '8px 10px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', background: '#f1f5f9', color: 'var(--text-main)', cursor: 'not-allowed' }} 
                      />
                    </div>
                  )}
                  {F('name', 'Full Name')}
                  {F('designation', 'Designation / Job Title', 'text', DESIGNATION_OPTIONS.map(d => ({ v: d, l: d })))}
                  {F('department', 'Department', 'text', DEPT_OPTIONS.map(d => ({ v: d, l: d })))}
                  {F('type', 'Type', 'text', [{ v: 'employee', l: 'Employee' }, { v: 'freelancer', l: 'Freelancer' }, { v: 'consultant', l: 'Consultant' }])}
                  {F('employment_type', 'Employment Type', 'text', [{ v: 'full_time', l: 'Full Time' }, { v: 'part_time', l: 'Part Time' }, { v: 'contract', l: 'Contract' }])}
                  {F('join_date', 'Join Date', 'date')}
                  {F('status', 'Status', 'text', [{ v: 'active', l: 'Active' }, { v: 'inactive', l: 'Inactive' }])}
                </div>
              </div>

              {/* Section: Salary */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '6px', borderBottom: '2px solid var(--primary-light)' }}>Salary & Rate</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                  {F('basic_salary', 'Basic Salary / Rate (₹)', 'number')}
                  {F('rate_type', 'Rate Type', 'text', [{ v: 'monthly', l: 'Monthly' }, { v: 'hourly', l: 'Hourly' }, { v: 'project', l: 'Per Project' }])}
                  {F('hra_percent', 'HRA %', 'number')}
                  {F('transport_allowance', 'Transport Allow. (₹)', 'number')}
                  {F('other_allowance', 'Other Allow. (₹)', 'number')}
                </div>
              </div>

              {/* Section: Deductions */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '6px', borderBottom: '2px solid var(--primary-light)' }}>Deductions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {F('pf_applicable', 'PF Applicable (12%)', 'checkbox')}
                  {F('esi_applicable', 'ESI Applicable (0.75%)', 'checkbox')}
                  {F('tds_percent', 'TDS %', 'number')}
                </div>
              </div>

              {/* Section: Contact */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '6px', borderBottom: '2px solid var(--primary-light)' }}>Contact & Personal</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {F('email', 'Email Address', 'email')}
                  {F('phone', 'Phone Number')}
                  {F('pan_number', 'PAN Number')}
                  {F('uan_number', 'UAN / PF Number')}
                  {F('address', 'Address')}
                  {F('emergency_contact', 'Emergency Contact')}
                </div>
              </div>

              {/* Section: Bank */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '6px', borderBottom: '2px solid var(--primary-light)' }}>Bank Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {F('bank_name', 'Bank Name')}
                  {F('bank_account', 'Account Number')}
                  {F('ifsc', 'IFSC Code')}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Add Employee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px 0' }}>Delete Employee?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 20px 0' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: '10px 20px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} style={{ padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
