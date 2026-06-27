'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AMCPage() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [amcs, setAmcs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [dashboardFilter, setDashboardFilter] = useState('all'); // all | paid | pending | expired
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedAmc, setSelectedAmc] = useState(null);

  // Forms
  const [newAmc, setNewAmc] = useState({
    client: '', product: '', start_date: '', end_date: '', amount: ''
  });

  const [newPayment, setNewPayment] = useState({
    amount: '', payment_date: '', method: 'Bank Transfer', category: 'partial', transaction_number: '', bank_account_received: ''
  });

  const [renewData, setRenewData] = useState({
    start_date: '', end_date: '', amount: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const resClients = await fetch('/api/clients');
      const dataClients = await resClients.json();
      setClients(dataClients);

      const resAmcs = await fetch('/api/amc');
      const dataAmcs = await resAmcs.json();
      setAmcs(dataAmcs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers
  const handleCreateAmc = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/amc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAmc,
          amount: Number(newAmc.amount)
        })
      });
      if (res.ok) {
        setNewAmc({ client: '', product: '', start_date: '', end_date: '', amount: '' });
        setIsCreateModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create AMC');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAmc = async (id) => {
    if (!confirm('Are you sure you want to delete this AMC contract? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/amc/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenewAmc = async (e) => {
    e.preventDefault();
    if (!selectedAmc) return;
    try {
      const res = await fetch(`/api/amc/${selectedAmc._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: renewData.start_date,
          end_date: renewData.end_date,
          amount: Number(renewData.amount),
          status: 'renewed'
        })
      });
      if (res.ok) {
        setIsRenewModalOpen(false);
        setSelectedAmc(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!selectedAmc) return;
    try {
      const res = await fetch(`/api/amc/${selectedAmc._id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment)
      });
      if (res.ok) {
        setNewPayment({
          amount: '', payment_date: '', method: 'Bank Transfer', category: 'partial', transaction_number: '', bank_account_received: ''
        });
        const updatedAmc = await res.json();
        setSelectedAmc(updatedAmc);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations Helper
  const getAmcPaid = (amc) => {
    return amc.payments ? amc.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
  };

  const getRemainingMonths = (endDateStr) => {
    const end = new Date(endDateStr);
    const today = new Date();
    const diffTime = end - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.4));
  };

  // Dashboard Stats Calculations
  const uniqueClients = [...new Set(amcs.map(a => a.client?._id))].length;
  const totalValue = amcs.reduce((sum, a) => sum + a.amount, 0);
  const totalPaid = amcs.reduce((sum, a) => sum + getAmcPaid(a), 0);
  const totalPending = Math.max(0, totalValue - totalPaid);

  // Filter lists based on Search & Dashboard Card Filters
  const filteredAmcs = amcs.filter(amc => {
    const paid = getAmcPaid(amc);
    const balance = Math.max(0, amc.amount - paid);
    const months = getRemainingMonths(amc.end_date);
    
    // Dashboard Card Filter
    if (dashboardFilter === 'paid' && balance > 0) return false;
    if (dashboardFilter === 'pending' && balance === 0) return false;
    if (dashboardFilter === 'expired' && months > 0) return false;

    // Search Query Filter
    const q = searchQuery.toLowerCase();
    const clientCompany = amc.client ? amc.client.company.toLowerCase() : '';
    const product = amc.product.toLowerCase();
    return clientCompany.includes(q) || product.includes(q);
  });

  return (
    <div>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>Annual Maintenance Contracts (AMC)</h1>
          <p style={{ color: 'var(--text-muted)' }}>Monitor contract durations, renewal dates, and payment balances for recurring products</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
          <span>➕</span> Add AMC Contract
        </button>
      </div>

      {/* Advanced Filter KPI Dashboard Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '28px'
      }}>
        <div 
          className={`card-metric accent-info ${dashboardFilter === 'all' ? 'active-filter' : ''}`}
          onClick={() => setDashboardFilter('all')}
          style={{ cursor: 'pointer', border: dashboardFilter === 'all' ? '2px solid var(--primary)' : '1px solid var(--card-border)' }}
        >
          <div className="metric-title">Total AMC Value / Contracts</div>
          <div className="metric-value">₹{totalValue.toLocaleString()}</div>
          <div className="metric-subtitle">{amcs.length} Active Contracts ({uniqueClients} Clients)</div>
        </div>
        
        <div 
          className={`card-metric accent-success ${dashboardFilter === 'paid' ? 'active-filter' : ''}`}
          onClick={() => setDashboardFilter('paid')}
          style={{ cursor: 'pointer', border: dashboardFilter === 'paid' ? '2px solid var(--primary)' : '1px solid var(--card-border)' }}
        >
          <div className="metric-title">Total Paid (Recovered)</div>
          <div className="metric-value" style={{ color: 'var(--success)' }}>₹{totalPaid.toLocaleString()}</div>
          <div className="metric-subtitle">Payments logged successfully</div>
        </div>

        <div 
          className={`card-metric accent-warning ${dashboardFilter === 'pending' ? 'active-filter' : ''}`}
          onClick={() => setDashboardFilter('pending')}
          style={{ cursor: 'pointer', border: dashboardFilter === 'pending' ? '2px solid var(--primary)' : '1px solid var(--card-border)' }}
        >
          <div className="metric-title">Pending AMC Revenue</div>
          <div className="metric-value" style={{ color: 'var(--primary)' }}>₹{totalPending.toLocaleString()}</div>
          <div className="metric-subtitle">Owed balance to be collected</div>
        </div>

        <div 
          className={`card-metric accent-danger ${dashboardFilter === 'expired' ? 'active-filter' : ''}`}
          onClick={() => setDashboardFilter('expired')}
          style={{ cursor: 'pointer', border: dashboardFilter === 'expired' ? '2px solid var(--primary)' : '1px solid var(--card-border)' }}
        >
          <div className="metric-title">Expired / Expiring AMCs</div>
          <div className="metric-value" style={{ color: 'var(--danger)' }}>
            {amcs.filter(a => getRemainingMonths(a.end_date) <= 0).length} Contracts
          </div>
          <div className="metric-subtitle">Requires immediate renewal</div>
        </div>
      </div>

      {/* Search Bar & Stats info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <input 
          type="text" 
          className="form-control" 
          placeholder="🔍 Search AMCs by Client Company or Product..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ maxWidth: '400px', padding: '10px 14px', fontSize: '14px', borderRadius: '8px' }}
        />
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
          Showing {filteredAmcs.length} of {amcs.length} Contracts
        </div>
      </div>

      {/* Main List Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-muted)', fontSize: '18px' }}>
          Loading AMC Records...
        </div>
      ) : (
        <div className="panel" style={{ margin: 0 }}>
          <div className="table-container">
            <table className="table-list">
              <thead>
                <tr>
                  <th>Client Company</th>
                  <th>Product Details</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Remaining Months</th>
                  <th>Total Contract</th>
                  <th>Paid Amount</th>
                  <th>Balance Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAmcs.map(amc => {
                  const paid = getAmcPaid(amc);
                  const balance = Math.max(0, amc.amount - paid);
                  const remainingMonths = getRemainingMonths(amc.end_date);
                  
                  let monthsColor = 'var(--text-main)';
                  let monthsText = `${remainingMonths} months`;
                  if (remainingMonths <= 0) {
                    monthsColor = 'var(--danger)';
                    monthsText = 'Expired';
                  } else if (remainingMonths <= 1) {
                    monthsColor = 'var(--danger)';
                    monthsText = 'Expiring (<1mo)';
                  } else if (remainingMonths <= 6) {
                    monthsColor = 'var(--warning)';
                  } else {
                    monthsColor = 'var(--success)';
                  }

                  return (
                    <tr key={amc._id} style={{ backgroundColor: remainingMonths <= 0 ? '#fff5f5' : 'inherit' }}>
                      <td>
                        <strong>{amc.client ? amc.client.company : 'N/A'}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{amc.client ? amc.client.name : ''}</div>
                      </td>
                      <td>{amc.product}</td>
                      <td>{new Date(amc.start_date).toLocaleDateString()}</td>
                      <td>{new Date(amc.end_date).toLocaleDateString()}</td>
                      <td>
                        <span style={{ color: monthsColor, fontWeight: '800' }}>{monthsText}</span>
                      </td>
                      <td style={{ fontWeight: '700' }}>₹{amc.amount.toLocaleString()}</td>
                      <td style={{ color: 'var(--success)', fontWeight: '600' }}>₹{paid.toLocaleString()}</td>
                      <td style={{ color: balance > 0 ? 'var(--primary)' : 'inherit', fontWeight: '700' }}>
                        ₹{balance.toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              setSelectedAmc(amc);
                              setNewPayment({
                                ...newPayment,
                                amount: balance
                              });
                              setIsPaymentModalOpen(true);
                            }}
                          >
                            💸 Payments Details
                          </button>
                          
                          <button 
                            className="btn btn-sm btn-secondary" style={{ color: '#0f766e' }}
                            onClick={() => {
                              setSelectedAmc(amc);
                              setRenewData({
                                start_date: new Date(amc.end_date).toISOString().substring(0, 10),
                                end_date: new Date(new Date(amc.end_date).setFullYear(new Date(amc.end_date).getFullYear() + 1)).toISOString().substring(0, 10),
                                amount: amc.amount
                              });
                              setIsRenewModalOpen(true);
                            }}
                          >
                            🔄 Renew
                          </button>
                          
                          <button 
                            className="btn btn-sm btn-danger" style={{ padding: '4px 8px' }}
                            onClick={() => handleDeleteAmc(amc._id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAmcs.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                      No AMC contracts found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Add New AMC Contract */}
      {isCreateModalOpen && (
        <div className="modal-backdrop">
          <form className="modal-content" style={{ maxWidth: '600px' }} onSubmit={handleCreateAmc}>
            <div className="modal-header">
              <h3 className="modal-title">Add New AMC Contract</h3>
              <button type="button" className="modal-close" onClick={() => setIsCreateModalOpen(false)}>×</button>
            </div>
            
            <div className="form-group">
              <label>Select Client</label>
              <select 
                className="form-control" required
                value={newAmc.client} onChange={e => setNewAmc({ ...newAmc, client: e.target.value })}
              >
                <option value="">-- Select Client Company --</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.company}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Product / Scope Details</label>
              <input 
                type="text" className="form-control" required placeholder="E.g. Interior Design Maintenance Contract / Software License"
                value={newAmc.product} onChange={e => setNewAmc({ ...newAmc, product: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Start Date</label>
                <input 
                  type="date" className="form-control" required
                  value={newAmc.start_date} onChange={e => setNewAmc({ ...newAmc, start_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input 
                  type="date" className="form-control" required
                  value={newAmc.end_date} onChange={e => setNewAmc({ ...newAmc, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Total Annual Amount (₹)</label>
              <input 
                type="number" className="form-control" required placeholder="E.g. 12000"
                value={newAmc.amount} onChange={e => setNewAmc({ ...newAmc, amount: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Contract</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: AMC Payments & Balance Details */}
      {isPaymentModalOpen && selectedAmc && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">💸 AMC Payment Workspace</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Client: <strong>{selectedAmc.client?.company}</strong> | Product: <strong>{selectedAmc.product}</strong>
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => { setIsPaymentModalOpen(false); setSelectedAmc(null); }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px', marginTop: '16px', alignItems: 'start' }}>
              
              {/* Left Column: Payments Log list */}
              <div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  backgroundColor: 'var(--background-alt)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: '1px solid var(--card-border)'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--success)' }}>Total Paid</span>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--success)', marginTop: '2px' }}>
                      ₹{getAmcPaid(selectedAmc).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)' }}>Remaining Balance</span>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)', marginTop: '2px' }}>
                      ₹{Math.max(0, selectedAmc.amount - getAmcPaid(selectedAmc)).toLocaleString()}
                    </div>
                  </div>
                </div>

                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>Payment Logs History</h4>
                <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <table className="table-list" style={{ fontSize: '11px' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Method / Ref</th>
                        <th>Category</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAmc.payments && selectedAmc.payments.map((p, idx) => (
                        <tr key={idx}>
                          <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td>
                            <strong>{p.method}</strong>
                            {p.transaction_number && (
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                {p.method} Ref: {p.transaction_number}
                              </div>
                            )}
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>
                            <span className="funnel-card-source" style={{ fontSize: '9px', padding: '1px 4px' }}>{p.category}</span>
                          </td>
                          <td style={{ color: 'var(--success)', fontWeight: '700' }}>+₹{p.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                      {(!selectedAmc.payments || selectedAmc.payments.length === 0) && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-light)' }}>
                            No payments logged yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Log New Payment Form */}
              <form onSubmit={handleAddPayment} className="panel" style={{ margin: 0, padding: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', marginBottom: '12px' }}>
                  Log AMC Payment
                </h4>

                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px' }}>Payment Amount (₹)</label>
                  <input 
                    type="number" className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }} required
                    value={newPayment.amount} onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px' }}>Received in Account / Wallet</label>
                  <input 
                    type="text" className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }}
                    placeholder="E.g. Bank Account / UPI ID"
                    value={newPayment.bank_account_received} onChange={e => setNewPayment({ ...newPayment, bank_account_received: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px' }}>Transaction ID / Reference</label>
                  <input 
                    type="text" className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }}
                    placeholder="E.g. UPI Ref / Bank Reference"
                    value={newPayment.transaction_number} onChange={e => setNewPayment({ ...newPayment, transaction_number: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '11px' }}>Date Paid</label>
                    <input 
                      type="date" className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }} required
                      value={newPayment.payment_date} onChange={e => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '11px' }}>Method</label>
                    <select 
                      className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }}
                      value={newPayment.method} onChange={e => setNewPayment({ ...newPayment, method: e.target.value })}
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="Google Pay">Google Pay</option>
                      <option value="PhonePe">PhonePe</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px' }}>Split Category</label>
                  <select 
                    className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }}
                    value={newPayment.category} onChange={e => setNewPayment({ ...newPayment, category: e.target.value })}
                  >
                    <option value="advance">Advance Payment</option>
                    <option value="partial">Partial Payment</option>
                    <option value="full">Full Payment</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-sm btn-primary" 
                  style={{ width: '100%' }}
                  disabled={Math.max(0, selectedAmc.amount - getAmcPaid(selectedAmc)) <= 0}
                >
                  Submit Payment Record
                </button>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Renew AMC Contract */}
      {isRenewModalOpen && selectedAmc && (
        <div className="modal-backdrop">
          <form className="modal-content" style={{ maxWidth: '550px' }} onSubmit={handleRenewAmc}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">🔄 Renew AMC Contract</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Client: <strong>{selectedAmc.client?.company}</strong> | Product: <strong>{selectedAmc.product}</strong>
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => { setIsRenewModalOpen(false); setSelectedAmc(null); }}>×</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
              <div className="form-group">
                <label>New Start Date</label>
                <input 
                  type="date" className="form-control" required
                  value={renewData.start_date} onChange={e => setRenewData({ ...renewData, start_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>New End Date</label>
                <input 
                  type="date" className="form-control" required
                  value={renewData.end_date} onChange={e => setRenewData({ ...renewData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Renewal Amount (₹)</label>
              <input 
                type="number" className="form-control" required
                value={renewData.amount} onChange={e => setRenewData({ ...renewData, amount: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setIsRenewModalOpen(false); setSelectedAmc(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Process Renewal</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
