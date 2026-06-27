'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ClientDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState('overview'); // overview | credentials | billing | quotations | quotation_history

  // Client Form
  const [editClient, setEditClient] = useState({
    name: '', company: '', email: '', phone: '', source: '', stage: '', lost_reason: '', approx_value: ''
  });

  // Quotation Form State
  const [quoteItems, setQuoteItems] = useState([
    { product_name: '', description: '', quantity: 1, unit_value: '', discount: '' }
  ]);
  const [quoteScope, setQuoteScope] = useState('');
  const [quoteDiscount, setQuoteDiscount] = useState('');
  const [quoteHasGst, setQuoteHasGst] = useState(true);
  const [quoteGstRate, setQuoteGstRate] = useState(18);

  // Project Forms (Credentials & Links)
  const [editingProject, setEditingProject] = useState(null);
  const [projectLinks, setProjectLinks] = useState({
    product_link: '', github_link: '', file_source_link: '',
    token_contract_address: '', username: '', password: '',
    private_key: '', seed_phrase: ''
  });

  // Invoice Form
  const [newInvoice, setNewInvoice] = useState({
    project: '', invoice_number: 'Auto-generated', amount: '', type: 'advance', issue_date: '', due_date: ''
  });

  // Payment Form
  const [newPayment, setNewPayment] = useState({
    invoice: '', project: '', amount: '', payment_date: '', method: 'Bank Transfer', bank_account_received: '', category: 'partial', transaction_number: ''
  });
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [projectBillingFilter, setProjectBillingFilter] = useState('all');
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editingQuotation, setEditingQuotation] = useState(null);

  // Fetch client details
  const fetchClientData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Client Info
      const resClient = await fetch(`/api/clients/${id}`);
      if (!resClient.ok) {
        throw new Error('Client not found');
      }
      const dataClient = await resClient.json();
      setClient(dataClient);
      setEditClient({
        name: dataClient.name,
        company: dataClient.company,
        email: dataClient.email,
        phone: dataClient.phone || '',
        source: dataClient.source,
        stage: dataClient.stage,
        lost_reason: dataClient.lost_reason || '',
        approx_value: dataClient.approx_value || ''
      });

      // 2. Fetch Projects
      const resProj = await fetch('/api/projects');
      const dataProj = await resProj.json();
      const validProjects = Array.isArray(dataProj) ? dataProj : [];
      const clientProjects = validProjects.filter(p => p.client && p.client._id === id);
      setProjects(clientProjects);

      const projectIds = clientProjects.map(p => p._id);

      // 3. Fetch Invoices
      const resInvoices = await fetch('/api/invoices');
      const dataInvoices = await resInvoices.json();
      const validInvoices = Array.isArray(dataInvoices) ? dataInvoices : [];
      setInvoices(validInvoices.filter(inv => inv.project && projectIds.includes(inv.project._id)));

      // 4. Fetch Payments
      const resPayments = await fetch('/api/payments');
      const dataPayments = await resPayments.json();
      const validPayments = Array.isArray(dataPayments) ? dataPayments : [];
      setPayments(validPayments.filter(p => p.project && projectIds.includes(p.project._id)));

      // 5. Fetch Quotations
      const resQuotes = await fetch('/api/quotations');
      const dataQuotes = await resQuotes.json();
      const validQuotes = Array.isArray(dataQuotes) ? dataQuotes : [];
      setQuotations(validQuotes.filter(q => q.client && q.client._id === id));

    } catch (err) {
      console.error(err);
      alert('Error fetching client details.');
      router.push('/clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchClientData();
  }, [id]);

  // Handle Client Info Save
  const handleSaveClientInfo = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editClient,
        approx_value: editClient.approx_value ? Number(editClient.approx_value) : 0
      };
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        setClient(updated);
        alert('Client details updated successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClient = async () => {
    if (!confirm('Are you sure you want to delete this client? This will permanently remove the client and all associated projects, credentials, invoices, and payments.')) return;
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Client deleted successfully.');
        router.push('/clients');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete client');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project? This will permanently remove its P&L history, invoices, and documents.')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Project deleted successfully.');
        fetchClientData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete project');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteQuotation = async (quoteId) => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;
    try {
      const res = await fetch(`/api/quotations/${quoteId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Quotation deleted successfully.');
        fetchClientData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete quotation');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getInvoicePaymentStats = (invoiceId) => {
    const invoicePayments = payments.filter(p => p.invoice && (p.invoice._id === invoiceId || p.invoice === invoiceId));
    const paid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
    const invoice = invoices.find(i => i._id === invoiceId);
    const total = invoice ? invoice.amount : 0;
    const remaining = Math.max(0, total - paid);
    return { paid, remaining };
  };

  const getProjectBillingStats = (projectId) => {
    const proj = projects.find(p => p._id === projectId);
    if (!proj) return { total: 0, invoiced: 0, remaining: 0 };
    const projInvoices = invoices.filter(inv => inv.project && (inv.project._id === projectId || inv.project === projectId));
    const invoiced = projInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    return {
      total: proj.value,
      invoiced,
      remaining: Math.max(0, proj.value - invoiced)
    };
  };

  const handlePrepareRemainingInvoice = (projectId) => {
    const proj = projects.find(p => p._id === projectId);
    if (!proj) return;
    const { remaining } = getProjectBillingStats(projectId);
    
    const projInvoices = invoices.filter(inv => inv.project && (inv.project._id === projectId || inv.project === projectId));
    const count = projInvoices.length;
    const suggestedNumber = `INV-${proj.name.substring(0, 4).toUpperCase()}-${new Date().getFullYear()}-${count + 1}`;

    const todayStr = new Date().toISOString().substring(0, 10);
    const dueStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

    setNewInvoice({
      project: projectId,
      invoice_number: suggestedNumber,
      amount: remaining,
      type: 'final',
      issue_date: todayStr,
      due_date: dueStr
    });

    const formElement = document.getElementById('generate-invoice-panel');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleShareInvoiceReminder = (inv) => {
    const { remaining } = getInvoicePaymentStats(inv._id);
    const clientCompany = client ? client.company : 'Partner';
    const dueStr = new Date(inv.due_date).toLocaleDateString();
    const msg = `*LegendIn Payment Reminder*\n\n*Invoice:* ${inv.invoice_number}\n*Client:* ${clientCompany}\n*Balance Due:* ₹${remaining.toLocaleString()}\n*Due Date:* ${dueStr}\n\nPlease arrange for payment at your earliest convenience.\n\n_LegendIn — Premium Interior Designers_`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Quotation Handlers
  const handleAddQuoteItem = () => {
    if (quoteItems.length >= 30) return;
    setQuoteItems([...quoteItems, { product_name: '', description: '', quantity: 1, unit_value: '', discount: '' }]);
  };

  const handleRemoveQuoteItem = (index) => {
    if (quoteItems.length <= 1) return;
    const items = [...quoteItems];
    items.splice(index, 1);
    setQuoteItems(items);
  };

  const handleQuoteItemChange = (index, field, value) => {
    const items = [...quoteItems];
    items[index][field] = value;
    setQuoteItems(items);
  };

  const handleCreateQuotation = async (e) => {
    e.preventDefault();
    try {
      const parsedItems = quoteItems.map(item => {
        const uVal = Number(item.unit_value) || 0;
        const disc = Number(item.discount) || 0;
        const qty = Number(item.quantity) || 1;
        return {
          product_name: item.product_name,
          description: item.description,
          quantity: qty,
          unit_value: uVal,
          discount: disc,
          final_value: Math.max(0, (uVal - disc) * qty)
        };
      });

      const totalActual = parsedItems.reduce((sum, item) => sum + (item.unit_value * item.quantity), 0);
      const totalDisc = parsedItems.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
      const subtotalAfterDiscounts = Math.max(0, totalActual - totalDisc);

      const overallDisc = Number(quoteDiscount) || 0;
      const taxableValue = Math.max(0, subtotalAfterDiscounts - overallDisc);

      const gstAmt = quoteHasGst ? Math.round(taxableValue * (Number(quoteGstRate) / 100)) : 0;
      const grandTotal = taxableValue + gstAmt;

      const payload = {
        client: id,
        scope_description: quoteScope || parsedItems[0]?.product_name || 'Interior Design Services',
        items: parsedItems,
        total_actual_value: totalActual,
        total_discount: totalDisc,
        discount: overallDisc,
        gst_rate: Number(quoteGstRate),
        has_gst: quoteHasGst,
        quoted_value: grandTotal,
        status: 'pending'
      };

      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setQuoteItems([{ product_name: '', description: '', quantity: 1, unit_value: '', discount: '' }]);
        setQuoteScope('');
        setQuoteDiscount('');
        setQuoteHasGst(true);
        setQuoteGstRate(18);
        alert('Quotation generated successfully!');
        setActiveTab('quotation_history');
        fetchClientData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create quotation');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating quotation');
    }
  };

  const handleUpdateQuotationStatus = async (quoteId, status) => {
    try {
      const res = await fetch(`/api/quotations/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchClientData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWhatsAppShare = (quote) => {
    const clientCompany = client ? client.company : 'Partner';
    const valueFormatted = quote.quoted_value.toLocaleString();
    const msg = `*LegendIn Quotation*\n\n*Client:* ${clientCompany}\n*Scope:* ${quote.scope_description}\n*Value:* ₹${valueFormatted}\n\n_LegendIn — Premium Interior Designers_`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handlePrintPDF = (quoteId) => {
    window.open(`/print/quotation/${quoteId}`, '_blank');
  };

  const handlePrintInvoicePDF = (invoiceId) => {
    window.open(`/print/invoice/${invoiceId}`, '_blank');
  };

  // Handle Credentials Save
  const handleOpenCredentialsEdit = (proj) => {
    setEditingProject(proj);
    setProjectLinks({
      product_link: proj.product_link || '',
      github_link: proj.github_link || '',
      file_source_link: proj.file_source_link || '',
      token_contract_address: proj.token_contract_address || '',
      username: proj.username || '',
      password: proj.password || '',
      private_key: proj.private_key || '',
      seed_phrase: proj.seed_phrase || ''
    });
  };

  const handleSaveProjectCredentials = async (e) => {
    e.preventDefault();
    if (!editingProject) return;
    try {
      const res = await fetch(`/api/projects/${editingProject._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectLinks)
      });
      if (res.ok) {
        alert('Credentials and Technical links updated.');
        setEditingProject(null);
        fetchClientData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Invoice Creation
  const handleAddInvoice = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: newInvoice.project,
          invoice_number: newInvoice.invoice_number,
          amount: Number(newInvoice.amount),
          type: newInvoice.type,
          issue_date: newInvoice.issue_date,
          due_date: newInvoice.due_date,
        }),
      });
      if (res.ok) {
        setNewInvoice({ project: '', invoice_number: '', amount: '', type: 'advance', issue_date: '', due_date: '' });
        fetchClientData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create invoice');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Payment Logging
  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!payingInvoice) return;

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: payingInvoice._id,
          project: payingInvoice.project._id,
          amount: Number(newPayment.amount),
          payment_date: newPayment.payment_date || new Date(),
          method: newPayment.method,
          bank_account_received: newPayment.bank_account_received,
          category: newPayment.category,
          transaction_number: newPayment.transaction_number || ''
        }),
      });
      if (res.ok) {
        setNewPayment({ invoice: '', project: '', amount: '', payment_date: '', method: 'Bank Transfer', bank_account_received: '', category: 'partial', transaction_number: '' });
        setPayingInvoice(null);
        fetchClientData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!confirm('Are you sure you want to delete this invoice? This will also delete any associated payment records.')) return;
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Invoice deleted successfully.');
        fetchClientData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete invoice');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete invoice');
    }
  };

  const handleEditInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;
    try {
      const res = await fetch(`/api/invoices/${editingInvoice._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingInvoice)
      });
      if (res.ok) {
        alert('Invoice updated successfully.');
        setEditingInvoice(null);
        fetchClientData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update invoice');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update invoice');
    }
  };

  const handleEditQuotationSubmit = async (e) => {
    e.preventDefault();
    if (!editingQuotation) return;
    try {
      const res = await fetch(`/api/quotations/${editingQuotation._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingQuotation)
      });
      if (res.ok) {
        alert('Quotation updated successfully.');
        setEditingQuotation(null);
        fetchClientData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update quotation');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update quotation');
    }
  };

  // Math totals
  const totalValue = projects.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + p.value, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = Math.max(0, totalValue - totalPaid);

  // Project-based billing filters
  const filteredInvoices = invoices.filter(inv => projectBillingFilter === 'all' || (inv.project && inv.project._id === projectBillingFilter));
  const filteredPayments = payments.filter(p => projectBillingFilter === 'all' || (p.project && p.project._id === projectBillingFilter));

  const selectedProjectObj = projects.find(p => p._id === projectBillingFilter);
  const filteredTotalValue = projectBillingFilter === 'all' ? totalValue : (selectedProjectObj ? selectedProjectObj.value : 0);
  const filteredTotalPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const filteredBalanceDue = Math.max(0, filteredTotalValue - filteredTotalPaid);

  const stages = [
    { key: 'lead', name: 'Lead', color: 'info' },
    { key: 'prospect', name: 'Prospect', color: 'warning' },
    { key: 'quotation_sent', name: 'Quotation Sent', color: 'primary' },
    { key: 'won', name: 'Won (Client)', color: 'success' },
    { key: 'lost', name: 'Lost', color: 'danger' }
  ];

  return (
    <div>
      {/* Header section with back button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <button className="btn btn-secondary btn-sm" style={{ marginBottom: '12px' }} onClick={() => router.push('/clients')}>
            ⬅️ Back to Pipeline Board
          </button>
          {client && (
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
                {client.company}
              </h1>
              <p style={{ color: 'var(--text-muted)' }}>
                Contact: <strong>{client.name}</strong> | Source: <span style={{ textTransform: 'capitalize' }}>{client.source}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="date-presets" style={{ width: 'fit-content', marginBottom: '28px' }}>
        <button className={`preset-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          👥 Overview & Status
        </button>
        <button className={`preset-btn ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
          🧾 Billing & Payments
        </button>
        <button className={`preset-btn ${activeTab === 'quotations' ? 'active' : ''}`} onClick={() => setActiveTab('quotations')}>
          📄 Raise New Quotation
        </button>
        <button className={`preset-btn ${activeTab === 'quotation_history' ? 'active' : ''}`} onClick={() => setActiveTab('quotation_history')}>
          📜 Quotation History
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAnchor: 'middle', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading Workspace Details...
        </div>
      ) : (
        client && (
          <div>
            {/* Tab 1: Client Info Overview */}
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
                <form className="panel" onSubmit={handleSaveClientInfo}>
                  <div className="panel-header">
                    <h2 className="panel-title">Client Contact Details</h2>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Contact Name</label>
                      <input 
                        type="text" className="form-control" required
                        value={editClient.name} onChange={e => setEditClient({ ...editClient, name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Company Name</label>
                      <input 
                        type="text" className="form-control" required
                        value={editClient.company} onChange={e => setEditClient({ ...editClient, company: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input 
                        type="email" className="form-control" required
                        value={editClient.email} onChange={e => setEditClient({ ...editClient, email: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input 
                        type="text" className="form-control"
                        value={editClient.phone} onChange={e => setEditClient({ ...editClient, phone: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Lead Source</label>
                      <select 
                        className="form-control"
                        value={editClient.source} onChange={e => setEditClient({ ...editClient, source: e.target.value })}
                      >
                        <option value="referral">Referral</option>
                        <option value="website">Website</option>
                        <option value="social">Social Media</option>
                        <option value="cold outreach">Cold Outreach</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Pipeline Stage</label>
                      <select 
                        className="form-control"
                        value={editClient.stage} onChange={e => setEditClient({ ...editClient, stage: e.target.value })}
                      >
                        <option value="lead">Lead</option>
                        <option value="prospect">Prospect</option>
                        <option value="quotation_sent">Quotation Sent</option>
                        <option value="won">Won (Client)</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Approximate Project Value (₹)</label>
                      <input 
                        type="number" className="form-control" placeholder="E.g. 5000"
                        value={editClient.approx_value} onChange={e => setEditClient({ ...editClient, approx_value: e.target.value })}
                      />
                    </div>
                  </div>

                  {editClient.stage === 'lost' && (
                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label style={{ color: 'var(--danger)' }}>Lost Reason</label>
                      <textarea 
                        className="form-control" style={{ borderColor: 'var(--danger)' }}
                        value={editClient.lost_reason} onChange={e => setEditClient({ ...editClient, lost_reason: e.target.value })}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button type="submit" className="btn btn-primary">
                      Save Client Details
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger"
                      onClick={handleDeleteClient}
                    >
                      Delete Client 🗑️
                    </button>
                  </div>
                </form>

                <div className="panel" style={{ height: 'fit-content' }}>
                  <h3 className="panel-title" style={{ marginBottom: '16px' }}>Status Summary</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                    <div>
                      <strong>Current Stage:</strong>{' '}
                      <span className={`badge badge-${client.stage}`}>{client.stage.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <strong>Registered:</strong> {new Date(client.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Total Projects Allocated:</strong> {projects.length}
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)' }} />
                    <div style={{ color: 'var(--primary)', fontWeight: '700' }}>
                      Financial Ledger AR: ₹{balanceDue.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}



            {/* Tab 3: Billing & Payments */}
            {activeTab === 'billing' && (
              <div>
                {/* Project Filter Selector */}
                {projects.length > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    marginBottom: '16px',
                    backgroundColor: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--card-border)',
                    width: 'fit-content',
                    marginLeft: 'auto'
                  }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Project Context:</label>
                    <select
                      className="form-control"
                      style={{ padding: '4px 8px', fontSize: '12px', width: '220px' }}
                      value={projectBillingFilter}
                      onChange={e => setProjectBillingFilter(e.target.value)}
                    >
                      <option value="all">All Projects Combined</option>
                      {projects.map(proj => (
                        <option key={proj._id} value={proj._id}>{proj.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Financial overview stats */}
                <div className="grid-3" style={{ marginBottom: '24px' }}>
                  <div className="card-metric accent-info">
                    <div className="metric-title">Total Project Values</div>
                    <div className="metric-value">₹{filteredTotalValue.toLocaleString()}</div>
                    <div className="metric-subtitle">Sum of active contracts</div>
                  </div>
                  <div className="card-metric accent-success">
                    <div className="metric-title">Total Received Amount</div>
                    <div className="metric-value">₹{filteredTotalPaid.toLocaleString()}</div>
                    <div className="metric-subtitle">Received client payments</div>
                  </div>
                  <div className="card-metric accent-warning">
                    <div className="metric-title">Yet to be Received</div>
                    <div className="metric-value" style={{ color: 'var(--primary)' }}>
                      ₹{filteredBalanceDue.toLocaleString()}
                    </div>
                    <div className="metric-subtitle">Accounts Receivable balance</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '28px', alignItems: 'start' }}>
                  
                  {/* Left: Invoices List & Payments log history */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Project Invoicing Summary */}
                    <div className="panel" style={{ margin: 0 }}>
                      <div className="panel-header" style={{ paddingBottom: 0 }}>
                        <h2 className="panel-title">📁 Project Invoicing Summary</h2>
                      </div>
                      <div className="table-container">
                        <table className="table-list" style={{ fontSize: '11px' }}>
                          <thead>
                            <tr>
                              <th>Project Name</th>
                              <th>Total Project Value</th>
                              <th>Total Invoiced so far</th>
                              <th>Uninvoiced Balance</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projects.map(proj => {
                              const { total, invoiced, remaining } = getProjectBillingStats(proj._id);
                              return (
                                <tr key={proj._id}>
                                  <td><strong>{proj.name}</strong></td>
                                  <td><strong>₹{total.toLocaleString()}</strong></td>
                                  <td style={{ color: 'var(--success)', fontWeight: '600' }}>₹{invoiced.toLocaleString()}</td>
                                  <td style={{ color: remaining > 0 ? 'var(--primary)' : 'inherit', fontWeight: '700' }}>
                                    ₹{remaining.toLocaleString()}
                                  </td>
                                  <td>
                                    {remaining > 0 ? (
                                      <button 
                                        className="btn btn-sm btn-primary" 
                                        style={{ padding: '2px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        onClick={() => handlePrepareRemainingInvoice(proj._id)}
                                      >
                                        ⚡ Invoice Remaining
                                      </button>
                                    ) : (
                                      <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '10px' }}>✓ Fully Invoiced</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {projects.length === 0 && (
                              <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>
                                  No projects logged for this client yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Invoices List */}
                    <div className="panel" style={{ margin: 0 }}>
                      <div className="panel-header" style={{ paddingBottom: 0 }}>
                        <h2 className="panel-title">📄 Project Invoices</h2>
                      </div>

                      {/* Financial Summary for Invoices */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '12px',
                        margin: '16px 20px',
                        backgroundColor: 'var(--background-alt)',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--card-border)'
                      }}>
                        <div>
                          <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Invoiced</span>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                            ₹{filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--success)' }}>Total Received</span>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--success)', marginTop: '2px' }}>
                            ₹{filteredPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)' }}>Remaining Balance</span>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary)', marginTop: '2px' }}>
                            ₹{Math.max(0, filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0) - filteredPayments.reduce((sum, p) => sum + p.amount, 0)).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="table-container">
                        <table className="table-list" style={{ fontSize: '11px' }}>
                          <thead>
                            <tr>
                              <th>Inv Number</th>
                              <th>Project</th>
                              <th>Type</th>
                              <th>Total Amount</th>
                              <th>Amount Paid</th>
                              <th>Remaining</th>
                              <th>Due Date</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredInvoices.map(inv => {
                              const { paid, remaining } = getInvoicePaymentStats(inv._id);
                              const overdue = inv.status !== 'paid' && new Date(inv.due_date) < new Date();

                              return (
                                <tr key={inv._id} style={{ backgroundColor: overdue ? '#fff5f5' : 'inherit' }}>
                                  <td style={{ fontWeight: '600' }}>{inv.invoice_number}</td>
                                  <td>{inv.project ? inv.project.name.substring(0, 12) : 'N/A'}...</td>
                                  <td style={{ textTransform: 'capitalize' }}>
                                    <span className="funnel-card-source" style={{ fontSize: '9px', padding: '1px 4px' }}>{inv.type}</span>
                                  </td>
                                  <td style={{ fontWeight: '700' }}>₹{inv.amount.toLocaleString()}</td>
                                  <td style={{ color: 'var(--success)', fontWeight: '600' }}>₹{paid.toLocaleString()}</td>
                                  <td style={{ color: remaining > 0 ? 'var(--primary)' : 'inherit', fontWeight: '700' }}>
                                    ₹{remaining.toLocaleString()}
                                  </td>
                                  <td style={{ color: overdue ? 'var(--danger)' : 'inherit', fontWeight: overdue ? '700' : 'normal' }}>
                                    {new Date(inv.due_date).toLocaleDateString()}
                                    {overdue && (
                                      <span style={{ display: 'block', fontSize: '9px', color: 'var(--danger)', fontWeight: 'bold', marginTop: '2px' }}>⚠️ OVERDUE</span>
                                    )}
                                  </td>
                                  <td>
                                    <span className={`badge badge-${inv.status}`}>{inv.status}</span>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                      {inv.status !== 'paid' && (
                                        <>
                                          <button 
                                            className="btn btn-sm btn-primary" style={{ padding: '2px 6px', fontSize: '10px' }}
                                            onClick={() => {
                                              setPayingInvoice(inv);
                                              setNewPayment({ ...newPayment, invoice: inv._id, project: inv.project._id, amount: remaining });
                                            }}
                                          >
                                            Pay 💸
                                          </button>
                                          <button 
                                            className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '10px', color: '#075e54' }}
                                            onClick={() => handleShareInvoiceReminder(inv)}
                                            title="Share Due Reminder"
                                          >
                                            Remind 💬
                                          </button>
                                        </>
                                      )}
                                      <button 
                                        className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '10px', color: 'var(--primary)' }}
                                        onClick={() => handlePrintInvoicePDF(inv._id)}
                                        title="Print PDF Invoice"
                                      >
                                        PDF 📄
                                      </button>
                                      <button 
                                        className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '10px' }}
                                        onClick={() => setEditingInvoice({
                                          ...inv,
                                          issue_date: inv.issue_date ? new Date(inv.issue_date).toISOString().split('T')[0] : '',
                                          due_date: inv.due_date ? new Date(inv.due_date).toISOString().split('T')[0] : ''
                                        })}
                                      >
                                        ✏️ Edit
                                      </button>
                                      <button 
                                        className="btn btn-sm btn-danger" style={{ padding: '2px 6px', fontSize: '10px' }}
                                        onClick={() => handleDeleteInvoice(inv._id)}
                                      >
                                        🗑️
                                      </button>
                                      {inv.status === 'paid' && (
                                        <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '10px', alignSelf: 'center' }}>Settled</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {filteredInvoices.length === 0 && (
                              <tr>
                                <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>
                                  No invoices match the project context filter.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Payments History log */}
                    <div className="panel" style={{ margin: 0 }}>
                      <div className="panel-header">
                        <h2 className="panel-title">💰 Payment Logs History</h2>
                      </div>

                      <div className="table-container">
                        <table className="table-list" style={{ fontSize: '12px' }}>
                          <thead>
                            <tr>
                              <th>Date Paid</th>
                              <th>Inv Number</th>
                              <th>Payment Method</th>
                              <th>Dest Account/Wallet</th>
                              <th>Split Category</th>
                              <th>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredPayments.map(p => (
                              <tr key={p._id}>
                                <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                                <td>{p.invoice ? p.invoice.invoice_number : 'Manual'}</td>
                                <td>
                                  <strong>{p.method}</strong>
                                  {p.transaction_number && (
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                      {p.method} Ref: {p.transaction_number}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <code style={{ fontSize: '10px', backgroundColor: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>
                                    {p.bank_account_received || 'Main Bank'}
                                  </code>
                                </td>
                                <td>
                                  <span className="funnel-card-source" style={{ textTransform: 'uppercase' }}>
                                    {p.category || 'partial'}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--success)', fontWeight: '700' }}>
                                  +₹{p.amount.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                            {filteredPayments.length === 0 && (
                              <tr>
                                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>
                                  No payments logged yet for this project context.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                  {/* Right: Forms for Invoicing & Payment */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Create Invoice Panel */}
                    <div id="generate-invoice-panel" className="panel" style={{ margin: 0, border: '1px solid var(--primary)' }}>
                      <h3 className="panel-title" style={{ marginBottom: '12px' }}>Generate Project Invoice</h3>
                      <form onSubmit={handleAddInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px' }}>Select Project</label>
                          <select 
                            className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }} required
                            value={newInvoice.project} onChange={e => setNewInvoice({ ...newInvoice, project: e.target.value })}
                          >
                            <option value="">-- Choose Project --</option>
                            {projects.map(p => (
                              <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px' }}>Invoice Number</label>
                          <input 
                            type="text" className="form-control" style={{ padding: '6px 10px', fontSize: '12px', backgroundColor: '#f8fafc' }} readOnly disabled
                            value="Auto-generated on Save"
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px' }}>Amount (₹)</label>
                          <input 
                            type="number" className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }} required
                            value={newInvoice.amount} onChange={e => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px' }}>Type</label>
                          <select 
                            className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }}
                            value={newInvoice.type} onChange={e => setNewInvoice({ ...newInvoice, type: e.target.value })}
                          >
                            <option value="advance">Advance Payment</option>
                            <option value="milestone">Milestone Billing</option>
                            <option value="final">Final Payment</option>
                          </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11px' }}>Issue Date</label>
                            <input 
                              type="date" className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }} required
                              value={newInvoice.issue_date} onChange={e => setNewInvoice({ ...newInvoice, issue_date: e.target.value })}
                            />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11px' }}>Due Date</label>
                            <input 
                              type="date" className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }} required
                              value={newInvoice.due_date} onChange={e => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                            />
                          </div>
                        </div>
                        <button type="submit" className="btn btn-sm btn-primary" style={{ marginTop: '8px' }}>
                          Generate Invoice
                        </button>
                      </form>
                    </div>

                    {/* Log Payment Subpanel */}
                    {payingInvoice && (
                      <div style={{ border: '1px solid var(--primary-border)', backgroundColor: 'var(--primary-light)', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)' }}>
                            💸 Payment for {payingInvoice.invoice_number}
                          </h4>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 'bold' }} onClick={() => setPayingInvoice(null)}>×</button>
                        </div>

                        <form onSubmit={handleAddPayment} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11px', color: 'var(--primary)' }}>Payment Amount (₹)</label>
                            <input 
                              type="number" className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }} required
                              value={newPayment.amount} onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                            />
                          </div>
                          
                          <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11px', color: 'var(--primary)' }}>Received in Account / Wallet</label>
                            <input 
                              type="text" className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }} required 
                              placeholder="HDFC Bank A/c / UPI ID / Google Pay Number"
                              value={newPayment.bank_account_received} onChange={e => setNewPayment({ ...newPayment, bank_account_received: e.target.value })}
                            />
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11px', color: 'var(--primary)' }}>Transaction ID / UPI Ref (Optional)</label>
                            <input 
                              type="text" className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }}
                              placeholder="E.g. UPI Ref / Bank Tx ID / Tx Hash"
                              value={newPayment.transaction_number || ''} onChange={e => setNewPayment({ ...newPayment, transaction_number: e.target.value })}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label style={{ fontSize: '11px', color: 'var(--primary)' }}>Date Paid</label>
                              <input 
                                type="date" className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }} required
                                value={newPayment.payment_date} onChange={e => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                              />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label style={{ fontSize: '11px', color: 'var(--primary)' }}>Method</label>
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


                          <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11px', color: 'var(--primary)' }}>Payment Split Category</label>
                            <select 
                              className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }}
                              value={newPayment.category} onChange={e => setNewPayment({ ...newPayment, category: e.target.value })}
                            >
                              <option value="advance">Advance Payment</option>
                              <option value="partial">Partial Payment</option>
                              <option value="final">Final Payment</option>
                              <option value="full">Full Payment</option>
                            </select>
                          </div>

                          <button type="submit" className="btn btn-sm btn-primary" style={{ marginTop: '4px' }}>
                            Submit Payment Record
                          </button>
                        </form>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Raise New Quotation */}
            {activeTab === 'quotations' && (
              <div style={{ height: 'calc(100vh - 270px)', minHeight: '520px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
                {/* Left: Raise Quotation Form */}
                <form className="panel" onSubmit={handleCreateQuotation} style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div className="panel-header" style={{ flexShrink: 0 }}>
                    <h2 className="panel-title">✍️ Raise New Quotation</h2>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Overall Project Scope / Summary</label>
                      <input 
                        type="text" className="form-control" required placeholder="E.g. Full BHK Apartment Interior Design & Execution"
                        value={quoteScope} onChange={e => setQuoteScope(e.target.value)}
                      />
                    </div>

                    <div style={{ border: '1px solid var(--card-border)', borderRadius: '8px', padding: '12px', backgroundColor: '#ffffff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>Itemized Design Elements ({quoteItems.length} of 30)</strong>
                        <button 
                          type="button" className="btn btn-sm btn-secondary" 
                          onClick={handleAddQuoteItem}
                          disabled={quoteItems.length >= 30}
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                        >
                          ➕ Add Item
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                        {quoteItems.map((item, idx) => {
                          const actualVal = (Number(item.unit_value) || 0);
                          const discVal = (Number(item.discount) || 0);
                          const qty = (Number(item.quantity) || 1);
                          const finalVal = Math.max(0, (actualVal - discVal) * qty);
                          
                          return (
                            <div key={idx} style={{ borderBottom: idx < quoteItems.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)' }}>Design Item #{idx + 1}</span>
                                {quoteItems.length > 1 && (
                                  <button 
                                    type="button" 
                                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '11px' }}
                                    onClick={() => handleRemoveQuoteItem(idx)}
                                  >
                                    ❌ Remove
                                  </button>
                                )}
                              </div>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px', marginBottom: '8px' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: '10px' }}>Item Name</label>
                                  <input 
                                    type="text" className="form-control" required style={{ padding: '4px 8px', fontSize: '12px' }} placeholder="E.g. Living Room Sofa"
                                    value={item.product_name} onChange={e => handleQuoteItemChange(idx, 'product_name', e.target.value)}
                                  />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: '10px' }}>Specifications</label>
                                  <input 
                                    type="text" className="form-control" style={{ padding: '4px 8px', fontSize: '12px' }} placeholder="E.g. Italian fabric, 3-seater"
                                    value={item.description} onChange={e => handleQuoteItemChange(idx, 'description', e.target.value)}
                                  />
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '8px' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: '10px' }}>Rate (₹)</label>
                                  <input 
                                    type="number" className="form-control" required style={{ padding: '4px 8px', fontSize: '12px' }} placeholder="0"
                                    value={item.unit_value} onChange={e => handleQuoteItemChange(idx, 'unit_value', e.target.value)}
                                  />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: '10px' }}>Qty</label>
                                  <input 
                                    type="number" className="form-control" required style={{ padding: '4px 8px', fontSize: '12px' }} placeholder="1" min="1"
                                    value={item.quantity} onChange={e => handleQuoteItemChange(idx, 'quantity', e.target.value)}
                                  />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: '10px' }}>Disc (₹)</label>
                                  <input 
                                    type="number" className="form-control" style={{ padding: '4px 8px', fontSize: '12px' }} placeholder="0"
                                    value={item.discount} onChange={e => handleQuoteItemChange(idx, 'discount', e.target.value)}
                                  />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: '10px' }}>Final (₹)</label>
                                  <input 
                                    type="text" className="form-control" disabled style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#f8fafc', fontWeight: 'bold' }}
                                    value={finalVal.toLocaleString()}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* GST & Overall Discount Options */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '12px', backgroundColor: '#ffffff' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '11px', fontWeight: '600' }}>Overall Discount (₹)</label>
                        <input 
                          type="number" className="form-control" style={{ padding: '6px 10px', fontSize: '13px' }} placeholder="Overall discount amount"
                          value={quoteDiscount} onChange={e => setQuoteDiscount(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '11px', fontWeight: '600' }}>GST Option</label>
                        <select 
                          className="form-control" style={{ padding: '6px 10px', fontSize: '13px' }}
                          value={quoteHasGst ? 'yes' : 'no'} 
                          onChange={e => {
                            const hasGst = e.target.value === 'yes';
                            setQuoteHasGst(hasGst);
                            if (!hasGst) setQuoteGstRate(0);
                            else setQuoteGstRate(18);
                          }}
                        >
                          <option value="yes">GST 18% (Default)</option>
                          <option value="no">No GST / Exempt</option>
                        </select>
                      </div>
                    </div>

                    {/* Pricing Summaries */}
                    {(() => {
                      const subtotalRaw = quoteItems.reduce((s, i) => s + ((Number(i.unit_value) || 0) * (Number(i.quantity) || 1)), 0);
                      const itemDiscounts = quoteItems.reduce((s, i) => s + ((Number(i.discount) || 0) * (Number(i.quantity) || 1)), 0);
                      const subtotalAfterItemDiscounts = Math.max(0, subtotalRaw - itemDiscounts);
                      const overallDisc = Number(quoteDiscount) || 0;
                      const taxable = Math.max(0, subtotalAfterItemDiscounts - overallDisc);
                      const gstVal = quoteHasGst ? Math.round(taxable * (Number(quoteGstRate) / 100)) : 0;
                      const finalTotalVal = taxable + gstVal;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Subtotal (Before Discounts):</span>
                            <strong>₹{subtotalRaw.toLocaleString()}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                            <span>Itemized Discounts:</span>
                            <strong>-₹{itemDiscounts.toLocaleString()}</strong>
                          </div>
                          {overallDisc > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                              <span>Overall Discount:</span>
                              <strong>-₹{overallDisc.toLocaleString()}</strong>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                            <span>Taxable Value:</span>
                            <strong>₹{taxable.toLocaleString()}</strong>
                          </div>
                          {quoteHasGst && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--info)' }}>
                              <span>GST ({quoteGstRate}%):</span>
                              <strong>₹{gstVal.toLocaleString()}</strong>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', borderTop: '1px solid #cbd5e1', paddingTop: '8px', color: 'var(--primary)' }}>
                            <span>Grand Total:</span>
                            <span>₹{finalTotalVal.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ flexShrink: 0, paddingTop: '12px', borderTop: '1px solid var(--card-border)', background: '#ffffff' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', margin: 0 }}>
                      Generate & Save Quotation
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 5: Quotations History */}
            {activeTab === 'quotation_history' && (
              <div style={{ height: 'calc(100vh - 270px)', minHeight: '520px' }}>
                {/* Right: Quotation History List */}
                <div className="panel" style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div className="panel-header" style={{ flexShrink: 0 }}>
                    <h2 className="panel-title">📄 Quotations History</h2>
                  </div>

                  <div className="table-container" style={{ flex: 1, overflowY: 'auto', margin: 0, border: 'none', borderRadius: 0 }}>
                    <table className="table-list" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Scope / Summary</th>
                          <th>Grand Total</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotations.map(quote => (
                          <tr key={quote._id}>
                            <td>{new Date(quote.sent_date).toLocaleDateString()}</td>
                            <td>
                              <div><strong>{quote.scope_description}</strong></div>
                              <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>{quote.items?.length || 0} product items</span>
                            </td>
                            <td style={{ fontWeight: '700' }}>₹{quote.quoted_value.toLocaleString()}</td>
                            <td>
                              <span className={`badge badge-${quote.status}`}>{quote.status}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {quote.status === 'pending' && (
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button 
                                      className="btn btn-sm btn-primary" style={{ padding: '2px 6px', fontSize: '10px' }}
                                      onClick={() => handleUpdateQuotationStatus(quote._id, 'accepted')}
                                    >
                                      Accept
                                    </button>
                                    <button 
                                      className="btn btn-sm btn-danger" style={{ padding: '2px 6px', fontSize: '10px' }}
                                      onClick={() => handleUpdateQuotationStatus(quote._id, 'rejected')}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                                
                                {quote.status === 'accepted' && (
                                  <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: '600' }}>Converted to Project</span>
                                )}
                                {quote.status === 'rejected' && (
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Rejected</span>
                                )}
                                
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  <button 
                                    className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '10px', color: '#075e54' }}
                                    onClick={() => handleWhatsAppShare(quote)}
                                    title="WhatsApp Share"
                                  >
                                    WA 💬
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '10px', color: 'var(--primary)' }}
                                    onClick={() => handlePrintPDF(quote._id)}
                                    title="Print PDF"
                                  >
                                    PDF 📄
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '10px' }}
                                    onClick={() => setEditingQuotation(quote)}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-danger" style={{ padding: '2px 6px', fontSize: '10px' }}
                                    onClick={() => handleDeleteQuotation(quote._id)}
                                    title="Delete Quotation"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {quotations.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>
                              No quotations raised yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}


          </div>
        )
      )}

      {/* --- EDIT INVOICE MODAL --- */}
      {editingInvoice && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <form className="modal-content" onSubmit={handleEditInvoiceSubmit}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Invoice: {editingInvoice.invoice_number}</h3>
              <button type="button" className="modal-close" onClick={() => setEditingInvoice(null)}>×</button>
            </div>
            
            <div className="form-group">
              <label>Invoice Number (Read-Only)</label>
              <input type="text" className="form-control" value={editingInvoice.invoice_number} readOnly disabled style={{ backgroundColor: '#f1f5f9' }} />
            </div>

            <div className="form-group">
              <label>Amount (₹)</label>
              <input type="number" className="form-control" required value={editingInvoice.amount} onChange={e => setEditingInvoice({ ...editingInvoice, amount: Number(e.target.value) })} />
            </div>

            <div className="form-group">
              <label>Invoice Type</label>
              <select className="form-control" value={editingInvoice.type} onChange={e => setEditingInvoice({ ...editingInvoice, type: e.target.value })}>
                <option value="advance">Advance Payment</option>
                <option value="milestone">Milestone Billing</option>
                <option value="final">Final Payment</option>
              </select>
            </div>

            <div className="form-group">
              <label>Billing Status</label>
              <select className="form-control" value={editingInvoice.status} onChange={e => setEditingInvoice({ ...editingInvoice, status: e.target.value })}>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label>Issue Date</label>
                <input type="date" className="form-control" required value={editingInvoice.issue_date} onChange={e => setEditingInvoice({ ...editingInvoice, issue_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input type="date" className="form-control" required value={editingInvoice.due_date} onChange={e => setEditingInvoice({ ...editingInvoice, due_date: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingInvoice(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Invoice</button>
            </div>
          </form>
        </div>
      )}

      {/* --- EDIT QUOTATION MODAL --- */}
      {editingQuotation && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <form className="modal-content" onSubmit={handleEditQuotationSubmit}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Quotation</h3>
              <button type="button" className="modal-close" onClick={() => setEditingQuotation(null)}>×</button>
            </div>

            <div className="form-group">
              <label>Quotation Number (Read-Only)</label>
              <input type="text" className="form-control" value={editingQuotation.quotation_number || 'Auto-generated on Save'} readOnly disabled style={{ backgroundColor: '#f1f5f9' }} />
            </div>

            <div className="form-group">
              <label>Scope Description / Project Scope</label>
              <input type="text" className="form-control" required value={editingQuotation.scope_description} onChange={e => setEditingQuotation({ ...editingQuotation, scope_description: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Quoted Value Amount (₹)</label>
              <input type="number" className="form-control" required value={editingQuotation.quoted_value} onChange={e => setEditingQuotation({ ...editingQuotation, quoted_value: Number(e.target.value) })} />
            </div>

            <div className="form-group">
              <label>Quotation Status</label>
              <select className="form-control" value={editingQuotation.status} onChange={e => setEditingQuotation({ ...editingQuotation, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingQuotation(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Quotation</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
