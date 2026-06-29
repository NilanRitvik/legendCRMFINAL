'use client';
import { useState, useEffect } from 'react';

export default function Storeroom3D() {
  const [racks, setRacks] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showListModal, setShowListModal] = useState(false);
  
  // Selected Rack for Edit Assignment Modal
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

  // 30 racks per side split into 6 Bays (columns) and 5 Tiers (rows)
  // Bay 1: L-01 to L-05
  // Bay 2: L-06 to L-10
  // ...
  // Bay 6: L-26 to L-30
  const getBayRacks = (side, bayIndex) => {
    const start = bayIndex * 5;
    const sideRacks = racks.filter(r => r.rack_code.startsWith(side));
    return sideRacks.slice(start, start + 5);
  };

  // Render stacks of boxes to look like a physical shelf pile
  const renderVisualStockPile = (current, capacity, isSearched) => {
    if (!current || current <= 0) return null;
    const ratio = Math.min(1, current / (capacity || 100));
    
    let pileColor = '#22c55e'; // Green
    if (ratio < 0.25) pileColor = '#3b82f6'; // Blue
    else if (ratio < 0.6) pileColor = '#eab308'; // Yellow
    else if (ratio > 0.95) pileColor = '#ef4444'; // Red

    const boxCount = ratio < 0.3 ? 1 : ratio < 0.65 ? 2 : 3;

    return (
      <div style={{
        position: 'absolute',
        bottom: '4px',
        left: '6px',
        right: '6px',
        height: '24px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: '2px',
        zIndex: 2
      }}>
        {[...Array(boxCount)].map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${12 + (i * 3)}px`,
              background: `linear-gradient(135deg, ${isSearched ? '#d4af37' : pileColor} 0%, #1e293b 100%)`,
              border: `1px solid ${isSearched ? '#ffd700' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '2px',
              position: 'relative',
              boxShadow: '0 2px 3px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Box flap lines */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '1px', background: 'rgba(0,0,0,0.15)' }} />
          </div>
        ))}
        {/* Qty Label floating directly inside */}
        <span style={{
          position: 'absolute',
          top: '-14px',
          background: 'rgba(9,13,22,0.95)',
          color: isSearched ? '#ffd700' : '#fff',
          fontSize: '9px',
          fontWeight: '900',
          padding: '1px 4px',
          borderRadius: '3px',
          border: `1.2px solid ${isSearched ? '#ffd700' : 'rgba(255,255,255,0.15)'}`
        }}>
          {current}
        </span>
      </div>
    );
  };

  const totalRacks = racks.length;
  const occupiedRacks = racks.filter(r => r.material_name).length;
  const occupancyPercentage = totalRacks > 0 ? Math.round((occupiedRacks / totalRacks) * 100) : 0;

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#090d16', color: '#cbd5e1' }}>
      
      {/* ── CSS KEYFRAMES FOR GOLDEN SEARCH GLOW ── */}
      <style>{`
        @keyframes goldenPulse {
          0% { box-shadow: 0 0 8px #d4af37, inset 0 0 4px #d4af37; border-color: #ffd700; transform: scale(1.02); }
          50% { box-shadow: 0 0 25px #ffd700, inset 0 0 12px #ffd700; border-color: #ffffff; transform: scale(1.05); }
          100% { box-shadow: 0 0 8px #d4af37, inset 0 0 4px #d4af37; border-color: #ffd700; transform: scale(1.02); }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px' }}>📦</span>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#fff', margin: 0 }}>Storeroom Organizer 3D</h1>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Manage room rack allocations (Left: 30, Right: 30). Search items to locate shelves instantly and track visual levels.
          </p>
        </div>

        {/* Action Controls & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          {/* Dynamic Search Box */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="🔍 Search material (e.g. plywood)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 16px 8px 36px',
                fontSize: '13px',
                width: '260px',
                borderRadius: '8px',
                border: '1.5px solid #1e293b',
                background: '#111827',
                color: '#fff',
                outline: 'none',
                transition: 'all 0.15s'
              }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '8px', opacity: 0.5 }}>🔍</span>
          </div>

          <button
            onClick={() => setShowListModal(true)}
            style={{
              padding: '10px 16px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '800',
              cursor: 'pointer',
              fontSize: '13px',
              boxShadow: '0 4px 10px rgba(59,130,246,0.3)'
            }}
          >
            📋 Inventory Directory
          </button>
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
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#1e293b', border: '1px dashed #475569', borderRadius: '2px' }} /> Empty Rack</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }} /> Low (&lt;25%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#eab308', borderRadius: '2px' }} /> Medium (25% - 60%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '2px' }} /> Normal (60% - 95%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }} /> High (&gt;95%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#ffd700', borderRadius: '2px', animation: 'goldenPulse 2s infinite' }} /> Search Match</span>
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
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.5fr 1.2fr',
              gap: '8px',
              alignItems: 'center',
              perspective: '1200px'
            }}>
              
              {/* LEFT WALL: RACKS L-01 to L-30 */}
              <div style={{
                transform: 'rotateY(20deg) translateZ(10px)',
                transformStyle: 'preserve-3d',
                display: 'flex',
                gap: '12px',
                padding: '16px',
                background: 'rgba(15,23,42,0.6)',
                border: '2.5px solid #1e293b',
                borderRadius: '16px',
                boxShadow: '-10px 10px 20px rgba(0,0,0,0.5)'
              }}>
                {[0, 1, 2, 3, 4, 5].map(bayIdx => (
                  <div key={bayIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
                    
                    {/* Orange Industrial Vertical Support Beam Left */}
                    <div style={{ position: 'absolute', top: '15px', bottom: 0, left: '-4px', width: '3px', background: 'linear-gradient(to bottom, #ea580c, #f97316)', zIndex: 1, borderRadius: '2px' }} />
                    {/* Orange Industrial Vertical Support Beam Right */}
                    <div style={{ position: 'absolute', top: '15px', bottom: 0, right: '-4px', width: '3px', background: 'linear-gradient(to bottom, #ea580c, #f97316)', zIndex: 1, borderRadius: '2px' }} />

                    <div style={{ textAlign: 'center', fontSize: '9px', color: '#ea580c', fontWeight: '900', letterSpacing: '0.5px', background: '#0f172a', padding: '3px 0', borderRadius: '4px', border: '1px solid #1e293b', textTransform: 'uppercase' }}>
                      Bay L{bayIdx + 1}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {getBayRacks('L', bayIdx).map((rack) => {
                        const isSearched = searchQuery.trim() !== '' && rack.material_name.toLowerCase().includes(searchQuery.toLowerCase().trim());
                        return (
                          <div
                            key={rack.rack_code}
                            onClick={() => handleOpenAssignModal(rack)}
                            style={rackStyle(rack, isSearched)}
                          >
                            {/* Steel Horizontal Beam */}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: '#475569', borderBottom: '1px solid #64748b' }} />

                            <span style={{ fontSize: '8px', fontWeight: '900', opacity: 0.5, position: 'absolute', top: '2px', left: '4px', zIndex: 3 }}>
                              {rack.rack_code}
                            </span>
                            
                            {rack.material_name ? (
                              <div style={{ fontSize: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', padding: '12px 2px 2px 2px', textAlign: 'center', color: '#fff', fontWeight: '700', zIndex: 3 }}>
                                {rack.material_name}
                              </div>
                            ) : (
                              <div style={{ fontSize: '8px', padding: '12px 2px 2px 2px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', zIndex: 3 }}>
                                Empty
                              </div>
                            )}

                            {renderVisualStockPile(rack.current_stock, rack.capacity, isSearched)}

                            {/* Floating details overlay on match */}
                            {isSearched && (
                              <div style={{
                                position: 'absolute', top: '-34px', left: '50%', transform: 'translateX(-50%)',
                                background: '#ffd700', color: '#000', fontSize: '9px', fontWeight: '900',
                                padding: '3px 6px', borderRadius: '4px', whiteSpace: 'nowrap', zIndex: 10,
                                boxShadow: '0 4px 10px rgba(0,0,0,0.5)', border: '1px solid #fff'
                              }}>
                                {rack.current_stock} {rack.unit} available
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                <div style={{
                  width: '45px',
                  height: '350px',
                  background: 'repeating-linear-gradient(45deg, #eab308, #eab308 10px, #0f172a 10px, #0f172a 20px)',
                  opacity: 0.25,
                  borderRadius: '6px',
                  boxShadow: '0 0 15px rgba(0,0,0,0.5)'
                }} />

                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.8))' }}>🚜</div>
                  <div style={{ fontSize: '9px', fontWeight: '900', color: '#eab308', letterSpacing: '1.2px', textTransform: 'uppercase', background: '#090d16', padding: '4px 8px', borderRadius: '4px', border: '1px solid #eab308', marginTop: '10px' }}>
                    AISLE WAY
                  </div>
                </div>
              </div>

              {/* RIGHT WALL: RACKS R-01 to R-30 */}
              <div style={{
                transform: 'rotateY(-20deg) translateZ(10px)',
                transformStyle: 'preserve-3d',
                display: 'flex',
                gap: '12px',
                padding: '16px',
                background: 'rgba(15,23,42,0.6)',
                border: '2.5px solid #1e293b',
                borderRadius: '16px',
                boxShadow: '10px 10px 20px rgba(0,0,0,0.5)'
              }}>
                {[0, 1, 2, 3, 4, 5].map(bayIdx => (
                  <div key={bayIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
                    
                    {/* Orange Industrial Vertical Support Beam Left */}
                    <div style={{ position: 'absolute', top: '15px', bottom: 0, left: '-4px', width: '3px', background: 'linear-gradient(to bottom, #ea580c, #f97316)', zIndex: 1, borderRadius: '2px' }} />
                    {/* Orange Industrial Vertical Support Beam Right */}
                    <div style={{ position: 'absolute', top: '15px', bottom: 0, right: '-4px', width: '3px', background: 'linear-gradient(to bottom, #ea580c, #f97316)', zIndex: 1, borderRadius: '2px' }} />

                    <div style={{ textAlign: 'center', fontSize: '9px', color: '#ea580c', fontWeight: '900', letterSpacing: '0.5px', background: '#0f172a', padding: '3px 0', borderRadius: '4px', border: '1px solid #1e293b', textTransform: 'uppercase' }}>
                      Bay R{bayIdx + 1}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {getBayRacks('R', bayIdx).map((rack) => {
                        const isSearched = searchQuery.trim() !== '' && rack.material_name.toLowerCase().includes(searchQuery.toLowerCase().trim());
                        return (
                          <div
                            key={rack.rack_code}
                            onClick={() => handleOpenAssignModal(rack)}
                            style={rackStyle(rack, isSearched)}
                          >
                            {/* Steel Horizontal Beam */}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: '#475569', borderBottom: '1px solid #64748b' }} />

                            <span style={{ fontSize: '8px', fontWeight: '900', opacity: 0.5, position: 'absolute', top: '2px', left: '4px', zIndex: 3 }}>
                              {rack.rack_code}
                            </span>

                            {rack.material_name ? (
                              <div style={{ fontSize: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', padding: '12px 2px 2px 2px', textAlign: 'center', color: '#fff', fontWeight: '700', zIndex: 3 }}>
                                {rack.material_name}
                              </div>
                            ) : (
                              <div style={{ fontSize: '8px', padding: '12px 2px 2px 2px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', zIndex: 3 }}>
                                Empty
                              </div>
                            )}

                            {renderVisualStockPile(rack.current_stock, rack.capacity, isSearched)}

                            {/* Floating details overlay on match */}
                            {isSearched && (
                              <div style={{
                                position: 'absolute', top: '-34px', left: '50%', transform: 'translateX(-50%)',
                                background: '#ffd700', color: '#000', fontSize: '9px', fontWeight: '900',
                                padding: '3px 6px', borderRadius: '4px', whiteSpace: 'nowrap', zIndex: 10,
                                boxShadow: '0 4px 10px rgba(0,0,0,0.5)', border: '1px solid #fff'
                              }}>
                                {rack.current_stock} {rack.unit} available
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── INVENTORY DIRECTORY LIST VIEW MODAL ── */}
      {showListModal && (
        <div className="modal-backdrop" style={{ zIndex: 1300, background: 'rgba(0,0,0,0.85)' }}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%', background: '#0f172a', border: '1px solid #1e293b' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ color: '#fff' }}>📋 Warehouse Inventory Directory</h3>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  Complete layout listing of active storeroom allocations and metrics.
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowListModal(false)} style={{ color: '#94a3b8' }}>×</button>
            </div>

            <div style={{ maxHeight: '450px', overflowY: 'auto', marginTop: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #1e293b', textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: '10px' }}>Rack Code</th>
                    <th style={{ padding: '10px' }}>Assigned Material</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Current Stock</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Max Capacity</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Density Status</th>
                  </tr>
                </thead>
                <tbody>
                  {racks.map((rack) => {
                    const density = rack.material_name ? Math.round((rack.current_stock / rack.capacity) * 100) : 0;
                    return (
                      <tr key={rack.rack_code} style={{ borderBottom: '1px solid #1e293b', background: rack.material_name ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '10px', fontWeight: '800', color: '#3b82f6' }}>{rack.rack_code}</td>
                        <td style={{ padding: '10px' }}>{rack.material_name || <span style={{ color: '#64748b', fontStyle: 'italic' }}>Unassigned</span>}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: rack.material_name ? '#fff' : '#64748b' }}>
                          {rack.material_name ? `${rack.current_stock.toLocaleString()} ${rack.unit}` : '—'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#94a3b8' }}>
                          {rack.material_name ? `${rack.capacity.toLocaleString()} ${rack.unit}` : '—'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {rack.material_name ? (
                            <span style={{
                              fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px',
                              background: density > 95 ? '#fee2e2' : density > 60 ? '#d1fae5' : '#eff6ff',
                              color: density > 95 ? '#ef4444' : density > 60 ? '#10b981' : '#3b82f6'
                            }}>
                              {density}% Full
                            </span>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '11px' }}>Empty</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowListModal(false)} style={{ border: '1px solid #1e293b', background: '#1e293b' }}>Close</button>
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
const rackStyle = (rack, isSearched) => {
  const isOccupied = !!rack.material_name;
  
  const baseStyle = {
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

  if (isSearched) {
    return {
      ...baseStyle,
      animation: 'goldenPulse 2.5s infinite',
      border: '2px solid #ffd700',
      zIndex: 5
    };
  }

  return baseStyle;
};
