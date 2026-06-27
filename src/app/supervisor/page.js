'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SupervisorPortal() {
  const [supervisors, setSupervisors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState([]); // Array of { employeeId, hours_worked, projectId, notes }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resEmp = await fetch('/api/hr/employees?status=active');
        const dataEmp = await resEmp.json();
        const activeEmps = Array.isArray(dataEmp) ? dataEmp : [];
        setEmployees(activeEmps);

        // Filter supervisors as designation containing 'supervisor' or just show all as potential supervisors
        const sups = activeEmps.filter(e => 
          e.designation?.toLowerCase().includes('supervisor') || 
          e.designation?.toLowerCase().includes('lead') || 
          e.designation?.toLowerCase().includes('manager')
        );
        setSupervisors(sups.length > 0 ? sups : activeEmps);

        const resProj = await fetch('/api/projects');
        const dataProj = await resProj.json();
        setProjects(Array.isArray(dataProj) ? dataProj : []);

        // Initialize rows for all employees
        setRows(activeEmps.map(emp => ({
          employeeId: emp._id,
          employeeName: emp.name,
          designation: emp.designation,
          type: emp.type,
          hours_worked: 0,
          projectId: '',
          notes: ''
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRowChange = (index, field, value) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupervisor) {
      alert('Please select your supervisor name.');
      return;
    }

    // Filter only records that have hours logged (> 0)
    const activeRecords = rows.filter(r => parseFloat(r.hours_worked) > 0);
    if (activeRecords.length === 0) {
      alert('Please enter working hours for at least one employee.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/supervisor-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisor: selectedSupervisor,
          date,
          records: activeRecords
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Daily attendance log submitted successfully to HR console!' });
        // Reset hours
        setRows(prev => prev.map(r => ({ ...r, hours_worked: 0, projectId: '', notes: '' })));
      } else {
        setMessage({ type: 'error', text: `Failed to submit log: ${data.error || 'Unknown error'}` });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Network error submitting log.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading portal resources...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            👷 Supervisor Daily Attendance Portal
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Multiple supervisors can submit daily working hours directly from this panel
          </p>
        </div>
        <Link href="/hr/supervisor-input" style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '700', textDecoration: 'underline' }}>
          Go to HR Supervisor Input Console ➡️
        </Link>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: message.type === 'success' ? '#15803d' : '#b91c1c',
          fontSize: '13px',
          fontWeight: '700',
          marginBottom: '20px'
        }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Supervisor Selection Block */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Select Supervisor Name
            </label>
            <select
              value={selectedSupervisor}
              onChange={e => setSelectedSupervisor(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '13px', background: '#fff', color: 'var(--text-main)', outline: 'none' }}
            >
              <option value="">-- Select Your Name --</option>
              {supervisors.map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.designation || 'Supervisor'})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Daily Log Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '13px', background: '#fff', color: 'var(--text-main)', outline: 'none' }}
            />
          </div>
        </div>

        {/* Employees Grid list */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
            Employees & Freelancers Hours Input
          </label>
          <div style={{ border: '1px solid var(--card-border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--card-border)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '700' }}>Employee / Freelancer</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '700', width: '100px', textAlign: 'center' }}>Hours</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '700', width: '220px' }}>Assign Project (Site)</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '700' }}>Tasks / Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.employeeId} style={{ borderBottom: idx < rows.length - 1 ? '1px solid #f1f5f9' : 'none', background: row.hours_worked > 0 ? 'rgba(var(--primary-rgb), 0.03)' : 'transparent' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{row.employeeName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {row.designation} · <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{row.type}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={row.hours_worked === 0 ? '' : row.hours_worked}
                        placeholder="0"
                        onChange={e => handleRowChange(idx, 'hours_worked', parseFloat(e.target.value) || 0)}
                        style={{ width: '70px', padding: '6px', border: '1px solid var(--card-border)', borderRadius: '6px', fontSize: '12px', textAlign: 'center', fontWeight: '700', outline: 'none' }}
                      />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={row.projectId}
                        disabled={row.hours_worked === 0}
                        onChange={e => handleRowChange(idx, 'projectId', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--card-border)', borderRadius: '6px', fontSize: '12px', outline: 'none', background: row.hours_worked === 0 ? '#f3f4f6' : '#fff' }}
                      >
                        <option value="">-- General --</option>
                        {projects.map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <input
                        type="text"
                        placeholder="E.g. Plastering work, framing drafts"
                        value={row.notes}
                        disabled={row.hours_worked === 0}
                        onChange={e => handleRowChange(idx, 'notes', e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--card-border)', borderRadius: '6px', fontSize: '12px', outline: 'none', background: row.hours_worked === 0 ? '#f3f4f6' : '#fff' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Block */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 24px',
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {submitting ? 'Submitting Log...' : '🚀 Submit Attendance Input'}
          </button>
        </div>

      </form>
    </div>
  );
}
