'use client';

import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [filter, setFilter] = useState('3months'); // month | 3months | 6months | 12months | custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Interactive break-up state
  const [selectedBreakup, setSelectedBreakup] = useState(null); // 'projects' | 'revenue' | 'expenses' | 'profit' | 'receivables' | 'payables'

  const handleSendWhatsAppReminder = (r) => {
    let phone = r.clientPhone || '';
    if (!phone) {
      phone = window.prompt("Client phone number is missing. Please enter phone number (including country code, e.g. +917502774016):");
      if (!phone) return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const dateStr = new Date().toLocaleDateString();
    const dueStr = r.dueDate ? new Date(r.dueDate).toLocaleDateString() : 'N/A';
    
    const msg = `*LEGENDIN PAYMENT REMINDER*\n\nDear Client,\n\nThis is a reminder regarding the outstanding balance for your project: *${r.name}*.\n\n*As of Today (${dateStr}):*\n- *Total Value:* ₹${r.value.toLocaleString()}\n- *Paid So Far:* ₹${r.paid.toLocaleString()}\n- *Remaining Balance:* ₹${r.remaining.toLocaleString()}\n- *Due Date:* ${dueStr}\n\nYou can view and download your full financial statement PDF here:\n${window.location.origin}/print/project/${r._id}\n\nPlease arrange for payment at your earliest convenience.\n\n_LegendIn — Premium Interior Designers_\nsupport@legendin.com | www.legendin.com`;
    
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      let url = `/api/dashboard?filter=${filter}`;
      if (filter === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data && typeof data === 'object' && !data.error && 'totalRevenue' in data) {
        setMetrics(data);
      } else {
        console.error((data && data.error) || 'Failed to fetch metrics / invalid data format');
        setMetrics(null);
      }
    } catch (err) {
      console.error(err);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [filter, startDate, endDate]);

  const handleDeleteInvoice = async (invoiceId) => {
    if (!confirm('Are you sure you want to delete this invoice? This will also delete any associated payment records.')) return;
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMetrics();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete invoice');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete invoice');
    }
  };

  const handlePresetChange = (preset) => {
    setFilter(preset);
  };

  const handleExportCSV = () => {
    if (!metrics) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header Info
    csvContent += "LEGENDIN CRM FINANCIAL CONSOLIDATED REPORT\n";
    csvContent += `Filter Range: ${filter.toUpperCase()}\n`;
    if (filter === 'custom') {
      csvContent += `Date Range: ${startDate} to ${endDate}\n`;
    }
    csvContent += "\n";
    
    // Summary
    csvContent += "SUMMARY METRICS\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Projects,${metrics.totalProjects}\n`;
    csvContent += `Total Revenue,₹${metrics.totalRevenue}\n`;
    csvContent += `Total Expenses,₹${metrics.totalExpenses}\n`;
    csvContent += `Net Profit,₹${metrics.netProfit}\n`;
    csvContent += `Accounts Receivable (Global),₹${metrics.globalAccountsReceivable}\n`;
    csvContent += `Accounts Payable (Global),₹${metrics.globalAccountsPayable}\n\n`;

    // Detailed Projects
    csvContent += "DETAILED PROJECTS\n";
    csvContent += "Project Name,Client Company,Type,Status,Contract Value,Start Date,End Date\n";
    (metrics.detailedProjects || []).forEach(p => {
      const clientName = p.client ? p.client.company : 'N/A';
      csvContent += `"${p.name}","${clientName}","${p.type}","${p.status}",${p.value},"${p.start_date ? new Date(p.start_date).toLocaleDateString() : ''}","${p.end_date ? new Date(p.end_date).toLocaleDateString() : ''}"\n`;
    });
    csvContent += "\n";

    // Detailed Revenue (Payments)
    csvContent += "REVENUE DETAILS (PAYMENTS RECEIVED)\n";
    csvContent += "Date Received,Invoice Number,Project Name,Client Company,Payment Method,Bank/Wallet Received,Category,Amount\n";
    (metrics.detailedPayments || []).forEach(p => {
      const invNum = p.invoice ? p.invoice.invoice_number : 'Manual';
      const projName = p.project ? p.project.name : 'N/A';
      const clientName = p.project && p.project.client ? p.project.client.company : 'N/A';
      csvContent += `"${new Date(p.payment_date).toLocaleDateString()}","${invNum}","${projName}","${clientName}","${p.method}","${p.bank_account_received || ''}","${p.category || ''}",${p.amount}\n`;
    });
    csvContent += "\n";

    // Detailed Expenses
    csvContent += "EXPENSES DETAILS\n";
    csvContent += "Date,Category,Description,Linked Project,Amount\n";
    (metrics.detailedExpenses || []).forEach(e => {
      const projName = e.project ? e.project.name : 'N/A';
      csvContent += `"${new Date(e.expense_date).toLocaleDateString()}","${e.category}","${e.description || ''}","${projName}",${e.amount}\n`;
    });
    csvContent += "\n";

    // Accounts Receivable
    csvContent += "ACCOUNTS RECEIVABLE BREAKDOWN\n";
    csvContent += "Project Name,Client Company,Total Value,Paid Amount,Remaining Balance\n";
    (metrics.detailedReceivables || []).forEach(r => {
      csvContent += `"${r.name}","${r.clientCompany}",${r.value},${r.paid},${r.remaining}\n`;
    });
    csvContent += "\n";

    // Accounts Payable
    csvContent += "ACCOUNTS PAYABLE BREAKDOWN (UNPAID BILLS)\n";
    csvContent += "Vendor Name,Description,Bill Date,Due Date,Amount\n";
    (metrics.detailedPayables || []).forEach(p => {
      csvContent += `"${p.vendor_name}","${p.description || ''}","${new Date(p.bill_date).toLocaleDateString()}","${new Date(p.due_date).toLocaleDateString()}",${p.amount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `legendin_financial_report_${filter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Render Advanced SVG Cumulative Growth Area Chart
  const renderGrowthChart = () => {
    if (!metrics || !metrics.chartData || metrics.chartData.length === 0) return null;

    const chartData = metrics.chartData;
    
    // Compute cumulative profit
    let cumulativeTotal = 0;
    const growthData = chartData.map(d => {
      cumulativeTotal += d.netProfit;
      return {
        month: d.month,
        value: cumulativeTotal
      };
    });

    const values = growthData.map(d => d.value);
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 1000);
    
    // Height & margins
    const height = 180;
    const width = 600;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 15;
    const paddingBottom = 30;
    
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    // Grid Lines (Y-Axis)
    const yGridLines = [0, 0.25, 0.5, 0.75, 1];

    // Compute coordinate points (X, Y) for path
    const points = growthData.map((d, idx) => {
      const x = paddingLeft + (plotWidth / Math.max(1, growthData.length - 1)) * idx;
      // Calculate normalized Y position (handling negative values gracefully)
      const ratio = (d.value - minVal) / Math.max(1, maxVal - minVal);
      const y = paddingTop + plotHeight * (1 - ratio);
      return { x, y, label: d.month, value: d.value };
    });

    // Generate Path Data
    let linePath = '';
    let areaPath = '';

    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
      const yBottom = paddingTop + plotHeight;
      areaPath = `${linePath} L ${points[points.length - 1].x} ${yBottom} L ${points[0].x} ${yBottom} Z`;
    }

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Y Grid Lines */}
        {yGridLines.map((ratio, idx) => {
          const y = paddingTop + plotHeight * (1 - ratio);
          const val = minVal + (maxVal - minVal) * ratio;
          return (
            <g key={idx}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={width - paddingRight} 
                y2={y} 
                stroke="#e2e8f0" 
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text 
                x={paddingLeft - 10} 
                y={y + 4} 
                textAnchor="end" 
                fontSize="10" 
                fill="var(--text-muted)"
                fontWeight="500"
              >
                ₹{Math.round(val) >= 1000 ? `${(val/1000).toFixed(1)}k` : Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Render Shaded Area */}
        {areaPath && <path d={areaPath} fill="url(#growthGradient)" />}

        {/* Render Colored line */}
        {linePath && (
          <path 
            d={linePath} 
            fill="none" 
            stroke="var(--primary)" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        )}

        {/* Render Data Nodes & Labels */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle 
              cx={p.x} 
              cy={p.y} 
              r="4" 
              fill="#ffffff" 
              stroke="var(--primary)" 
              strokeWidth="2" 
            >
              <title>{p.label} Cumulative Profit: ₹{p.value.toLocaleString()}</title>
            </circle>
            
            <text 
              x={p.x} 
              y={p.y - 10} 
              textAnchor="middle" 
              fontSize="10" 
              fontWeight="700" 
              fill="var(--primary)"
            >
              ₹{Math.round(p.value) >= 1000 ? `${(p.value/1000).toFixed(1)}k` : Math.round(p.value)}
            </text>

            <text 
              x={p.x} 
              y={height - 10} 
              textAnchor="middle" 
              fontSize="10" 
              fill="var(--text-muted)"
              fontWeight="600"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  // 2. Render Advanced SVG Expenses Pie Chart
  const renderExpensesPieChart = () => {
    if (!metrics || !metrics.expensesByCategory) return null;

    const categories = [
      { key: 'salary', label: 'Salaries & Payouts', color: '#8b5cf6' },
      { key: 'software', label: 'Software Licenses', color: '#10b981' },
      { key: 'rent', label: 'Office Rent', color: '#3b82f6' },
      { key: 'marketing', label: 'Marketing', color: '#f59e0b' },
      { key: 'vendor_settlement', label: 'Vendor Payables', color: '#d1123f' },
      { key: 'project_cost', label: 'Direct Project Costs', color: '#ec4899' },
      { key: 'other', label: 'Other Ops', color: '#64748b' }
    ];

    const data = categories.map(c => ({
      ...c,
      amount: metrics.expensesByCategory[c.key] || 0
    })).filter(c => c.amount > 0);

    const total = data.reduce((sum, c) => sum + c.amount, 0);

    if (total === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-muted)', fontSize: '13px' }}>
          No expenses logged in this period.
        </div>
      );
    }

    let accumulatedPercent = 0;
    const radius = 50;
    const circ = 2 * Math.PI * radius;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <svg width="150" height="150" viewBox="0 0 120 120">
            <g transform="rotate(-90 60 60)">
              {data.map((cat, idx) => {
                const ratio = cat.amount / total;
                const dashArray = `${ratio * circ} ${circ}`;
                const dashOffset = -accumulatedPercent * circ;
                accumulatedPercent += ratio;

                return (
                  <circle
                    key={idx}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke={cat.color}
                    strokeWidth="16"
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    style={{ transition: 'stroke-width 0.2s' }}
                    onMouseEnter={e => e.target.setAttribute('stroke-width', '20')}
                    onMouseLeave={e => e.target.setAttribute('stroke-width', '16')}
                  >
                    <title>{cat.label}: ₹{cat.amount.toLocaleString()} ({Math.round(ratio * 100)}%)</title>
                  </circle>
                );
              })}
            </g>
            <circle cx="60" cy="60" r="34" fill="#ffffff" />
            <text x="60" y="60" textAnchor="middle" dy="4" fontSize="11" fontWeight="800" fill="var(--text-main)">
              Total Spent
            </text>
            <text x="60" y="73" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--danger)">
              ₹{total.toLocaleString()}
            </text>
          </svg>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
          {data.map((cat, idx) => {
            const ratio = cat.amount / total;
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat.color }} />
                  <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{cat.label}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ color: 'var(--text-main)' }}>₹{cat.amount.toLocaleString()}</strong>
                  <span style={{ color: 'var(--text-light)', marginLeft: '4px' }}>({Math.round(ratio * 100)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderBreakupModal = () => {
    if (!metrics) return null;

    let title = '';
    let headers = [];
    let rows = [];

    if (selectedBreakup === 'projects') {
      title = 'Total Projects Breakup';
      headers = ['Project Name', 'Client Company', 'Type', 'Status', 'Contract Value', 'Start Date'];
      rows = (metrics.detailedProjects || []).map(p => ({
        col1: p.name,
        col2: p.client ? p.client.company : 'N/A',
        col3: p.type === 'new' ? 'New Development' : 'Rework',
        col4: <span className={`badge badge-${p.status}`}>{p.status.replace('_', ' ')}</span>,
        col5: `₹${p.value.toLocaleString()}`,
        col6: p.start_date ? new Date(p.start_date).toLocaleDateString() : 'N/A'
      }));
    } else if (selectedBreakup === 'revenue') {
      title = 'Total Revenue (Payments Received) Breakup';
      headers = ['Date', 'Invoice', 'Project', 'Client', 'Method', 'Bank/Wallet', 'Category', 'Amount'];
      rows = (metrics.detailedPayments || []).map(p => ({
        col1: new Date(p.payment_date).toLocaleDateString(),
        col2: p.invoice ? p.invoice.invoice_number : 'Manual',
        col3: p.project ? p.project.name : 'N/A',
        col4: p.project && p.project.client ? p.project.client.company : 'N/A',
        col5: p.method,
        col6: p.bank_account_received || 'N/A',
        col7: <span className="badge badge-success" style={{ textTransform: 'capitalize', fontSize: '10px' }}>{p.category}</span>,
        col8: <strong style={{ color: 'var(--success)' }}>+₹{p.amount.toLocaleString()}</strong>
      }));
    } else if (selectedBreakup === 'expenses') {
      title = 'Total Expenses Breakup';
      headers = ['Date', 'Category', 'Description', 'Linked Project', 'Amount'];
      rows = (metrics.detailedExpenses || []).map(e => ({
        col1: new Date(e.expense_date).toLocaleDateString(),
        col2: <span className="funnel-card-source" style={{ textTransform: 'uppercase', fontSize: '9px' }}>{e.category.replace('_', ' ')}</span>,
        col3: e.description || 'General Expense',
        col4: e.project ? e.project.name : 'N/A',
        col5: <strong style={{ color: 'var(--danger)' }}>-₹{e.amount.toLocaleString()}</strong>
      }));
    } else if (selectedBreakup === 'profit') {
      title = 'Net Profit Monthly Trend';
      headers = ['Month Period', 'Revenue Inflow', 'Expenses Outflow', 'Monthly Net Profit', 'Net Profit Margin %'];
      rows = (metrics.chartData || []).map((d, idx) => {
        const marginPct = d.revenue > 0 ? Math.round((d.netProfit / d.revenue) * 100) : 0;
        let trendArrow = null;
        if (idx > 0) {
          const prevProfit = metrics.chartData[idx - 1].netProfit;
          if (d.netProfit > prevProfit) {
            trendArrow = <span style={{ color: 'var(--success)', marginLeft: '6px', fontWeight: 'bold' }}>▲</span>;
          } else if (d.netProfit < prevProfit) {
            trendArrow = <span style={{ color: 'var(--danger)', marginLeft: '6px', fontWeight: 'bold' }}>▼</span>;
          }
        }

        return {
          col1: d.month,
          col2: `₹${d.revenue.toLocaleString()}`,
          col3: `-₹${d.expenses.toLocaleString()}`,
          col4: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <strong style={{ color: d.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {d.netProfit < 0 ? '-' : ''}₹{Math.abs(d.netProfit).toLocaleString()}
              </strong>
              {trendArrow}
            </div>
          ),
          col5: <strong style={{ color: 'var(--text-main)' }}>{marginPct}%</strong>
        };
      });
    } else if (selectedBreakup === 'receivables') {
      title = 'Accounts Receivable Breakup (Active Balances)';
      headers = ['Project Name', 'Client Company', 'Total Value', 'Paid So Far', 'Remaining Due', 'Reminder'];
      rows = (metrics.detailedReceivables || []).map(r => ({
        col1: r.name,
        col2: r.clientCompany,
        col3: `₹${r.value.toLocaleString()}`,
        col4: `₹${r.paid.toLocaleString()}`,
        col5: <strong style={{ color: 'var(--primary)' }}>₹{r.remaining.toLocaleString()}</strong>,
        col6: (
          <button 
            className="btn btn-primary" 
            style={{ 
              padding: '4px 10px', 
              fontSize: '11px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px',
              fontWeight: '700'
            }}
            onClick={() => handleSendWhatsAppReminder(r)}
          >
            💬 WhatsApp
          </button>
        )
      }));
    } else if (selectedBreakup === 'payables') {
      title = 'Accounts Payable Breakup (Unpaid Vendor Bills)';
      headers = ['Vendor Name', 'Description', 'Bill Date', 'Due Date', 'Status', 'Amount'];
      rows = (metrics.detailedPayables || []).map(p => ({
        col1: p.vendor_name,
        col2: p.description || 'N/A',
        col3: new Date(p.bill_date).toLocaleDateString(),
        col4: new Date(p.due_date).toLocaleDateString(),
        col5: <span className="badge badge-unpaid">Unpaid</span>,
        col6: <strong style={{ color: 'var(--danger)' }}>₹{p.amount.toLocaleString()}</strong>
      }));
    } else if (selectedBreakup === 'amc') {
      title = 'Annual Maintenance Contracts (AMC) Overview';
      headers = ['Client Company', 'Product', 'Start Date', 'End Date', 'Remaining Time', 'Total Contract', 'Paid Amount', 'Balance Due'];
      rows = (metrics.detailedAmcs || []).map(amc => {
        const paid = amc.payments ? amc.payments.reduce((s, p) => s + p.amount, 0) : 0;
        const remaining = Math.max(0, amc.amount - paid);
        const end = new Date(amc.end_date);
        const today = new Date();
        const diffMonths = Math.ceil((end - today) / (1000 * 60 * 60 * 24 * 30.4));
        
        let remainingStr = '';
        let remainingColor = 'var(--text-main)';
        if (diffMonths <= 0) {
          remainingStr = 'Expired';
          remainingColor = 'var(--danger)';
        } else if (diffMonths <= 1) {
          remainingStr = 'Expiring (<1mo)';
          remainingColor = 'var(--danger)';
        } else if (diffMonths <= 6) {
          remainingStr = `${diffMonths} months`;
          remainingColor = 'var(--warning)';
        } else {
          remainingStr = `${diffMonths} months`;
          remainingColor = 'var(--success)';
        }

        return {
          col1: amc.client ? amc.client.company : 'N/A',
          col2: amc.product,
          col3: new Date(amc.start_date).toLocaleDateString(),
          col4: new Date(amc.end_date).toLocaleDateString(),
          col5: <span style={{ color: remainingColor, fontWeight: '700' }}>{remainingStr}</span>,
          col6: <strong>₹{amc.amount.toLocaleString()}</strong>,
          col7: <span style={{ color: 'var(--success)', fontWeight: '600' }}>₹{paid.toLocaleString()}</span>,
          col8: <span style={{ color: remaining > 0 ? 'var(--primary)' : 'inherit', fontWeight: '700' }}>₹{remaining.toLocaleString()}</span>
        };
      });
    } else if (selectedBreakup === 'stock') {
      title = 'Material Stock Valuation (Worth of INR)';
      headers = ['Material Name', 'Current Stock', 'Unit', 'Avg Purchase Rate', 'Total Valuation'];
      rows = (metrics.stockDetails || []).map(s => ({
        col1: s.name,
        col2: s.current_stock,
        col3: s.unit,
        col4: `₹${(s.avgRate || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        col5: <strong style={{ color: 'var(--primary)' }}>₹{(s.worth || 0).toLocaleString()}</strong>
      }));
    }

    return (
      <div className="modal-backdrop" style={{ zIndex: 1000 }}>
        <div className="modal-content" style={{ maxWidth: '850px', maxHeight: '85vh', overflowY: 'auto' }}>
          <div className="modal-header">
            <div>
              <h3 className="modal-title">{title}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Showing breakup records based on selected timeframe
              </p>
            </div>
            <button type="button" className="modal-close" onClick={() => setSelectedBreakup(null)}>×</button>
          </div>

          <div className="table-container" style={{ marginTop: '16px' }}>
            <table className="table-list" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  {headers.map((h, i) => <th key={i}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {Object.keys(row).map((k, idx) => <td key={idx}>{row[k]}</td>)}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={headers.length} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedBreakup(null)}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header bar with Branding Logo & Slogan */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: '#ffffff', 
        border: '1px solid var(--card-border)', 
        borderRadius: 'var(--border-radius)', 
        padding: '20px 24px', 
        marginBottom: '28px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#12131a',
            padding: '3px',
            border: '2px solid var(--primary)',
            boxShadow: '0 0 15px rgba(209, 18, 63, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img 
              src="/logo.png?v=2" 
              alt="LegendIn Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              LegendIn 
              <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                ERP
              </span>
            </h1>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', display: 'block', marginTop: '2px' }}>
              LegendIn — Premium Interior Designers
            </span>
          </div>
        </div>

        {/* Date presets selection & Excel Download */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="date-presets">
            <button className={`preset-btn ${filter === 'month' ? 'active' : ''}`} onClick={() => handlePresetChange('month')}>This Month</button>
            <button className={`preset-btn ${filter === '3months' ? 'active' : ''}`} onClick={() => handlePresetChange('3months')}>3 Months</button>
            <button className={`preset-btn ${filter === '6months' ? 'active' : ''}`} onClick={() => handlePresetChange('6months')}>6 Months</button>
            <button className={`preset-btn ${filter === '12months' ? 'active' : ''}`} onClick={() => handlePresetChange('12months')}>12 Months</button>
            <button className={`preset-btn ${filter === 'custom' ? 'active' : ''}`} onClick={() => handlePresetChange('custom')}>Custom</button>
          </div>

          {filter === 'custom' && (
            <div className="custom-date-range">
              <label>From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <label>To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          )}

          <button className="btn btn-primary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            📥 Download Report
          </button>
        </div>
      </div>

      {loading && !metrics ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-muted)', fontSize: '18px' }}>
          Loading metrics...
        </div>
      ) : (
        metrics && (
          <div>
            {/* Primary KPI Metrics Grid */}
            <div className="grid-4" style={{ marginBottom: '24px' }}>
              <div 
                className="card-metric accent-info" 
                onClick={() => setSelectedBreakup('projects')}
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Click to view Project listings"
              >
                <div className="metric-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Projects</span>
                  <span style={{ fontSize: '12px' }}>🔍 View</span>
                </div>
                <div className="metric-value">{metrics?.totalProjects ?? 0}</div>
                <div className="metric-subtitle">Started in selected period</div>
              </div>
              
              <div 
                className="card-metric accent-success"
                onClick={() => setSelectedBreakup('revenue')}
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Click to view Payments history"
              >
                <div className="metric-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Revenue</span>
                  <span style={{ fontSize: '12px' }}>🔍 View</span>
                </div>
                <div className="metric-value">₹{(metrics?.totalRevenue ?? 0).toLocaleString()}</div>
                <div className="metric-subtitle">Inflow from client payments</div>
              </div>

              <div 
                className="card-metric accent-danger"
                onClick={() => setSelectedBreakup('expenses')}
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Click to view Expenses log"
              >
                <div className="metric-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Expenses</span>
                  <span style={{ fontSize: '12px' }}>🔍 View</span>
                </div>
                <div className="metric-value">₹{(metrics?.totalExpenses ?? 0).toLocaleString()}</div>
                <div className="metric-subtitle">Outflow (costs & settlements)</div>
              </div>

              <div 
                className={`card-metric ${(metrics?.netProfit ?? 0) >= 0 ? 'accent-success' : 'accent-danger'}`}
                onClick={() => setSelectedBreakup('profit')}
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Click to view Net Profit trend details"
              >
                <div className="metric-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Net Profit</span>
                  <span style={{ fontSize: '12px' }}>🔍 View</span>
                </div>
                <div className="metric-value" style={{ color: (metrics?.netProfit ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {(metrics?.netProfit ?? 0) < 0 ? '-' : ''}₹{Math.abs(metrics?.netProfit ?? 0).toLocaleString()}
                </div>
                <div className="metric-subtitle">Revenue minus expenses</div>
              </div>
            </div>

            {/* Global Balance Sheets & AMC Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              <div 
                className="card-metric accent-warning" 
                onClick={() => setSelectedBreakup('receivables')}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Click to view accounts receivable breakup"
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="metric-title" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>Accounts Receivable</span>
                    <span style={{ fontSize: '10px', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', padding: '1px 5px', borderRadius: '3px' }}>🔍 Breakup</span>
                  </div>
                  <div className="metric-value" style={{ fontSize: '24px' }}>₹{(metrics?.globalAccountsReceivable ?? 0).toLocaleString()}</div>
                  <div className="metric-subtitle">Client funds currently owed to agency</div>
                </div>
                <span style={{ fontSize: '32px', flexShrink: 0, marginLeft: '12px' }}>⏳</span>
              </div>

              <div 
                className="card-metric accent-primary" 
                onClick={() => setSelectedBreakup('payables')}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Click to view accounts payable breakup"
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="metric-title" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>Accounts Payable</span>
                    <span style={{ fontSize: '10px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 5px', borderRadius: '3px' }}>🔍 Breakup</span>
                  </div>
                  <div className="metric-value" style={{ fontSize: '24px' }}>₹{(metrics?.globalAccountsPayable ?? 0).toLocaleString()}</div>
                  <div className="metric-subtitle">Outstanding unpaid vendor bills</div>
                </div>
                <span style={{ fontSize: '32px', flexShrink: 0, marginLeft: '12px' }}>💸</span>
              </div>

              <div 
                className="card-metric accent-info" 
                onClick={() => setSelectedBreakup('amc')}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Click to view AMC contracts breakup"
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="metric-title" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>AMC Contracts</span>
                    <span style={{ fontSize: '10px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 5px', borderRadius: '3px' }}>🔍 Breakup</span>
                  </div>
                  <div className="metric-value" style={{ fontSize: '24px' }}>{metrics?.totalAmcs ?? 0} Active</div>
                  <div className="metric-subtitle">
                    Value: ₹{(metrics?.totalAmcValue ?? 0).toLocaleString()} | Owed: ₹{(metrics?.totalAmcPending ?? 0).toLocaleString()}
                  </div>
                </div>
                <span style={{ fontSize: '32px', flexShrink: 0, marginLeft: '12px' }}>🔄</span>
              </div>

              <div 
                className="card-metric accent-success" 
                onClick={() => setSelectedBreakup('stock')}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Click to view material stock valuation breakdown"
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="metric-title" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>Stock Available</span>
                    <span style={{ fontSize: '10px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '1px 5px', borderRadius: '3px' }}>🔍 Breakup</span>
                  </div>
                  <div className="metric-value" style={{ fontSize: '24px' }}>₹{(metrics?.totalStockWorth ?? 0).toLocaleString()}</div>
                  <div className="metric-subtitle">Worth of stock in inventory (INR)</div>
                </div>
                <span style={{ fontSize: '32px', flexShrink: 0, marginLeft: '12px' }}>🪵</span>
              </div>
            </div>

            {/* Advanced Performance Metrics Banner */}
            <div className="panel" style={{ marginBottom: '32px' }}>
              <div className="panel-header" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '10px' }}>
                <h2 className="panel-title" style={{ fontSize: '16px' }}>📉 Advanced Performance Ratios & Status Distributions</h2>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--primary)' }}>Real-time analytics & margins</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '14px' }}>
                <div style={{ borderRight: '1px solid var(--card-border)', paddingRight: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Average Project Value</span>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                    ₹{(metrics?.totalProjects ?? 0) > 0 ? Math.round((metrics?.detailedProjects || []).reduce((sum, p) => sum + (p.value || 0), 0) / (metrics?.totalProjects || 1)).toLocaleString() : 0}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>Average budget sizes</span>
                </div>

                <div style={{ borderRight: '1px solid var(--card-border)', paddingRight: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Global Net Profit Margin</span>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
                    {(metrics?.totalRevenue ?? 0) > 0 ? `${Math.round(((metrics?.netProfit ?? 0) / (metrics?.totalRevenue || 1)) * 100)}%` : '0%'}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>Efficiency ratio of revenue</span>
                </div>

                <div style={{ borderRight: '1px solid var(--card-border)', paddingRight: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Workflows Pipeline</span>
                  <div style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div>🚀 In Progress: <strong>{(metrics?.detailedProjects || []).filter(p => p.status === 'in_progress').length}</strong></div>
                    <div>✅ Completed: <strong>{(metrics?.detailedProjects || []).filter(p => p.status === 'completed').length}</strong></div>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Outstanding Balance Ratio</span>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--warning)', marginTop: '4px' }}>
                    {(metrics?.globalAccountsReceivable ?? 0) + (metrics?.totalRevenue ?? 0) > 0 
                      ? `${Math.round(((metrics?.globalAccountsReceivable ?? 0) / ((metrics?.globalAccountsReceivable ?? 0) + (metrics?.totalRevenue ?? 0))) * 100)}%`
                      : '0%'}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>Receivables vs total project value sum</span>
                </div>
              </div>
            </div>

            {/* Charts section: Left Line Chart, Right Pie Chart */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
              {/* Financial Cumulative Growth Chart */}
              <div className="panel" style={{ margin: 0 }}>
                <div className="panel-header">
                  <h2 className="panel-title">Cumulative Growth (Net Profit Trend)</h2>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--primary)' }}>
                    📈 Accumulated Profits Over Selected Range
                  </div>
                </div>
                <div className="chart-svg-container">
                  {renderGrowthChart()}
                </div>
              </div>

              {/* Expenses Breakdown Pie Chart */}
              <div className="panel" style={{ margin: 0 }}>
                <div className="panel-header">
                  <h2 className="panel-title">Company Expenses Breakdown</h2>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>
                    Pie chart representation
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  {renderExpensesPieChart()}
                </div>
              </div>
            </div>

            {/* Actionable alerts grid below charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginTop: '28px', marginBottom: '40px' }}>
              
              {/* In Progress Projects */}
              <div className="panel" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '320px' }}>
                <div className="panel-header" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', marginBottom: '10px' }}>
                  <h2 className="panel-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>🚀 In Progress Projects</h2>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(metrics.detailedProjects || []).filter(p => p.status === 'in_progress').length > 0 ? (
                    (metrics.detailedProjects || []).filter(p => p.status === 'in_progress').map(proj => (
                      <div key={proj._id} style={{ padding: '10px', backgroundColor: '#fcfcfc', border: '1px solid var(--card-border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>{proj.name}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Client: {proj.client ? proj.client.company : 'N/A'}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', marginTop: '2px' }}>Start: {proj.start_date ? new Date(proj.start_date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)' }}>₹{proj.value?.toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)', fontSize: '12px', fontStyle: 'italic' }}>
                      No projects currently in progress.
                    </div>
                  )}
                </div>
              </div>

              {/* Payments in Due (Client Receivables / Invoices) */}
              <div className="panel" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '320px' }}>
                <div className="panel-header" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', marginBottom: '10px' }}>
                  <h2 className="panel-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>⏳ Payments in Due (Unpaid Invoices)</h2>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(metrics.detailedInvoices || []).length > 0 ? (
                    (metrics.detailedInvoices || []).map(inv => {
                      const isOverdue = new Date(inv.due_date) < new Date();
                      return (
                        <div key={inv._id} style={{ padding: '10px', backgroundColor: '#fcfcfc', border: `1px solid ${isOverdue ? 'var(--danger, #ef4444)' : 'var(--card-border)'}`, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>{inv.invoice_number}</strong>
                              <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: '4px', backgroundColor: inv.status === 'partial' ? 'var(--warning-light)' : 'var(--danger-light)', color: inv.status === 'partial' ? 'var(--warning)' : 'var(--danger)' }}>
                                {inv.status.toUpperCase()}
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Project: {inv.project ? inv.project.name : 'N/A'}</span>
                            <span style={{ fontSize: '11px', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: isOverdue ? '700' : '400', display: 'block' }}>
                              Due: {new Date(inv.due_date).toLocaleDateString()} {isOverdue && '⚠️ OVERDUE'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>₹{inv.amount?.toLocaleString()}</span>
                            </div>
                            <button 
                              onClick={() => handleDeleteInvoice(inv._id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px', transition: 'transform 0.1s' }}
                              title="Delete Invoice"
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)', fontSize: '12px', fontStyle: 'italic' }}>
                      All invoices are fully settled! 🎉
                    </div>
                  )}
                </div>
              </div>

              {/* Accounts Payable Reminders (Vendor Bills) */}
              <div className="panel" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '320px' }}>
                <div className="panel-header" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', marginBottom: '10px' }}>
                  <h2 className="panel-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>💸 Accounts Payable Reminders</h2>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(() => {
                    const today = new Date();
                    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                    const crossedDue = (metrics.detailedPayables || []).filter(p => new Date(p.due_date) < today);
                    const nearToPay = (metrics.detailedPayables || []).filter(p => {
                      const d = new Date(p.due_date);
                      return d >= today && d <= sevenDaysFromNow;
                    });

                    if (crossedDue.length === 0 && nearToPay.length === 0) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)', fontSize: '12px', fontStyle: 'italic' }}>
                          No pending vendor settlements.
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {crossedDue.length > 0 && (
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--danger)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🔴 Crossed Due ({crossedDue.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {crossedDue.map(bill => (
                                <div key={bill._id} style={{ padding: '8px', backgroundColor: 'var(--danger-light)', border: '1px solid #fecaca', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <strong style={{ fontSize: '12px', color: 'var(--text-main)', display: 'block' }}>{bill.vendor_name}</strong>
                                    <span style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: '700' }}>Overdue: {new Date(bill.due_date).toLocaleDateString()}</span>
                                  </div>
                                  <strong style={{ fontSize: '12px', color: 'var(--danger)' }}>₹{bill.amount?.toLocaleString()}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {nearToPay.length > 0 && (
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--warning)', textTransform: 'uppercase', marginBottom: '6px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🟡 Near to Pay ({nearToPay.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {nearToPay.map(bill => (
                                <div key={bill._id} style={{ padding: '8px', backgroundColor: 'var(--warning-light)', border: '1px solid #fef3c7', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <strong style={{ fontSize: '12px', color: 'var(--text-main)', display: 'block' }}>{bill.vendor_name}</strong>
                                    <span style={{ fontSize: '10px', color: 'var(--warning)' }}>Due: {new Date(bill.due_date).toLocaleDateString()}</span>
                                  </div>
                                  <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>₹{bill.amount?.toLocaleString()}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>

            {/* Render breakup details modal */}
            {selectedBreakup && renderBreakupModal()}
          </div>
        )
      )}
    </div>
  );
}
