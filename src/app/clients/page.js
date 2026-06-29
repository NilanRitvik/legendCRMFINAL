'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logActivity } from '@/lib/activityLogger';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // View mode & Search
  const [viewMode, setViewMode] = useState('board'); // board | list
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  
  // CLIENT LOOKUP DIRECTORY STATS
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');
  const [lookupClient, setLookupClient] = useState(null); // Selected client in directory
  const [lookupMode, setLookupMode] = useState('menu'); // menu | new_quote | new_invoice

  // Forms
  const [newClient, setNewClient] = useState({
    name: '', company: '', email: '', phone: '', source: 'website', stage: 'lead', approx_value: ''
  });
  
  // Quick Quotation Form
  const [quickQuote, setQuickQuote] = useState({
    quoted_value: '', scope_description: '', gst_rate: 18, has_gst: true
  });

  // Quick Invoice Form
  const [quickInvoice, setQuickInvoice] = useState({
    project: '', amount: '', type: 'advance', issue_date: '', due_date: ''
  });

  // Drag and Drop States
  const [draggingClientId, setDraggingClientId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const resClients = await fetch('/api/clients');
      const dataClients = await resClients.json();
      setClients(dataClients);

      const resQuotes = await fetch('/api/quotations');
      const dataQuotes = await resQuotes.json();
      setQuotations(dataQuotes);

      const resProj = await fetch('/api/projects');
      const dataProj = await resProj.json();
      setProjects(Array.isArray(dataProj) ? dataProj : []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers
  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newClient,
        approx_value: newClient.approx_value ? Number(newClient.approx_value) : 0
      };
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        // Log Activity
        await logActivity({
          action_type: 'create',
          module: 'clients',
          description: `Added new client: ${payload.name} from company ${payload.company}`,
          ref_id: created._id || '',
          ref_name: payload.name
        });

        setNewClient({ name: '', company: '', email: '', phone: '', source: 'website', stage: 'lead', approx_value: '' });
        setIsClientModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateClientStage = async (clientId, newStage, reason = '') => {
    try {
      const payload = { stage: newStage };
      if (newStage === 'lost') {
        payload.lost_reason = reason;
      }
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const clientObj = clients.find(c => c._id === clientId);
        const nameStr = clientObj ? clientObj.name : 'Unknown Client';
        
        // Log Activity
        await logActivity({
          action_type: 'update',
          module: 'clients',
          description: `Updated client stage for ${nameStr} to "${newStage}"${reason ? ` (Reason: ${reason})` : ''}`,
          ref_id: clientId,
          ref_name: nameStr
        });

        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragStart = (e, client) => {
    e.dataTransfer.setData('text/plain', client._id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingClientId(client._id);
  };

  const handleDragEnd = () => {
    setDraggingClientId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e, stageKey) => {
    e.preventDefault();
    if (dragOverStage !== stageKey) {
      setDragOverStage(stageKey);
    }
  };

  const handleDrop = async (e, stageKey) => {
    e.preventDefault();
    const clientId = e.dataTransfer.getData('text/plain') || draggingClientId;
    setDragOverStage(null);
    setDraggingClientId(null);
    
    if (!clientId) return;

    const client = clients.find(c => c._id === clientId);
    if (!client || client.stage === stageKey) return;

    if (stageKey === 'lost') {
      const reason = prompt('Enter reason for losing this client/deal:');
      if (reason !== null) {
        await handleUpdateClientStage(clientId, stageKey, reason);
      }
    } else {
      await handleUpdateClientStage(clientId, stageKey);
    }
  };

  // Quick Quotation submit
  const handleQuickQuoteSubmit = async (e) => {
    e.preventDefault();
    if (!lookupClient) return;
    try {
      const value = Number(quickQuote.quoted_value);
      const payload = {
        client: lookupClient._id,
        scope_description: quickQuote.scope_description,
        quoted_value: value,
        has_gst: quickQuote.has_gst,
        gst_rate: Number(quickQuote.gst_rate) || 18,
        items: [{
          product_name: quickQuote.scope_description,
          quantity: 1,
          unit_value: value,
          discount: 0,
          final_value: value
        }]
      };

      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        // Log Activity
        await logActivity({
          action_type: 'create',
          module: 'clients',
          description: `Generated quick quotation for client: ${lookupClient.company} (${lookupClient.name}) worth ₹${value.toLocaleString()}`,
          ref_id: created._id || '',
          ref_name: `Quote for ${lookupClient.company}`
        });

        alert('Quotation generated successfully!');
        setQuickQuote({ quoted_value: '', scope_description: '', gst_rate: 18, has_gst: true });
        setLookupMode('menu');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create quotation');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating quotation');
    }
  };

  // Quick Invoice submit
  const handleQuickInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!quickInvoice.project) return alert('Please select a project');
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: quickInvoice.project,
          amount: Number(quickInvoice.amount),
          type: quickInvoice.type,
          issue_date: quickInvoice.issue_date,
          due_date: quickInvoice.due_date
        })
      });

      if (res.ok) {
        const created = await res.json();
        const projObj = projects.find(p => p._id === quickInvoice.project);
        const projName = projObj ? projObj.name : 'Unknown Project';

        // Log Activity
        await logActivity({
          action_type: 'create',
          module: 'invoices',
          description: `Generated project invoice for ${projName} worth ₹${Number(quickInvoice.amount).toLocaleString()}`,
          ref_id: created._id || '',
          ref_name: `Invoice for ${projName}`
        });

        alert('Invoice generated successfully!');
        setQuickInvoice({ project: '', amount: '', type: 'advance', issue_date: '', due_date: '' });
        setLookupMode('menu');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to generate invoice');
      }
    } catch (err) {
      console.error(err);
      alert('Error generating invoice');
    }
  };

  const stages = [
    { key: 'lead', name: 'Lead', color: 'info' },
    { key: 'prospect', name: 'Prospect', color: 'warning' },
    { key: 'quotation_sent', name: 'Quotation Sent', color: 'primary' },
    { key: 'won', name: 'Won (Client)', color: 'success' },
    { key: 'lost', name: 'Lost', color: 'danger' }
  ];

  const getClientQuotes = (clientId) => {
    return quotations.filter(q => q.client && q.client._id === clientId);
  };

  // Filter clients for pipeline board
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery)) ||
    c.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter clients for lookup list
  const filteredLookupClients = clients.filter(c => 
    c.name.toLowerCase().includes(lookupSearch.toLowerCase()) ||
    c.company.toLowerCase().includes(lookupSearch.toLowerCase())
  );

  // Compute stats for each stage
  const stageStats = stages.map(st => {
    const stageClients = clients.filter(c => c.stage === st.key);
    const totalVal = stageClients.reduce((sum, c) => {
      const quotes = getClientQuotes(c._id);
      const quoteVal = quotes.reduce((s, q) => s + q.quoted_value, 0);
      return sum + (quoteVal > 0 ? quoteVal : (c.approx_value || 0));
    }, 0);
    return {
      ...st,
      count: stageClients.length,
      value: totalVal
    };
  });

  const renderListView = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {stages.map(st => {
          const stageClients = filteredClients
            .filter(c => c.stage === st.key)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          return (
            <div 
              key={st.key}
              className={`panel ${dragOverStage === st.key ? 'drag-over' : ''}`}
              style={{ 
                margin: 0, 
                borderLeft: `4px solid var(--${st.color})`,
                transition: 'background-color 0.2s',
                backgroundColor: dragOverStage === st.key ? 'rgba(0,0,0,0.02)' : '#ffffff'
              }}
              onDragOver={(e) => handleDragOver(e, st.key)}
              onDrop={(e) => handleDrop(e, st.key)}
            >
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--card-border)', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: `var(--${st.color})` }} />
                  {st.name}
                </h3>
                <span className="badge badge-secondary" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  {stageClients.length} of {clients.filter(c => c.stage === st.key).length} Leads
                </span>
              </div>

              <div className="table-container" style={{ marginTop: '10px' }}>
                <table className="table-list" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Name / Contact</th>
                      <th>Company</th>
                      <th>Source</th>
                      <th>Project Value</th>
                      <th>Created Date</th>
                      <th>Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageClients.map(client => {
                      const clientQuotes = getClientQuotes(client._id);
                      const totalQuoted = clientQuotes.reduce((sum, q) => sum + q.quoted_value, 0);

                      return (
                        <tr 
                          key={client._id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, client)}
                          onDragEnd={handleDragEnd}
                          style={{ 
                            cursor: 'grab', 
                            backgroundColor: draggingClientId === client._id ? '#fdf2f4' : 'inherit',
                            opacity: draggingClientId === client._id ? 0.6 : 1
                          }}
                          onClick={(e) => {
                            if (e.target.tagName !== 'SELECT') {
                              router.push(`/clients/${client._id}`);
                            }
                          }}
                        >
                          <td style={{ fontWeight: '600' }}>
                            {client.name}
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>{client.email}</div>
                          </td>
                          <td>{client.company}</td>
                          <td style={{ textTransform: 'capitalize' }}>
                            <span className="funnel-card-source" style={{ fontSize: '10px' }}>{client.source}</span>
                          </td>
                          <td style={{ fontWeight: '700' }}>
                            {clientQuotes.length > 0 ? (
                              <span style={{ color: 'var(--primary)' }}>
                                ₹{totalQuoted.toLocaleString()}
                              </span>
                            ) : client.approx_value > 0 ? (
                              `₹${client.approx_value.toLocaleString()}`
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>{new Date(client.createdAt).toLocaleDateString('en-IN')}</td>
                          <td>
                            <select 
                              className="form-control"
                              style={{ padding: '4px 8px', fontSize: '12px', width: '130px', display: 'inline-block' }}
                              value={client.stage}
                              onChange={async (e) => {
                                const newSt = e.target.value;
                                if (newSt === 'lost') {
                                  const reason = prompt('Enter reason for losing this client/deal:');
                                  if (reason !== null) {
                                    await handleUpdateClientStage(client._id, newSt, reason);
                                  }
                                } else {
                                  await handleUpdateClientStage(client._id, newSt);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {stages.map(s => (
                                <option key={s.key} value={s.key}>{s.name}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                    {stageClients.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '24px' }}>
                          No leads match search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {/* Header section */}
      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>Client Pipeline</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage leads, prospects, and quotation conversions</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsLookupOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
          >
            🔍 Client Lookup Directory
          </button>
          
          <div className="date-presets" style={{ margin: 0 }}>
            <button className={`preset-btn ${viewMode === 'board' ? 'active' : ''}`} onClick={() => setViewMode('board')}>📋 Board</button>
            <button className={`preset-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>📝 List</button>
          </div>
          <button className="btn btn-primary" onClick={() => setIsClientModalOpen(true)}>
            <span>➕</span> Add New Client
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '24px' }}>
        <input 
          type="text" 
          className="form-control" 
          placeholder="🔍 Search pipeline board..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ maxWidth: '400px', padding: '10px 14px', fontSize: '14px', borderRadius: '8px' }}
        />
      </div>

      {/* Dynamic Status-wise Stats Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '16px',
        marginBottom: '28px',
        backgroundColor: '#ffffff',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--border-radius)',
        padding: '16px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {stageStats.map(st => (
          <div key={st.key} style={{ borderRight: st.key !== 'lost' ? '1px solid #e2e8f0' : 'none', paddingRight: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: `var(--${st.color})` }} />
              {st.name}
            </span>
            <div style={{ fontSize: '18px', fontWeight: '850', color: 'var(--text-main)', marginTop: '4px' }}>
              {st.count} <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)' }}>Leads</span>
            </div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', marginTop: '2px' }}>
              ₹{st.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-muted)', fontSize: '18px' }}>
          Loading Pipeline...
        </div>
      ) : (
        viewMode === 'board' ? (
          <div className={`funnel-board ${draggingClientId ? 'dragging-active' : ''}`}>
            {stages.map(st => {
              const stageClients = filteredClients
                .filter(c => c.stage === st.key)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

              return (
                <div 
                  key={st.key} 
                  className={`funnel-column ${dragOverStage === st.key ? 'drag-over' : ''}`}
                  onDragOver={(e) => handleDragOver(e, st.key)}
                  onDrop={(e) => handleDrop(e, st.key)}
                  style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}
                >
                  <div className="funnel-column-header">
                    <div className="funnel-column-title">
                      <span style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: `var(--${st.color})`
                      }} />
                      {st.name}
                    </div>
                    <span className="funnel-column-count">{stageClients.length}</span>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px', 
                    flex: 1,
                    maxHeight: '480px',
                    overflowY: 'auto',
                    paddingRight: '4px'
                  }}>
                    {stageClients.map(client => {
                      const clientQuotes = getClientQuotes(client._id);
                      const totalQuoted = clientQuotes.reduce((sum, q) => sum + q.quoted_value, 0);

                      return (
                        <div 
                          key={client._id} 
                          className={`funnel-card ${draggingClientId === client._id ? 'dragging' : ''}`}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, client)}
                          onDragEnd={handleDragEnd}
                          onClick={() => router.push(`/clients/${client._id}`)}
                        >
                          <div className="funnel-card-name">{client.name}</div>
                          <div className="funnel-card-company">{client.company}</div>
                          
                          {client.approx_value > 0 && (
                            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px' }}>
                              Value: <span style={{ color: 'var(--primary)' }}>₹{client.approx_value.toLocaleString()}</span>
                            </div>
                          )}

                          {clientQuotes.length > 0 && (
                            <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--primary)', marginTop: '4px' }}>
                              {clientQuotes.length} Quote(s): ₹{totalQuoted.toLocaleString()}
                            </div>
                          )}

                          <div className="funnel-card-meta">
                            <span className="funnel-card-source">{client.source}</span>
                            <span style={{ fontSize: '9px', color: 'var(--text-light)' }}>
                              {new Date(client.createdAt).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {stageClients.length === 0 && (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '30px 10px', 
                        color: 'var(--text-light)', 
                        fontSize: '12px',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff'
                      }}>
                        No leads in stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          renderListView()
        )
      )}

      {/* ─── MODALS ─── */}

      {/* 1. Add Client Modal */}
      {isClientModalOpen && (
        <div className="modal-backdrop">
          <form className="modal-content" style={{ maxWidth: '800px', width: '90%' }} onSubmit={handleCreateClient}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Client</h3>
              <button type="button" className="modal-close" onClick={() => setIsClientModalOpen(false)}>×</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: '600' }}>Contact Name</label>
                  <input type="text" className="form-control" required value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
                </div>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: '600' }}>Company Name</label>
                  <input type="text" className="form-control" required value={newClient.company} onChange={e => setNewClient({ ...newClient, company: e.target.value })} />
                </div>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: '600' }}>Email Address</label>
                  <input type="email" className="form-control" required value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
                </div>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: '600' }}>Phone Number</label>
                  <input type="text" className="form-control" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: '600' }}>Approximate Project Value (₹)</label>
                  <input type="number" className="form-control" placeholder="E.g. 500000" value={newClient.approx_value} onChange={e => setNewClient({ ...newClient, approx_value: e.target.value })} />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: '600' }}>Lead Source</label>
                  <select className="form-control" value={newClient.source} onChange={e => setNewClient({ ...newClient, source: e.target.value })}>
                    <option value="referral">Referral</option>
                    <option value="website">Website</option>
                    <option value="social">Social Media</option>
                    <option value="cold outreach">Cold Outreach</option>
                  </select>
                </div>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: '600' }}>Initial Pipeline Stage</label>
                  <select className="form-control" value={newClient.stage} onChange={e => setNewClient({ ...newClient, stage: e.target.value })}>
                    <option value="lead">Lead</option>
                    <option value="prospect">Prospect</option>
                    <option value="quotation_sent">Quotation Sent</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsClientModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Client</button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Client Lookup Directory Modal (Lookup Popup) */}
      {isLookupOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ borderBottom: '2px solid var(--primary-light)', paddingBottom: '12px' }}>
              <div>
                <h3 className="modal-title">👥 Client Lookup Directory</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Search and select a client to raise a new quotation or invoice.</p>
              </div>
              <button type="button" className="modal-close" onClick={() => { setIsLookupOpen(false); setLookupClient(null); setLookupMode('menu'); }}>×</button>
            </div>

            {/* IF NO CLIENT SELECTED YET */}
            {!lookupClient ? (
              <div style={{ marginTop: '16px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="🔍 Search client company / contact name..."
                  value={lookupSearch}
                  onChange={e => setLookupSearch(e.target.value)}
                  style={{ width: '100%', marginBottom: '16px' }}
                />
                
                <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table className="table-list" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Company Name</th>
                        <th>Contact Person</th>
                        <th>Email / Phone</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLookupClients.map(c => (
                        <tr key={c._id}>
                          <td style={{ fontWeight: '700' }}>{c.company}</td>
                          <td>{c.name}</td>
                          <td>{c.email} {c.phone ? `· ${c.phone}` : ''}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-primary" 
                              onClick={() => { setLookupClient(c); setLookupMode('menu'); }}
                            >
                              Select Client
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredLookupClients.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '24px' }}>
                            No clients found matching search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // CLIENT SELECTED
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                <div style={{ padding: '12px 16px', background: 'var(--primary-light)', borderRadius: '8px', border: '1px solid var(--primary-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--primary)', fontWeight: '800' }}>
                      Selected: {lookupClient.company} ({lookupClient.name})
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Email: {lookupClient.email} | Phone: {lookupClient.phone || '—'}</span>
                  </div>
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={() => { setLookupClient(null); setLookupMode('menu'); }}
                  >
                    Change Client
                  </button>
                </div>

                {/* MENU VIEW */}
                {lookupMode === 'menu' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Select the document or action you wish to perform for this client:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <button 
                        onClick={() => setLookupMode('new_quote')}
                        className="btn btn-primary" 
                        style={{ padding: '20px', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: '800' }}
                      >
                        📄 Raise New Quotation
                        <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'rgba(255,255,255,0.8)' }}>Create a detailed price estimate</span>
                      </button>

                      <button 
                        onClick={() => {
                          const clientProjects = projects.filter(p => p.client && p.client._id === lookupClient._id);
                          if (clientProjects.length === 0) {
                            alert("This client does not have any active projects. You must accept a Quotation to create a Project first!");
                            return;
                          }
                          setQuickInvoice({ ...quickInvoice, project: clientProjects[0]._id });
                          setLookupMode('new_invoice');
                        }}
                        className="btn btn-secondary" 
                        style={{ padding: '20px', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: '800', border: '1px solid var(--primary-border)' }}
                      >
                        🧾 Generate Project Invoice
                        <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-muted)' }}>Bill against active interior projects</span>
                      </button>
                    </div>

                    <button 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setIsLookupOpen(false);
                        router.push(`/clients/${lookupClient._id}`);
                      }}
                      style={{ marginTop: '8px', alignSelf: 'center' }}
                    >
                      📂 Go to Full Client Profile & technical Vault
                    </button>
                  </div>
                )}

                {/* NEW QUICK QUOTATION FORM */}
                {lookupMode === 'new_quote' && (
                  <form onSubmit={handleQuickQuoteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>✍️ Raise Quotation for {lookupClient.company}</h4>
                    
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Quotation Scope / Description</label>
                      <input 
                        type="text" className="form-control" required 
                        placeholder="E.g. Modular Kitchen & TV Console Woodwork"
                        value={quickQuote.scope_description} 
                        onChange={e => setQuickQuote({ ...quickQuote, scope_description: e.target.value })} 
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Quoted Value Amount (₹)</label>
                        <input 
                          type="number" className="form-control" required 
                          placeholder="E.g. 150000"
                          value={quickQuote.quoted_value} 
                          onChange={e => setQuickQuote({ ...quickQuote, quoted_value: e.target.value })} 
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>GST Option</label>
                        <select 
                          className="form-control"
                          value={quickQuote.has_gst ? 'yes' : 'no'}
                          onChange={e => setQuickQuote({ ...quickQuote, has_gst: e.target.value === 'yes', gst_rate: e.target.value === 'yes' ? 18 : 0 })}
                        >
                          <option value="yes">GST 18% (Apply)</option>
                          <option value="no">No GST / Exempt</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setLookupMode('menu')}>Back</button>
                      <button type="submit" className="btn btn-primary">Generate Quotation</button>
                    </div>
                  </form>
                )}

                {/* NEW QUICK INVOICE FORM */}
                {lookupMode === 'new_invoice' && (
                  <form onSubmit={handleQuickInvoiceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>🧾 Generate Invoice for {lookupClient.company}</h4>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Select Project</label>
                      <select 
                        className="form-control" required
                        value={quickInvoice.project}
                        onChange={e => setQuickInvoice({ ...quickInvoice, project: e.target.value })}
                      >
                        {projects.filter(p => p.client && p.client._id === lookupClient._id).map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Billing Amount (₹)</label>
                        <input 
                          type="number" className="form-control" required
                          placeholder="Amount in INR"
                          value={quickInvoice.amount}
                          onChange={e => setQuickInvoice({ ...quickInvoice, amount: e.target.value })}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Invoice Category Type</label>
                        <select 
                          className="form-control"
                          value={quickInvoice.type}
                          onChange={e => setQuickInvoice({ ...quickInvoice, type: e.target.value })}
                        >
                          <option value="advance">Advance Payment</option>
                          <option value="milestone">Milestone Billing</option>
                          <option value="final">Final Payment</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Issue Date</label>
                        <input 
                          type="date" className="form-control" required
                          value={quickInvoice.issue_date}
                          onChange={e => setQuickInvoice({ ...quickInvoice, issue_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Due Date</label>
                        <input 
                          type="date" className="form-control" required
                          value={quickInvoice.due_date}
                          onChange={e => setQuickInvoice({ ...quickInvoice, due_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setLookupMode('menu')}>Back</button>
                      <button type="submit" className="btn btn-primary">Generate Invoice</button>
                    </div>
                  </form>
                )}

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
