'use client';

import { useState, useEffect, useRef } from 'react';

const designTypeLabels = {
  '2d': '📐 2D Layout Plan (CAD / Blueprint)',
  '3d': '🕶️ 3D Perspective Render (Max / Sketchup)'
};

export default function DesigningPage() {
  const [clients, setClients] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('design_history');
  const [selectedDesignForView, setSelectedDesignForView] = useState(null);

  // Upload mode toggle
  const [uploadMode, setUploadMode] = useState('url'); // 'file' | 'url'
  const [acceptanceUploadMode, setAcceptanceUploadMode] = useState('url'); // 'file' | 'url'

  // Form State
  const [selectedClient, setSelectedClient] = useState('');
  const [designType, setDesignType] = useState('2d');
  const [notes, setNotes] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlFileName, setUrlFileName] = useState('');
  const [acceptanceUrlInput, setAcceptanceUrlInput] = useState('');
  const [acceptanceUrlFileName, setAcceptanceUrlFileName] = useState('');
  const fileInputRef = useRef(null);
  const acceptanceFileInputRef = useRef(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resClients, resDesigns] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/designing')
      ]);
      const dataClients = await resClients.json();
      const dataDesigns = await resDesigns.json();

      setClients(Array.isArray(dataClients) ? dataClients : []);
      setDesigns(Array.isArray(dataDesigns) ? dataDesigns : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadDesign = async (e) => {
    e.preventDefault();
    if (!selectedClient) return alert('Please select a client.');

    try {
      setUploading(true);

      const useFormData = uploadMode === 'file' || acceptanceUploadMode === 'file';

      if (useFormData) {
        const formData = new FormData();
        formData.append('client', selectedClient);
        formData.append('design_type', designType);
        formData.append('notes', notes);

        // Design File
        if (uploadMode === 'file') {
          const file = fileInputRef.current?.files?.[0];
          if (!file) return alert('Please choose a design file to upload.');
          formData.append('file', file);
        } else {
          if (!urlInput.trim()) return alert('Please enter a valid design URL link.');
          formData.append('file_url', urlInput.trim());
          formData.append('file_name', urlFileName.trim() || urlInput.split('/').pop() || 'Design Link');
        }

        // Acceptance Document
        if (acceptanceUploadMode === 'file') {
          const accFile = acceptanceFileInputRef.current?.files?.[0];
          if (accFile) {
            formData.append('acceptance_file', accFile);
          }
        } else {
          if (acceptanceUrlInput.trim()) {
            formData.append('acceptance_file_url', acceptanceUrlInput.trim());
            formData.append('acceptance_file_name', acceptanceUrlFileName.trim() || 'Acceptance Link');
          }
        }

        const res = await fetch('/api/designing', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          resetForm();
          setActiveTab('design_history');
          fetchData();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to save design.');
        }
      } else {
        // JSON body (both are links)
        if (!urlInput.trim()) return alert('Please enter a valid design URL.');
        const displayName = urlFileName.trim() || urlInput.split('/').pop() || 'Design File';

        const bodyData = {
          client: selectedClient,
          design_type: designType,
          file_name: displayName,
          file_url: urlInput.trim(),
          notes
        };

        if (acceptanceUrlInput.trim()) {
          bodyData.acceptance_file_url = acceptanceUrlInput.trim();
          bodyData.acceptance_file_name = acceptanceUrlFileName.trim() || 'Acceptance Link';
        }

        const res = await fetch('/api/designing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });

        if (res.ok) {
          resetForm();
          setActiveTab('design_history');
          fetchData();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to save design link.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error saving design.');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setNotes('');
    setUrlInput('');
    setUrlFileName('');
    setAcceptanceUrlInput('');
    setAcceptanceUrlFileName('');
    setSelectedClient('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (acceptanceFileInputRef.current) acceptanceFileInputRef.current.value = '';
  };

  const handleDeleteDesign = async (designId) => {
    if (!confirm('Are you sure you want to delete this design?')) return;
    try {
      const res = await fetch(`/api/designing/${designId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete design');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!');
    }).catch(() => {
      alert('Could not copy: ' + url);
    });
  };

  // Compute stats
  const total2D = designs.filter(d => d.design_type === '2d').length;
  const total3D = designs.filter(d => d.design_type === '3d').length;
  const clientsWithDesigns = new Set(designs.filter(d => ['2d', '3d'].includes(d.design_type)).map(d => d.client?._id).filter(Boolean)).size;

  // Filter designs based on search and type
  const filteredDesigns = designs.filter(d => {
    const clientComp = d.client?.company || '';
    const clientName = d.client?.name || '';
    const fileName = d.file_name || '';
    const notesStr = d.notes || '';
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = !searchQuery ||
      clientComp.toLowerCase().includes(query) ||
      clientName.toLowerCase().includes(query) ||
      fileName.toLowerCase().includes(query) ||
      notesStr.toLowerCase().includes(query);

    const matchesType = typeFilter === 'all' ? ['2d', '3d'].includes(d.design_type) : d.design_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>🎨 Blueprints, Drawings & QC Sheets</h1>
          <p style={{ color: 'var(--text-muted)' }}>Upload architectural drafts, floorplans, perspective renders, quality sheets, and logistics drawings</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="date-presets" style={{ width: 'fit-content', marginBottom: '28px' }}>
        <button className={`preset-btn ${activeTab === 'design_history' ? 'active' : ''}`} onClick={() => setActiveTab('design_history')}>
          📜 Design History
        </button>
        <button className={`preset-btn ${activeTab === 'add_design' ? 'active' : ''}`} onClick={() => setActiveTab('add_design')}>
          ➕ Add Design
        </button>
      </div>

      {/* 1. Design History Tab */}
      {activeTab === 'design_history' && (
        <div>
          {/* KPI Summary Cards */}
          <div className="grid-3" style={{ marginBottom: '28px' }}>
            <div className="card-metric accent-primary">
              <div className="metric-title">📂 Total Designs</div>
              <div className="metric-value">{total2D + total3D}</div>
              <div className="metric-subtitle">All uploaded layouts & renders</div>
            </div>
            <div className="card-metric accent-info">
              <div className="metric-title">📐 2D Layouts</div>
              <div className="metric-value">{total2D}</div>
              <div className="metric-subtitle">CAD blueprints & floor plans</div>
            </div>
            <div className="card-metric accent-warning">
              <div className="metric-title">🕶️ 3D Renders</div>
              <div className="metric-value">{total3D}</div>
              <div className="metric-subtitle">Perspective renders & walkthroughs</div>
            </div>
          </div>

          {/* Search + Type Filter Bar */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-control"
              placeholder="🔍 Search by client, company, file name, notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ maxWidth: '380px', padding: '10px 14px', fontSize: '14px', borderRadius: '8px' }}
            />
            <div className="date-presets" style={{ gap: '6px', flexWrap: 'wrap' }}>
              <button className={`preset-btn ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>
                All ({total2D + total3D})
              </button>
              <button className={`preset-btn ${typeFilter === '2d' ? 'active' : ''}`} onClick={() => setTypeFilter('2d')}>
                📐 2D ({total2D})
              </button>
              <button className={`preset-btn ${typeFilter === '3d' ? 'active' : ''}`} onClick={() => setTypeFilter('3d')}>
                🕶️ 3D ({total3D})
              </button>
            </div>
          </div>

          {/* Design History List Table */}
          <div className="panel" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className="panel-header" style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="panel-title">📜 Design Records</h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Showing {filteredDesigns.length} records</span>
            </div>

            <div className="table-container" style={{ flex: 1, overflowY: 'auto', maxHeight: '600px', margin: 0 }}>
              <table className="table-list" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>S.No</th>
                    <th>Client Name</th>
                    <th>Type / Classification</th>
                    <th>Prepared Date</th>
                    <th>Approved Date</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDesigns.map((d, index) => (
                    <tr key={d._id}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>{index + 1}</td>
                      <td>
                        <strong style={{ color: 'var(--text-main)' }}>{d.client?.company || 'N/A'}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Contact: {d.client?.name || 'N/A'}</div>
                        {d.acceptance_file_url && (
                          <div style={{ fontSize: '11.5px', color: '#10b981', marginTop: '2.5px', fontWeight: '800' }}>
                            📁 Acceptance copy attached
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${d.design_type === '2d' ? 'info' : 'warning'}`} style={{ fontSize: '11px', padding: '3px 8px' }}>
                          {d.design_type === '2d' ? '📐 2D Layout' : '🕶️ 3D Render'}
                        </span>
                      </td>
                      <td>{new Date(d.uploaded_at || d.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        {d.approval_status === 'approved' ? (
                          <span style={{ color: '#10b981', fontWeight: '700' }}>
                            ✅ {new Date(d.updatedAt).toLocaleDateString('en-IN')}
                          </span>
                        ) : d.approval_status === 'rejected' ? (
                          <span style={{ color: '#ef4444', fontWeight: '700' }}>❌ Rejected</span>
                        ) : (
                          <span style={{ color: '#b45309', fontWeight: '700', fontStyle: 'italic' }}>⏳ Pending</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setSelectedDesignForView(d)}
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            👁️ View
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteDesign(d._id)}
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDesigns.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)', fontStyle: 'italic' }}>
                        No designs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add Design Tab */}
      {activeTab === 'add_design' && (
        <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
          {/* Upload Form */}
          <form className="panel" onSubmit={handleUploadDesign} style={{ margin: 0 }}>
            <div className="panel-header">
              <h2 className="panel-title">📤 Upload / Register New Design</h2>
            </div>

            {/* Upload Mode Toggle */}
            <div className="date-presets" style={{ marginBottom: '20px', width: '100%' }}>
              <button
                type="button"
                className={`preset-btn ${uploadMode === 'url' ? 'active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setUploadMode('url')}
              >
                🔗 Add Link URL
              </button>
              <button
                type="button"
                className={`preset-btn ${uploadMode === 'file' ? 'active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setUploadMode('file')}
              >
                📁 Upload File
              </button>
            </div>

            <div className="form-group">
              <label>Select Sales Client</label>
              <select
                className="form-control" required
                value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
              >
                <option value="">Choose a client...</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.company} ({c.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Design Classification</label>
              <select
                className="form-control" required
                value={designType} onChange={e => setDesignType(e.target.value)}
              >
                <option value="2d">📐 2D Layout Plan (CAD / Blueprint)</option>
                <option value="3d">🕶️ 3D Perspective Render (Max / Sketchup)</option>
              </select>
            </div>

            {uploadMode === 'url' ? (
              <>
                <div className="form-group">
                  <label>File URL (Google Drive, Dropbox, etc.)</label>
                  <input
                    type="url"
                    className="form-control"
                    required
                    placeholder="https://drive.google.com/file/d/..."
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Paste a shareable link from Google Drive, Dropbox, OneDrive, etc.
                  </span>
                </div>
                <div className="form-group">
                  <label>Display Name (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. Master Bedroom 3D Render v2"
                    value={urlFileName}
                    onChange={e => setUrlFileName(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="form-group">
                <label>Choose File</label>
                <input
                  type="file" className="form-control" required ref={fileInputRef}
                  accept="image/*,application/pdf,.dwg,.dxf,.skp"
                  style={{ padding: '8px' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Accepts: images, PDF, DWG, DXF, SKP
                </span>
              </div>
            )}

            {/* Client Acceptance copy upload or link */}
            <div style={{ marginTop: '20px', borderTop: '1px dashed var(--card-border)', paddingTop: '16px', marginBottom: '16px' }}>
              <label style={{ fontWeight: '700', fontSize: '13px', display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>
                📁 Client Design Acceptance Copy (Optional)
              </label>
              
              <div className="date-presets" style={{ marginBottom: '14px', width: '100%' }}>
                <button
                  type="button"
                  className={`preset-btn ${acceptanceUploadMode === 'url' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '6px 12px', fontSize: '11px' }}
                  onClick={() => setAcceptanceUploadMode('url')}
                >
                  🔗 Add Acceptance Link URL
                </button>
                <button
                  type="button"
                  className={`preset-btn ${acceptanceUploadMode === 'file' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '6px 12px', fontSize: '11px' }}
                  onClick={() => setAcceptanceUploadMode('file')}
                >
                  📁 Upload Acceptance File
                </button>
              </div>

              {acceptanceUploadMode === 'url' ? (
                <>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px' }}>Client Acceptance Link URL</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://drive.google.com/file/d/..."
                      value={acceptanceUrlInput}
                      onChange={e => setAcceptanceUrlInput(e.target.value)}
                      style={{ fontSize: '12px', padding: '8px 12px' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px' }}>Display Name (optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="E.g. Signed Design Confirmation Document"
                      value={acceptanceUrlFileName}
                      onChange={e => setAcceptanceUrlFileName(e.target.value)}
                      style={{ fontSize: '12px', padding: '8px 12px' }}
                    />
                  </div>
                </>
              ) : (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px' }}>Acceptance Document File</label>
                  <input
                    type="file" 
                    className="form-control" 
                    ref={acceptanceFileInputRef}
                    accept="image/*,application/pdf"
                    style={{ padding: '6px 8px', fontSize: '12px' }}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Designer Notes / Description</label>
              <textarea
                className="form-control" placeholder="E.g. Approved layout for master bedroom wardrobe..."
                rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={uploading}>
              {uploading ? '⏳ Saving...' : '➕ Save Design'}
            </button>
          </form>
        </div>
      )}

      {/* --- DESIGN PREVIEW & SHARE MODAL --- */}
      {selectedDesignForView && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">🎨 Design File Details</h3>
              <button type="button" className="modal-close" onClick={() => setSelectedDesignForView(null)}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Client / Company</span>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                    {selectedDesignForView.client?.company || 'N/A'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Contact: {selectedDesignForView.client?.name || 'N/A'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Classification</span>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                    {designTypeLabels[selectedDesignForView.design_type] || selectedDesignForView.design_type}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Prepared Date</span>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginTop: '2px' }}>
                    {new Date(selectedDesignForView.uploaded_at || selectedDesignForView.createdAt).toLocaleDateString('en-IN')}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Approved Date</span>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginTop: '2px' }}>
                    {selectedDesignForView.approval_status === 'approved' 
                      ? new Date(selectedDesignForView.updatedAt).toLocaleDateString('en-IN') 
                      : 'Awaiting Approval'}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Approval Status</span>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '800',
                      background: selectedDesignForView.approval_status === 'approved' ? '#ecfdf5' : selectedDesignForView.approval_status === 'rejected' ? '#fef2f2' : '#fefce8',
                      color: selectedDesignForView.approval_status === 'approved' ? '#10b981' : selectedDesignForView.approval_status === 'rejected' ? '#ef4444' : '#b45309',
                      border: '1px solid currentColor'
                    }}>
                      {selectedDesignForView.approval_status ? selectedDesignForView.approval_status.toUpperCase() : 'PENDING'}
                    </span>
                    {selectedDesignForView.approval_notes && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px', fontStyle: 'italic' }}>
                        💬 "{selectedDesignForView.approval_notes}"
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>File Name</span>
                <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600', marginTop: '2px' }}>
                  {selectedDesignForView.file_name}
                </div>
              </div>

               <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Designer Notes / Remarks</span>
                <div style={{ fontSize: '13px', color: 'var(--text-main)', background: '#fafafa', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '4px', fontStyle: 'italic' }}>
                  {selectedDesignForView.notes || 'No description provided.'}
                </div>
              </div>

              {selectedDesignForView.acceptance_file_url && (
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>📄 Client Design Acceptance Copy</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <a
                      href={selectedDesignForView.acceptance_file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                    >
                      👁️ View Acceptance Copy ({selectedDesignForView.acceptance_file_name || 'Link/File'})
                    </a>
                  </div>
                </div>
              )}

              {/* Preview block */}
              {selectedDesignForView.file_url && selectedDesignForView.file_url.match(/\.(jpeg|jpg|gif|png|webp)/i) && selectedDesignForView.file_url.startsWith('/uploads/') ? (
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Image Preview</span>
                  <div style={{ width: '100%', maxHeight: '280px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', backgroundColor: '#e2e8f0', marginTop: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img src={selectedDesignForView.file_url} alt={selectedDesignForView.file_name} style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain' }} />
                  </div>
                </div>
              ) : (
                <div style={{ border: '1px dashed #cbd5e1', padding: '20px', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '6px' }}>
                  <span style={{ fontSize: '32px' }}>{(selectedDesignForView.file_url && (selectedDesignForView.file_url.startsWith('http://') || selectedDesignForView.file_url.startsWith('https://'))) ? '🔗' : '📄'}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', textAlign: 'center', wordBreak: 'break-all' }}>{selectedDesignForView.file_name}</span>
                  {(selectedDesignForView.file_url && (selectedDesignForView.file_url.startsWith('http://') || selectedDesignForView.file_url.startsWith('https://'))) && (
                    <span style={{ fontSize: '11px', color: 'var(--info)' }}>External Link (Google Drive / DropBox)</span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '8px' }}>
                <a
                  href={selectedDesignForView.file_url}
                  download={selectedDesignForView.file_name}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', textDecoration: 'none', padding: '8px 14px' }}
                >
                  📥 Download File
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const msg = `*LegendIn Design Share*\n\n*Client:* ${selectedDesignForView.client?.company || 'N/A'}\n*Design:* ${selectedDesignForView.file_name}\n*Type:* ${designTypeLabels[selectedDesignForView.design_type] || selectedDesignForView.design_type}\n*Notes:* ${selectedDesignForView.notes || 'None'}\n*Link:* ${window.location.origin}${selectedDesignForView.file_url}`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#075e54', padding: '8px 14px' }}
                >
                  💬 WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const subject = `LegendIn Design Share - ${selectedDesignForView.file_name}`;
                    const body = `Hello,\n\nPlease find the approved design details below:\n\nClient: ${selectedDesignForView.client?.company || 'N/A'}\nDesign: ${selectedDesignForView.file_name}\nType: ${designTypeLabels[selectedDesignForView.design_type] || selectedDesignForView.design_type}\nNotes: ${selectedDesignForView.notes || 'None'}\nLink: ${window.location.origin}${selectedDesignForView.file_url}\n\nBest regards,\nLegendIn Team`;
                    window.open(`mailto:${selectedDesignForView.client?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
                  }}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--primary)', padding: '8px 14px' }}
                >
                  ✉️ Email Share
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setSelectedDesignForView(null)} style={{ padding: '8px 16px' }}>
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
