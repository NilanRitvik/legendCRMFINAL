'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SupervisorInputReview() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/supervisor-input');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

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
        body: JSON.stringify({ id, status, approval_notes: notes })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh logs list
        fetchLogs();
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
        Loading supervisor inputs review log...
      </div>
    );
  }

  return (
    <div style={{ padding: '28px', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            📋 Supervisor Inputs & Attendance Sign-offs
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Review, reject, or approve daily attendance sheets submitted by site supervisors
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
          {logs.map(log => {
            const dateStr = new Date(log.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
            const isExpanded = expandedId === log._id;

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
                }} onClick={() => setExpandedId(isExpanded ? null : log._id)}>
                  
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
                    {/* Status Badge */}
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

                    {/* Expand Chevron */}
                    <div style={{ fontSize: '16px', color: 'var(--text-muted)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                      ▶
                    </div>
                  </div>

                </div>

                {/* Expanded Details list */}
                {isExpanded && (
                  <div>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ color: 'var(--text-muted)', fontWeight: '700', borderBottom: '1px solid #f1f5f9' }}>
                            <th style={{ padding: '8px 12px' }}>Employee / Freelancer</th>
                            <th style={{ padding: '8px 12px', width: '100px', textAlign: 'center' }}>Hours</th>
                            <th style={{ padding: '8px 12px', width: '180px' }}>Project Linked</th>
                            <th style={{ padding: '8px 12px' }}>Supervisor Tasks & Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {log.records?.map((rec, rIdx) => (
                            <tr key={rIdx} style={{ borderBottom: rIdx < log.records.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                              <td style={{ padding: '8px 12px' }}>
                                <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{rec.employee?.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{rec.employee?.designation} · {rec.employee?.type}</div>
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '800', color: 'var(--primary)' }}>
                                {rec.hours_worked} hrs
                              </td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-main)', fontWeight: '600' }}>
                                {rec.project?.name || '—'}
                              </td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                                {rec.notes || '—'}
                              </td>
                            </tr>
                          ))}
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
                          {actioningId === log._id ? 'Syncing...' : '✅ Approve & Sync to Attendance'}
                        </button>
                      </div>
                    )}

                    {log.status !== 'pending' && log.approval_notes && (
                      <div style={{ padding: '12px 20px', background: '#f9fafb', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <strong>HR Rejection Reason:</strong> {log.approval_notes}
                      </div>
                    )}

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
