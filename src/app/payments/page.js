'use client';

import { useState, useEffect } from 'react';

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState('receivables'); // receivables | payables | gst_ledger | expenses | transport | ledger_book
  const [payments, setPayments] = useState([]);
  const [payables, setPayables] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [purchases, setPurchases] = useState([]); // Material purchases
  const [transport, setTransport] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [newPayable, setNewPayable] = useState({ vendor_name: '', description: '', amount: '', bill_date: '', due_date: '', status: 'unpaid' });
  const [newExpense, setNewExpense] = useState({ category: 'rent', amount: '', expense_date: '', description: '' });
  const [newTransport, setNewTransport] = useState({ project: '', transport_service: '', amount: '', payment_status: 'unpaid', delivery_date: '', notes: '' });

  // Modal display states
  const [showAddPayableModal, setShowAddPayableModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddTransportModal, setShowAddTransportModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resPay, resPayables, resExp, resInvs, resProjs, resPurch, resTrans, resPayroll] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/vendors-payables'),
        fetch('/api/expenses'),
        fetch('/api/invoices'),
        fetch('/api/projects'),
        fetch('/api/purchase'),
        fetch('/api/transport'),
        fetch(`/api/hr/payroll?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`)
      ]);

      const payData = await resPay.json();
      const payablesData = await resPayables.json();
      const expData = await resExp.json();
      const invsData = await resInvs.json();
      const projsData = await resProjs.json();
      const purchData = await resPurch.json();
      const transData = await resTrans.json();
      
      let payrollData = [];
      try {
        payrollData = await resPayroll.json();
      } catch (e) {
        console.warn("Payroll fetch warning:", e);
      }

      setPayments(Array.isArray(payData) ? payData : []);
      setPayables(Array.isArray(payablesData) ? payablesData : []);
      setExpenses(Array.isArray(expData) ? expData : []);
      setInvoices(Array.isArray(invsData) ? invsData : []);
      setProjects(Array.isArray(projsData) ? projsData : []);
      setPurchases(Array.isArray(purchData.transactions) ? purchData.transactions.filter(t => t.transaction_type === 'purchase') : []);
      setTransport(Array.isArray(transData) ? transData : []);
      setPayroll(Array.isArray(payrollData) ? payrollData : []);
    } catch (err) {
      console.error("Error loading account data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePayable = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/vendors-payables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPayable, amount: Number(newPayable.amount) })
      });
      if (res.ok) {
        setNewPayable({ vendor_name: '', description: '', amount: '', bill_date: '', due_date: '', status: 'unpaid' });
        setShowAddPayableModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettlePayable = async (payableId) => {
    try {
      const res = await fetch(`/api/vendors-payables/${payableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (newExpense.category === 'other' && !newExpense.description?.trim()) {
      return alert('Please enter description details for "Other Ops" expenses.');
    }
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newExpense, amount: Number(newExpense.amount) })
      });
      if (res.ok) {
        setNewExpense({ category: 'rent', amount: '', expense_date: '', description: '' });
        setShowAddExpenseModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTransport = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/transport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTransport,
          amount: Number(newTransport.amount),
          payment_date: newTransport.payment_status === 'paid' ? new Date().toISOString() : null
        })
      });
      if (res.ok) {
        // Also log a direct expense if paid
        if (newTransport.payment_status === 'paid') {
          await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category: 'other',
              amount: Number(newTransport.amount),
              expense_date: new Date().toISOString(),
              description: `Logistics: ${newTransport.transport_service}`
            })
          });
        }
        setNewTransport({ project: '', transport_service: '', amount: '', payment_status: 'unpaid', delivery_date: '', notes: '' });
        setShowAddTransportModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettleTransport = async (id, amount, serviceName) => {
    try {
      const res = await fetch(`/api/transport/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'paid', payment_date: new Date().toISOString() })
      });
      if (res.ok) {
        // Log in expense book
        await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'other',
            amount: Number(amount),
            expense_date: new Date().toISOString(),
            description: `Logistics: ${serviceName}`
          })
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadInvoice = (invoiceId) => {
    window.open(`/print/invoice/${invoiceId}`, '_blank');
  };

  const handleExportExcel = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    if (activeTab === 'receivables') {
      csv += 'ACCOUNTS RECEIVABLE\n';
      csv += 'Invoice No,Project Name,Client Partner,Due Date,Status,Total Amount\n';
      filteredInvoices.forEach(inv => {
        csv += `"${inv.invoice_number}","${inv.project ? inv.project.name.replace(/"/g, '""') : ''}","${inv.project && inv.project.client ? inv.project.client.company.replace(/"/g, '""') : ''}","${new Date(inv.due_date).toLocaleDateString()}","${inv.status}","₹${inv.amount}"\n`;
      });
    } else if (activeTab === 'payables') {
      csv += 'ACCOUNTS PAYABLE\n';
      csv += 'Category,Vendor Name,Description,Bill Date,Due Date,Amount Owed,Status\n';
      payables.forEach(p => {
        csv += `"Vendor Bill","${p.vendor_name.replace(/"/g, '""')}","${p.description ? p.description.replace(/"/g, '""') : ''}","${new Date(p.bill_date).toLocaleDateString()}","${new Date(p.due_date).toLocaleDateString()}","₹${p.amount}","${p.status}"\n`;
      });
    } else if (activeTab === 'gst_ledger') {
      csv += 'GST BOOKKEEPING LEDGER\n';
      csv += 'Invoice No,Project,Client,Tax Status,GST Rate,Taxable Amt,GST Collected,Total Value\n';
      invoices.forEach(inv => {
        const hasGst = inv.has_gst !== false;
        const gstRate = inv.gst_rate || 18;
        const totalVal = inv.amount;
        const taxable = hasGst ? Math.round(totalVal / (1 + (gstRate / 100))) : totalVal;
        const gstAmt = totalVal - taxable;
        csv += `"${inv.invoice_number}","${inv.project ? inv.project.name.replace(/"/g, '""') : ''}","${inv.project && inv.project.client ? inv.project.client.company.replace(/"/g, '""') : ''}","${hasGst ? 'GST Active' : 'No GST'}","${hasGst ? `${gstRate}%` : '0%'}","₹${taxable}","₹${hasGst ? gstAmt : '0'}","₹${totalVal}"\n`;
      });
    } else if (activeTab === 'expenses') {
      csv += 'EXPENSES BOOK\n';
      csv += 'Date,Category,Description,Amount\n';
      expenses.forEach(e => {
        csv += `"${new Date(e.expense_date).toLocaleDateString()}","${e.category}","${e.description ? e.description.replace(/"/g, '""') : ''}","₹${e.amount}"\n`;
      });
    } else if (activeTab === 'transport') {
      csv += 'TRANSPORT LOGISTICS LOG\n';
      csv += 'Carrier Name,Linked Project,Delivery Date,Payment Status,Amount,Notes\n';
      transport.forEach(t => {
        csv += `"${t.transport_service.replace(/"/g, '""')}","${t.project ? t.project.name.replace(/"/g, '""') : 'General Cargo'}","${t.delivery_date ? new Date(t.delivery_date).toLocaleDateString() : 'Pending'}","${t.payment_status}","₹${t.amount}","${t.notes ? t.notes.replace(/"/g, '""') : ''}"\n`;
      });
    } else if (activeTab === 'ledger_book') {
      csv += 'UNIFIED GENERAL LEDGER CASHBOOK\n';
      csv += 'Date,Transaction Category,Ref ID,Description,Debit,Credit,Cash Balance\n';
      filteredLedger.forEach(e => {
        csv += `"${e.date.toLocaleDateString()}","${e.type}","${e.ref}","${e.description.replace(/"/g, '""')}","${e.debit > 0 ? `₹${e.debit}` : '—'}","${e.credit > 0 ? `₹${e.credit}` : '—'}","₹${e.balance}"\n`;
      });
    }

    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `legendin_${activeTab}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Compile Dynamic Consolidated Cash Book Ledger
  const getLedgerEntries = () => {
    const entries = [];

    // 1. Credits (Payments Received)
    payments.forEach(p => {
      entries.push({
        date: new Date(p.payment_date || p.createdAt),
        type: 'Revenue Inflow',
        description: `Received payment for project "${p.project?.name || 'N/A'}" (Inv: ${p.invoice?.invoice_number || 'Manual'})`,
        ref: p.invoice?.invoice_number || p._id.substring(p._id.length - 6).toUpperCase(),
        debit: 0,
        credit: p.amount
      });
    });

    // 2. Debits (Expenses)
    expenses.forEach(e => {
      entries.push({
        date: new Date(e.expense_date || e.createdAt),
        type: `Expense (${e.category.toUpperCase()})`,
        description: e.description || 'General operational cost',
        ref: e._id.substring(e._id.length - 6).toUpperCase(),
        debit: e.amount,
        credit: 0
      });
    });

    // 3. Debits (Purchases from Stock Ledger)
    purchases.forEach(p => {
      entries.push({
        date: new Date(p.date || p.createdAt),
        type: 'Inventory Purchase',
        description: `Material: "${p.material_name}" qty: ${p.quantity} from ${p.supplier || 'Vendor'}`,
        ref: p.invoice_number || 'Stock Log',
        debit: p.quantity * (p.rate || 0),
        credit: 0
      });
    });

    // 4. Debits (Logistics Transport settled payments)
    transport.filter(t => t.payment_status === 'paid').forEach(t => {
      entries.push({
        date: new Date(t.payment_date || t.createdAt),
        type: 'Logistics Cost',
        description: `Transport fee to ${t.transport_service} ${t.project ? `for project "${t.project.name}"` : ''}`,
        ref: 'LOG-TRN',
        debit: t.amount,
        credit: 0
      });
    });

    // Sort chronologically (oldest first) to compute running balance
    entries.sort((a, b) => a.date - b.date);

    let runningBalance = 0;
    const ledger = entries.map(entry => {
      runningBalance = runningBalance + entry.credit - entry.debit;
      return {
        ...entry,
        balance: runningBalance
      };
    });

    // Reverse to show newest on top for user view
    return ledger.reverse();
  };

  const ledgerBook = getLedgerEntries();

  // Filters
  const filteredInvoices = invoices.filter(inv => {
    const q = searchQuery.toLowerCase();
    return inv.invoice_number.toLowerCase().includes(q) ||
           (inv.project && inv.project.name.toLowerCase().includes(q)) ||
           (inv.project && inv.project.client && inv.project.client.company.toLowerCase().includes(q));
  });

  const filteredLedger = ledgerBook.filter(entry => {
    const q = searchQuery.toLowerCase();
    return entry.description.toLowerCase().includes(q) ||
           entry.type.toLowerCase().includes(q) ||
           entry.ref.toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>💰 LegendIn Accounts & Ledger Console</h1>
          <p style={{ color: 'var(--text-muted)' }}>Consolidated accounts book, GST logs, transport logistics, and automated double-entry ledger journals</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleExportExcel}>📥 Export Excel</button>
          <button className="btn btn-secondary" onClick={handlePrintPDF}>🖨️ Print PDF</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="date-presets" style={{ width: 'fit-content', marginBottom: '28px' }}>
        <button className={`preset-btn ${activeTab === 'receivables' ? 'active' : ''}`} onClick={() => setActiveTab('receivables')}>
          ⏳ Accounts Receivable (Owed)
        </button>
        <button className={`preset-btn ${activeTab === 'payables' ? 'active' : ''}`} onClick={() => setActiveTab('payables')}>
          💸 Accounts Payable (Bills)
        </button>
        <button className={`preset-btn ${activeTab === 'gst_ledger' ? 'active' : ''}`} onClick={() => setActiveTab('gst_ledger')}>
          📋 Invoice GST Ledger
        </button>
        <button className={`preset-btn ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
          📉 Expenses Book
        </button>
        <button className={`preset-btn ${activeTab === 'transport' ? 'active' : ''}`} onClick={() => setActiveTab('transport')}>
          🚚 Transport & Logistics
        </button>
        <button className={`preset-btn ${activeTab === 'ledger_book' ? 'active' : ''}`} onClick={() => setActiveTab('ledger_book')}>
          📖 Unified General Ledger
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <input 
          type="text" 
          className="form-control" 
          placeholder="🔍 Filter records by details or numbers..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ maxWidth: '400px', padding: '10px 14px', fontSize: '14px', borderRadius: '8px' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          Loading accounts ledger datasets...
        </div>
      ) : (
        <div>
          
          {/* TAB 1: RECEIVABLES */}
          {activeTab === 'receivables' && (
            <div className="panel">
              <h2 className="panel-title" style={{ marginBottom: '16px' }}>Outstanding Accounts Receivable (Client Invoices)</h2>
              <div className="table-container">
                <table className="table-list">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Project Name</th>
                      <th>Client Partner</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(inv => (
                      <tr key={inv._id}>
                        <td style={{ fontWeight: '700' }}>{inv.invoice_number}</td>
                        <td>{inv.project ? inv.project.name : '—'}</td>
                        <td>{inv.project && inv.project.client ? inv.project.client.company : '—'}</td>
                        <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge badge-${inv.status}`}>{inv.status}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--primary)' }}>
                          ₹{inv.amount.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleDownloadInvoice(inv._id)}>
                            ⬇️ Invoice PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredInvoices.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>
                          No outstanding receivables matching search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PAYABLES */}
          {activeTab === 'payables' && (
            <div className="panel" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 className="panel-title" style={{ margin: 0 }}>Outstanding Accounts Payable</h2>
                <button className="btn btn-primary no-print" onClick={() => setShowAddPayableModal(true)}>
                  ➕ Log New Vendor Bill
                </button>
              </div>
              <div className="table-container">
                <table className="table-list" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Vendor / Material Details</th>
                      <th>Bill Date</th>
                      <th>Due Date</th>
                      <th style={{ textAlign: 'right' }}>Amount Owed</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Unpaid Vendor payables */}
                    {payables.filter(p => p.status === 'unpaid').map(p => (
                      <tr key={p._id}>
                        <td><span className="badge badge-danger">Vendor Bill</span></td>
                        <td>
                          <strong>{p.vendor_name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.description}</div>
                        </td>
                        <td>{new Date(p.bill_date).toLocaleDateString()}</td>
                        <td>{new Date(p.due_date).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{p.amount.toLocaleString()}</td>
                        <td>
                          <button className="btn btn-sm btn-primary" onClick={() => handleSettlePayable(p._id)}>
                            Settle Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* We can also pull purchases that are unpaid if any */}
                    {payables.filter(p => p.status === 'unpaid').length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>
                          No outstanding accounts payable bills.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GST LEDGER */}
          {activeTab === 'gst_ledger' && (
            <div className="panel">
              <h2 className="panel-title" style={{ marginBottom: '16px' }}>GST Bookkeeping Ledger</h2>
              <div className="table-container">
                <table className="table-list">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Project / Partner</th>
                      <th>Tax Status</th>
                      <th>GST Rate</th>
                      <th style={{ textAlign: 'right' }}>Taxable Amt (₹)</th>
                      <th style={{ textAlign: 'right' }}>GST Collected (₹)</th>
                      <th style={{ textAlign: 'right' }}>Total Value (₹)</th>
                      <th>Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => {
                      const hasGst = inv.has_gst !== false;
                      const gstRate = inv.gst_rate || 18;
                      const totalVal = inv.amount;
                      
                      // Calculate backward from amount
                      const taxable = hasGst ? Math.round(totalVal / (1 + (gstRate / 100))) : totalVal;
                      const gstAmt = totalVal - taxable;

                      return (
                        <tr key={inv._id}>
                          <td style={{ fontWeight: '700' }}>{inv.invoice_number}</td>
                          <td>
                            <strong>{inv.project ? inv.project.name : '—'}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {inv.project && inv.project.client ? inv.project.client.company : '—'}
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-${hasGst ? 'success' : 'secondary'}`}>
                              {hasGst ? 'GST Active' : 'No GST'}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600' }}>{hasGst ? `${gstRate}%` : '0%'}</td>
                          <td style={{ textAlign: 'right', fontWeight: '500' }}>₹{taxable.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: 'var(--info)', fontWeight: '700' }}>
                            ₹{hasGst ? gstAmt.toLocaleString() : '0'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--primary)' }}>
                            ₹{totalVal.toLocaleString()}
                          </td>
                          <td>
                            <button className="btn btn-sm btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleDownloadInvoice(inv._id)}>
                              🖨️ PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>
                          No invoices generated. Create invoices inside clients billing tabs.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: EXPENSES LOG */}
          {activeTab === 'expenses' && (
            <div className="panel" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 className="panel-title" style={{ margin: 0 }}>Expense Ledger Logs</h2>
                <button className="btn btn-primary no-print" onClick={() => setShowAddExpenseModal(true)}>
                  ➕ Log Expense
                </button>
              </div>
              <div className="table-container">
                <table className="table-list" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description / Details</th>
                      <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e._id}>
                        <td>{new Date(e.expense_date).toLocaleDateString()}</td>
                        <td>
                          <span className="badge badge-danger" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                            {e.category}
                          </span>
                        </td>
                        <td>{e.description || 'General operational expense'}</td>
                        <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: '700' }}>
                          -₹{e.amount.toLocaleString()}
                        </td>
                        <td>
                          <button className="btn btn-sm btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDeleteExpense(e._id)}>
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>
                          No expenses registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: TRANSPORT & LOGISTICS */}
          {activeTab === 'transport' && (
            <div className="panel" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 className="panel-title" style={{ margin: 0 }}>Transport & Logistics Log</h2>
                <button className="btn btn-primary no-print" onClick={() => setShowAddTransportModal(true)}>
                  ➕ Log Transport Service
                </button>
              </div>
              <div className="table-container">
                <table className="table-list" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Carrier Name</th>
                      <th>Project link</th>
                      <th>Delivery Date</th>
                      <th>Payment Status</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transport.map(t => (
                      <tr key={t._id}>
                        <td style={{ fontWeight: '700' }}>
                          {t.transport_service}
                          {t.notes && <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)' }}>Notes: {t.notes}</div>}
                        </td>
                        <td>{t.project ? t.project.name : 'General Cargo'}</td>
                        <td>{t.delivery_date ? new Date(t.delivery_date).toLocaleDateString() : 'Pending'}</td>
                        <td>
                          <span className={`badge badge-${t.payment_status === 'paid' ? 'success' : 'danger'}`}>
                            {t.payment_status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{t.amount.toLocaleString()}</td>
                        <td>
                          {t.payment_status === 'unpaid' ? (
                            <button className="btn btn-sm btn-primary" onClick={() => handleSettleTransport(t._id, t.amount, t.transport_service)}>
                              Settle Pay
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600' }}>Settled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {transport.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>
                          No transport entries cataloged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: UNIFIED GENERAL LEDGER BOOK */}
          {activeTab === 'ledger_book' && (
            <div className="panel">
              <h2 className="panel-title" style={{ marginBottom: '16px' }}>Consolidated General Ledger Cashbook</h2>
              <div className="table-container">
                <table className="table-list" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fafbfc' }}>
                      <th>Date</th>
                      <th>Transaction Category</th>
                      <th>Ref ID / Details</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right', color: 'var(--danger)' }}>Debit (Outflow)</th>
                      <th style={{ textAlign: 'right', color: 'var(--success)' }}>Credit (Inflow)</th>
                      <th style={{ textAlign: 'right' }}>Cash Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedger.map((entry, idx) => (
                      <tr key={idx}>
                        <td>{entry.date.toLocaleDateString()}</td>
                        <td>
                          <span className={`funnel-card-source`} style={{ fontSize: '10px' }}>{entry.type}</span>
                        </td>
                        <td><code>{entry.ref}</code></td>
                        <td>{entry.description}</td>
                        <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: entry.debit > 0 ? '700' : 'normal' }}>
                          {entry.debit > 0 ? `-₹${entry.debit.toLocaleString()}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: entry.credit > 0 ? '700' : 'normal' }}>
                          {entry.credit > 0 ? `+₹${entry.credit.toLocaleString()}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: entry.balance >= 0 ? 'var(--text-main)' : 'var(--danger)' }}>
                          ₹{entry.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {filteredLedger.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                          No entries in accounts cash book matching query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Modal 1: Log New Vendor Bill */}
      {showAddPayableModal && (
        <div className="modal-backdrop" style={{ zIndex: 1100, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', padding: '40px 20px' }}>
          <form className="modal-content" style={{ maxWidth: '600px', margin: 'auto' }} onSubmit={handleCreatePayable}>
            <div className="modal-header">
              <h3 className="modal-title">➕ Log New Vendor Bill</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddPayableModal(false)}>×</button>
            </div>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Vendor Name</label>
              <input type="text" className="form-control" required placeholder="E.g. Timberwood Traders"
                value={newPayable.vendor_name} onChange={e => setNewPayable({ ...newPayable, vendor_name: e.target.value })} />
            </div>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Description / Bill Details</label>
              <input type="text" className="form-control" required placeholder="E.g. Raw teakwood sheets order"
                value={newPayable.description} onChange={e => setNewPayable({ ...newPayable, description: e.target.value })} />
            </div>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Bill Amount (₹)</label>
              <input type="number" className="form-control" required placeholder="25000"
                value={newPayable.amount} onChange={e => setNewPayable({ ...newPayable, amount: e.target.value })} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Bill Date</label>
                <input type="date" className="form-control" required
                  value={newPayable.bill_date} onChange={e => setNewPayable({ ...newPayable, bill_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Due Date</label>
                <input type="date" className="form-control" required
                  value={newPayable.due_date} onChange={e => setNewPayable({ ...newPayable, due_date: e.target.value })} />
              </div>
            </div>
            
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddPayableModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Payable Entry</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Log Expense */}
      {showAddExpenseModal && (
        <div className="modal-backdrop" style={{ zIndex: 1100, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', padding: '40px 20px' }}>
          <form className="modal-content" style={{ maxWidth: '600px', margin: 'auto' }} onSubmit={handleCreateExpense}>
            <div className="modal-header">
              <h3 className="modal-title">➕ Log Expense</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddExpenseModal(false)}>×</button>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Category</label>
              <select className="form-control" value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}>
                <option value="salary">Salary / Resource Payout</option>
                <option value="rent">Office Rent & Utilities</option>
                <option value="electricity">Electricity / Water Bills</option>
                <option value="software">Design Software Licences (CAD/3ds Max)</option>
                <option value="machine_maintenance">Woodworking Machine Maintenance</option>
                <option value="office_expenses">Office Stationery & Admin costs</option>
                <option value="other">Other Ops</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Amount (₹)</label>
              <input type="number" className="form-control" required placeholder="5000"
                value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Expense Date</label>
              <input type="date" className="form-control" required
                value={newExpense.expense_date} onChange={e => setNewExpense({ ...newExpense, expense_date: e.target.value })} />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                Description details {newExpense.category === 'other' && <span style={{ color: 'var(--danger)' }}>*</span>}
              </label>
              <textarea 
                className="form-control" 
                placeholder="E.g. Electricity bill for woodwork showroom June"
                required={newExpense.category === 'other'}
                value={newExpense.description} 
                onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} 
                style={{ minHeight: '80px' }}
              />
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddExpenseModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Expense</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 3: Log Transport Service */}
      {showAddTransportModal && (
        <div className="modal-backdrop" style={{ zIndex: 1100, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', padding: '40px 20px' }}>
          <form className="modal-content" style={{ maxWidth: '600px', margin: 'auto' }} onSubmit={handleCreateTransport}>
            <div className="modal-header">
              <h3 className="modal-title">➕ Log Transport Service</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddTransportModal(false)}>×</button>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Transport / Logistics Provider</label>
              <input type="text" className="form-control" required placeholder="E.g. Professional Packers & Movers"
                value={newTransport.transport_service} onChange={e => setNewTransport({ ...newTransport, transport_service: e.target.value })} />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Linked Project</label>
              <select className="form-control" value={newTransport.project} onChange={e => setNewTransport({ ...newTransport, project: e.target.value })}>
                <option value="">Select Project...</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Charge Amount (₹)</label>
              <input type="number" className="form-control" required placeholder="8000"
                value={newTransport.amount} onChange={e => setNewTransport({ ...newTransport, amount: e.target.value })} />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Delivery / Cargo Date</label>
              <input type="date" className="form-control" required
                value={newTransport.delivery_date} onChange={e => setNewTransport({ ...newTransport, delivery_date: e.target.value })} />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Initial Payment Status</label>
              <select className="form-control" value={newTransport.payment_status} onChange={e => setNewTransport({ ...newTransport, payment_status: e.target.value })}>
                <option value="unpaid">Unpaid / Bill Owed</option>
                <option value="paid">Paid (Logs direct expense)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Notes / Vehicle No</label>
              <input type="text" className="form-control" placeholder="E.g. Truck No MH-12-PQ-9876, wooden modular pieces"
                value={newTransport.notes} onChange={e => setNewTransport({ ...newTransport, notes: e.target.value })} />
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddTransportModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Log Transport Cargo</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
