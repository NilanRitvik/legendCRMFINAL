'use client';
import { useState, useEffect } from 'react';

export default function Wasteroom3D() {
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedBinCode, setFocusedBinCode] = useState(null);
  const [hoveredBin, setHoveredBin] = useState(null);
  const [showListModal, setShowListModal] = useState(false);

  // Selected bin for Settings Modal
  const [selectedBin, setSelectedBin] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    category_name: '',
    capacity: 200
  });

  useEffect(() => {
    fetchBins();
  }, []);

  const fetchBins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wasteroom-bins');
      const data = await res.json();
      setBins(data.bins || []);
    } catch (err) {
      console.error('Error fetching waste bins', err);
    }
    setLoading(false);
  };

  const handleOpenSettingsModal = (bin) => {
    setSelectedBin(bin);
    setSettingsForm({
      category_name: bin.category_name || '',
      capacity: bin.capacity || 200
    });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!selectedBin) return;

    try {
      const res = await fetch('/api/wasteroom-bins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bin_code: selectedBin.bin_code,
          category_name: settingsForm.category_name,
          capacity: Number(settingsForm.capacity) || 200
        })
      });
      if (res.ok) {
        setSelectedBin(null);
        fetchBins();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update waste bin');
      }
    } catch {
      alert('Error updating waste bin');
    }
  };

  // Find search matches
  const trimmedSearch = searchQuery.trim().toLowerCase();
  const matchedBins = trimmedSearch
    ? bins.filter(b => b.category_name && b.category_name.toLowerCase().includes(trimmedSearch))
    : [];
  const hasMatches = matchedBins.length > 0;

  // Auto-focus first match when search query changes
  useEffect(() => {
    if (hasMatches) {
      setFocusedBinCode(matchedBins[0].bin_code);
    } else {
      setFocusedBinCode(null);
    }
  }, [searchQuery]);

  const getBayBins = (side, bayIndex) => {
    const start = bayIndex * 5;
    const sideBins = bins.filter(b => b.bin_code.startsWith(`W-${side}`));
    return sideBins.slice(start, start + 5);
  };

  // Render a visual trash bucket / container filled with waste material
  const renderVisualTrashBucket = (current, capacity, isSearched) => {
    const ratio = current && capacity ? Math.min(1, current / capacity) : 0;
    
    let bucketFillColor = '#ef4444'; // Red (High waste)
    if (ratio < 0.25) bucketFillColor = '#6b7280'; // Grey (Low waste)
    else if (ratio < 0.6) bucketFillColor = '#f97316'; // Orange (Medium waste)

    return (
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '32px',
        height: '36px',
        background: '#1e293b',
        border: `2px solid ${isSearched ? '#ffd700' : '#475569'}`,
        borderBottomLeftRadius: '6px',
        borderBottomRightRadius: '6px',
        borderTop: 'none',
        boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
        zIndex: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'end'
      }}>
        {/* Metal handle lip */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#64748b' }} />

        {/* Dynamic Waste Fill Area */}
        {ratio > 0 && (
          <div style={{
            height: `${ratio * 100}%`,
            width: '100%',
            background: `linear-gradient(to top, ${bucketFillColor}, rgba(255,255,255,0.15))`,
            transition: 'height 0.4s ease'
          }} />
        )}
      </div>
    );
  };

  // Aggregates
  const totalWastedCost = bins.reduce((sum, b) => sum + (b.total_cost || 0), 0);
  const totalWastedQty = bins.reduce((sum, b) => sum + (b.current_stock || 0), 0);

  const focusedBin = focusedBinCode ? bins.find(b => b.bin_code === focusedBinCode) : null;
  const focusedDensity = focusedBin ? Math.round((focusedBin.current_stock / focusedBin.capacity) * 100) : 0;

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#090d16', color: '#cbd5e1' }}>
      
      {/* ── CSS KEYFRAMES FOR TRANSITIONS & ANIMATIONS ── */}
      <style>{`
        @keyframes goldenPulse {
          0% { box-shadow: 0 0 10px #d4af37, inset 0 0 5px #d4af37; border-color: #ffd700; transform: scale(1.03) translateZ(10px); }
          50% { box-shadow: 0 0 30px #ffd700, inset 0 0 15px #ffd700; border-color: #ffffff; transform: scale(1.1) translateZ(25px); }
          100% { box-shadow: 0 0 10px #d4af37, inset 0 0 5px #d4af37; border-color: #ffd700; transform: scale(1.03) translateZ(10px); }
        }
        @keyframes slideInRight {
          from { transform: translateX(60px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .bin-item {
          position: relative;
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px' }}>🗑️</span>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#fff', margin: 0 }}>Virtual Wasteroom 3D</h1>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Visual loss control center. Track scrap quantities, dump categories (Left: 30, Right: 30), and calculate exact financial wastage values.
          </p>
        </div>

        {/* Action Controls & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="🔍 Search waste categories..."
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
            📋 Wastage Directory
          </button>
        </div>
      </div>

      {/* KPI Cards (Total Cost & Total Quantity Preference) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#111827', border: '1.5px solid #ef4444', padding: '16px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>💸 Total Financial Wastage Loss</span>
          <strong style={{ fontSize: '26px', color: '#ef4444' }}>₹ {totalWastedCost.toLocaleString()}</strong>
        </div>
        <div style={{ background: '#111827', border: '1px solid #1f2937', padding: '16px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>📦 Total Accumulated Scrap Qty</span>
          <strong style={{ fontSize: '26px', color: '#fff' }}>{totalWastedQty.toLocaleString()} items</strong>
        </div>
        <div style={{ background: '#111827', border: '1px solid #1f2937', padding: '16px', borderRadius: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12.5px', color: '#94a3b8' }}>
          💡 Assign waste write-offs directly to specific bin numbers to calculate localized scrap densities and financial loss values.
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0', fontSize: '16px', color: '#94a3b8' }}>
          Loading virtual waste bins...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: focusedBin ? '1fr 340px' : '1fr', gap: '24px', transition: 'all 0.4s ease-in-out' }}>
          
          {/* ── LEFT COLUMN: 3D WASTE CONTAINER GRID ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Monitor Board Display */}
            <div style={{
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(17,24,39,0.9)',
              border: '1.5px solid #1e293b',
              borderRadius: '12px',
              fontSize: '13.5px',
              color: '#fff',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              padding: '0 20px',
              textAlign: 'center'
            }}>
              {hoveredBin ? (
                hoveredBin.current_stock > 0 ? (
                  <div>
                    <span style={{ color: '#ef4444', fontWeight: '900', marginRight: '10px', fontSize: '14px', border: '1.2px solid #ef4444', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)' }}>
                      {hoveredBin.bin_code}
                    </span>
                    <strong style={{ color: '#fff', fontSize: '14.5px' }}>{hoveredBin.category_name}</strong>
                    <span style={{ color: '#ef4444', marginLeft: '12px', fontWeight: '900' }}>
                      Loss: ₹{hoveredBin.total_cost.toLocaleString()}
                    </span>
                    <span style={{ color: '#94a3b8', marginLeft: '12px' }}>
                      (Qty: {hoveredBin.current_stock} {hoveredBin.unit} / Max: {hoveredBin.capacity})
                    </span>
                  </div>
                ) : (
                  <div>
                    <span style={{ color: '#64748b', fontWeight: '900', marginRight: '10px', fontSize: '14px', border: '1.2px dashed #475569', padding: '1px 6px', borderRadius: '4px' }}>
                      {hoveredBin.bin_code}
                    </span>
                    <span style={{ color: '#64748b', fontStyle: 'italic' }}>Empty Waste Bin ({hoveredBin.category_name || 'General Scrap'})</span>
                  </div>
                )
              ) : (
                <span style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🗑️</span> Touch or hover over any waste bucket to view scrap cost & volume details here
                </span>
              )}
            </div>

            {/* 3D Warehouse floor */}
            <div style={{
              position: 'relative',
              background: 'linear-gradient(135deg, #0e1220 0%, #1a2238 100%)',
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
                
                {/* LEFT SIDE BINS (W-L01 to W-L20) */}
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
                  {[0, 1, 2, 3].map(bayIdx => (
                    <div key={bayIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '15px', bottom: 0, left: '-4px', width: '3px', background: '#3b82f6', zIndex: 1, borderRadius: '2px' }} />
                      <div style={{ position: 'absolute', top: '15px', bottom: 0, right: '-4px', width: '3px', background: '#3b82f6', zIndex: 1, borderRadius: '2px' }} />

                      <div style={{ textAlign: 'center', fontSize: '8px', color: '#3b82f6', fontWeight: '900', letterSpacing: '0.5px', background: '#0f172a', padding: '3px 0', borderRadius: '4px', border: '1px solid #1e293b', textTransform: 'uppercase' }}>
                        Zone L{bayIdx + 1}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {getBayBins('L', bayIdx).map(bin => {
                          const isMatched = searchQuery.trim() !== '' && bin.category_name.toLowerCase().includes(searchQuery.toLowerCase().trim());
                          const isFocused = focusedBinCode === bin.bin_code;
                          const fadeOff = hasMatches && !isMatched;

                          return (
                            <div
                              key={bin.bin_code}
                              className="bin-item"
                              onMouseEnter={() => setHoveredBin(bin)}
                              onMouseLeave={() => setHoveredBin(null)}
                              onClick={() => {
                                if (bin.current_stock > 0) {
                                  setFocusedBinCode(bin.bin_code);
                                } else {
                                  handleOpenSettingsModal(bin);
                                }
                              }}
                              style={binItemStyle(bin, isMatched, isFocused, fadeOff)}
                            >
                              <span style={{ fontSize: '8.5px', fontWeight: '900', opacity: 0.8, position: 'absolute', top: '3px', left: '5px', color: '#64748b', zIndex: 3 }}>
                                {bin.bin_code.replace('W-', '')}
                              </span>

                              {bin.current_stock <= 0 && (
                                <div style={{ fontSize: '8px', padding: '16px 2px 2px 2px', color: '#475569', fontStyle: 'italic', textAlign: 'center', zIndex: 3 }}>
                                  Empty
                                </div>
                              )}

                              {renderVisualTrashBucket(bin.current_stock, bin.capacity, isMatched)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CENTER AISLE */}
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
                    background: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 10px, #0f172a 10px, #0f172a 20px)',
                    opacity: 0.2,
                    borderRadius: '6px',
                    boxShadow: '0 0 15px rgba(0,0,0,0.5)'
                  }} />

                  <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px' }}>🚨</div>
                    <div style={{ fontSize: '9px', fontWeight: '900', color: '#ef4444', letterSpacing: '1px', textTransform: 'uppercase', background: '#090d16', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ef4444', marginTop: '10px' }}>
                      WASTE AISLE
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE BINS (W-R01 to W-R20) */}
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
                  {[0, 1, 2, 3].map(bayIdx => (
                    <div key={bayIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '15px', bottom: 0, left: '-4px', width: '3px', background: '#3b82f6', zIndex: 1, borderRadius: '2px' }} />
                      <div style={{ position: 'absolute', top: '15px', bottom: 0, right: '-4px', width: '3px', background: '#3b82f6', zIndex: 1, borderRadius: '2px' }} />

                      <div style={{ textAlign: 'center', fontSize: '8px', color: '#3b82f6', fontWeight: '900', letterSpacing: '0.5px', background: '#0f172a', padding: '3px 0', borderRadius: '4px', border: '1px solid #1e293b', textTransform: 'uppercase' }}>
                        Zone R{bayIdx + 1}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {getBayBins('R', bayIdx).map(bin => {
                          const isMatched = searchQuery.trim() !== '' && bin.category_name.toLowerCase().includes(searchQuery.toLowerCase().trim());
                          const isFocused = focusedBinCode === bin.bin_code;
                          const fadeOff = hasMatches && !isMatched;

                          return (
                            <div
                              key={bin.bin_code}
                              className="bin-item"
                              onMouseEnter={() => setHoveredBin(bin)}
                              onMouseLeave={() => setHoveredBin(null)}
                              onClick={() => {
                                if (bin.current_stock > 0) {
                                  setFocusedBinCode(bin.bin_code);
                                } else {
                                  handleOpenSettingsModal(bin);
                                }
                              }}
                              style={binItemStyle(bin, isMatched, isFocused, fadeOff)}
                            >
                              <span style={{ fontSize: '8.5px', fontWeight: '900', opacity: 0.8, position: 'absolute', top: '3px', left: '5px', color: '#64748b', zIndex: 3 }}>
                                {bin.bin_code.replace('W-', '')}
                              </span>

                              {bin.current_stock <= 0 && (
                                <div style={{ fontSize: '8px', padding: '16px 2px 2px 2px', color: '#475569', fontStyle: 'italic', textAlign: 'center', zIndex: 3 }}>
                                  Empty
                                </div>
                              )}

                              {renderVisualTrashBucket(bin.current_stock, bin.capacity, isMatched)}
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

          {/* ── RIGHT COLUMN: SLIDE-OUT FOCUSED BIN DETAIL PANEL ── */}
          {focusedBin && (
            <div style={{
              background: '#111827',
              border: '1.5px solid #1e293b',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'sticky',
              top: '24px',
              height: 'fit-content'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
                <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  🚨 Focused Waste Bin
                </span>
                <button
                  onClick={() => setFocusedBinCode(null)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                >
                  ×
                </button>
              </div>

              {/* Bin Code */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#ef4444', margin: 0 }}>{focusedBin.bin_code}</h2>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>({focusedBin.bin_code.includes('-L') ? 'Left Wall' : 'Right Wall'})</span>
              </div>

              {/* Category */}
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800', marginBottom: '4px' }}>Waste Classification</div>
                <strong style={{ fontSize: '16px', color: '#fff', display: 'block', lineHeight: '1.3' }}>{focusedBin.category_name}</strong>
              </div>

              {/* Actual Financial Loss Card */}
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1.5px solid #ef4444', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '900', textTransform: 'uppercase' }}>Actual Cost Value Wasted</span>
                <strong style={{ fontSize: '24px', color: '#fff' }}>₹ {focusedBin.total_cost.toLocaleString()}</strong>
              </div>

              {/* Metrics */}
              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#94a3b8' }}>Scrap Quantity:</span>
                  <strong style={{ color: '#fff' }}>{focusedBin.current_stock} {focusedBin.unit}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#94a3b8' }}>Bin Max Weight:</span>
                  <strong style={{ color: '#94a3b8' }}>{focusedBin.capacity} {focusedBin.unit}</strong>
                </div>

                {/* Progress */}
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', fontWeight: '800' }}>
                    <span style={{ color: '#64748b' }}>Bin density:</span>
                    <span style={{ color: '#ef4444' }}>{focusedDensity}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, focusedDensity)}%`,
                      height: '100%',
                      background: '#ef4444',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenSettingsModal(focusedBin)}
                style={{
                  width: '100%', padding: '12px', background: '#1e293b', border: '1px solid #334155',
                  color: '#fff', borderRadius: '8px', fontWeight: '800', cursor: 'pointer',
                  fontSize: '12px', textAlign: 'center', marginTop: '10px'
                }}
              >
                ⚙️ Adjust Bin Configuration
              </button>
            </div>
          )}

        </div>
      )}

      {/* ── WASTAGE DIRECTORY LIST VIEW MODAL ── */}
      {showListModal && (
        <div className="modal-backdrop" style={{ zIndex: 1300, background: 'rgba(0,0,0,0.85)' }}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%', background: '#0f172a', border: '1px solid #1e293b' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ color: '#fff' }}>📋 Virtual Wasteroom Directory</h3>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  Listing of active trash buckets, categories, quantities, and financial waste valuations.
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowListModal(false)} style={{ color: '#94a3b8' }}>×</button>
            </div>

            <div style={{ maxHeight: '450px', overflowY: 'auto', marginTop: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #1e293b', textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: '10px' }}>Bin Code</th>
                    <th style={{ padding: '10px' }}>Waste Classification</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Scrap Quantity</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Financial Cost</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Density Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bins.map((bin) => {
                    const density = Math.round((bin.current_stock / bin.capacity) * 100);
                    return (
                      <tr key={bin.bin_code} style={{ borderBottom: '1px solid #1e293b', background: bin.current_stock > 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '10px', fontWeight: '800', color: '#ef4444' }}>{bin.bin_code}</td>
                        <td style={{ padding: '10px' }}>{bin.category_name || 'General Scrap'}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: bin.current_stock > 0 ? '#fff' : '#64748b' }}>
                          {bin.current_stock > 0 ? `${bin.current_stock.toLocaleString()} ${bin.unit}` : '—'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: '800', color: bin.current_stock > 0 ? '#ef4444' : '#64748b' }}>
                          {bin.current_stock > 0 ? `₹ ${bin.total_cost.toLocaleString()}` : '—'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {bin.current_stock > 0 ? (
                            <span style={{
                              fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px',
                              background: density > 95 ? '#fee2e2' : '#eff6ff',
                              color: density > 95 ? '#ef4444' : '#3b82f6'
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

      {/* ── EDIT BIN SETTINGS MODAL ── */}
      {selectedBin && (
        <div className="modal-backdrop" style={{ zIndex: 1300, background: 'rgba(0,0,0,0.8)' }}>
          <form className="modal-content" style={{ maxWidth: '440px', background: '#0f172a', border: '1px solid #1e293b' }} onSubmit={handleSaveSettings}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ color: '#fff' }}>⚙️ Bin Settings: {selectedBin.bin_code}</h3>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  Assign waste categorization and threshold limits.
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedBin(null)} style={{ color: '#94a3b8' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8' }}>Waste Category Name</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={settingsForm.category_name}
                  onChange={e => setSettingsForm({ ...settingsForm, category_name: e.target.value })}
                  style={{ background: '#090d16', border: '1px solid #1e293b', color: '#fff', padding: '10px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8' }}>Maximum Bin Capacity</label>
                <input
                  type="number"
                  className="form-control"
                  required
                  min="10"
                  value={settingsForm.capacity}
                  onChange={e => setSettingsForm({ ...settingsForm, capacity: Number(e.target.value) })}
                  style={{ background: '#090d16', border: '1px solid #1e293b', color: '#fff', padding: '10px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedBin(null)} style={{ border: '1px solid #1e293b', background: '#1e293b' }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#ef4444', fontWeight: '700' }}>💾 Save Configuration</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

const binItemStyle = (bin, isMatched, isFocused, fadeOff) => {
  const isOccupied = bin.current_stock > 0;
  const baseStyle = {
    position: 'relative',
    height: '56px',
    background: isOccupied ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.4)',
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
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    userSelect: 'none'
  };

  if (isFocused) {
    return {
      ...baseStyle,
      transform: 'scale(1.15) translateZ(30px)',
      boxShadow: '0 8px 25px rgba(239,68,68,0.4), inset 0 0 10px rgba(239,68,68,0.2)',
      borderColor: '#ef4444',
      zIndex: 10,
      opacity: 1
    };
  }

  if (isMatched) {
    return {
      ...baseStyle,
      animation: 'goldenPulse 2s infinite',
      zIndex: 8,
      opacity: 1
    };
  }

  if (fadeOff) {
    return {
      ...baseStyle,
      opacity: 0.1,
      transform: 'scale(0.92)',
      pointerEvents: 'none',
      boxShadow: 'none'
    };
  }

  return baseStyle;
};
