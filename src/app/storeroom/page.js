'use client';
import { useState, useEffect } from 'react';

export default function Storeroom3D() {
  const [racks, setRacks] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Selected Rack for Edit Modal
  const [selectedRack, setSelectedRack] = useState(null);
  const [assignForm, setAssignForm] = useState({
    material_name: '',
    capacity: 100
  });

  useEffect(() => {
    fetchRacks();
  }, []);

  const fetchRacks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/warehouse-racks');
      const data = await res.json();
      setRacks(data.racks || []);
      setMaterials(data.materials || []);
    } catch (err) {
      console.error('Error fetching racks', err);
    }
    setLoading(false);
  };

  const handleOpenAssignModal = (rack) => {
    setSelectedRack(rack);
    setAssignForm({
      material_name: rack.material_name || '',
      capacity: rack.capacity || 100
    });
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!selectedRack) return;

    try {
      const res = await fetch('/api/warehouse-racks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rack_code: selectedRack.rack_code,
          material_name: assignForm.material_name,
          capacity: Number(assignForm.capacity) || 100
        })
      });
      if (res.ok) {
        setSelectedRack(null);
        fetchRacks();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update rack');
      }
    } catch {
      alert('Error updating rack assignment');
    }
  };

  // Helper to get group of racks by side (L/R) and bay index (0 to 4)
  const getBayRacks = (side, bayIndex) => {
    const start = bayIndex * 10;
    const sideRacks = racks.filter(r => r.rack_code.startsWith(side));
    return sideRacks.slice(start, start + 10);
  };

  // Render a visual stack representing current occupancy
  const renderVisualStockPile = (current, capacity) => {
    if (!current || current <= 0) return null;
    const ratio = Math.min(1, current / (capacity || 100));
    
    // Choose color based on fill level
    let pileBg = '#22c55e'; // Green (full)
    if (ratio < 0.25) pileBg = '#3b82f6'; // Blue (low)
    else if (ratio < 0.6) pileBg = '#eab308'; // Yellow (med)
    else if (ratio > 0.95) pileBg = '#ef4444'; // Red (packed)

    return (
      <div style={{
        position: 'absolute',
        bottom: '3px',
        left: '3px',
        right: '3px',
        height: `${Math.max(8, ratio * 28)}px`,
        background: `linear-gradient(to top, ${pileBg}, rgba(255,255,255,0.2))`,
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: '3px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '9px',
        fontWeight: 'bold',
        color: '#fff',
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}>
        {current}
      </div>
    );
  };

  // Dashboard Stats
  const totalRacks = racks.length;
  const occupiedRacks = racks.filter(r => r.material_name).length;
  const occupancyPercentage = totalRacks > 0 ? Math.round((occupiedRacks / totalRacks) * 100) : 0;

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#090d16', color: '#cbd5e1' }}>
      
      {/* ── HEADER & SUMMARY CARDS ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px' }}>📦</span>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#fff', margin: 0 }}>Virtual Storeroom 3D</h1>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Interactive 3D representation of your warehouse inventory. Assign materials to storage racks and track visual occupancy levels in real-time.
          </p>
        </div>

        {/* Dashboard KPIs */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ background: '#111827', border: '1px solid #1f2937', padding: '10px 16px', borderRadius: '10px', minWidth: '120px' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800' }}>Total Racks</div>
            <strong style={{ fontSize: '20px', color: '#fff' }}>{totalRacks}</strong>
          </div>
          <div style={{ background: '#111827', border: '1px solid #1f2937', padding: '10px 16px', borderRadius: '10px', minWidth: '120px' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800' }}>Occupied</div>
            <strong style={{ fontSize: '20px', color: '#3b82f6' }}>{occupiedRacks} <span style={{ fontSize: '12px', color: '#94a3b8' }}>({occupancyPercentage}%)</span></strong>
          </div>
          <div style={{ background: '#111827', border: '1px solid #1f2937', padding: '10px 16px', borderRadius: '10px', minWidth: '120px' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800' }}>Empty Racks</div>
            <strong style={{ fontSize: '20px', color: '#22c55e' }}>{totalRacks - occupiedRacks}</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0', fontSize: '16px', color: '#94a3b8' }}>
          Loading virtual warehouse grids...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Legend indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '12px', background: '#111827', padding: '10px', borderRadius: '8px', border: '1px solid #1f2937' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#1e293b', border: '1px dashed #475569', borderRadius: '2px' }} /> Unassigned</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }} /> Low Occupancy (&lt;25%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#eab308', borderRadius: '2px' }} /> Medium Occupancy (25% - 60%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '2px' }} /> Normal Occupancy (60% - 95%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }} /> High Occupancy (&gt;95%)</span>
          </div>

          {/* ── 3D WAREHOUSE STAGE ── */}
          <div style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #0b0f19 0%, #151d30 100%)',
            border: '2px solid #1e293b',
            borderRadius: '24px',
            padding: '30px 16px',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)'
          }}>
            
            {/* Ceiling Lights / Glow Accents */}
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '200px', height: '3px', background: '#3b82f6', boxShadow: '0 0 30px #3b82f6', opacity: 0.8 }} />

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.6fr 1.2fr',
              gap: '8px',
              alignItems: 'center',
              perspective: '1200px'
            }}>
              
              {/* LEFT WALL: RACKS L-01 to L-50 */}
              <div style={{
                transform: 'rotateY(24deg) translateZ(10px)',
                transformStyle: 'preserve-3d',
                display: 'flex',
                gap: '8px',
                padding: '12px',
                background: 'rgba(15,23,42,0.6)',
                border: '2.5px solid #1e293b',
                borderRadius: '16px',
                boxShadow: '-10px 10px 20px rgba(0,0,0,0.5)'
              }}>
                {[0, 1, 2, 3, 4].map(bayIdx => (
                  <div key={bayIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ textAlign: 'center', fontSize: '10px', color: '#3b82f6', fontWeight: '900', letterSpacing: '0.5px', background: '#0f172a', padding: '3px 0', borderRadius: '4px', border: '1px solid #1e293b', textTransform: 'uppercase' }}>
                      Bay L{bayIdx + 1}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {getBayRacks('L', bayIdx).map(rack => (
                        <div
                          key={rack.rack_code}
                          onClick={() => handleOpenAssignModal(rack)}
                          style={rackStyle(rack)}
                          title={`${rack.rack_code}: ${rack.material_name || 'Empty'}`}
                        >
                          <span style={{ fontSize: '9px', fontWeight: '800', opacity: 0.6, position: 'absolute', top: '2px', left: '4px' }}>
                            {rack.rack_code}
                          </span>
                          {rack.material_name ? (
                            <div style={{ fontSize: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', padding: '12px 2px 2px 2px', textAlign: 'center', color: '#fff', fontWeight: '700' }}>
                              {rack.material_name}
                            </div>
                          ) : (
                            <div style={{ fontSize: '8px', padding: '12px 2px 2px 2px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                              Empty
                            </div>
                          )}
                          {renderVisualStockPile(rack.current_stock, rack.capacity)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* CENTER: PERSPECTIVE AISLE ROAD */}
              <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '40px 0',
                position: 'relative'
              }}>
                {/* Yellow Striped Warning Lines on Floor */}
                <div style={{
                  width: '50px',
                  height: '400px',
                  background: 'repeating-linear-gradient(45deg, #eab308, #eab308 10px, #0f172a 10px, #0f172a 20px)',
                  opacity: 0.25,
                  borderRadius: '6px',
                  boxShadow: '0 0 15px rgba(0,0,0,0.5)'
                }} />

                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.8))' }}>🚜</div>
                  <div style={{ fontSize: '9px', fontWeight: '900', color: '#eab308', letterSpacing: '1px', textTransform: 'uppercase', background: '#090d16', padding: '4px 8px', borderRadius: '4px', border: '1px solid #eab308', marginTop: '10px' }}>
                    AISLE WAY
                  </div>
                </div>
              </div>

              {/* RIGHT WALL: RACKS R-01 to R-50 */}
              <div style={{
                transform: 'rotateY(-24deg) translateZ(10px)',
                transformStyle: 'preserve-3d',
                display: 'flex',
                gap: '8px',
                padding: '12px',
                background: 'rgba(15,23,42,0.6)',
                border: '2.5px solid #1e293b',
                borderRadius: '16px',
                boxShadow: '10px 10px 20px rgba(0,0,0,0.5)'
              }}>
                {[0, 1, 2, 3, 4].map(bayIdx => (
                  <div key={bayIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ textAlign: 'center', fontSize: '10px', color: '#10b981', fontWeight: '900', letterSpacing: '0.5px', background: '#0f172a', padding: '3px 0', borderRadius: '4px', border: '1px solid #1e293b', textTransform: 'uppercase' }}>
                      Bay R{bayIdx + 1}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {getBayRacks('R', bayIdx).map(rack => (
                        <div
                          key={rack.rack_code}
                          onClick={() => handleOpenAssignModal(rack)}
                          style={rackStyle(rack)}
                          title={`${rack.rack_code}: ${rack.material_name || 'Empty'}`}
                        >
                          <span style={{ fontSize: '9px', fontWeight: '800', opacity: 0.6, position: 'absolute', top: '2px', left: '4px' }}>
                            {rack.rack_code}
                          </span>
                          {rack.material_name ? (
                            <div style={{ fontSize: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', padding: '12px 2px 2px 2px', textAlign: 'center', color: '#fff', fontWeight: '700' }}>
                              {rack.material_name}
                            </div>
                          ) : (
                            <div style={{ fontSize: '8px', padding: '12px 2px 2px 2px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                              Empty
                            </div>
                          )}
                          {renderVisualStockPile(rack.current_stock, rack.capacity)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── EDIT RACK MATERIAL ASSIGNMENT MODAL ── */}
      {selectedRack && (
        <div className="modal-backdrop" style={{ zIndex: 1300, background: 'rgba(0,0,0,0.8)' }}>
          <form className="modal-content" style={{ maxWidth: '440px', background: '#0f172a', border: '1px solid #1e293b' }} onSubmit={handleSaveAssignment}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ color: '#fff' }}>⚙️ Rack Settings: {selectedRack.rack_code}</h3>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  Assign warehouse inventory materials and set rack thresholds.
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedRack(null)} style={{ color: '#94a3b8' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8' }}>Assign Inventory Material</label>
                <select
                  className="form-control"
                  value={assignForm.material_name}
                  onChange={e => setAssignForm({ ...assignForm, material_name: e.target.value })}
                  style={{ background: '#090d16', border: '1px solid #1e293b', color: '#fff', padding: '10px' }}
                >
                  <option value="">-- Unassigned (Empty Shelf) --</option>
                  {materials.map(m => (
                    <option key={m._id} value={m.name}>{m.name} (Stock: {m.current_stock} {m.unit || 'pcs'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8' }}>Shelf Maximum Capacity (Limit)</label>
                <input
                  type="number"
                  className="form-control"
                  required
                  min="10"
                  value={assignForm.capacity}
                  onChange={e => setAssignForm({ ...assignForm, capacity: Number(e.target.value) })}
                  style={{ background: '#090d16', border: '1px solid #1e293b', color: '#fff', padding: '10px' }}
                />
                <span style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', display: 'block' }}>Used to calculate visual fill levels on the 3D grid.</span>
              </div>

              {/* Status details */}
              {selectedRack.material_name && (
                <div style={{ background: '#090d16', border: '1px solid #1e293b', padding: '12px', borderRadius: '8px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>Current Warehoused Qty:</span>
                    <strong style={{ color: '#3b82f6' }}>{selectedRack.current_stock} {selectedRack.unit}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Shelf Density (Fill %):</span>
                    <strong style={{ color: selectedRack.current_stock > selectedRack.capacity ? '#ef4444' : '#22c55e' }}>
                      {Math.round((selectedRack.current_stock / selectedRack.capacity) * 100)}%
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedRack(null)} style={{ border: '1px solid #1e293b', background: '#1e293b' }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#3b82f6', fontWeight: '700' }}>💾 Save Assignment</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

// Inline dynamic styles for rack block elements
const rackStyle = (rack) => {
  const isOccupied = !!rack.material_name;
  return {
    position: 'relative',
    height: '42px',
    background: isOccupied ? 'rgba(30, 41, 59, 0.9)' : 'rgba(15, 23, 42, 0.4)',
    border: isOccupied ? '1.5px solid #475569' : '1px dashed rgba(71, 85, 105, 0.4)',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#94a3b8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    boxSizing: 'border-box',
    boxShadow: isOccupied ? '0 4px 6px rgba(0,0,0,0.3), inset 0 2px 2px rgba(255,255,255,0.05)' : 'none',
    transition: 'all 0.15s ease-in-out',
    userSelect: 'none'
  };
};
