'use client';
import { useState, useEffect } from 'react';

const PHASES = ['design', 'carpentry', 'assembly', 'installation', 'handover'];
const THEMES = ['Modern Minimalist', 'Scandinavian', 'Industrial Loft', 'Classic Victorian', 'Japandi Harmony', 'Bohemian Chic', 'Art Deco Luxury'];
const GEMINI_MODEL = 'gemini-2.5-flash';

export default function DesignStudio() {
  const [activeTab, setActiveTab] = useState('boq'); // 'boq' | 'gantt' | 'warranty' | 'ai'
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [materials, setMaterials] = useState([]);
  
  // Data lists
  const [boq, setBoq] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [warranties, setWarranties] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Milestone Form
  const [milestoneForm, setMilestoneForm] = useState({
    title: '', phase: 'design', start_date: '', end_date: '', progress: 0, notes: ''
  });

  // Warranty Form
  const [warrantyForm, setWarrantyForm] = useState({
    item_name: '', brand: '', serial_number: '', warranty_years: 1, start_date: '', notes: ''
  });

  // AI Sandbox Form & Output
  const [aiForm, setAiForm] = useState({
    theme: 'Japandi Harmony', colors: 'Warm Oaks, Beige, and Soft Sage', room_type: 'Kitchen'
  });
  const [aiOutput, setAiOutput] = useState('');

  useEffect(() => {
    fetchStudioData();
  }, []);

  const fetchStudioData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/design-studio');
      const data = await res.json();
      setProjects(data.projects || []);
      setMaterials(data.materials || []);
      
      if (data.projects && data.projects.length > 0) {
        setSelectedProjectId(data.projects[0]._id);
        fetchProjectSpecificData(data.projects[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchProjectSpecificData = async (projId) => {
    try {
      const res = await fetch(`/api/design-studio?projectId=${projId}`);
      const data = await res.json();
      
      // Handle BOQ
      if (data.boqs && data.boqs.length > 0) {
        setBoq(data.boqs[0]);
      } else {
        // Create an empty skeleton BOQ
        setBoq({
          project: projId,
          rooms: [
            { room_name: 'Living Room', items: [{ name: 'TV Unit Cabinetry', material: '', quantity: 1, unit: 'pcs', rate: 12000, markup: 10, total: 13200 }] }
          ],
          grand_total: 13200,
          status: 'draft'
        });
      }

      setMilestones(data.milestones || []);
      setWarranties(data.warranties || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProjectChange = (e) => {
    const projId = e.target.value;
    setSelectedProjectId(projId);
    fetchProjectSpecificData(projId);
  };

  // ──────── BOQ FUNCTIONS ────────
  const addRoom = () => {
    if (!boq) return;
    const updatedRooms = [...boq.rooms, { room_name: 'New Room', items: [] }];
    setBoq({ ...boq, rooms: updatedRooms });
  };

  const removeRoom = (roomIndex) => {
    if (!boq) return;
    const updatedRooms = boq.rooms.filter((_, idx) => idx !== roomIndex);
    recalculateBoqTotal(updatedRooms);
  };

  const addBoqItem = (roomIndex) => {
    if (!boq) return;
    const updatedRooms = [...boq.rooms];
    updatedRooms[roomIndex].items.push({
      name: 'New Custom Item',
      material: '',
      quantity: 1,
      unit: 'pcs',
      rate: 0,
      markup: 0,
      total: 0
    });
    setBoq({ ...boq, rooms: updatedRooms });
  };

  const removeBoqItem = (roomIndex, itemIndex) => {
    if (!boq) return;
    const updatedRooms = [...boq.rooms];
    updatedRooms[roomIndex].items = updatedRooms[roomIndex].items.filter((_, idx) => idx !== itemIndex);
    recalculateBoqTotal(updatedRooms);
  };

  const updateBoqItemField = (roomIndex, itemIndex, field, value) => {
    if (!boq) return;
    const updatedRooms = [...boq.rooms];
    const item = { ...updatedRooms[roomIndex].items[itemIndex] };

    // Handle updates
    if (field === 'material') {
      item.material = value;
      const matStock = materials.find(m => m.name === value);
      if (matStock) {
        item.rate = matStock.last_rate || 0;
        item.unit = matStock.unit || 'pcs';
      }
    } else {
      item[field] = value;
    }

    // Calculations
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const markupPct = Number(item.markup) || 0;
    const cost = qty * rate;
    item.total = Math.round(cost + (cost * (markupPct / 100)));

    updatedRooms[roomIndex].items[itemIndex] = item;
    recalculateBoqTotal(updatedRooms);
  };

  const updateRoomName = (roomIndex, newName) => {
    if (!boq) return;
    const updatedRooms = [...boq.rooms];
    updatedRooms[roomIndex].room_name = newName;
    setBoq({ ...boq, rooms: updatedRooms });
  };

  const recalculateBoqTotal = (roomsList) => {
    let grand = 0;
    roomsList.forEach(r => {
      r.items.forEach(i => {
        grand += (i.total || 0);
      });
    });
    setBoq({ ...boq, rooms: roomsList, grand_total: grand });
  };

  const handleSaveBOQ = async () => {
    if (!selectedProjectId) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/design-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_boq',
          project: selectedProjectId,
          rooms: boq.rooms,
          grand_total: boq.grand_total,
          status: boq.status
        })
      });
      if (res.ok) {
        alert('BOQ saved successfully!');
        fetchProjectSpecificData(selectedProjectId);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save BOQ');
      }
    } catch {
      alert('Error saving BOQ');
    }
    setActionLoading(false);
  };

  // ──────── GANTT & MILESTONES FUNCTIONS ────────
  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/design-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_milestone',
          project: selectedProjectId,
          ...milestoneForm
        })
      });

      if (res.ok) {
        setMilestoneForm({ title: '', phase: 'design', start_date: '', end_date: '', progress: 0, notes: '' });
        fetchProjectSpecificData(selectedProjectId);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create milestone');
      }
    } catch {
      alert('Error creating milestone');
    }
    setActionLoading(false);
  };

  const handleUpdateMilestoneProgress = async (id, newProgress, newStatus) => {
    try {
      const res = await fetch('/api/design-studio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_milestone',
          id,
          progress: Number(newProgress),
          status: newStatus
        })
      });
      if (res.ok) {
        fetchProjectSpecificData(selectedProjectId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMilestone = async (id) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;
    try {
      const res = await fetch(`/api/design-studio?id=${id}&type=milestone`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchProjectSpecificData(selectedProjectId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ──────── WARRANTY FUNCTIONS ────────
  const handleAddWarranty = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/design-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_warranty',
          project: selectedProjectId,
          ...warrantyForm
        })
      });

      if (res.ok) {
        setWarrantyForm({ item_name: '', brand: '', serial_number: '', warranty_years: 1, start_date: '', notes: '' });
        fetchProjectSpecificData(selectedProjectId);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to register warranty');
      }
    } catch {
      alert('Error registering warranty');
    }
    setActionLoading(false);
  };

  const handleUpdateWarrantyStatus = async (id, newStatus) => {
    try {
      const res = await fetch('/api/design-studio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_warranty',
          id,
          status: newStatus
        })
      });
      if (res.ok) {
        fetchProjectSpecificData(selectedProjectId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWarranty = async (id) => {
    if (!confirm('Are you sure you want to delete this warranty?')) return;
    try {
      const res = await fetch(`/api/design-studio?id=${id}&type=warranty`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchProjectSpecificData(selectedProjectId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ──────── AI SANDBOX SUGGESTIONS ────────
  const handleGetAISuggestions = async () => {
    if (!selectedProjectId) return;
    setActionLoading(true);
    setAiOutput('⏳ Thinking... Consulting design models...');

    try {
      const res = await fetch('/api/design-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ai_suggest',
          theme: aiForm.theme,
          colors: aiForm.colors,
          room_type: aiForm.room_type
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAiOutput(data.reply || 'No response returned.');
      } else {
        setAiOutput(`⚠️ Error: ${data.error || 'Could not reach AI services. Please verify your Gemini API key.'}`);
      }
    } catch {
      setAiOutput('⚠️ Network error connecting to AI Services.');
    }
    setActionLoading(false);
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)' }}>
      
      {/* ── HEADER & PROJECT SELECTOR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '28px', paddingBottom: '16px', borderBottom: '1px solid var(--card-border)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px', color: 'var(--primary)' }}>📐</span>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Design & BOQ Board</h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Manage room-wise Bill of Quantities (BOQ), milestones tracking, material warranties, and AI palette suggestions.
          </p>
        </div>

        {/* Dropdown Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Selected Project:</label>
          <select
            className="form-control"
            value={selectedProjectId}
            onChange={handleProjectChange}
            style={{ padding: '10px 16px', fontSize: '13px', borderRadius: '8px', border: '1.5px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-main)', outline: 'none', fontWeight: '700' }}
          >
            {projects.map(p => (
              <option key={p._id} value={p._id}>{p.name} ({p.client?.company})</option>
            ))}
            {projects.length === 0 && (
              <option value="">-- No Active Projects --</option>
            )}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0', fontSize: '16px', color: 'var(--text-muted)' }}>
          Loading design modules...
        </div>
      ) : (
        selectedProjectId && (
          <div>
            {/* ── MODULE TABS ── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px' }}>
              <button onClick={() => setActiveTab('boq')} style={tabStyle(activeTab === 'boq')}>📐 Room-Wise BOQ</button>
              <button onClick={() => setActiveTab('gantt')} style={tabStyle(activeTab === 'gantt')}>📅 Milestone Gantt</button>
              <button onClick={() => setActiveTab('warranty')} style={tabStyle(activeTab === 'warranty')}>🔒 Material Warranty</button>
              <button onClick={() => setActiveTab('ai')} style={tabStyle(activeTab === 'ai')}>🎨 AI Design Sandbox</button>
            </div>

            {/* ── TAB 1: BOQ BUILDER ── */}
            {activeTab === 'boq' && boq && (
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text-main)' }}>Interactive Bill of Quantities (BOQ)</h2>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Map material requirements room-by-room and calculate margins.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      className="form-control"
                      value={boq.status}
                      onChange={e => setBoq({ ...boq, status: e.target.value })}
                      style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '8px' }}
                    >
                      <option value="draft">Draft</option>
                      <option value="approved">Approved</option>
                      <option value="active">Active Execution</option>
                    </select>
                    <button onClick={addRoom} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>+ Add Room</button>
                    <button onClick={handleSaveBOQ} className="btn btn-primary" disabled={actionLoading} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: '700' }}>
                      {actionLoading ? 'Saving...' : '💾 Save BOQ'}
                    </button>
                  </div>
                </div>

                {/* Rooms List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {boq.rooms.map((room, roomIdx) => (
                    <div key={roomIdx} style={{ border: '1.5px solid var(--card-border)', borderRadius: '12px', padding: '16px', backgroundColor: '#fcfcfc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <input
                          type="text"
                          value={room.room_name}
                          onChange={e => updateRoomName(roomIdx, e.target.value)}
                          style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', border: 'none', borderBottom: '1.5px solid transparent', background: 'transparent', outline: 'none', width: '200px' }}
                          onFocus={e => e.target.style.borderBottomColor = 'var(--primary)'}
                          onBlur={e => e.target.style.borderBottomColor = 'transparent'}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => addBoqItem(roomIdx)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>+ Add Item</button>
                          <button onClick={() => removeRoom(roomIdx)} className="btn" style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444', background: '#fee2e2', border: '1px solid #fecaca' }}>Delete Room</button>
                        </div>
                      </div>

                      {/* Items Table */}
                      <div style={{ overflowX: 'auto', width: '100%', marginTop: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '850px', tableLayout: 'fixed' }}>
                          <colgroup>
                            <col style={{ width: '25%' }} />
                            <col style={{ width: '22%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '11%' }} />
                            <col style={{ width: '4%' }} />
                          </colgroup>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #cbd5e1', color: 'var(--text-muted)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 4px' }}>Item Description</th>
                              <th style={{ padding: '8px 4px' }}>Link Material (Inventory)</th>
                              <th style={{ padding: '8px 4px', textAlign: 'center' }}>Qty</th>
                              <th style={{ padding: '8px 4px', textAlign: 'center' }}>Unit</th>
                              <th style={{ padding: '8px 4px', textAlign: 'right' }}>Unit Price (₹)</th>
                              <th style={{ padding: '8px 4px', textAlign: 'center' }}>Markup (%)</th>
                              <th style={{ padding: '8px 4px', textAlign: 'right' }}>Total (₹)</th>
                              <th style={{ padding: '8px 4px', textAlign: 'center' }} />
                            </tr>
                          </thead>
                          <tbody>
                            {room.items.map((item, itemIdx) => (
                              <tr key={itemIdx} style={{ borderBottom: '1px dotted #e2e8f0' }}>
                                <td style={{ padding: '6px 4px' }}>
                                  <input type="text" className="form-control" value={item.name} onChange={e => updateBoqItemField(roomIdx, itemIdx, 'name', e.target.value)} style={{ padding: '6px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }} />
                                </td>
                                <td style={{ padding: '6px 4px' }}>
                                  <select className="form-control" value={item.material} onChange={e => updateBoqItemField(roomIdx, itemIdx, 'material', e.target.value)} style={{ padding: '6px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}>
                                    <option value="">-- Custom Material --</option>
                                    {materials.map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                                  <input type="number" className="form-control" value={item.quantity} onChange={e => updateBoqItemField(roomIdx, itemIdx, 'quantity', e.target.value)} style={{ padding: '6px', textAlign: 'center', fontSize: '12px', width: '100%', boxSizing: 'border-box' }} />
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                                  <input type="text" className="form-control" value={item.unit} onChange={e => updateBoqItemField(roomIdx, itemIdx, 'unit', e.target.value)} style={{ padding: '6px', textAlign: 'center', fontSize: '12px', width: '100%', boxSizing: 'border-box' }} />
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                                  <input type="number" className="form-control" value={item.rate} onChange={e => updateBoqItemField(roomIdx, itemIdx, 'rate', e.target.value)} style={{ padding: '6px', textAlign: 'right', fontSize: '12px', width: '100%', boxSizing: 'border-box' }} />
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                                  <input type="number" className="form-control" value={item.markup} onChange={e => updateBoqItemField(roomIdx, itemIdx, 'markup', e.target.value)} style={{ padding: '6px', textAlign: 'center', fontSize: '12px', width: '100%', boxSizing: 'border-box' }} />
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: '800', color: 'var(--text-main)' }}>
                                  ₹{(item.total || 0).toLocaleString()}
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                                  <button type="button" onClick={() => removeBoqItem(roomIdx, itemIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: 'var(--background)', border: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-muted)' }}>Estimated BOQ Grand Total:</span>
                  <strong style={{ fontSize: '20px', color: 'var(--primary)', fontWeight: '900' }}>₹{boq.grand_total.toLocaleString()}</strong>
                </div>
              </div>
            )}

            {/* ── TAB 2: MILESTONES GANTT ── */}
            {activeTab === 'gantt' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                
                {/* Visual Gantt Chart List */}
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '16px' }}>Project Phase Timelines (Gantt)</h2>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {milestones.map(m => (
                      <div key={m._id} style={{ padding: '14px', border: '1px solid var(--card-border)', borderRadius: '10px', background: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>{m.title}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Phase: <strong style={{ textTransform: 'capitalize' }}>{m.phase}</strong> · Timeline: {new Date(m.start_date).toLocaleDateString('en-IN')} - {new Date(m.end_date).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                          <button onClick={() => handleDeleteMilestone(m._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                        </div>

                        {/* Slider Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', width: '32px' }}>{m.progress}%</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={m.progress}
                            onChange={e => handleUpdateMilestoneProgress(m._id, e.target.value, e.target.value === '100' ? 'completed' : 'in_progress')}
                            style={{ flex: 1, accentColor: 'var(--primary)' }}
                          />
                          <span style={{
                            fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px',
                            background: m.status === 'completed' ? 'var(--success-light)' : m.status === 'in_progress' ? 'var(--warning-light)' : '#cbd5e1',
                            color: m.status === 'completed' ? 'var(--success)' : m.status === 'in_progress' ? 'var(--warning)' : '#64748b'
                          }}>
                            {m.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                    {milestones.length === 0 && (
                      <div style={{ padding: '40px 20px', border: '1px dashed var(--card-border)', borderRadius: '10px', textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '12px' }}>
                        No milestones created yet for this project.
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Milestone Form */}
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '14px' }}>Add Phase Milestone</h2>
                  
                  <form onSubmit={handleAddMilestone} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '11px', fontWeight: '800' }}>Milestone Title</label>
                      <input type="text" className="form-control" required placeholder="E.g. 3D Carpentry Renders Final approval"
                        value={milestoneForm.title} onChange={e => setMilestoneForm({ ...milestoneForm, title: e.target.value })} />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '11px', fontWeight: '800' }}>Phase Categorization</label>
                      <select className="form-control" value={milestoneForm.phase} onChange={e => setMilestoneForm({ ...milestoneForm, phase: e.target.value })}>
                        {PHASES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '11px', fontWeight: '800' }}>Start Date</label>
                        <input type="date" className="form-control" required value={milestoneForm.start_date} onChange={e => setMilestoneForm({ ...milestoneForm, start_date: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '11px', fontWeight: '800' }}>End Date</label>
                        <input type="date" className="form-control" required value={milestoneForm.end_date} onChange={e => setMilestoneForm({ ...milestoneForm, end_date: e.target.value })} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '11px', fontWeight: '800' }}>Milestone Notes</label>
                      <textarea className="form-control" rows="2" placeholder="E.g. Client signature needed on design layout plans"
                        value={milestoneForm.notes} onChange={e => setMilestoneForm({ ...milestoneForm, notes: e.target.value })} />
                    </div>

                    <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: '700', fontSize: '13px', marginTop: '8px' }}>
                      {actionLoading ? 'Creating...' : '🚀 Create Phase Milestone'}
                    </button>
                  </form>
                </div>

              </div>
            )}

            {/* ── TAB 3: WARRANTY REGISTRY ── */}
            {activeTab === 'warranty' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px' }}>
                
                {/* Warranties Table */}
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '16px' }}>Materials Warranty Register</h2>
                  
                  <div className="table-container">
                    <table className="table-list" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr style={{ textAlign: 'left' }}>
                          <th>Item Name</th>
                          <th>Brand</th>
                          <th>Serial No</th>
                          <th>Years</th>
                          <th>Expiry Date</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'center' }} />
                        </tr>
                      </thead>
                      <tbody>
                        {warranties.map(w => (
                          <tr key={w._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                            <td><strong>{w.item_name}</strong></td>
                            <td>{w.brand}</td>
                            <td>{w.serial_number || '—'}</td>
                            <td>{w.warranty_years} yrs</td>
                            <td>{new Date(w.end_date).toLocaleDateString('en-IN')}</td>
                            <td>
                              <select
                                value={w.status}
                                onChange={e => handleUpdateWarrantyStatus(w._id, e.target.value)}
                                style={{
                                  padding: '2px 6px', fontSize: '10px', borderRadius: '4px', fontWeight: '800',
                                  color: w.status === 'active' ? '#10b981' : '#ef4444',
                                  borderColor: w.status === 'active' ? '#10b98140' : '#ef444440',
                                  background: w.status === 'active' ? '#e6fbf3' : '#fee2e2'
                                }}
                              >
                                <option value="active">Active</option>
                                <option value="expired">Expired</option>
                              </select>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button onClick={() => handleDeleteWarranty(w._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                            </td>
                          </tr>
                        ))}
                        {warranties.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)', fontStyle: 'italic' }}>
                              No items registered under warranty for this project.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Add Warranty Form */}
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '14px' }}>Register Product Warranty</h2>
                  
                  <form onSubmit={handleAddWarranty} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '11px', fontWeight: '800' }}>Item / Hardware Name</label>
                      <input type="text" className="form-control" required placeholder="E.g. Soft-Close Drawers Tandembox"
                        value={warrantyForm.item_name} onChange={e => setWarrantyForm({ ...warrantyForm, item_name: e.target.value })} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '11px', fontWeight: '800' }}>Brand Name</label>
                        <input type="text" className="form-control" required placeholder="E.g. Blum, Blumotion, Hettich"
                          value={warrantyForm.brand} onChange={e => setWarrantyForm({ ...warrantyForm, brand: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '11px', fontWeight: '800' }}>Serial / Batch No</label>
                        <input type="text" className="form-control" placeholder="Optional Serial No"
                          value={warrantyForm.serial_number} onChange={e => setWarrantyForm({ ...warrantyForm, serial_number: e.target.value })} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '11px', fontWeight: '800' }}>Warranty Duration (Years)</label>
                        <input type="number" className="form-control" required min="1" value={warrantyForm.warranty_years} onChange={e => setWarrantyForm({ ...warrantyForm, warranty_years: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '11px', fontWeight: '800' }}>Handover / Start Date</label>
                        <input type="date" className="form-control" required value={warrantyForm.start_date} onChange={e => setWarrantyForm({ ...warrantyForm, start_date: e.target.value })} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '11px', fontWeight: '800' }}>Registrations Notes</label>
                      <textarea className="form-control" rows="2" placeholder="E.g. Lifetime warranty on Blum runners"
                        value={warrantyForm.notes} onChange={e => setWarrantyForm({ ...warrantyForm, notes: e.target.value })} />
                    </div>

                    <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: '700', fontSize: '13px', marginTop: '8px' }}>
                      {actionLoading ? 'Registering...' : '💾 Register Product Warranty'}
                    </button>
                  </form>
                </div>

              </div>
            )}

            {/* ── TAB 4: AI DESIGN SANDBOX ── */}
            {activeTab === 'ai' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px' }}>
                
                {/* Settings Form */}
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '6px' }}>AI Palette & Laminates Assistant</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Generate detailed styling briefs, veneer pairings, laminate references, and raw material stock forecasts.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '11px', fontWeight: '800' }}>Select Design Theme</label>
                      <select
                        className="form-control"
                        value={aiForm.theme}
                        onChange={e => setAiForm({ ...aiForm, theme: e.target.value })}
                        style={{ padding: '8px 12px', fontSize: '13px' }}
                      >
                        {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '11px', fontWeight: '800' }}>Room Type</label>
                      <select
                        className="form-control"
                        value={aiForm.room_type}
                        onChange={e => setAiForm({ ...aiForm, room_type: e.target.value })}
                        style={{ padding: '8px 12px', fontSize: '13px' }}
                      >
                        <option value="Kitchen">Modular Kitchen</option>
                        <option value="Master Bedroom">Master Bedroom</option>
                        <option value="Living Room">Living Room</option>
                        <option value="Guest Bedroom">Guest Bedroom</option>
                        <option value="Office Cabin">Office Cabin</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '11px', fontWeight: '800' }}>Preferred Color Scheme</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="E.g. Warm wood grains, dark grey laminates, gold knobs"
                        value={aiForm.colors}
                        onChange={e => setAiForm({ ...aiForm, colors: e.target.value })}
                      />
                    </div>

                    <button
                      onClick={handleGetAISuggestions}
                      disabled={actionLoading}
                      style={{
                        width: '100%', padding: '14px', background: 'var(--primary)', color: '#fff',
                        border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer',
                        fontSize: '13px', boxShadow: '0 4px 14px rgba(212,175,55,0.3)', marginTop: '8px'
                      }}
                    >
                      {actionLoading ? 'Generating Suggestions...' : '🎨 Consult AI Designer ➔'}
                    </button>
                  </div>
                </div>

                {/* AI Output Terminal */}
                <div style={{
                  background: '#0d0e15', border: '1px solid #1e1b4b',
                  borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)',
                  display: 'flex', flexDirection: 'column', minHeight: '400px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>●</span> AI DESIGN CONSOLE
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Model: {GEMINI_MODEL}</span>
                  </div>

                  <div style={{
                    flexGrow: 1, overflowY: 'auto', maxHeight: '420px',
                    fontFamily: 'monospace', fontSize: '12px', color: '#cbd5e1',
                    lineHeight: '1.6', whiteSpace: 'pre-wrap'
                  }}>
                    {aiOutput || 'Click "Consult AI Designer" on the left to output suggestions...'}
                  </div>
                </div>

              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

const tabStyle = (isActive) => ({
  padding: '10px 18px',
  borderRadius: '8px',
  border: isActive ? '1px solid var(--primary-border)' : '1px solid transparent',
  background: isActive ? 'var(--primary-light)' : 'none',
  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
  fontWeight: '800',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s'
});
