'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SupervisorInputReview() {
  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [edits, setEdits] = useState({}); // { [logId]: [{ employeeId, hours_worked, notes, projectId }] }
  const [showAllLogs, setShowAllLogs] = useState(false);

  const fetchLogsAndProjects = async () => {
    try {
      const res = await fetch('/api/supervisor-input');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);

      const resProj = await fetch('/api/projects');
      const dataProj = await resProj.json();
      setProjects(Array.isArray(dataProj) ? dataProj : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsAndProjects();
  }, []);

  const toggleExpand = (log) => {
    if (expandedId === log._id) {
      setExpandedId(null);
    } else {
      setExpandedId(log._id);
      // Initialize edits state if not present
      if (!edits[log._id]) {
        setEdits(prev => ({
          ...prev,
          [log._id]: log.records.map(r => ({
            employeeId: r.employee?._id,
            hours_worked: r.hours_worked,
            notes: r.notes || '',
            projectId: r.project?._id || ''
          }))
        }));
      }
    }
  };

  const handleEditChange = (logId, employeeId, field, value) => {
    setEdits(prev => {
      const nextLogs = [...(prev[logId] || [])];
      const matchIdx = nextLogs.findIndex(r => r.employeeId === employeeId);
      if (matchIdx !== -1) {
        nextLogs[matchIdx] = { ...nextLogs[matchIdx], [field]: value };
      }
      return { ...prev, [logId]: nextLogs };
    });
  };

  const handleAction = async (id, status) => {
    let notes = '';
    if (status === 'rejected') {
      notes = prompt('Enter rejection notes/reason:');
      if (notes === null) return; // cancelled
    }

    setActioningId(id);
    try {
      const res = await fetch('/api/supervisor-input', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          status, 
          approval_notes: notes,
          records: edits[id] || [] // Pass edited records
        })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh logs list
        fetchLogsAndProjects();
      } else {
        alert(`Failed to update log: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error updating log.');
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading supervisor inputs review console...
      </div>
    );
  }

  // Handle collapsible visibility: default showing only recent 5 submissions
  const visibleLogs = showAllLogs ? logs : logs.slice(0, 5);
  const hiddenCount = logs.length - visibleLogs.length;

  return (
    <div style={{ padding: '28px', maxWidth: '1150px', margin: '0 auto' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            📋 Supervisor Inputs & Attendance Sign-offs
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Verify hours directly in the rows below, modify if necessary, and approve to update payroll.
          </p>
        </div>
        <Link href="/supervisor" style={{
          padding: '8px 16px',
          background: 'rgba(0,0,0,0.03)',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '700',
          color: 'var(--text-main)',
          textDecoration: 'none'
        }}>
          👷 Open Supervisor Portal ➡️
        </Link>
      </div>

      {logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-light)', border: '2px dashed var(--card-border)', borderRadius: '12px', background: '#fff' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
          <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-muted)' }}>All clear! No supervisor attendance sheets logged yet.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {visibleLogs.map(log => {
            const dateStr = new Date(log.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
            const isExpanded = expandedId === log._id;
            const logEdits = edits[log._id] || [];

            return (
              <div key={log._id} style={{
                background: '#fff',
                borderRadius: '12px',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
                transition: 'all 0.2s'
              }}>
                
                {/* Log Header Row */}
                <div style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f9fafb',
                  borderBottom: isExpanded ? '1px solid var(--card-border)' : 'none',
                  flexWrap: 'wrap',
                  gap: '12px',
                  cursor: 'pointer'
                }} onClick={() => toggleExpand(log)}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '20px' }}>👷</div>
                    <div>
                      <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>
                        Supervisor: {log.supervisor?.name || 'Unknown Supervisor'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        📅 Log Date: {dateStr} · 👥 {log.records?.length || 0} employees marked
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '5px',
                      fontSize: '10px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      border: '1px solid currentColor',
                      background: log.status === 'approved' ? '#ecfdf5' : log.status === 'rejected' ? '#fef2f2' : '#fefce8',
                      color: log.status === 'approved' ? '#10b981' : log.status === 'rejected' ? '#ef4444' : '#b45309'
                    }}>
                      {log.status.toUpperCase()}
                    </span>

                    <div style={{ fontSize: '16px', color: 'var(--text-muted)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                      ▶
                    </div>
                  </div>

                </div>

                {/* Expanded Details / Editor */}
                {isExpanded && (
                  <div>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ color: 'var(--text-muted)', fontWeight: '700', borderBottom: '1px solid #f1f5f9' }}>
                            <th style={{ padding: '8px 12px' }}>Employee / Freelancer</th>
                            <th style={{ padding: '8px 12px', width: '120px', textAlign: 'center' }}>Hours</th>
                            <th style={{ padding: '8px 12px', width: '220px' }}>Project Linked</th>
                            <th style={{ padding: '8px 12px' }}>Supervisor Tasks & Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {log.records?.map((rec, rIdx) => {
                            const empId = rec.employee?._id;
                            const recEdit = logEdits.find(e => e.employeeId === empId) || {
                              hours_worked: rec.hours_worked,
                              notes: rec.notes || '',
                              projectId: rec.project?._id || ''
                            };
                            const isPending = log.status === 'pending';

                            return (
                              <tr key={rIdx} style={{ borderBottom: rIdx < log.records.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <td style={{ padding: '8px 12px' }}>
                                  <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{rec.employee?.name}</div>
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{rec.employee?.designation} · {rec.employee?.type}</div>
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  {isPending ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="24"
                                      step="0.5"
                                      value={recEdit.hours_worked}
                                      onChange={e => handleEditChange(log._id, empId, 'hours_worked', parseFloat(e.target.value) || 0)}
                                      style={{
                                        width: '80px',
                                        padding: '5px',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        textAlign: 'center',
                                        fontWeight: '800',
                                        outline: 'none'
                                      }}
                                    />
                                  ) : (
                                    <span style={{ fontWeight: '800', color: 'var(--primary)' }}>
                                      {(() => {
                                        const totalDec = rec.hours_worked || 0;
                                        const h = Math.floor(totalDec);
                                        const m = Math.round((totalDec - h) * 60);
                                        return m > 0 ? `${h}h ${m}m` : `${h}h`;
                                      })()}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                  {isPending ? (
                                    <select
                                      value={recEdit.projectId}
                                      onChange={e => handleEditChange(log._id, empId, 'projectId', e.target.value)}
                                      style={{
                                        width: '100%',
                                        padding: '5px 8px',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        outline: 'none',
                                        background: '#fff'
                                      }}
                                    >
                                      <option value="">-- General / Office --</option>
                                      {projects.map(p => (
                                        <option key={p._id} value={p._id}>{p.name}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>
                                      {rec.project?.name || '—'}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                  {isPending ? (
                                    <input
                                      type="text"
                                      value={recEdit.notes}
                                      onChange={e => handleEditChange(log._id, empId, 'notes', e.target.value)}
                                      style={{
                                        width: '100%',
                                        padding: '5px 10px',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        outline: 'none'
                                      }}
                                    />
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      {rec.notes || '—'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Action Panel */}
                    {log.status === 'pending' && (
                      <div style={{ padding: '12px 20px', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                          disabled={actioningId === log._id}
                          onClick={() => handleAction(log._id, 'rejected')}
                          style={{
                            padding: '6px 14px',
                            background: '#fff',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700',
                            color: '#ef4444',
                            cursor: 'pointer'
                          }}
                        >
                          ❌ Reject Sheet
                        </button>
                        <button
                          disabled={actioningId === log._id}
                          onClick={() => handleAction(log._id, 'approved')}
                          style={{
                            padding: '6px 18px',
                            background: 'var(--primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {actioningId === log._id ? 'Syncing...' : '✅ Save, Approve & Sync'}
                        </button>
                      </div>
                    )}

                    {log.status !== 'pending' && log.approval_notes && (
                      <div style={{ padding: '12px 20px', background: '#f9fafb', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <strong>HR Status Note:</strong> {log.approval_notes}
                      </div>
                    )}

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Hide/Show Toggle at the bottom */}
      {hiddenCount > 0 && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => setShowAllLogs(true)}
            style={{
              padding: '8px 24px',
              background: '#fff',
              border: '1px solid var(--card-border)',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            📂 Load Older Logs ({hiddenCount} hidden)
          </button>
        </div>
      )}

      {showAllLogs && logs.length > 5 && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => setShowAllLogs(false)}
            style={{
              padding: '8px 24px',
              background: '#fff',
              border: '1px solid var(--card-border)',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            📁 Collapse Older Logs
          </button>
        </div>
      )}

    </div>
  );
}
