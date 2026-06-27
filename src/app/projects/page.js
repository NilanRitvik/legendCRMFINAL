'use client';

import { useState, useEffect, useRef } from 'react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  
  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  
  // Sub-modules state
  const [documents, setDocuments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [directProjectExpenses, setDirectProjectExpenses] = useState([]);
  
  // Forms
  const [newProject, setNewProject] = useState({
    client: '', name: '', type: 'new', status: 'not_started', value: '', start_date: '', end_date: '', product_link: ''
  });
  const [clients, setClients] = useState([]);
  
  const [newDocFile, setNewDocFile] = useState(null);
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('agreement');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [newInvoice, setNewInvoice] = useState({
    invoice_number: '', amount: '', type: 'advance', issue_date: '', due_date: ''
  });

  const [newPayment, setNewPayment] = useState({
    invoice: '', amount: '', payment_date: '', method: 'Bank Transfer', bank_account_received: '', category: 'partial', transaction_number: ''
  });
  const [payingInvoice, setPayingInvoice] = useState(null);

  const [allocation, setAllocation] = useState({ member: '', percent: '100' });

  // Direct Project Expense Form
  const [newProjExpense, setNewProjExpense] = useState({
    amount: '', expense_date: '', description: ''
  });

  // Status Change State
  const [statusChange, setStatusChange] = useState({
    pendingStatus: '',
    description: '',
    isActive: false
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Fetch initial data
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const resProj = await fetch('/api/projects');
      const dataProj = await resProj.json();
      setProjects(Array.isArray(dataProj) ? dataProj : []);

      const resClients = await fetch('/api/clients');
      const dataClients = await resClients.json();
      const validClients = Array.isArray(dataClients) ? dataClients : [];
      setClients(validClients.filter(c => c.stage === 'won' || c.stage === 'prospect'));

      const resTeam = await fetch('/api/team');
      const dataTeam = await resTeam.json();
      setTeamMembers(Array.isArray(dataTeam) ? dataTeam : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch details for a specific project
  const fetchProjectDetails = async (projectId) => {
    try {
      // Fetch documents
      const resDocs = await fetch(`/api/projects/${projectId}/documents`);
      const dataDocs = await resDocs.json();
      setDocuments(Array.isArray(dataDocs) ? dataDocs : []);

      // Fetch invoices
      const resInvoices = await fetch('/api/invoices');
      const dataInvoices = await resInvoices.json();
      const validInvoices = Array.isArray(dataInvoices) ? dataInvoices : [];
      setInvoices(validInvoices.filter(inv => inv.project && inv.project._id === projectId));

      // Fetch payments
      const resPayments = await fetch('/api/payments');
      const dataPayments = await resPayments.json();
      const validPayments = Array.isArray(dataPayments) ? dataPayments : [];
      setPayments(validPayments.filter(p => p.project && p.project._id === projectId));

      // Refresh single project financials (P&L calculations)
      const resSingle = await fetch(`/api/projects/${projectId}`);
      const dataSingle = await resSingle.json();
      if (resSingle.ok && !dataSingle.error) {
        setSelectedProject(dataSingle);
        setDirectProjectExpenses(dataSingle.directExpensesList || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDetails = async (project) => {
    setSelectedProject(project);
    setIsDetailModalOpen(true);
    await fetchProjectDetails(project._id);
    // Reset status change state
    setStatusChange({ pendingStatus: '', description: '', isActive: false });
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProject,
          value: Number(newProject.value)
        })
      });
      if (res.ok) {
        setNewProject({ client: '', name: '', type: 'new', status: 'not_started', value: '', start_date: '', end_date: '', product_link: '' });
        setIsProjectModalOpen(false);
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProjectStatus = async (projectId, newStatus, desc = '') => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          status_description: desc
        })
      });
      if (res.ok) {
        fetchInitialData();
        const updated = await res.json();
        // Sync detail modal including updated status_history from DB
        await fetchProjectDetails(projectId);
        setStatusChange({ pendingStatus: '', description: '', isActive: false });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Team allocation
  const handleAddTeamAllocation = async (e) => {
    e.preventDefault();
    if (!allocation.member || !selectedProject) return;

    const existingTeam = selectedProject.team || [];
    if (existingTeam.some(t => t.member && t.member._id === allocation.member)) {
      alert('Team member already allocated to this project.');
      return;
    }

    const updatedTeam = [...existingTeam, {
      member: allocation.member,
      allocation: Number(allocation.percent)
    }];

    try {
      const res = await fetch(`/api/projects/${selectedProject._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: updatedTeam })
      });
      if (res.ok) {
        await fetchProjectDetails(selectedProject._id);
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTeamAllocation = async (memberId) => {
    if (!selectedProject) return;
    const updatedTeam = selectedProject.team.filter(t => t.member && t.member._id !== memberId);
    try {
      const res = await fetch(`/api/projects/${selectedProject._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: updatedTeam })
      });
      if (res.ok) {
        await fetchProjectDetails(selectedProject._id);
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Document attachments
  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      setIsUploading(true);
      let res;
      if (newDocFile) {
        const formData = new FormData();
        formData.append('file', newDocFile);
        formData.append('type', newDocType);
        res = await fetch(`/api/projects/${selectedProject._id}/documents`, {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch(`/api/projects/${selectedProject._id}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: newDocType,
            file_name: newDocName || 'External Link',
            file_url: newDocUrl,
          }),
        });
      }

      if (res.ok) {
        setNewDocFile(null);
        setNewDocUrl('');
        setNewDocName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchProjectDetails(selectedProject._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  // Helper for invoice payments
  const getInvoicePaymentStats = (invoiceId) => {
    const invoicePayments = payments.filter(p => p.invoice && (p.invoice._id === invoiceId || p.invoice === invoiceId));
    const paid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
    const invoice = invoices.find(i => i._id === invoiceId);
    const total = invoice ? invoice.amount : 0;
    const remaining = Math.max(0, total - paid);
    return { paid, remaining };
  };

  // Invoices
  const handleAddInvoice = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: selectedProject._id,
          invoice_number: newInvoice.invoice_number,
          amount: Number(newInvoice.amount),
          type: newInvoice.type,
          issue_date: newInvoice.issue_date,
          due_date: newInvoice.due_date,
        }),
      });
      if (res.ok) {
        setNewInvoice({ invoice_number: '', amount: '', type: 'advance', issue_date: '', due_date: '' });
        await fetchProjectDetails(selectedProject._id);
        fetchInitialData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create invoice');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Payments log
  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!selectedProject || !payingInvoice) return;

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: payingInvoice._id,
          project: selectedProject._id,
          amount: Number(newPayment.amount),
          payment_date: newPayment.payment_date || new Date(),
          method: newPayment.method,
          bank_account_received: newPayment.bank_account_received || '',
          category: newPayment.category || 'partial',
          transaction_number: newPayment.transaction_number || ''
        }),
      });
      if (res.ok) {
        setNewPayment({ invoice: '', amount: '', payment_date: '', method: 'Bank Transfer', bank_account_received: '', category: 'partial', transaction_number: '' });
        setPayingInvoice(null);
        await fetchProjectDetails(selectedProject._id);
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Direct project expenses
  const handleAddProjExpense = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'project_cost',
          amount: Number(newProjExpense.amount),
          expense_date: newProjExpense.expense_date,
          description: newProjExpense.description,
          project: selectedProject._id
        }),
      });
      if (res.ok) {
        setNewProjExpense({ amount: '', expense_date: '', description: '' });
        await fetchProjectDetails(selectedProject._id);
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProjExpense = async (expenseId) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchProjectDetails(selectedProject._id);
        fetchInitialData();
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
        fetchInitialData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete project');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Excel CSV Export
  const handleExportProjectsCSV = () => {
    if (projects.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "LEGENDIN PROJECTS & DELIVERY REPORT\n";
    csvContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    csvContent += "Project Name,Client Company,Type,Status,Contract Value,Direct Expenses,Team Cost,Net Profit,Start Date,End Date,Github/Product Link\n";
    
    projects.forEach(p => {
      const clientName = p.client ? p.client.company : 'N/A';
      const profit = p.projectProfit || 0;
      const direct = p.directExpenses || 0;
      const team = p.teamCost || 0;
      const typeStr = p.type === 'new' ? 'New Development' : 'Rework';
      const statusStr = p.status.replace('_', ' ').toUpperCase();
      
      csvContent += `"${p.name}","${clientName}","${typeStr}","${statusStr}",${p.value},${direct},${team},${profit},"${p.start_date ? new Date(p.start_date).toLocaleDateString() : ''}","${p.end_date ? new Date(p.end_date).toLocaleDateString() : ''}","${p.product_link || p.github_link || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "legendin_projects_delivery_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const projectStatuses = [
    { key: 'not_started', name: 'Not Started', color: 'info' },
    { key: 'in_progress', name: 'In Progress', color: 'primary' },
    { key: 'on_hold', name: 'On Hold', color: 'warning' },
    { key: 'completed', name: 'Completed', color: 'success' },
    { key: 'cancelled', name: 'Cancelled', color: 'danger' }
  ];

  // Calculate status summary stats
  const statusStats = projectStatuses.map(st => {
    const list = projects.filter(p => p.status === st.key);
    const totalVal = list.reduce((sum, p) => sum + (p.value || 0), 0);
    return {
      ...st,
      count: list.length,
      value: totalVal
    };
  });

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.client && p.client.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
    p.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>Projects & Delivery</h1>
          <p style={{ color: 'var(--text-muted)' }}>Monitor client development workflows, assets, and invoices</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={handleExportProjectsCSV}>
            📥 Export Projects (Excel)
          </button>
          <button className="btn btn-primary" onClick={() => setIsProjectModalOpen(true)}>
            <span>➕</span> Create New Project
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '24px' }}>
        <input 
          type="text" 
          className="form-control" 
          placeholder="🔍 Search projects by name, client, status, type..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ maxWidth: '400px', padding: '10px 14px', fontSize: '14px', borderRadius: '8px' }}
        />
      </div>

      {/* Projects Status Dashboard Board */}
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
        {statusStats.map(st => (
          <div key={st.key} style={{ borderRight: st.key !== 'cancelled' ? '1px solid #e2e8f0' : 'none', paddingRight: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: `var(--${st.color})` }} />
              {st.name}
            </span>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
              {st.count} <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)' }}>Projects</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)', marginTop: '2px' }}>
              ₹{st.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-muted)', fontSize: '18px' }}>
          Loading projects workspace...
        </div>
      ) : (
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Active Projects</h2>
          </div>
          
          <div className="table-container">
            <table className="table-list">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Contract Value</th>
                  <th>Direct Expenses</th>
                  <th>Team Cost</th>
                  <th>Project Net Profit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map(project => {
                  const profit = project.projectProfit || 0;
                  const profitMargin = project.value > 0 ? Math.round((profit / project.value) * 100) : 0;
                  
                  return (
                    <tr key={project._id}>
                      <td style={{ fontWeight: '700' }}>{project.name}</td>
                      <td>{project.client ? project.client.company : 'N/A'}</td>
                      <td>
                        <span className={`badge badge-${project.status}`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600' }}>₹{project.value.toLocaleString()}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: '600' }}>
                        -₹{project.directExpenses ? project.directExpenses.toLocaleString() : '0'}
                      </td>
                      <td style={{ color: 'var(--danger)', fontWeight: '600' }}>
                        -₹{project.teamCost ? Math.round(project.teamCost).toLocaleString() : '0'}
                      </td>
                      <td style={{ color: profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: '800' }}>
                        {profit < 0 ? '-' : ''}₹{Math.abs(Math.round(profit)).toLocaleString()} 
                        <span style={{ fontSize: '11px', fontWeight: '500', marginLeft: '4px', opacity: 0.8 }}>
                          ({profitMargin}%)
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleOpenDetails(project)}>
                            Open Workspace
                          </button>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteProject(project._id)}
                            style={{ padding: '6px 10px' }}
                            title="Delete Project"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>
                      No active projects found. Convert an accepted Quotation to start!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Manual Project Modal */}
      {isProjectModalOpen && (
        <div className="modal-backdrop">
          <form className="modal-content" onSubmit={handleCreateProject}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Project</h3>
              <button type="button" className="modal-close" onClick={() => setIsProjectModalOpen(false)}>×</button>
            </div>
            
            <div className="form-group">
              <label>Select Client</label>
              <select 
                className="form-control" required
                value={newProject.client} onChange={e => setNewProject({ ...newProject, client: e.target.value })}
              >
                <option value="">-- Choose Client --</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.company} ({c.name})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Project Name</label>
              <input 
                type="text" className="form-control" required
                value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Project Type</label>
                <select 
                  className="form-control"
                  value={newProject.type} onChange={e => setNewProject({ ...newProject, type: e.target.value })}
                >
                  <option value="new">New Development</option>
                  <option value="rework">Project Rework</option>
                </select>
              </div>
              <div className="form-group">
                <label>Contract Value (₹)</label>
                <input 
                  type="number" className="form-control" required
                  value={newProject.value} onChange={e => setNewProject({ ...newProject, value: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Start Date</label>
                <input 
                  type="date" className="form-control"
                  value={newProject.start_date} onChange={e => setNewProject({ ...newProject, start_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input 
                  type="date" className="form-control"
                  value={newProject.end_date} onChange={e => setNewProject({ ...newProject, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Product Link / Repository URL</label>
              <input 
                type="url" className="form-control" placeholder="https://github.com/..."
                value={newProject.product_link} onChange={e => setNewProject({ ...newProject, product_link: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsProjectModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Project</button>
            </div>
          </form>
        </div>
      )}

      {/* Detailed Project Workspace Modal */}
      {isDetailModalOpen && selectedProject && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '1400px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedProject.name}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Client: {selectedProject.client ? selectedProject.client.company : 'N/A'} | Stage: {' '}
                  <span className={`badge badge-${selectedProject.status}`}>{selectedProject.status.replace('_', ' ')}</span>
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsDetailModalOpen(false)}>×</button>
            </div>

            {/* Quick Actions (Status Change, Links) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--background)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <strong>Change Status:</strong>
                  <select 
                    className="form-control" style={{ padding: '4px 8px', fontSize: '12px', width: '150px' }}
                    value={statusChange.isActive ? statusChange.pendingStatus : selectedProject.status} 
                    onChange={e => {
                      const newStatus = e.target.value;
                      if (newStatus !== selectedProject.status) {
                        setStatusChange({
                          pendingStatus: newStatus,
                          description: '',
                          isActive: true
                        });
                      } else {
                        setStatusChange({ pendingStatus: '', description: '', isActive: false });
                      }
                    }}
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                {selectedProject.product_link && (
                  <a href={selectedProject.product_link} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary">
                    🔗 Github Repo
                  </a>
                )}
              </div>

              {/* Status Change Description Request Field */}
              {statusChange.isActive && (
                <div style={{
                  padding: '12px',
                  border: '1px dashed var(--primary-border)',
                  backgroundColor: 'var(--primary-light)',
                  borderRadius: '8px',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>
                    📝 Provide Update Description for changing status to "{statusChange.pendingStatus.replace('_', ' ').toUpperCase()}"
                  </span>
                  <textarea 
                    className="form-control"
                    style={{ minHeight: '60px', fontSize: '12px' }}
                    placeholder="Why is this status changing? E.g., Milestone 1 signed off, waiting for client credentials..."
                    value={statusChange.description}
                    onChange={e => setStatusChange({ ...statusChange, description: e.target.value })}
                    required
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-secondary" 
                      onClick={() => setStatusChange({ pendingStatus: '', description: '', isActive: false })}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-primary"
                      disabled={!statusChange.description.trim()}
                      onClick={() => handleUpdateProjectStatus(selectedProject._id, statusChange.pendingStatus, statusChange.description)}
                    >
                      Save Status Change
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Project P&L Dashboard Panel */}
            <div style={{
              backgroundColor: 'var(--primary-light)',
              border: '1px solid var(--primary-border)',
              borderRadius: '8px',
              padding: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Contract Value</span>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                  ₹{selectedProject.value.toLocaleString()}
                </div>
              </div>
              
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Team Costs ({selectedProject.durationMonths || 1} mo)</span>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--danger)', marginTop: '4px' }}>
                  -₹{Math.round(selectedProject.teamCost || 0).toLocaleString()}
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>Based on resource allocations</span>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Direct Expenses</span>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--danger)', marginTop: '4px' }}>
                  -₹{Math.round(selectedProject.directExpenses || 0).toLocaleString()}
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>Hardware/Hosting/Licensing</span>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Project Net Profit</span>
                <div style={{ 
                  fontSize: '22px', 
                  fontWeight: '800', 
                  color: (selectedProject.projectProfit || 0) >= 0 ? 'var(--success)' : 'var(--danger)', 
                  marginTop: '4px' 
                }}>
                  {(selectedProject.projectProfit || 0) < 0 ? '-' : ''}₹{Math.abs(Math.round(selectedProject.projectProfit || 0)).toLocaleString()}
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: (selectedProject.projectProfit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {selectedProject.value > 0 ? Math.round(((selectedProject.projectProfit || 0) / selectedProject.value) * 100) : 0}% Profit Margin
                </span>
              </div>
            </div>

            {/* Main Tabs/Panels inside Detail Modal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginTop: '20px' }}>
              
              {/* Left Column: Expenses, Documents, Team Allocations, History Log */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Direct Project Expenses section */}
                <div style={{ border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)' }}>
                    📉 Direct Project Expenses
                  </h4>

                  <form onSubmit={handleAddProjExpense} style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0, flex: 2 }}>
                      <label style={{ fontSize: '11px' }}>Cost Description</label>
                      <input 
                        type="text" className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }} required
                        placeholder="Marble floor tiles, timber wood, wallpaper rolls"
                        value={newProjExpense.description} onChange={e => setNewProjExpense({ ...newProjExpense, description: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <label style={{ fontSize: '11px' }}>Amount (₹)</label>
                      <input 
                        type="number" className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }} required
                        value={newProjExpense.amount} onChange={e => setNewProjExpense({ ...newProjExpense, amount: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 1.2 }}>
                      <label style={{ fontSize: '11px' }}>Date Paid</label>
                      <input 
                        type="date" className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }} required
                        value={newProjExpense.expense_date} onChange={e => setNewProjExpense({ ...newProjExpense, expense_date: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn btn-sm btn-primary" style={{ height: '37px' }}>Log Cost</button>
                  </form>

                  <div className="table-container">
                    <table className="table-list" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {directProjectExpenses.map(exp => (
                          <tr key={exp._id}>
                            <td>{exp.description}</td>
                            <td>{new Date(exp.expense_date).toLocaleDateString()}</td>
                            <td style={{ fontWeight: '600', color: 'var(--danger)' }}>-₹{exp.amount.toLocaleString()}</td>
                            <td>
                              <button 
                                className="btn btn-sm btn-danger" style={{ padding: '2px 6px', fontSize: '10px' }}
                                onClick={() => handleDeleteProjExpense(exp._id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {directProjectExpenses.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '16px' }}>
                              No direct expenses logged for this project.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Documents Tracker */}
                <div style={{ border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)' }}>
                    📁 Documents & Contracts
                  </h4>
                  
                  <form onSubmit={handleAddDocument} style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <label style={{ fontSize: '11px' }}>Doc Type</label>
                      <select 
                        className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }}
                        value={newDocType} onChange={e => setNewDocType(e.target.value)}
                      >
                        <option value="agreement">Agreement Copy</option>
                        <option value="nda">NDA Document</option>
                        <option value="invoice">Invoice PDF Link</option>
                        <option value="deliverable">Deliverable URL</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0, flex: 1.5 }}>
                      <label style={{ fontSize: '11px' }}>Local File Upload</label>
                      <input 
                        type="file" ref={fileInputRef} className="form-control" style={{ padding: '4px 6px', fontSize: '11px' }}
                        onChange={e => {
                          setNewDocFile(e.target.files[0]);
                          setNewDocUrl('');
                        }}
                      />
                    </div>
                    
                    <div style={{ fontSize: '12px', fontWeight: '600', paddingBottom: '8px', color: 'var(--text-muted)' }}>OR</div>

                    <div className="form-group" style={{ margin: 0, flex: 1.5 }}>
                      <label style={{ fontSize: '11px' }}>Paste Link URL</label>
                      <input 
                        type="url" className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }}
                        placeholder="Google Drive link..."
                        value={newDocUrl} onChange={e => {
                          setNewDocUrl(e.target.value);
                          setNewDocFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      />
                    </div>

                    {newDocUrl && (
                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label style={{ fontSize: '11px' }}>Link Label</label>
                        <input 
                          type="text" className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }}
                          placeholder="GitHub, Figma, etc"
                          value={newDocName} onChange={e => setNewDocName(e.target.value)}
                        />
                      </div>
                    )}

                    <button type="submit" className="btn btn-sm btn-primary" style={{ height: '37px' }} disabled={isUploading}>
                      {isUploading ? 'Adding...' : 'Add'}
                    </button>
                  </form>

                  <div className="table-container">
                    <table className="table-list" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Name</th>
                          <th>Uploaded</th>
                          <th>Download/View</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map(doc => (
                          <tr key={doc._id}>
                            <td>
                              <span className="funnel-card-source" style={{ textTransform: 'uppercase' }}>
                                {doc.type}
                              </span>
                            </td>
                            <td>{doc.file_name}</td>
                            <td>{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                            <td>
                              <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'underline' }}>
                                Open 🔗
                              </a>
                            </td>
                          </tr>
                        ))}
                        {documents.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '16px' }}>
                              No files attached yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Team Allocations */}
                <div style={{ border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)' }}>
                    👥 Team Allocations
                  </h4>
                  
                  <form onSubmit={handleAddTeamAllocation} style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0, flex: 2 }}>
                      <label style={{ fontSize: '11px' }}>Allocate Team Member</label>
                      <select 
                        className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }} required
                        value={allocation.member} onChange={e => setAllocation({ ...allocation, member: e.target.value })}
                      >
                        <option value="">-- Choose Member --</option>
                        {teamMembers.map(m => (
                          <option key={m._id} value={m._id}>{m.name} ({m.role} - {m.resource_type || 'fulltime'}) - ₹{m.monthly_cost}/mo</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <label style={{ fontSize: '11px' }}>Allocation (%)</label>
                      <input 
                        type="number" className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }} required min="1" max="100"
                        value={allocation.percent} onChange={e => setAllocation({ ...allocation, percent: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn btn-sm btn-primary" style={{ height: '37px' }}>Assign</button>
                  </form>

                  <div className="table-container">
                    <table className="table-list" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Allocation</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProject.team && selectedProject.team.map(alloc => (
                          alloc.member && (
                            <tr key={alloc.member._id}>
                              <td style={{ fontWeight: '600' }}>{alloc.member.name}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{alloc.member.role}</span>
                                  <span style={{ 
                                    fontSize: '9px', 
                                    backgroundColor: alloc.member.resource_type === 'fulltime' ? '#ecfdf5' : alloc.member.resource_type === 'freelancer' ? '#eff6ff' : '#fffbeb', 
                                    color: alloc.member.resource_type === 'fulltime' ? '#065f46' : alloc.member.resource_type === 'freelancer' ? '#1d4ed8' : '#b45309',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    fontWeight: '700',
                                    textTransform: 'uppercase'
                                  }}>
                                    {alloc.member.resource_type || 'fulltime'}
                                  </span>
                                </div>
                              </td>
                              <td>{alloc.allocation}%</td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-danger" style={{ padding: '2px 6px', fontSize: '10px' }}
                                  onClick={() => handleRemoveTeamAllocation(alloc.member._id)}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          )
                        ))}
                        {(!selectedProject.team || selectedProject.team.length === 0) && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '16px' }}>
                              No team members assigned yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Project Status History Log */}
                <div style={{ border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)' }}>
                    📜 Project Status History Log
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                    {selectedProject.status_history && selectedProject.status_history.length > 0 ? (
                      selectedProject.status_history.map((log, idx) => (
                        <div key={idx} style={{ 
                          borderBottom: idx < selectedProject.status_history.length - 1 ? '1px solid #e2e8f0' : 'none', 
                          paddingBottom: '8px',
                          fontSize: '12px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span className={`badge badge-${log.status}`} style={{ fontSize: '9px', padding: '1px 5px', textTransform: 'capitalize' }}>
                              {log.status.replace('_', ' ')}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>
                              {new Date(log.changed_at).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-main)', fontStyle: 'italic', paddingLeft: '4px' }}>
                            "{log.description || 'No comment provided'}"
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-light)', fontSize: '12px' }}>
                        No status transitions recorded yet.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Invoices & Invoices Payments */}
              <div>
                
                {/* Invoices List */}
                <div style={{ border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)' }}>
                    📄 Invoices Tracking
                  </h4>

                  {/* Financial Summary for Invoices */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '12px',
                    marginBottom: '16px',
                    backgroundColor: 'var(--background-alt)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--card-border)'
                  }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Invoiced</span>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                        ₹{invoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--success)' }}>Total Received</span>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--success)', marginTop: '2px' }}>
                        ₹{payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)' }}>Remaining Balance</span>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary)', marginTop: '2px' }}>
                        ₹{Math.max(0, invoices.reduce((sum, inv) => sum + inv.amount, 0) - payments.reduce((sum, p) => sum + p.amount, 0)).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleAddInvoice} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', backgroundColor: '#fafbfc', padding: '12px', borderRadius: '6px' }}>
                    <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Invoice Number</label>
                      <input 
                        type="text" className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }} required placeholder="INV-2026-001"
                        value={newInvoice.invoice_number} onChange={e => setNewInvoice({ ...newInvoice, invoice_number: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Amount (₹)</label>
                      <input 
                        type="number" className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }} required
                        value={newInvoice.amount} onChange={e => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Invoice Type</label>
                      <select 
                        className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }}
                        value={newInvoice.type} onChange={e => setNewInvoice({ ...newInvoice, type: e.target.value })}
                      >
                        <option value="advance">Advance Payment</option>
                        <option value="milestone">Milestone Billing</option>
                        <option value="final">Final Payment</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Issue Date</label>
                      <input 
                        type="date" className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }} required
                        value={newInvoice.issue_date} onChange={e => setNewInvoice({ ...newInvoice, issue_date: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Due Date</label>
                      <input 
                        type="date" className="form-control" style={{ padding: '5px 8px', fontSize: '12px' }} required
                        value={newInvoice.due_date} onChange={e => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn btn-sm btn-primary" style={{ gridColumn: 'span 2', marginTop: '4px' }}>
                      Generate Invoice
                    </button>
                  </form>

                  <div className="table-container">
                    <table className="table-list" style={{ fontSize: '11px' }}>
                      <thead>
                        <tr>
                          <th>Inv Number</th>
                          <th>Type</th>
                          <th>Total Amount</th>
                          <th>Amount Paid</th>
                          <th>Remaining</th>
                          <th>Due Date</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map(inv => {
                          const { paid, remaining } = getInvoicePaymentStats(inv._id);
                          const overdue = inv.status !== 'paid' && new Date(inv.due_date) < new Date();

                          return (
                            <tr key={inv._id} style={{ backgroundColor: overdue ? '#fff5f5' : 'inherit' }}>
                              <td style={{ fontWeight: '600' }}>{inv.invoice_number}</td>
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
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {inv.status !== 'paid' && (
                                    <button 
                                      className="btn btn-sm btn-primary" style={{ padding: '2px 6px', fontSize: '10px' }}
                                      onClick={() => {
                                        setPayingInvoice(inv);
                                        setNewPayment({ 
                                          ...newPayment, 
                                          invoice: inv._id, 
                                          amount: remaining,
                                          category: inv.type || 'partial'
                                        });
                                      }}
                                    >
                                      Pay 💸
                                    </button>
                                  )}
                                  {inv.status === 'paid' && (
                                    <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '10px' }}>Settled</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {invoices.length === 0 && (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '16px' }}>
                              No invoices created yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Log Payment Sub-form */}
                {payingInvoice && (
                  <div style={{ border: '1px solid var(--primary-border)', backgroundColor: 'var(--primary-light)', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)' }}>
                        💸 Log Payment for {payingInvoice.invoice_number}
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
                          placeholder="E.g. Bank Account / ERC-20 Address"
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsDetailModalOpen(false)}>Close Workspace</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
