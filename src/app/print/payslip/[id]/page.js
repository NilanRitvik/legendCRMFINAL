'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function numberToWords(amount) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (!amount || amount === 0) return 'Zero Rupees Only';
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

export default function PayslipPrintPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Custom date-wise logs
  const [dailyRecords, setDailyRecords] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/hr/payroll/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!data || data.error) return;
    const empId = data.employee?._id || data.employee;
    const month = data.month;
    const year = data.year;

    if (data.employee?.type === 'employee') {
      fetch(`/api/hr/attendance/daily?employee=${empId}&month=${month}&year=${year}`)
        .then(r => r.json())
        .then(res => {
          if (Array.isArray(res)) setDailyRecords(res);
        })
        .catch(err => console.error(err));
    } else {
      fetch(`/api/hr/attendance/worklogs?employee=${empId}&month=${month}&year=${year}`)
        .then(r => r.json())
        .then(res => {
          if (Array.isArray(res)) setWorkLogs(res);
        })
        .catch(err => console.error(err));
    }
  }, [data]);

  useEffect(() => {
    if (data && !data.error) {
      const timer = setTimeout(() => window.print(), 1800); // 1.8s delay to allow dynamic log render before print dialog
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center', fontFamily: "'Outfit', sans-serif", color: 'var(--text-muted)' }}>Generating Detailed Payslip...</div>;
  if (!data || data.error) return <div style={{ padding: '50px', textAlign: 'center', color: '#ef4444', fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>Payslip not found.</div>;

  const emp = data.employee || {};
  const isFreelancer = emp.type !== 'employee';

  const renderCalendar = () => {
    if (!data || dailyRecords.length === 0) return null;
    const daysCount = new Date(data.year, data.month, 0).getDate();
    // Weekday alignment
    const firstDay = new Date(data.year, data.month - 1, 1).getDay(); // 0 = Sunday
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon = 0
    
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const cells = [];
    
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: '', status: '' });
    }
    
    for (let d = 1; d <= daysCount; d++) {
      const record = dailyRecords.find(r => new Date(r.date).getUTCDate() === d);
      cells.push({ day: d, status: record?.status || '' });
    }
    
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    
    const statusMeta = {
      present: { text: 'P', c: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
      late: { text: 'L', c: '#d97706', bg: '#fffbeb', border: '#fef3c7' },
      half_day: { text: 'H', c: '#2563eb', bg: '#eff6ff', border: '#dbeafe' },
      absent: { text: 'A', c: '#dc2626', bg: '#fef2f2', border: '#fee2e2' },
      unmarked: { text: '-', c: '#64748b', bg: '#f8fafc', border: '#e2e8f0' }
    };
    
    return (
      <div style={{ marginTop: '16px', background: '#f8fafc', borderRadius: '8px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '9px', fontWeight: '800', color: '#d4af37', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
          🗓️ Monthly Attendance Log (Day-Wise Check-In)
        </div>
        <table style={{ width: '100%', border: 'none', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr>
              {weekdays.map(w => (
                <th key={w} style={{ padding: '4px', fontSize: '9px', fontWeight: '800', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{w}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => {
                  const style = statusMeta[cell.status] || statusMeta.unmarked;
                  return (
                    <td key={cIdx} style={{ padding: '4px 2px', border: 'none' }}>
                      {cell.day ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span style={{ fontSize: '8px', fontWeight: '700', color: '#94a3b8' }}>{cell.day}</span>
                          <span style={{
                            width: '17px', height: '17px', borderRadius: '50%',
                            background: style.bg, color: style.c, border: `1px solid ${style.border}`,
                            fontSize: '9px', fontWeight: '850', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {style.text}
                          </span>
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '8px', fontSize: '8px', color: '#64748b', fontWeight: '700' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}/> P: Present</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }}/> L: Late</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb' }}/> H: Half-Day</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }}/> A: Absent</span>
        </div>
      </div>
    );
  };

  const renderFreelancerWorkLogs = () => {
    if (!data || !isFreelancer || workLogs.length === 0) return null;
    const hourlyRate = emp.basic_salary || 0;
    
    return (
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '10px', fontWeight: '800', color: '#d4af37', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
          🧑‍💻 Detailed Hourly Performance & Deliverables Log
        </h3>
        <table style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>Date Performed</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '800', color: '#475569' }}>Hours Performed</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>Task / Work Accomplished</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800', color: '#475569' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {workLogs.map((log) => {
              const lineTotal = (log.hours_worked || 0) * hourlyRate;
              return (
                <tr key={log._id} className="row-border">
                  <td style={{ padding: '8px 12px', fontWeight: '700', color: '#1e293b' }}>
                    {new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', color: '#8b5cf6' }}>
                    {log.hours_worked} hrs
                  </td>
                  <td style={{ padding: '8px 12px', color: '#334155' }}>
                    {log.description || 'Services rendered'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                    ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f5f3ff', borderTop: '2px solid #c084fc' }}>
              <td style={{ padding: '10px 12px', fontWeight: '800', color: '#8b5cf6' }}>Total Logged Breakdown</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '800', color: '#8b5cf6' }}>
                {data.hours_worked} hrs
              </td>
              <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: '10px', fontStyle: 'italic' }}>
                Sum performance sheet @ ₹{hourlyRate}/hour
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: '#8b5cf6' }}>
                ₹{(data.hours_worked * hourlyRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @media print {
          body { background-color: #ffffff !important; padding: 0 !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .page-container { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; border: none !important; padding: 20px !important; }
        }
        body { font-family: 'Outfit', 'Segoe UI', Arial, sans-serif; background: #f3f4f6; color: #1e293b; margin: 0; padding: 20px 0; }
        .page-container { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 40px; position: relative; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 8px 12px; line-height: 1.5; }
        .earn-th { background: #f0fdf4; color: #166534; font-weight: 800; text-transform: uppercase; font-size: 10px; border-bottom: 2px solid #bbf7d0; }
        .ded-th { background: #fef2f2; color: #991b1b; font-weight: 800; text-transform: uppercase; font-size: 10px; border-bottom: 2px solid #fecaca; }
        .row-border { border-bottom: 1px solid #f1f5f9; }
      `}</style>

      {/* Floating Action Bar */}
      <div className="no-print" style={{
        maxWidth: '800px',
        margin: '0 auto 20px auto',
        background: '#1e293b',
        color: '#ffffff',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => window.history.back()}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.target.style.background = 'rgba(255,255,255,0.15)'}
            onMouseOut={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
          >
            ← Back to App
          </button>
          <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 'bold' }}>
            Detailed Branded Payslip Viewer
          </span>
        </div>

        <button
          onClick={() => window.print()}
          style={{
            background: '#d4af37',
            border: 'none',
            color: '#ffffff',
            padding: '6px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(212,175,55,0.3)',
            transition: 'background 0.2s'
          }}
          onMouseOver={e => e.target.style.background = '#c59f2e'}
          onMouseOut={e => e.target.style.background = '#d4af37'}
        >
          <span>📥</span> Print / Download PDF
        </button>
      </div>

      <div className="page-container">
        {/* Subtle Watermark Logo */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: '0.025',
          pointerEvents: 'none',
          zIndex: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          userSelect: 'none'
        }}>
          <img 
            src="/logo.png?v=2" 
            alt="Watermark Logo" 
            style={{ width: '420px', height: '420px', objectFit: 'contain' }} 
          />
          <h1 style={{ fontSize: '68px', fontWeight: '900', color: '#000000', margin: '-10px 0 0 0', letterSpacing: '-2px' }}>
            LEGENDIN
          </h1>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Branded Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2.5px solid #d4af37',
            paddingBottom: '18px',
            marginBottom: '24px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                  src="/logo.png?v=2" 
                  alt="Legend Interiors" 
                  style={{ width: '48px', height: '48px', objectFit: 'contain' }} 
                />
                <h1 style={{ fontSize: '24px', fontWeight: '850', margin: 0, color: '#1e293b', letterSpacing: '-0.5px' }}>
                  Legend Interiors
                </h1>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', display: 'block', marginTop: '5px' }}>
                Premium Space Architecture & Interior Designing
              </span>
            </div>

            <div style={{ textAlign: 'right', fontSize: '10px', color: '#64748b', lineHeight: '1.4' }}>
              <strong style={{ fontSize: '11px', color: '#1e293b' }}>Legend Interiors Office</strong>
              <div>legendinteriorudumalpet@gmail.com | +91 95975 33099</div>
              <div>No 13/113 A, Palani Road, Palappampatti, Udumalpet - 642 128</div>
              <div style={{ fontWeight: '700', color: '#475569', marginTop: '2px' }}>
                GST: 33DFSPB1768C1ZL | CIN: U45200TG2016PTC112460
              </div>
            </div>
          </div>

          {/* Title & Pay Period */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, textTransform: 'uppercase', color: '#d4af37', letterSpacing: '0.5px' }}>
              {isFreelancer ? 'CONSULTANT PAY INVOICE' : 'MONTHLY SALARY PAYSLIP'}
            </h2>
            <div style={{ fontSize: '12px', color: '#475569', textAlign: 'right' }}>
              Period: <strong>{MONTHS[data.month-1]} {data.year}</strong><br />
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>Generated on: {new Date().toLocaleDateString('en-IN')}</span>
            </div>
          </div>

          {/* Grid Information Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Employee Block */}
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#d4af37', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                {isFreelancer ? 'Consultant Details' : 'Employee Details'}
              </div>
              {[
                ['Name', emp.name],
                ['Designation', emp.designation],
                ['Department', emp.department || 'Operations'],
                ['Employment Type', emp.employment_type?.replace('_',' ').toUpperCase() || 'FULL TIME'],
                ['PAN Card Number', emp.pan_number || '—'],
                ...(!isFreelancer ? [['UAN / PF Number', emp.uan_number || '—']] : []),
                ['Joining Date', emp.join_date ? new Date(emp.join_date).toLocaleDateString('en-IN') : '—']
              ].map(([k,v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <span style={{ fontWeight: '700', color: '#1e293b' }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Payment Block */}
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#d4af37', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                Payment & Account Info
              </div>
              {[
                ['Bank Name', emp.bank_name || '—'],
                ['Bank Account No.', emp.bank_account || '—'],
                ['IFSC Route Code', emp.ifsc || '—'],
                ['Disbursement Mode', data.payment_mode?.replace('_',' ').toUpperCase() || 'BANK TRANSFER'],
                ['Status', data.status?.toUpperCase() || 'DRAFT'],
                ...(isFreelancer && data.hours_worked ? [['Hours Billed', `${data.hours_worked} Hours`]] : [])
              ].map(([k,v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <span style={{ 
                    fontWeight: '700', 
                    color: k === 'Status' ? (v === 'PAID' ? '#16a34a' : '#d97706') : '#1e293b'
                  }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Day-Wise Attendance Calendar for Salaried Employees */}
          {!isFreelancer && renderCalendar()}

          {/* Earnings vs Deductions Breakdowns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px', marginBottom: '24px' }}>
            {/* Earnings Table */}
            <div>
              <table style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <thead>
                  <tr>
                    <th className="earn-th" style={{ textAlign: 'left' }}>Earnings Component</th>
                    <th className="earn-th" style={{ textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Basic Salary', data.basic_salary],
                    ['House Rent Allowance (HRA)', data.hra],
                    ['Transport Allowance', data.transport_allowance],
                    ['Other Allowances', data.other_allowance],
                    ['Overtime Payout', data.overtime_pay],
                  ].filter(([,v]) => v > 0).map(([l,v]) => (
                    <tr key={l} className="row-border">
                      <td style={{ color: '#334155', fontWeight: '500' }}>{l}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {Array(Math.max(0, 4 - [data.basic_salary, data.hra, data.transport_allowance, data.other_allowance, data.overtime_pay].filter(v => v > 0).length)).fill(0).map((_, i) => (
                    <tr key={i} className="row-border"><td style={{ color: 'transparent' }}>Spacer</td><td></td></tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f0fdf4' }}>
                    <td style={{ fontWeight: '800', color: '#166534', padding: '10px 12px' }}>Gross Salary</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#166534', padding: '10px 12px' }}>₹{data.gross_salary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Deductions Table */}
            <div>
              <table style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <thead>
                  <tr>
                    <th className="ded-th" style={{ textAlign: 'left' }}>Deductions Component</th>
                    <th className="ded-th" style={{ textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Provident Fund (PF)', data.pf_deduction],
                    ['Employee State Insurance (ESI)', data.esi_deduction],
                    ['Professional Tax (PT)', data.pt_deduction],
                    ['TDS (Income Tax)', data.tds_deduction],
                    ['Leave Deductions', data.leave_deduction],
                    ['Salary Advance Deductions', data.advance_deduction],
                    ['Other Deductions', data.other_deduction],
                  ].filter(([,v]) => v > 0).map(([l,v]) => (
                    <tr key={l} className="row-border">
                      <td style={{ color: '#334155', fontWeight: '500' }}>{l}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>({v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</td>
                    </tr>
                  ))}
                  {(data.total_deductions || 0) === 0 && (
                    <tr>
                      <td colSpan="2" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 12px', fontStyle: 'italic' }}>
                        No payroll deductions recorded for this cycle.
                      </td>
                    </tr>
                  )}
                  {Array(Math.max(0, 4 - [data.pf_deduction, data.esi_deduction, data.pt_deduction, data.tds_deduction, data.leave_deduction, data.advance_deduction, data.other_deduction].filter(v => v > 0).length)).fill(0).map((_, i) => (
                    <tr key={i} className="row-border"><td style={{ color: 'transparent' }}>Spacer</td><td></td></tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#fef2f2' }}>
                    <td style={{ fontWeight: '800', color: '#991b1b', padding: '10px 12px' }}>Total Deductions</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#991b1b', padding: '10px 12px' }}>(₹{data.total_deductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Itemized Hourly log table for Freelancers */}
          {isFreelancer && renderFreelancerWorkLogs()}

          {/* Work description (freelancers - legacy text if no detailed items) */}
          {data.project_description && !workLogs.length && (
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', border: '1px solid #e2e8f0', fontSize: '11px', whiteSpace: 'pre-line' }}>
              <strong>Work Description / Deliverables:</strong><br />
              {data.project_description}
            </div>
          )}

          {/* Net Salary block */}
          <div style={{
            background: 'linear-gradient(135deg, #d4af37 0%, #b59424 100%)',
            borderRadius: '10px',
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
            boxShadow: '0 4px 12px rgba(212,175,55,0.2)'
          }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Net Pay Amount</div>
              <div style={{ color: '#ffffff', fontSize: '11px', marginTop: '4px', fontWeight: '600', fontStyle: 'italic' }}>
                {numberToWords(data.net_salary)}
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px' }}>
              ₹{data.net_salary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Footer signature line */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: '1.5' }}>
              <div>• This document is a digitally compiled payslip.</div>
              <div>• Legend Interiors © {new Date().getFullYear()} — Confidential Corporate Document.</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '160px' }}>
              <div style={{ width: '100%', borderBottom: '1.5px solid #475569', marginBottom: '6px', height: '30px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <img src="/signature.png" alt="Signature" style={{ maxHeight: '28px', maxWidth: '120px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
              </div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b' }}>Authorised Signatory</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>Founder / MD, Legend Interiors</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
