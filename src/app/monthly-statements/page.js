'use client';

import { useState, useEffect } from 'react';

export default function MonthlyStatementsPage() {
  const [startYear, setStartYear] = useState('2026');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal for monthly details
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [detailTab, setDetailTab] = useState('projects'); // projects | expenses | payments
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReport = data?.monthlyReport.filter(row => 
    row.monthName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.year.toString().includes(searchQuery)
  ) || [];

  const fetchStatements = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/monthly-statements?year=${startYear}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching monthly statements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatements();
  }, [startYear]);

  // Download CSV
  const handleDownloadCSV = () => {
    if (!data || !data.monthlyReport) return;
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Month,Year,Projects Count,Project Value (Turnover),Expenses,Payments Received (Cash Inflow),Net Profit (Accrual),Net Profit (Cash)\n';
    
    data.monthlyReport.forEach(row => {
      csvContent += `"${row.monthName}",${row.year},${row.projectsCount},${row.projectValueSum},${row.expensesSum},${row.paymentsSum},${row.netProfitAccrual},${row.netProfitCash}\n`;
    });
    
    // Append totals row
    csvContent += `"TOTAL FY",,${data.monthlyReport.reduce((sum, r) => sum + r.projectsCount, 0)},${data.totalProjectValue},${data.totalExpenses},${data.totalPayments},${data.netProfitAccrual},${data.netProfitCash}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Monthly_Statement_FY_${startYear}_${parseInt(startYear, 10)+1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Month Detail Popup Modal
  const handleRowClick = (monthData) => {
    setSelectedMonth(monthData);
    setDetailTab('projects');
    setIsModalOpen(true);
  };

  return (
    <div>
      {/* Header and Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>Monthly Financial Statements</h1>
          <p style={{ color: 'var(--text-muted)' }}>Financial Year-wise breakdown (April to March) of project values, expenses, and net profit margins</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-muted)' }}>Financial Year:</label>
          <select 
            className="form-control" 
            value={startYear} 
            onChange={e => setStartYear(e.target.value)}
            style={{ width: '180px', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
          >
            <option value="2024">FY 2024 - 2025 (Apr-Mar)</option>
            <option value="2025">FY 2025 - 2026 (Apr-Mar)</option>
            <option value="2026">FY 2026 - 2027 (Apr-Mar)</option>
            <option value="2027">FY 2027 - 2028 (Apr-Mar)</option>
          </select>
          {data && (
            <button className="btn btn-primary" onClick={handleDownloadCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              📥 Export Excel
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-muted)', fontSize: '18px' }}>
          Aggregating financial statements...
        </div>
      ) : !data ? (
        <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>
          Failed to load statement data. Please try again.
        </div>
      ) : (
        <div>
          {/* Summary Metric Cards */}
          <div className="grid-5" style={{ marginBottom: '28px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
            <div className="card-metric accent-primary" style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="metric-title" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Turnover (Project Values)</div>
              <div className="metric-value" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>₹{data.totalProjectValue.toLocaleString()}</div>
              <div className="metric-subtitle" style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>Total value of projects started</div>
            </div>

            <div className="card-metric accent-danger" style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="metric-title" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Expenses</div>
              <div className="metric-value" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--danger)', marginTop: '4px' }}>₹{data.totalExpenses.toLocaleString()}</div>
              <div className="metric-subtitle" style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>Operating costs & payouts</div>
            </div>

            <div className="card-metric accent-success" style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="metric-title" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cash Received</div>
              <div className="metric-value" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>₹{data.totalPayments.toLocaleString()}</div>
              <div className="metric-subtitle" style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>Payments collected in hand</div>
            </div>

            <div className="card-metric accent-info" style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="metric-title" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accrual Net Profit</div>
              <div className="metric-value" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--info)', marginTop: '4px' }}>₹{data.netProfitAccrual.toLocaleString()}</div>
              <div className="metric-subtitle" style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>Project Value less Expenses</div>
            </div>

            <div className="card-metric accent-warning" style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="metric-title" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cash Net Profit</div>
              <div className="metric-value" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--warning)', marginTop: '4px' }}>₹{data.netProfitCash.toLocaleString()}</div>
              <div className="metric-subtitle" style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>Payments received less Expenses</div>
            </div>
          </div>

           {/* Month Wise Report Table */}
          <div className="panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h2 className="panel-title">Month-Wise Financial Performance</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="🔍 Search month or year..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '220px', padding: '6px 12px', fontSize: '13px', borderRadius: '6px', margin: 0 }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>* Click row for details</span>
              </div>
            </div>

            <div className="table-container">
              <table className="table-list" style={{ fontSize: '14px' }}>
                <thead>
                  <tr style={{ cursor: 'default' }}>
                    <th>Month</th>
                    <th style={{ textAlign: 'center' }}>Projects Count</th>
                    <th style={{ textAlign: 'right' }}>Project Value (Turnover)</th>
                    <th style={{ textAlign: 'right' }}>Expenses</th>
                    <th style={{ textAlign: 'right' }}>Cash Received</th>
                    <th style={{ textAlign: 'right' }}>Net Profit (Accrual)</th>
                    <th style={{ textAlign: 'right' }}>Net Profit (Cash)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReport.map((row) => {
                    const originalIndex = data.monthlyReport.findIndex(r => r.monthName === row.monthName && r.year === row.year);
                    const prevRow = originalIndex > 0 ? data.monthlyReport[originalIndex - 1] : null;

                    let accrualTrend = null;
                    if (prevRow) {
                      if (row.netProfitAccrual > prevRow.netProfitAccrual) {
                        accrualTrend = <span style={{ color: 'var(--success)', marginLeft: '6px', fontWeight: 'bold' }} title="Increased from previous month">▲</span>;
                      } else if (row.netProfitAccrual < prevRow.netProfitAccrual) {
                        accrualTrend = <span style={{ color: 'var(--danger)', marginLeft: '6px', fontWeight: 'bold' }} title="Decreased from previous month">▼</span>;
                      }
                    }

                    let cashTrend = null;
                    if (prevRow) {
                      if (row.netProfitCash > prevRow.netProfitCash) {
                        cashTrend = <span style={{ color: 'var(--success)', marginLeft: '6px', fontWeight: 'bold' }} title="Increased from previous month">▲</span>;
                      } else if (row.netProfitCash < prevRow.netProfitCash) {
                        cashTrend = <span style={{ color: 'var(--danger)', marginLeft: '6px', fontWeight: 'bold' }} title="Decreased from previous month">▼</span>;
                      }
                    }

                    return (
                      <tr 
                        key={row.monthName} 
                        onClick={() => handleRowClick(row)}
                        style={{ cursor: 'pointer', transition: 'background-color 0.15s' }}
                        className="hover-row"
                      >
                        <td style={{ fontWeight: '700' }}>
                          📅 {row.monthName} {row.year}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>
                          {row.projectsCount}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--primary)' }}>
                          ₹{row.projectValueSum.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--danger)' }}>
                          ₹{row.expensesSum.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--success)' }}>
                          ₹{row.paymentsSum.toLocaleString()}
                        </td>
                        <td style={{ 
                          textAlign: 'right', 
                          fontWeight: '700', 
                          color: row.netProfitAccrual >= 0 ? 'var(--info)' : 'var(--danger)' 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                            <span>₹{row.netProfitAccrual.toLocaleString()}</span>
                            {accrualTrend}
                          </div>
                        </td>
                        <td style={{ 
                          textAlign: 'right', 
                          fontWeight: '700', 
                          color: row.netProfitCash >= 0 ? 'var(--success)' : 'var(--danger)' 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                            <span>₹{row.netProfitCash.toLocaleString()}</span>
                            {cashTrend}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredReport.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '30px' }}>
                        No records match your search query.
                      </td>
                    </tr>
                  )}
                  
                  {/* Totals Row */}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: '800', borderTop: '2px solid #cbd5e1' }}>
                    <td>Total Financial Year</td>
                    <td style={{ textAlign: 'center' }}>
                      {data.monthlyReport.reduce((sum, r) => sum + r.projectsCount, 0)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--primary)' }}>
                      ₹{data.totalProjectValue.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)' }}>
                      ₹{data.totalExpenses.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--success)' }}>
                      ₹{data.totalPayments.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: data.netProfitAccrual >= 0 ? 'var(--info)' : 'var(--danger)' }}>
                      ₹{data.netProfitAccrual.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: data.netProfitCash >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      ₹{data.netProfitCash.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Detail Pop-up Modal */}
      {isModalOpen && selectedMonth && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '16px' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: '800' }}>
                Financial Details — {selectedMonth.monthName} {selectedMonth.year}
              </h3>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} style={{ padding: '4px 10px', fontSize: '12px' }}>
                ✕ Close
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="date-presets" style={{ width: 'fit-content', marginTop: '16px', marginBottom: '20px' }}>
              <button 
                className={`preset-btn ${detailTab === 'projects' ? 'active' : ''}`}
                onClick={() => setDetailTab('projects')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                📁 Projects ({selectedMonth.projects.length})
              </button>
              <button 
                className={`preset-btn ${detailTab === 'expenses' ? 'active' : ''}`}
                onClick={() => setDetailTab('expenses')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                📉 Expenses (₹{selectedMonth.expensesSum.toLocaleString()})
              </button>
              <button 
                className={`preset-btn ${detailTab === 'payments' ? 'active' : ''}`}
                onClick={() => setDetailTab('payments')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                💰 Cash Payments Received (₹{selectedMonth.paymentsSum.toLocaleString()})
              </button>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {/* Projects List */}
              {detailTab === 'projects' && (
                <div className="table-container">
                  <table className="table-list" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Project Name</th>
                        <th>Client</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Project Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMonth.projects.map((proj) => (
                        <tr key={proj._id}>
                          <td><strong>{proj.name}</strong></td>
                          <td>{proj.client ? proj.client.company : 'N/A'}</td>
                          <td style={{ textTransform: 'capitalize' }}>
                            <span className="funnel-card-source" style={{ fontSize: '9px', padding: '2px 6px' }}>{proj.type}</span>
                          </td>
                          <td>
                            <span className={`badge badge-${proj.status}`} style={{ fontSize: '10px' }}>{proj.status.replace('_', ' ')}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '700' }}>
                            ₹{proj.value.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {selectedMonth.projects.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>
                            No new projects started in this month.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Expenses List */}
              {detailTab === 'expenses' && (
                <div className="table-container">
                  <table className="table-list" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Date</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMonth.expenses.map((exp) => (
                        <tr key={exp._id}>
                          <td>
                            <span className="funnel-card-source" style={{ textTransform: 'uppercase', fontSize: '9px', padding: '2px 6px' }}>
                              {exp.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td>{exp.description || 'General Expense'}</td>
                          <td>{new Date(exp.expense_date).toLocaleDateString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--danger)' }}>
                            -₹{exp.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {selectedMonth.expenses.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>
                            No expenses logged in this month.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Payments List */}
              {detailTab === 'payments' && (
                <div className="table-container">
                  <table className="table-list" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Invoice Number</th>
                        <th>Project</th>
                        <th>Payment Method</th>
                        <th>Date Received</th>
                        <th style={{ textAlign: 'right' }}>Amount Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMonth.payments.map((pmt) => (
                        <tr key={pmt._id}>
                          <td><strong>{pmt.invoice ? pmt.invoice.invoice_number : 'Manual Payment'}</strong></td>
                          <td>{pmt.project ? pmt.project.name : 'N/A'}</td>
                          <td>{pmt.method}</td>
                          <td>{new Date(pmt.payment_date).toLocaleDateString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--success)' }}>
                            +₹{pmt.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {selectedMonth.payments.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>
                            No payments received in this month.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local styling to support row highlight hover and clean spacing */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hover-row:hover {
          background-color: #fcf4f6 !important;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background-color: #ffffff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: modalAppear 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalAppear {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}} />
    </div>
  );
}
