'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function numberToWords(amount) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (amount === 0) return 'Zero';
  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + convert(n%100) : '');
    if (n < 100000) return convert(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + convert(n%1000) : '');
    if (n < 10000000) return convert(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + convert(n%100000) : '');
    return convert(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + convert(n%10000000) : '');
  };
  return convert(Math.round(amount)) + ' Rupees Only';
}

export default function PayrollPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [viewPayslip, setViewPayslip] = useState(null);
  const [tab, setTab] = useState('employee');

  // Freelancer modal
  const [showFreelancerModal, setShowFreelancerModal] = useState(false);
  const [freelancerForm, setFreelancerForm] = useState({
    employee: '', hours_worked: 0, project_description: '', advance_deduction: 0, other_deduction: 0,
    payment_mode: 'bank_transfer', notes: ''
  });
  const [savingFl, setSavingFl] = useState(false);

  // Fetch work logs for selected freelancer in chosen month/year
  useEffect(() => {
    if (!freelancerForm.employee || !showFreelancerModal) return;
    const fetchFreelancerLogs = async () => {
      try {
        const res = await fetch(`/api/hr/attendance/worklogs?employee=${freelancerForm.employee}&month=${month}&year=${year}`);
        const logs = await res.json();
        if (Array.isArray(logs)) {
          let sumHours = 0;
          let descriptions = [];
          logs.forEach(l => {
            sumHours += l.hours_worked || 0;
            if (l.description && l.hours_worked > 0) {
              const dateLabel = new Date(l.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
              descriptions.push(`[${dateLabel}]: ${l.description} (${l.hours_worked} hrs)`);
            }
          });
          setFreelancerForm(f => ({
            ...f,
            hours_worked: sumHours,
            project_description: descriptions.join('\n')
          }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchFreelancerLogs();
  }, [freelancerForm.employee, month, year, showFreelancerModal]);

  const load = async () => {
    setLoading(true);
    const [pr, er] = await Promise.all([
      fetch(`/api/hr/payroll?month=${month}&year=${year}`),
      fetch('/api/hr/employees?status=active')
    ]);
    const [pList, eList] = await Promise.all([pr.json(), er.json()]);
    setPayrolls(Array.isArray(pList) ? pList : []);
    setEmployees(Array.isArray(eList) ? eList : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [month, year]);

  // Generate payroll for all active employees for this month
  const generatePayroll = async () => {
    setGenerating(true);
    const activeEmps = employees.filter(e => e.type === 'employee' && e.status === 'active');
    const existingEmpIds = payrolls.map(p => p.employee?._id);
    const newEmps = activeEmps.filter(e => !existingEmpIds.includes(e._id));

    // Create draft payroll entries
    await Promise.all(newEmps.map(emp =>
      fetch('/api/hr/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee: emp._id, month, year, basic_salary: emp.basic_salary, status: 'draft' })
      })
    ));

    // Now auto-calculate each new entry
    const updatedRes = await fetch(`/api/hr/payroll?month=${month}&year=${year}`);
    const updatedList = await updatedRes.json();
    const newEntries = Array.isArray(updatedList) ? updatedList.filter(p => !existingEmpIds.includes(p.employee?._id)) : [];
    await Promise.all(newEntries.map(p =>
      fetch(`/api/hr/payroll/${p._id}/calculate`, { method: 'POST' })
    ));
    await load();
    setGenerating(false);
  };

  const recalculate = async (id) => {
    await fetch(`/api/hr/payroll/${id}/calculate`, { method: 'POST' });
    load();
  };

  const markPaid = async (id) => {
    await fetch(`/api/hr/payroll/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid', payment_date: new Date().toISOString() })
    });
    load();
  };

  const deletePayroll = async (id) => {
    if (!confirm('Delete this payroll entry?')) return;
    await fetch(`/api/hr/payroll/${id}`, { method: 'DELETE' });
    load();
  };

  const saveFreelancer = async () => {
    const emp = employees.find(e => e._id === freelancerForm.employee);
    if (!emp) return alert('Select a freelancer/consultant.');
    setSavingFl(true);

    try {
      // 1. Upsert attendance record for freelancer/consultant to save working hours
      await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: freelancerForm.employee,
          month,
          year,
          total_working_days: 26,
          present_days: Math.ceil((freelancerForm.hours_worked || 0) / 8),
          overtime_hours: freelancerForm.hours_worked || 0
        })
      });

      // 2. Create draft payroll document
      const res = await fetch('/api/hr/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: freelancerForm.employee,
          month,
          year,
          status: 'draft',
          advance_deduction: freelancerForm.advance_deduction || 0,
          other_deduction: freelancerForm.other_deduction || 0,
          payment_mode: freelancerForm.payment_mode,
          notes: freelancerForm.notes,
          project_description: freelancerForm.project_description
        })
      });

      if (res.ok) {
        const data = await res.json();
        // 3. Auto-calculate and transition status to processed
        await fetch(`/api/hr/payroll/${data._id}/calculate`, { method: 'POST' });
        setShowFreelancerModal(false);
        load();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to save freelancer payroll'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save freelancer payment');
    }
    setSavingFl(false);
  };

  const sendWhatsApp = (p) => {
    const phone = p.employee?.phone?.replace(/\D/g, '');
    if (!phone) return alert('No phone number for this employee.');
    const msg = `Dear ${p.employee?.name},\n\nYour ${MONTHS[month-1]} ${year} payslip is ready.\n💰 Gross: ₹${(p.gross_salary||0).toLocaleString()}\n✂️ Deductions: ₹${(p.total_deductions||0).toLocaleString()}\n🏦 Net Pay: ₹${(p.net_salary||0).toLocaleString()}\n\nPayment Mode: ${p.payment_mode?.toUpperCase()}\n\n– LegendIn HR`;
    window.open(`https://api.whatsapp.com/send?phone=91${phone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredPayrolls = payrolls.filter(p => {
    const matchTab = tab === 'employee' ? p.employee?.type === 'employee' : p.employee?.type !== 'employee';
    const matchSearch = !search || p.employee?.name?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const totalNet = filteredPayrolls.reduce((s, p) => s + (p.net_salary || 0), 0);
  const totalGross = filteredPayrolls.reduce((s, p) => s + (p.gross_salary || 0), 0);

  const statusColor = { draft: { bg: '#fef3c7', c: '#d97706' }, processed: { bg: '#eff6ff', c: '#3b82f6' }, paid: { bg: '#ecfdf5', c: '#10b981' } };

  return (
    <div style={{ padding: '28px', maxWidth: '1300px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>💰 Payroll Processing</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Generate payslips for employees and pay invoices for freelancers</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowFreelancerModal(true)} style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
            🧑‍💻 Add Freelancer Payment
          </button>
          <button onClick={generatePayroll} disabled={generating} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', opacity: generating ? 0.7 : 1 }}>
            {generating ? 'Generating...' : '⚡ Generate Payroll'}
          </button>
        </div>
      </div>

      {/* Month/Year + Summary */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#fff', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
          style={{ padding: '7px 12px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', fontWeight: '700', background: '#fff' }}>
          {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))}
          style={{ padding: '7px 12px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', fontWeight: '700', background: '#fff' }}>
          {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL GROSS</div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#10b981' }}>₹{totalGross.toLocaleString()}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL NET PAY</div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--primary)' }}>₹{totalNet.toLocaleString()}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>PAYROLL COUNT</div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)' }}>{filteredPayrolls.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[{ key: 'employee', label: '👨‍💼 Employee Payroll' }, { key: 'freelancer', label: '🧑‍💻 Freelancer / Consultant' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', border: 'none',
              background: tab === t.key ? 'var(--primary)' : 'var(--card-bg)',
              color: tab === t.key ? '#fff' : 'var(--text-muted)'
            }}>{t.label}</button>
          ))}
        </div>
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '13px', width: '220px', background: '#fff', outline: 'none' }} />
      </div>

      {/* Payroll Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)', overflow: 'auto' }}>
        {loading ? <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div> :
        filteredPayrolls.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💰</div>
            <div style={{ fontWeight: '700', marginBottom: '8px' }}>No payroll for {MONTHS[month-1]} {year}</div>
            <p style={{ fontSize: '13px' }}>Click "⚡ Generate Payroll" to auto-create payroll for all employees</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'var(--card-bg)' }}>
                {['Employee', tab === 'employee' ? 'Basic' : 'Hours/Rate', 'Gross', 'Deductions', 'Net Pay', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid var(--card-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPayrolls.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{p.employee?.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.employee?.designation} · {p.employee?.department}</div>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {tab === 'employee' ? `₹${(p.basic_salary||0).toLocaleString()}` : `${p.hours_worked||0} hrs × ₹${(p.employee?.basic_salary||0).toLocaleString()}`}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: '700', color: '#10b981' }}>₹{(p.gross_salary||0).toLocaleString()}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ color: '#ef4444', fontWeight: '700' }}>₹{(p.total_deductions||0).toLocaleString()}</div>
                    {p.leave_deduction > 0 && <div style={{ fontSize: '10px', color: '#ef4444' }}>Leave: ₹{p.leave_deduction.toLocaleString()}</div>}
                    {p.pf_deduction > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PF: ₹{p.pf_deduction.toLocaleString()}</div>}
                    {p.esi_deduction > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ESI: ₹{p.esi_deduction.toLocaleString()}</div>}
                    {p.pt_deduction > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PT: ₹{p.pt_deduction.toLocaleString()}</div>}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: '900', fontSize: '15px', color: 'var(--primary)' }}>₹{(p.net_salary||0).toLocaleString()}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: statusColor[p.status]?.bg, color: statusColor[p.status]?.c }}>
                      {p.status?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <button onClick={() => setViewPayslip(p)} style={{ padding: '4px 8px', background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: '5px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
                        {tab === 'employee' ? '🧾 Payslip' : '📄 Invoice'}
                      </button>
                      {tab === 'employee' && p.status === 'draft' && (
                        <button onClick={() => recalculate(p._id)} style={{ padding: '4px 8px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '5px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>⚙️ Calc</button>
                      )}
                      {p.status !== 'paid' && (
                        <button onClick={() => markPaid(p._id)} style={{ padding: '4px 8px', background: '#ecfdf5', color: '#10b981', border: 'none', borderRadius: '5px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>✓ Paid</button>
                      )}
                      <button onClick={() => sendWhatsApp(p)} style={{ padding: '4px 8px', background: '#ecfdf5', color: '#25d366', border: 'none', borderRadius: '5px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>📱 WA</button>
                      <button onClick={() => deletePayroll(p._id)} style={{ padding: '4px 8px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '5px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payslip/Invoice View Modal */}
      {viewPayslip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 80px rgba(0,0,0,0.35)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
              <strong style={{ fontSize: '16px' }}>{viewPayslip.employee?.type === 'employee' ? '🧾 Payslip' : '📄 Pay Invoice'} — {viewPayslip.employee?.name}</strong>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => window.open(`/print/payslip/${viewPayslip._id}`, '_blank')} style={{ padding: '7px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                  ⬇️ Download PDF
                </button>
                <button onClick={() => sendWhatsApp(viewPayslip)} style={{ padding: '7px 14px', background: '#25d366', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                  📱 WhatsApp
                </button>
                <button onClick={() => {
                  const email = viewPayslip.employee?.email;
                  const sub = `${MONTHS[month-1]} ${year} Payslip — ${viewPayslip.employee?.name}`;
                  const body = `Dear ${viewPayslip.employee?.name},\n\nPlease find your payslip for ${MONTHS[month-1]} ${year}.\nNet Pay: ₹${(viewPayslip.net_salary||0).toLocaleString()}\n\nRegards,\nLegendIn HR`;
                  window.location.href = `mailto:${email}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
                }} style={{ padding: '7px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                  📧 Email
                </button>
                <button onClick={() => setViewPayslip(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>×</button>
              </div>
            </div>

            {/* Payslip Preview */}
            <div style={{ padding: '28px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid var(--primary)' }}>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--primary)' }}>LegendIn</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>LegendIn — Premium Interior Designers</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>{viewPayslip.employee?.type === 'employee' ? 'SALARY PAYSLIP' : 'CONSULTANT INVOICE'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Period: {MONTHS[month-1]} {year}</div>
                </div>
              </div>

              {/* Employee Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Employee Details</div>
                  {[
                    ['Name', viewPayslip.employee?.name],
                    ['Designation', viewPayslip.employee?.designation],
                    ['Department', viewPayslip.employee?.department || '—'],
                    ['PAN', viewPayslip.employee?.pan_number || '—'],
                    ['UAN', viewPayslip.employee?.uan_number || '—'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{k}:</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Payment Details</div>
                  {[
                    ['Bank', viewPayslip.employee?.bank_name || '—'],
                    ['Account', viewPayslip.employee?.bank_account || '—'],
                    ['IFSC', viewPayslip.employee?.ifsc || '—'],
                    ['Payment Mode', viewPayslip.payment_mode?.toUpperCase() || '—'],
                    ['Status', viewPayslip.status?.toUpperCase()],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{k}:</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Earnings vs Deductions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                {/* Earnings */}
                <div>
                  <div style={{ background: '#ecfdf5', padding: '10px 14px', borderRadius: '8px 8px 0 0', fontWeight: '800', color: '#10b981', fontSize: '13px' }}>EARNINGS</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderTop: 'none' }}>
                    <tbody>
                      {[
                        ['Basic Salary', viewPayslip.basic_salary],
                        ['HRA', viewPayslip.hra],
                        ['Transport Allowance', viewPayslip.transport_allowance],
                        ['Other Allowances', viewPayslip.other_allowance],
                        ['Overtime Pay', viewPayslip.overtime_pay],
                      ].filter(([,v]) => v > 0).map(([label, val]) => (
                        <tr key={label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '7px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>{label}</td>
                          <td style={{ padding: '7px 12px', fontSize: '12px', fontWeight: '700', textAlign: 'right', color: 'var(--text-main)' }}>₹{(val||0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#ecfdf5' }}>
                        <td style={{ padding: '8px 12px', fontWeight: '800', fontSize: '12px', color: '#10b981' }}>Gross Salary</td>
                        <td style={{ padding: '8px 12px', fontWeight: '900', fontSize: '14px', textAlign: 'right', color: '#10b981' }}>₹{(viewPayslip.gross_salary||0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Deductions */}
                <div>
                  <div style={{ background: '#fef2f2', padding: '10px 14px', borderRadius: '8px 8px 0 0', fontWeight: '800', color: '#ef4444', fontSize: '13px' }}>DEDUCTIONS</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderTop: 'none' }}>
                    <tbody>
                      {[
                        ['PF (12%)', viewPayslip.pf_deduction],
                        ['ESI (0.75%)', viewPayslip.esi_deduction],
                        ['Professional Tax (PT)', viewPayslip.pt_deduction],
                        ['TDS', viewPayslip.tds_deduction],
                        ['Leave Deduction', viewPayslip.leave_deduction],
                        ['Advance', viewPayslip.advance_deduction],
                        ['Other', viewPayslip.other_deduction],
                      ].filter(([,v]) => v > 0).map(([label, val]) => (
                        <tr key={label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '7px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>{label}</td>
                          <td style={{ padding: '7px 12px', fontSize: '12px', fontWeight: '700', textAlign: 'right', color: '#ef4444' }}>₹{(val||0).toLocaleString()}</td>
                        </tr>
                      ))}
                      {viewPayslip.total_deductions === 0 && <tr><td colSpan="2" style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>No deductions</td></tr>}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#fef2f2' }}>
                        <td style={{ padding: '8px 12px', fontWeight: '800', fontSize: '12px', color: '#ef4444' }}>Total Deductions</td>
                        <td style={{ padding: '8px 12px', fontWeight: '900', fontSize: '14px', textAlign: 'right', color: '#ef4444' }}>₹{(viewPayslip.total_deductions||0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Net Salary */}
              <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', borderRadius: '10px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '600' }}>NET PAY ({MONTHS[month-1]} {year})</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '3px', fontStyle: 'italic' }}>{numberToWords(viewPayslip.net_salary || 0)}</div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff' }}>₹{(viewPayslip.net_salary||0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Freelancer Payment Modal */}
      {showFreelancerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800' }}>🧑‍💻 Freelancer / Consultant Payment</h2>
              <button onClick={() => setShowFreelancerModal(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { key: 'employee', label: 'Freelancer / Consultant', type: 'select', opts: employees.filter(e => e.type !== 'employee').map(e => ({ v: e._id, l: `${e.name} (${e.rate_type === 'hourly' ? `₹${e.basic_salary}/hr` : `₹${e.basic_salary}/project`})` })) },
                { key: 'hours_worked', label: 'Hours Worked (for hourly rate)', type: 'number' },
                { key: 'project_description', label: 'Project / Work Description', type: 'text' },
                { key: 'advance_deduction', label: 'Advance Deduction (₹)', type: 'number' },
                { key: 'other_deduction', label: 'Other Deduction (₹)', type: 'number' },
                { key: 'payment_mode', label: 'Payment Mode', type: 'select', opts: [{ v: 'bank_transfer', l: 'Bank Transfer' }, { v: 'upi', l: 'UPI' }, { v: 'cash', l: 'Cash' }, { v: 'cheque', l: 'Cheque' }] },
                { key: 'notes', label: 'Notes', type: 'text' },
              ].map(({ key, label, type, opts }) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</label>
                  {type === 'select' ? (
                    <select value={freelancerForm[key]} onChange={e => setFreelancerForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ padding: '9px 12px', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '13px', background: '#fff', color: 'var(--text-main)' }}>
                      <option value="">Select...</option>
                      {opts?.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  ) : key === 'project_description' ? (
                    <textarea rows={3} value={freelancerForm[key]} onChange={e => setFreelancerForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ padding: '9px 12px', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '13px', background: '#fff', color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
                  ) : (
                    <input type={type} value={freelancerForm[key]} onChange={e => setFreelancerForm(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                      style={{ padding: '9px 12px', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '13px', background: '#fff', color: 'var(--text-main)', outline: 'none' }} />
                  )}
                </div>
              ))}
              {/* Live Preview */}
              {freelancerForm.employee && (() => {
                const emp = employees.find(e => e._id === freelancerForm.employee);
                if (!emp) return null;
                const gross = emp.rate_type === 'hourly' ? emp.basic_salary * (freelancerForm.hours_worked || 0) : emp.basic_salary;
                const ded = (freelancerForm.advance_deduction || 0) + (freelancerForm.other_deduction || 0);
                return (
                  <div style={{ background: 'var(--primary-light)', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700' }}>
                    <span>Gross: <span style={{ color: '#10b981' }}>₹{gross.toLocaleString()}</span></span>
                    <span>Deductions: <span style={{ color: '#ef4444' }}>₹{ded.toLocaleString()}</span></span>
                    <span>Net: <span style={{ color: 'var(--primary)' }}>₹{Math.max(0, gross - ded).toLocaleString()}</span></span>
                  </div>
                );
              })()}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowFreelancerModal(false)} style={{ padding: '10px 20px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
              <button onClick={saveFreelancer} disabled={savingFl} style={{ padding: '10px 24px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                {savingFl ? 'Saving...' : 'Create Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
