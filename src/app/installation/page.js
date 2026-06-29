'use client';

import { useState, useEffect } from 'react';

export default function InstallationPage() {
  const [installations, setInstallations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [approvedDesigns, setApprovedDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'schedule'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({
    project: '',
    installation_team: [],
    location: '',
    start_date: '',
    end_date: '',
    manpower_used: 0,
    hours_worked: 0,
    supervisor: '',
    status: 'scheduled',
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [resInst, resProj, resEmp, resDesigns] = await Promise.all([
        fetch('/api/installation'),
        fetch('/api/projects'),
        fetch('/api/hr/employees?status=active'),
        fetch('/api/designing')
      ]);

      const [dataInst, dataProj, dataEmp, dataDesigns] = await Promise.all([
        resInst.json(),
        resProj.json(),
        resEmp.json(),
        resDesigns.json()
      ]);

      setInstallations(Array.isArray(dataInst) ? dataInst : []);
      setProjects(Array.isArray(dataProj) ? dataProj : []);
      setEmployees(Array.isArray(dataEmp) ? dataEmp : []);
      setApprovedDesigns(Array.isArray(dataDesigns) ? dataDesigns : []);
    } catch (err) {
      console.error('Error loading installation datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      project: '',
      installation_team: [],
      location: '',
      start_date: '',
      end_date: '',
      manpower_used: 0,
      hours_worked: 0,
      supervisor: '',
      status: 'scheduled',
      notes: ''
    });
    setActiveTab('schedule');
  };

  const handleOpenEdit = (inst) => {
    setEditingId(inst._id);
    setForm({
      project: inst.project?._id || '',
      installation_team: inst.installation_team?.map(e => e._id) || [],
      location: inst.location || '',
      start_date: inst.start_date ? inst.start_date.substring(0, 10) : '',
      end_date: inst.end_date ? inst.end_date.substring(0, 10) : '',
      manpower_used: inst.manpower_used || 0,
      hours_worked: inst.hours_worked || 0,
      supervisor: inst.supervisor || '',
      status: inst.status || 'scheduled',
      notes: inst.notes || ''
    });
    setActiveTab('schedule');
  };

  const handleTeamCheckboxChange = (empId) => {
    const isChecked = form.installation_team.includes(empId);
    if (isChecked) {
      setForm({ ...form, installation_team: form.installation_team.filter(id => id !== empId) });
    } else {
      setForm({ ...form, installation_team: [...form.installation_team, empId] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check approval block
    if (editingId) {
      const selectedInstallation = installations.find(i => i._id === editingId);
      if (selectedInstallation && selectedInstallation.approval_status !== 'approved' && form.status !== 'scheduled') {
        alert('Installation site activity cannot be set to In Progress or Completed until it gets CEO Approval!');
        return;
      }
    } else {
      if (form.status !== 'scheduled') {
        alert('New installations must be set as Scheduled initially. They require CEO Approval before site work can begin.');
        return;
      }
    }

    try {
      const url = editingId ? `/api/installation/${editingId}` : '/api/installation';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setActiveTab('history');
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save installation entry');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this installation dispatch?')) return;
    try {
      const res = await fetch(`/api/installation/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getApprovedDesignsForClient = (clientId) => {
    if (!clientId) return [];
    return approvedDesigns.filter(d => 
      d.approval_status === 'approved' &&
      (d.client?._id === clientId || d.client === clientId)
    );
  };

  const statusColors = {
    scheduled: { bg: '#eff6ff', c: '#3b82f6', border: '#bfdbfe' },
    in_progress: { bg: '#fffbeb', c: '#d97706', border: '#fef08a' },
    completed: { bg: '#ecfdf5', c: '#10b981', border: '#a7f3d0' }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1300px' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>🔧 Site Installation Workspace</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Assign installation teams, track manpower schedules, and monitor site project execution logs</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="date-presets" style={{ width: 'fit-content', marginBottom: '28px' }}>
        <button className={`preset-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          📜 Installation History
        </button>
        <button className={`preset-btn ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => handleOpenCreate()}>
          ➕ {editingId ? 'Edit Installation' : 'Schedule Installation'}
        </button>
      </div>

      {/* 1. History Tab */}
      {activeTab === 'history' && (
        <div>
          {loading ? (
            <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading installation logs...</div>
          ) : installations.length === 0 ? (
            <div className="panel" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)', margin: 0 }}>
              <div style={{ fontSize: '50px', marginBottom: '16px' }}>🔧</div>
              <h3 style={{ fontWeight: '800', color: 'var(--text-main)', margin: '0 0 8px 0' }}>No Installations Dispatched</h3>
              <p style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto 20px auto' }}>Assign installation technicians and supervisors to active projects to begin tracking site deployments.</p>
              <button className="btn btn-primary" onClick={handleOpenCreate}>Schedule First Site Installation</button>
            </div>
          ) : (
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h2 className="panel-title">Active Site Installations</h2>
                <input
                  type="text"
                  className="form-control"
                  placeholder="🔍 Search installations..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ maxWidth: '240px', padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
                />
              </div>
              
              <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto', margin: 0 }}>
                <table className="table-list" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Site Location</th>
                      <th>Supervisor</th>
                      <th>Timeline</th>
                      <th>Technician Team</th>
                      <th style={{ textAlign: 'center' }}>Manpower</th>
                      <th style={{ textAlign: 'center' }}>Hours Worked</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th>CEO Approval</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = installations.filter(inst => {
                        const projName = inst.project?.name || '';
                        const clientComp = inst.project?.client?.company || '';
                        const location = inst.location || '';
                        const supervisor = inst.supervisor || '';
                        const notesStr = inst.notes || '';
                        const query = searchQuery.toLowerCase();
                        return !searchQuery ||
                          projName.toLowerCase().includes(query) ||
                          clientComp.toLowerCase().includes(query) ||
                          location.toLowerCase().includes(query) ||
                          supervisor.toLowerCase().includes(query) ||
                          notesStr.toLowerCase().includes(query);
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>
                              No matching installations found.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map(inst => (
                        <tr key={inst._id}>
                          <td>
                            <strong style={{ color: 'var(--text-main)' }}>{inst.project?.name || 'Unknown'}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Client: {inst.project?.client?.company || 'N/A'}
                            </div>
                            {/* Approved Designs for Client */}
                            {(() => {
                              const client_id = inst.project?.client?._id || inst.project?.client;
                              const designsList = getApprovedDesignsForClient(client_id);
                              if (designsList.length > 0) {
                                return (
                                  <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {designsList.map(d => (
                                      <a
                                        key={d._id}
                                        href={d.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          fontSize: '10px',
                                          fontWeight: '700',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          backgroundColor: '#eff6ff',
                                          color: '#2563eb',
                                          textDecoration: 'none',
                                          border: '1px solid #bfdbfe',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px'
                                        }}
                                        title={d.file_name}
                                      >
                                        📥 {d.design_type.toUpperCase()}
                                      </a>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </td>
                          <td>{inst.location}</td>
                          <td>
                            <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>👤 {inst.supervisor}</span>
                          </td>
                          <td>
                            <div style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                              📅 {new Date(inst.start_date).toLocaleDateString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              to {new Date(inst.end_date).toLocaleDateString('en-IN')}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
                              {inst.installation_team?.length > 0 ? (
                                inst.installation_team.map(emp => (
                                  <span key={emp._id} style={{ fontSize: '10px', backgroundColor: '#f1f5f9', color: '#334155', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                    {emp.name}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--text-light)', fontStyle: 'italic' }}>No workers assigned</span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '700' }}>
                            {inst.manpower_used} Pax
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--primary)' }}>
                            {inst.hours_worked} Hrs
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ 
                              padding: '3px 10px', 
                              borderRadius: '20px', 
                              fontSize: '11px', 
                              fontWeight: '800', 
                              textTransform: 'uppercase',
                              backgroundColor: statusColors[inst.status]?.bg, 
                              color: statusColors[inst.status]?.c,
                              border: `1px solid ${statusColors[inst.status]?.border}`
                            }}>
                              {inst.status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '800',
                              display: 'inline-block',
                              background: inst.approval_status === 'approved' ? '#ecfdf5' : inst.approval_status === 'rejected' ? '#fef2f2' : '#fefce8',
                              color: inst.approval_status === 'approved' ? '#10b981' : inst.approval_status === 'rejected' ? '#ef4444' : '#b45309',
                              border: '1px solid currentColor'
                            }}>
                              {inst.approval_status ? inst.approval_status.toUpperCase() : 'PENDING'}
                            </span>
                            {inst.approval_notes && (
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
                                💬 {inst.approval_notes}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => handleOpenEdit(inst)} style={{ padding: '5px 9px' }}>
                                Edit
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(inst._id)} style={{ padding: '5px 9px' }}>
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Schedule Tab */}
      {activeTab === 'schedule' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <form className="panel" onSubmit={handleSubmit} style={{ margin: 0 }}>
            <div className="panel-header">
              <h2 className="panel-title">{editingId ? '📝 Edit Site Installation' : '➕ Schedule Site Installation'}</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px 0' }}>
              {/* Project select */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Select Project</label>
                <select 
                  className="form-control" required
                  value={form.project} onChange={e => setForm({ ...form, project: e.target.value })}
                >
                  <option value="">-- Select Active Project --</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.client?.company})</option>
                  ))}
                </select>
              </div>

              {form.project && (() => {
                const selectedProjObj = projects.find(p => p._id === form.project);
                const clientId = selectedProjObj?.client?._id || selectedProjObj?.client;
                const projectDesigns = getApprovedDesignsForClient(clientId);
                if (projectDesigns.length === 0) {
                  return (
                    <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '12px', color: '#dc2626', fontWeight: '500' }}>
                      ⚠️ No approved 2D/3D design plans found for this client. Please upload and approve designs in the 2D & 3D panel first.
                    </div>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      📐 Linked Approved Designs & Plans
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {projectDesigns.map(d => (
                        <div key={d._id} style={{ background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '12px', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }} title={d.file_name}>
                              {d.file_name}
                            </strong>
                            <span className={`badge badge-${d.design_type === '2d' ? 'info' : 'warning'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                              {d.design_type === '2d' ? '2D Layout' : '3D Render'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                            <a
                              href={d.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '3px 8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center' }}
                            >
                              👁️ View
                            </a>
                            <a
                              href={d.file_url}
                              download={d.file_name}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '3px 8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center' }}
                            >
                              📥 Download
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Location Entry */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Site Location (Manual Entry)</label>
                <input 
                  type="text" className="form-control" required placeholder="E.g., Sector 15, Block B, Gurgaon Studio Suite"
                  value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                />
              </div>

              {/* Start & End dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Start Date</label>
                  <input 
                    type="date" className="form-control" required
                    value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>End Date</label>
                  <input 
                    type="date" className="form-control" required
                    value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Supervisor & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Supervisor Name</label>
                  <select 
                    className="form-control" required
                    value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })}
                  >
                    <option value="">-- Select Supervisor --</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp.name}>{emp.name} ({emp.designation})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Current Status</label>
                  <select 
                    className="form-control" required
                    value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Manpower & Hours */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Total Manpower Used (Pax)</label>
                  <input 
                    type="number" className="form-control" min="0"
                    value={form.manpower_used} onChange={e => setForm({ ...form, manpower_used: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Total Hours Worked (Hrs)</label>
                  <input 
                    type="number" className="form-control" min="0"
                    value={form.hours_worked} onChange={e => setForm({ ...form, hours_worked: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Team selection checklist */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Select Installation Team Members</label>
                <div style={{ 
                  maxHeight: '130px', 
                  overflowY: 'auto', 
                  border: '1px solid var(--card-border)', 
                  borderRadius: '8px', 
                  padding: '8px 12px',
                  backgroundColor: '#fbfbfb',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px'
                }}>
                  {employees.map(emp => (
                    <label key={emp._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', margin: 0, padding: '2px 0' }}>
                      <input 
                        type="checkbox" 
                        checked={form.installation_team.includes(emp._id)} 
                        onChange={() => handleTeamCheckboxChange(emp._id)}
                      />
                      <span>{emp.name}</span>
                    </label>
                  ))}
                  {employees.length === 0 && (
                    <div style={{ color: 'var(--text-light)', fontStyle: 'italic', gridColumn: 'span 2', fontSize: '12px' }}>No active employees found.</div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Remarks / Notes</label>
                <textarea 
                  className="form-control" style={{ minHeight: '60px', fontSize: '13px' }}
                  placeholder="Details about site entry permits, specific equipment required, client timing restrictions..."
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>

            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('history')}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Save Changes' : 'Assign Installation Work'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
