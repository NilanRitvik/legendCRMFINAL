'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SupervisorPortal() {
  const [supervisors, setSupervisors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState([]); // Array of { employeeId, employeeName, designation, type, logs: [{ projectId, hours, minutes, notes }] }
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

        // Initialize rows for all employees with empty log arrays
        setRows(activeEmps.map(emp => ({
          employeeId: emp._id,
          employeeName: emp.name,
          designation: emp.designation,
          type: emp.type,
          logs: [{ projectId: '', hours: 0, minutes: 0, notes: '' }]
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogChange = (empIdx, logIdx, field, value) => {
    setRows(prev => {
      const next = [...prev];
      if (next[empIdx] && next[empIdx].logs[logIdx]) {
        next[empIdx].logs[logIdx] = { ...next[empIdx].logs[logIdx], [field]: value };
      }
      return next;
    });
  };

  const addLogLine = (empIdx) => {
    setRows(prev => {
      const next = [...prev];
      if (next[empIdx]) {
        next[empIdx].logs.push({ projectId: '', hours: 0, minutes: 0, notes: '' });
      }
      return next;
    });
  };

  const removeLogLine = (empIdx, logIdx) => {
    setRows(prev => {
      const next = [...prev];
      if (next[empIdx]) {
        next[empIdx].logs = next[empIdx].logs.filter((_, idx) => idx !== logIdx);
        if (next[empIdx].logs.length === 0) {
          next[empIdx].logs = [{ projectId: '', hours: 0, minutes: 0, notes: '' }];
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupervisor) {
      alert('Please select your supervisor name.');
      return;
    }

    // Convert logs to decimal hours and gather active records
    const records = [];
    rows.forEach(r => {
      r.logs.forEach(log => {
        const h = parseFloat(log.hours) || 0;
        const m = parseFloat(log.minutes) || 0;
        const dec = h + (m / 60);
        if (dec > 0) {
          records.push({
            employeeId: r.employeeId,
            projectId: log.projectId || null,
            hours_worked: dec,
            notes: log.notes || ''
          });
        }
      });
    });

    if (records.length === 0) {
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
          records
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Daily attendance log submitted successfully to HR console!' });
        // Reset logs
        setRows(prev => prev.map(r => ({
          ...r,
          logs: [{ projectId: '', hours: 0, minutes: 0, notes: '' }]
        })));
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
    <div style={{ padding: '24px', maxWidth: '1050px', margin: '0 auto' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            👷 Supervisor Daily Attendance Portal (Hourly-Based)
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Enter hours and minutes worked per project/site. HR review console receives logs instantly.
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

        {/* Employees Table */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
            Employees & Freelancers Hours & Project Allocations
          </label>
          <div style={{ border: '1px solid var(--card-border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--card-border)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '700' }}>Employee / Freelancer</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '700' }}>Logged Hours & Project Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, empIdx) => {
                  const hasHours = row.logs.some(l => (parseFloat(l.hours) || 0) > 0 || (parseFloat(l.minutes) || 0) > 0);
                  
                  return (
                    <tr key={row.employeeId} style={{ borderBottom: empIdx < rows.length - 1 ? '1px solid #f1f5f9' : 'none', background: hasHours ? 'rgba(var(--primary-rgb), 0.02)' : 'transparent' }}>
                      
                      {/* Left: Employee Info */}
                      <td style={{ padding: '16px', width: '250px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{row.employeeName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {row.designation} · <span style={{ textTransform: 'capitalize', fontWeight: '700' }}>{row.type}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addLogLine(empIdx)}
                          style={{
                            background: 'none', border: 'none', color: 'var(--primary)',
                            fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                            marginTop: '10px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          ➕ Add Project Log
                        </button>
                      </td>

                      {/* Right: Project/Hours Log rows */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {row.logs.map((log, logIdx) => (
                            <div key={logIdx} style={{ display: 'grid', gridTemplateColumns: '1.4fr 85px 85px 1.6fr 35px', gap: '8px', alignItems: 'center' }}>
                              
                              {/* Project dropdown select */}
                              <div>
                                <select
                                  value={log.projectId}
                                  onChange={e => handleLogChange(empIdx, logIdx, 'projectId', e.target.value)}
                                  style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--card-border)', borderRadius: '6px', fontSize: '12px', outline: 'none', background: '#fff' }}
                                >
                                  <option value="">-- General / Office --</option>
                                  {projects.map(p => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Hours */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                  type="number"
                                  placeholder="Hrs"
                                  min="0"
                                  max="24"
                                  value={log.hours === 0 ? '' : log.hours}
                                  onChange={e => handleLogChange(empIdx, logIdx, 'hours', parseInt(e.target.value) || 0)}
                                  style={{ width: '100%', padding: '6px 4px', border: '1px solid var(--card-border)', borderRadius: '6px', fontSize: '12px', textAlign: 'center', fontWeight: '700', outline: 'none' }}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>h</span>
                              </div>

                              {/* Minutes */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                  type="number"
                                  placeholder="Mins"
                                  min="0"
                                  max="59"
                                  step="5"
                                  value={log.minutes === 0 ? '' : log.minutes}
                                  onChange={e => handleLogChange(empIdx, logIdx, 'minutes', parseInt(e.target.value) || 0)}
                                  style={{ width: '100%', padding: '6px 4px', border: '1px solid var(--card-border)', borderRadius: '6px', fontSize: '12px', textAlign: 'center', fontWeight: '700', outline: 'none' }}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>m</span>
                              </div>

                              {/* Notes */}
                              <div>
                                <input
                                  type="text"
                                  placeholder="Work performed description..."
                                  value={log.notes}
                                  onChange={e => handleLogChange(empIdx, logIdx, 'notes', e.target.value)}
                                  style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--card-border)', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
                                />
                              </div>

                              {/* Delete button */}
                              <div>
                                <button
                                  type="button"
                                  onClick={() => removeLogLine(empIdx, logIdx)}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer', display: 'block', margin: '0 auto' }}
                                  title="Delete entry line"
                                >
                                  🗑️
                                </button>
                              </div>

                            </div>
                          ))}
                        </div>
                      </td>

                    </tr>
                  );
                })}
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
            {submitting ? 'Submitting Sheets...' : '🚀 Submit Daily Logs'}
          </button>
        </div>

      </form>
    </div>
  );
}
