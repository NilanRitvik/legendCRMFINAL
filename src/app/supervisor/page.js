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

  // Submissions & Notifications states
  const [mySubmissions, setMySubmissions] = useState([]);
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Supervisor verification states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState('');

  const [installations, setInstallations] = useState([]);
  const [approvedDesigns, setApprovedDesigns] = useState([]);
  const [uploadingDocFor, setUploadingDocFor] = useState(null); // installation _id being uploaded to
  const [docUploading, setDocUploading] = useState(false);

  const fetchData = async () => {
    try {
      const resEmp = await fetch('/api/hr/employees?status=active');
      const dataEmp = await resEmp.json();
      const activeEmps = Array.isArray(dataEmp) ? dataEmp : [];
      setEmployees(activeEmps);

      // Filter supervisors
      const sups = activeEmps.filter(e => 
        e.designation?.toLowerCase().includes('supervisor') || 
        e.designation?.toLowerCase().includes('lead') || 
        e.designation?.toLowerCase().includes('manager')
      );
      setSupervisors(sups.length > 0 ? sups : activeEmps);

      const resProj = await fetch('/api/projects');
      const dataProj = await resProj.json();
      setProjects(Array.isArray(dataProj) ? dataProj : []);

      // Initialize rows
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

  useEffect(() => {
    fetchData();
  }, []);

  // Reset auth when supervisor changes
  useEffect(() => {
    setIsAuthenticated(false);
    setEnteredPassword('');
    setAuthError('');
  }, [selectedSupervisor]);

  // Fetch submissions and notifications when supervisor is selected and verified
  useEffect(() => {
    if (!selectedSupervisor || !isAuthenticated) {
      setMySubmissions([]);
      setNotifications([]);
      return;
    }

    const fetchSupData = async () => {
      try {
        // Fetch submissions
        const resSub = await fetch('/api/supervisor-input');
        const dataSub = await resSub.json();
        if (Array.isArray(dataSub)) {
          const filtered = dataSub.filter(l => 
            l.supervisor === selectedSupervisor || 
            (l.supervisor && l.supervisor._id === selectedSupervisor)
          );
          setMySubmissions(filtered);
        }

        // Fetch notifications
        const resNotif = await fetch(`/api/supervisor-notifications?supervisor=${selectedSupervisor}`);
        const dataNotif = await resNotif.json();
        setNotifications(Array.isArray(dataNotif) ? dataNotif : []);

        // Fetch installations and designs
        const [resInst, resDesigns] = await Promise.all([
          fetch('/api/installation'),
          fetch('/api/designing')
        ]);
        const dataInst = await resInst.json();
        const dataDesigns = await resDesigns.json();
        setInstallations(Array.isArray(dataInst) ? dataInst : []);
        setApprovedDesigns(Array.isArray(dataDesigns) ? dataDesigns : []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchSupData();
  }, [selectedSupervisor, isAuthenticated]);

  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    if (!selectedSupervisor) return;
    if (!enteredPassword) {
      setAuthError('Please enter your password.');
      return;
    }

    setVerifying(true);
    setAuthError('');
    try {
      const res = await fetch('/api/supervisor/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedSupervisor,
          password: enteredPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setAuthError('');
      } else {
        setAuthError(data.error || 'Authentication failed. Please verify your password.');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Network error verifying password.');
    } finally {
      setVerifying(false);
    }
  };

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

  const handleMarkNotificationRead = async (notifId) => {
    try {
      const res = await fetch('/api/supervisor-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notifId })
      });
      if (res.ok) {
        // Mark as read locally
        setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, read: true } : n));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupervisor) {
      alert('Please select your supervisor name.');
      return;
    }

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
        
        // Refresh submissions
        const resSub = await fetch('/api/supervisor-input');
        const dataSub = await resSub.json();
        if (Array.isArray(dataSub)) {
          const filtered = dataSub.filter(l => 
            l.supervisor === selectedSupervisor || 
            (l.supervisor && l.supervisor._id === selectedSupervisor)
          );
          setMySubmissions(filtered);
        }

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

  // Submission filters: Default only showing the most recent 3 sheets
  const visibleSubmissions = showAllSubmissions ? mySubmissions : mySubmissions.slice(0, 3);
  const hiddenSubmissionsCount = mySubmissions.length - visibleSubmissions.length;
  const unreadNotifications = notifications.filter(n => !n.read);

  const getApprovedDesignsForClient = (clientId) => {
    if (!clientId) return [];
    return approvedDesigns.filter(d => 
      d.approval_status === 'approved' &&
      (d.client?._id === clientId || d.client === clientId)
    );
  };

  const supervisorEmp = employees.find(e => e._id === selectedSupervisor);
  const supervisorName = supervisorEmp ? supervisorEmp.name : '';

  // Match installations by supervisor name (case-insensitive, trim) OR by employee name
  const myInstallations = installations.filter(i => {
    if (!supervisorName) return false;
    const instSup = (i.supervisor || '').toLowerCase().trim();
    const empName = supervisorName.toLowerCase().trim();
    return instSup === empName || instSup.includes(empName) || empName.includes(instSup);
  });

  // Handle document upload for a specific installation
  const handleDocUpload = async (instId, file) => {
    if (!file) return;
    setDocUploading(true);
    try {
      // 1. Upload file
      const fd = new FormData();
      fd.append('file', file);
      const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!upRes.ok) throw new Error('Upload failed');
      const { url } = await upRes.json();

      // 2. Attach to installation record
      const putRes = await fetch('/api/installation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: instId,
          add_document: { file_name: file.name, file_url: url }
        })
      });
      if (!putRes.ok) throw new Error('Failed to attach document');
      const updated = await putRes.json();
      setInstallations(prev => prev.map(i => i._id === instId ? updated : i));
      setUploadingDocFor(null);
    } catch (err) {
      alert(`Document upload error: ${err.message}`);
    } finally {
      setDocUploading(false);
    }
  };

  const handleRemoveDoc = async (instId, docIdx) => {
    if (!confirm('Remove this document?')) return;
    try {
      const res = await fetch('/api/installation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: instId, remove_document_index: docIdx })
      });
      if (!res.ok) throw new Error('Failed to remove document');
      const updated = await res.json();
      setInstallations(prev => prev.map(i => i._id === instId ? updated : i));
    } catch (err) {
      alert(`Remove error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1050px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            👷 Supervisor Daily Attendance Portal
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Enter hours and minutes worked per project/site. HR review console receives logs instantly.
          </p>
        </div>
        <Link href="/hr/supervisor-input" style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '700', textDecoration: 'underline' }}>
          Go to HR Supervisor Input Console ➡️
        </Link>
      </div>

      {/* Notifications Panel */}
      {selectedSupervisor && isAuthenticated && unreadNotifications.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '12px', color: '#b45309', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🔔 Notifications ({unreadNotifications.length} unread updates)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {unreadNotifications.map(notif => (
              <div key={notif._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fef08a', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-main)' }}>{notif.message}</span>
                <button
                  onClick={() => handleMarkNotificationRead(notif._id)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '700', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Mark read
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: message.type === 'success' ? '#15803d' : '#b91c1c',
          fontSize: '13px',
          fontWeight: '700'
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
              disabled={!isAuthenticated}
              max={new Date().toISOString().split('T')[0]}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '13px', background: !isAuthenticated ? '#f1f5f9' : '#fff', color: 'var(--text-main)', outline: 'none' }}
            />
          </div>
        </div>

        {!isAuthenticated && selectedSupervisor && (
          <div style={{
            background: '#fafafa',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '24px' }}>🔒</span>
            <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)' }}>
              Verification Required
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, maxWidth: '320px' }}>
              Please enter your supervisor password to unlock daily attendance and expense logs.
            </p>
            <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '320px', marginTop: '6px' }}>
              <input
                type="password"
                placeholder="Enter password..."
                value={enteredPassword}
                onChange={e => setEnteredPassword(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
              />
              <button
                type="button"
                onClick={handleVerifyPassword}
                disabled={verifying}
                style={{
                  padding: '8px 16px',
                  background: 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: verifying ? 'not-allowed' : 'pointer'
                }}
              >
                {verifying ? 'Verifying...' : 'Unlock'}
              </button>
            </div>
            {authError && (
              <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: '700', marginTop: '4px' }}>
                {authError}
              </span>
            )}
          </div>
        )}

        {isAuthenticated && (
          <>
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
          </>
        )}
      </form>

      {/* Site Installation Schedules */}
      {selectedSupervisor && isAuthenticated && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏗️ Scheduled Site Installations
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                Your assigned site schedules, approved plans, and project documents
              </p>
            </div>
            <span style={{ padding: '4px 12px', background: myInstallations.length > 0 ? '#ecfdf5' : '#f1f5f9', color: myInstallations.length > 0 ? '#10b981' : 'var(--text-muted)', borderRadius: '20px', fontSize: '11px', fontWeight: '800', border: `1px solid ${myInstallations.length > 0 ? '#bbf7d0' : '#e2e8f0'}` }}>
              {myInstallations.length} assignment{myInstallations.length !== 1 ? 's' : ''}
            </span>
          </div>

          {myInstallations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📅</div>
              <div style={{ fontWeight: '700', marginBottom: '4px' }}>No site installations scheduled</div>
              <div style={{ fontSize: '12px' }}>Your assigned installation schedules will appear here once scheduled by management.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {myInstallations.map(inst => {
                const clientId = inst.project?.client?._id || inst.project?.client;
                const designsList = getApprovedDesignsForClient(clientId);
                const isUploadingThis = uploadingDocFor === inst._id;
                const statusColors = {
                  scheduled: { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' },
                  in_progress: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
                  completed: { bg: '#ecfdf5', color: '#10b981', border: '#bbf7d0' }
                };
                const sc = statusColors[inst.status] || statusColors.scheduled;

                return (
                  <div key={inst._id} style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', background: '#fafafa' }}>

                    {/* Card Header */}
                    <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
                          🏗️ {inst.project?.name || 'Project Site'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <span>📍 {inst.location}</span>
                          {inst.project?.client?.name && <span>👤 {inst.project.client.name}</span>}
                          {inst.project?.client?.company && <span>🏢 {inst.project.client.company}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {inst.status?.replace('_', ' ')}
                        </span>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', background: inst.approval_status === 'approved' ? '#ecfdf5' : inst.approval_status === 'rejected' ? '#fef2f2' : '#fefce8', color: inst.approval_status === 'approved' ? '#10b981' : inst.approval_status === 'rejected' ? '#ef4444' : '#b45309', border: `1px solid ${inst.approval_status === 'approved' ? '#bbf7d0' : inst.approval_status === 'rejected' ? '#fecaca' : '#fde68a'}` }}>
                          CEO: {inst.approval_status?.toUpperCase() || 'PENDING'}
                        </span>
                      </div>
                    </div>

                    {/* Schedule Info Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0', borderBottom: '1px solid #f1f5f9' }}>
                      {[
                        { icon: '📅', label: 'Start Date', value: inst.start_date ? new Date(inst.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                        { icon: '🏁', label: 'End Date', value: inst.end_date ? new Date(inst.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                        { icon: '👷', label: 'Manpower', value: `${inst.manpower_used || 0} crew members` },
                        { icon: '⏱️', label: 'Hours Allocated', value: `${inst.hours_worked || 0} hours` },
                      ].map(({ icon, label, value }) => (
                        <div key={label} style={{ padding: '12px 16px', borderRight: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '3px' }}>{icon} {label}</div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Team Members */}
                    {inst.installation_team?.length > 0 && (
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>👥 Installation Team</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {inst.installation_team.map(emp => (
                            <span key={emp._id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#f1f5f9', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: '#475569', border: '1px solid #e2e8f0' }}>
                              👤 {emp.name} <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>({emp.designation || 'Worker'})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {inst.notes && (
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', background: '#fffbeb' }}>
                        <div style={{ fontSize: '10px', color: '#b45309', fontWeight: '700', textTransform: 'uppercase', marginBottom: '3px' }}>📝 Site Notes</div>
                        <div style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>{inst.notes}</div>
                      </div>
                    )}

                    {/* Approved 2D / 3D Plans */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>📐 Approved Layout Plans & 3D Renders</div>
                      {designsList.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No approved design plans found for this project.</div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {designsList.map(d => (
                            <div key={d._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
                              <span style={{ fontSize: '18px' }}>{d.design_type === '2d' ? '📐' : '🕶️'}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.file_name}>{d.file_name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{d.design_type === '2d' ? '2D Floor Layout' : '3D Perspective Render'}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                <a href={d.file_url} target="_blank" rel="noreferrer" style={{ padding: '4px 8px', background: '#eff6ff', color: '#3b82f6', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textDecoration: 'none', border: '1px solid #bfdbfe' }}>👁️ View</a>
                                <a href={d.file_url} download={d.file_name} target="_blank" rel="noreferrer" style={{ padding: '4px 8px', background: '#ecfdf5', color: '#10b981', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textDecoration: 'none', border: '1px solid #bbf7d0' }}>📥 Download</a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Site Documents Section */}
                    <div style={{ padding: '14px 16px', background: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>📁 Site Documents ({(inst.documents || []).length})</div>
                        <button
                          type="button"
                          onClick={() => setUploadingDocFor(isUploadingThis ? null : inst._id)}
                          style={{ padding: '5px 12px', background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary-border)', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          {isUploadingThis ? '✕ Cancel' : '+ Upload Document'}
                        </button>
                      </div>

                      {/* Upload Input */}
                      {isUploadingThis && (
                        <div style={{ marginBottom: '10px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--card-border)' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Select File to Upload (PDF, Image, DWG)</label>
                          <input
                            type="file"
                            accept="image/*,application/pdf,.dwg,.dxf,.doc,.docx,.xlsx,.xls"
                            disabled={docUploading}
                            onChange={e => e.target.files[0] && handleDocUpload(inst._id, e.target.files[0])}
                            style={{ fontSize: '12px', width: '100%' }}
                          />
                          {docUploading && <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '6px', fontWeight: '700' }}>⏳ Uploading document...</div>}
                        </div>
                      )}

                      {/* Document List */}
                      {(inst.documents || []).length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>No documents uploaded yet. Use the button above to attach site documents.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(inst.documents || []).map((doc, docIdx) => (
                            <div key={docIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                              <span style={{ fontSize: '16px' }}>
                                {doc.file_name?.match(/\.pdf$/i) ? '📄' : doc.file_name?.match(/\.(png|jpg|jpeg|webp|gif)$/i) ? '🖼️' : '📁'}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.file_name}>{doc.file_name}</div>
                                {doc.uploaded_at && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Uploaded: {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</div>}
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ padding: '4px 8px', background: '#eff6ff', color: '#3b82f6', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textDecoration: 'none', border: '1px solid #bfdbfe' }}>👁️ View</a>
                                <a href={doc.file_url} download={doc.file_name} target="_blank" rel="noreferrer" style={{ padding: '4px 8px', background: '#ecfdf5', color: '#10b981', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textDecoration: 'none', border: '1px solid #bbf7d0' }}>📥 Download</a>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDoc(inst._id, docIdx)}
                                  style={{ padding: '4px 8px', background: '#fef2f2', color: '#ef4444', borderRadius: '6px', fontSize: '10px', fontWeight: '700', border: '1px solid #fecaca', cursor: 'pointer' }}
                                >🗑️</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recent Submissions Log */}
      {selectedSupervisor && mySubmissions.length > 0 && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 16px 0', color: 'var(--text-main)' }}>
            📋 Your Logged Attendance Sheets
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleSubmissions.map(sub => {
              const formattedDate = new Date(sub.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <div key={sub._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '12px 16px', fontSize: '13px' }}>
                  <div>
                    <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>Log Date: {formattedDate}</span>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      👥 {sub.records?.length || 0} employee logs synced
                    </div>
                  </div>
                  <div>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      border: '1px solid currentColor',
                      background: sub.status === 'approved' ? '#ecfdf5' : sub.status === 'rejected' ? '#fef2f2' : '#fefce8',
                      color: sub.status === 'approved' ? '#10b981' : sub.status === 'rejected' ? '#ef4444' : '#b45309'
                    }}>
                      {sub.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hide/Show Toggle */}
          {hiddenSubmissionsCount > 0 && (
            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button
                type="button"
                onClick={() => setShowAllSubmissions(true)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                📂 Show Older Sheets ({hiddenSubmissionsCount} hidden)
              </button>
            </div>
          )}

          {showAllSubmissions && mySubmissions.length > 3 && (
            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button
                type="button"
                onClick={() => setShowAllSubmissions(false)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                📁 Collapse Older Sheets
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
