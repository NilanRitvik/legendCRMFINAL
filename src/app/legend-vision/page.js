'use client';
import { useState, useEffect } from 'react';

const ARCHITECTURE_FLOW = [
  { step: '1', title: 'ERP Database', desc: 'Mongoose / Atlas data collections', icon: '🗄️' },
  { step: '2', title: 'Event Tracker', desc: 'ActivityLog auditing engine', icon: '📡' },
  { step: '3', title: 'ML Prediction Engine', desc: 'Lightweight heuristic analytics', icon: '🧠' },
  { step: '4', title: 'AI Copilot / Agent', desc: 'Nuera Gemini 2.5 flash layer', icon: '✦' },
  { step: '5', title: 'CEO Console', desc: 'Real-time prediction metrics', icon: '👑' }
];

const ROADMAP = [
  {
    year: 'Year 1: Foundation',
    status: 'ACTIVE',
    progress: 100,
    desc: 'Audit trail and activity logs. Integrated Nuera Assistant directly with live MongoDB collections and page navigations.',
    deliverables: [
      'Universal ActivityLog Schema & DB collections',
      'LogActivity tracker hooks in page event handlers',
      'Dual-Key fallback for 100% LLM uptime',
      'Interactive Nuera floating assistant component'
    ]
  },
  {
    year: 'Year 2: Prediction Models',
    status: 'IN PROGRESS',
    progress: 45,
    desc: 'Apply lightweight classification and regression logic on active collections. Estimate lead wins, project delays, and invoice risks.',
    deliverables: [
      'Lead win probability calculator',
      'Invoice payment delay risk indexer',
      'Project deadline delay predictor',
      'Quality QC defect likelihood modeler'
    ]
  },
  {
    year: 'Year 3: Fully Autonomous ERP',
    status: 'FUTURE ROADMAP',
    progress: 10,
    desc: 'Fully autonomous agent system. Nuera can automatically purchase inventory, dispatch logistics, and handle payroll reviews.',
    deliverables: [
      'Autonomous vendor replenishment',
      'Automatic dispatcher logistics scheduling',
      'Predictive HR attrition risk triggers',
      'Conversational CEO business analyzer'
    ]
  }
];

export default function LegendVision() {
  const [activeTab, setActiveTab] = useState('predictions');
  const [activeYear, setActiveYear] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    leadPredictions: [],
    outstandingInvoices: [],
    projectDelays: [],
    employeeStats: []
  });

  // Simulated AI query state
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiThinking, setAiThinking] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/legend-vision');
      const json = await res.json();
      if (res.ok && !json.error) {
        setData({
          leadPredictions: json.leadPredictions || [],
          outstandingInvoices: json.outstandingInvoices || [],
          projectDelays: json.projectDelays || [],
          employeeStats: json.employeeStats || []
        });
      } else {
        console.error('Predictions API error:', json.error);
      }
    } catch (err) {
      console.error('Failed to load predictions data:', err);
    }
    setLoading(false);
  };

  const handleAISimulate = (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiThinking(true);
    setAiResponse('');

    setTimeout(() => {
      const q = aiQuery.toLowerCase();
      let reply = '';

      if (q.includes('rahul') || q.includes('designer')) {
        reply = `**Nuera Prediction Engine [ Rahul - Senior Designer ]**\n\n*   **Productivity:** 88% (Top 10% in team)\n*   **Design Quality Score:** 92%\n*   **Design Approval Time:** 2.1 days average\n*   **Risk Indicators:** High likelihood to delay BOQ spreadsheets.\n*   **Recommendation:** Improve estimation skills. Offer BOQ templates.`;
      } else if (q.includes('project') || q.includes('delay')) {
        reply = `**Project Delay Forecast**\n\nCurrently analyzing **${data.projectDelays[0]?.projectName || 'Ongoing Projects'}**:\n*   **Risk Status:** ${data.projectDelays[0]?.riskLevel || 'Low'} Risk\n*   **Delay Days:** ${data.projectDelays[0]?.delayDays || 0} Days predicted\n*   **Key Reason:** ${data.projectDelays[0]?.reasons?.join(', ') || 'No critical bottlenecks'}\n*   **Mitigation:** Expedite purchase order validation.`;
      } else if (q.includes('lead') || q.includes('won') || q.includes('convert')) {
        reply = `**Lead Conversion scoring [ Live CRM Analysis ]**\n\n*   **Top Lead:** ${data.leadPredictions[0]?.name || 'Prospect'} (${data.leadPredictions[0]?.company || 'Company'})\n*   **Win Probability:** ${data.leadPredictions[0]?.probability || 75}%\n*   **Expected Valuation:** ₹${((data.leadPredictions[0]?.approxValue || 500000) / 100000).toFixed(1)} Lakhs\n*   **Sales Representative Assigned:** ${data.leadPredictions[0]?.recommendedExec || 'Rajesh Kumar'}`;
      } else if (q.includes('payment') || q.includes('invoice') || q.includes('outstanding')) {
        reply = `**Payment Delay risk evaluation**\n\n*   **Target Invoice:** ${data.outstandingInvoices[0]?.invoiceNumber || 'INV-001'}\n*   **Delay Risk:** ${data.outstandingInvoices[0]?.delayProbability || 45}%\n*   **Recommendation:** ${data.outstandingInvoices[0]?.recommendation || 'Send payment reminder'}`;
      } else {
        reply = `**Nuera Vision Model is operational.**\n\nLive context loaded: **${data.employeeStats.length}** employee stats, **${data.projectDelays.length}** project deadline checks. Try asking:\n- *"How is Rahul performing?"*\n- *"Analyze lead conversion probability"* \n- *"Show me project delays"*`;
      }

      setAiResponse(reply);
      setAiThinking(false);
    }, 900);
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: 'var(--background)' }}>
      
      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '28px', paddingBottom: '16px', borderBottom: '1px solid var(--card-border)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px', color: 'var(--primary)', textShadow: '0 0 10px rgba(212,175,55,0.2)' }}>✦</span>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Legend Vision</h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Nuera AI-Powered ERP Intelligence Console & Predictive Machine Learning Framework
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: '8px 16px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700',
            transition: 'opacity 0.2s', fontSize: '12px'
          }}
        >
          {loading ? 'Re-analyzing...' : '🔄 Refresh AI Models'}
        </button>
      </div>

      {/* ── ARCHITECTURE VISUALIZER ── */}
      <div style={{
        background: '#12131a', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px', padding: '20px', marginBottom: '28px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
      }}>
        <h2 style={{ fontSize: '14px', fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px' }}>
          Recommended AI Architecture Flow
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          {ARCHITECTURE_FLOW.map((f, i) => (
            <div key={i} style={{ display: 'flex', flex: 1, minWidth: '160px', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: i === 3 ? 'linear-gradient(135deg, #7c3aed, #0ea5e9)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                width: '45px', height: '45px', borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', boxShadow: i === 3 ? '0 0 15px rgba(124,58,237,0.4)' : 'none'
              }}>
                {f.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: i === 3 ? '#c4b5fd' : '#fff' }}>{f.title}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{f.desc}</div>
              </div>
              {i < ARCHITECTURE_FLOW.length - 1 && (
                <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '16px', fontWeight: '800' }}>➔</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('predictions')}
          style={tabStyle(activeTab === 'predictions')}
        >
          🔮 Predictive Models
        </button>
        <button
          onClick={() => setActiveTab('roadmap')}
          style={tabStyle(activeTab === 'roadmap')}
        >
          📅 3-Year Vision Roadmap
        </button>
        <button
          onClick={() => setActiveTab('employee')}
          style={tabStyle(activeTab === 'employee')}
        >
          👔 CEO Employee Console
        </button>
        <button
          onClick={() => setActiveTab('sandbox')}
          style={tabStyle(activeTab === 'sandbox')}
        >
          🧠 Nuera Prediction Sandbox
        </button>
      </div>

      {/* ── TAB CONTENT ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: '35px', height: '35px', border: '3px solid var(--card-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'legend-spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px', fontWeight: '600' }}>Running machine learning predictive heuristics...</span>
        </div>
      ) : (
        <div>
          {/* TAB 1: PREDICTIONS */}
          {activeTab === 'predictions' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              
              {/* Lead win probability card */}
              <div className="glass-card" style={cardStyle}>
                <h3 style={cardTitleStyle}>🎯 Lead Conversion Probability</h3>
                <p style={cardSubtitleStyle}>Heuristics computed based on client sources, negotiation status & valuation ranges.</p>
                {data.leadPredictions.length === 0 ? (
                  <div style={emptyStyle}>No active leads found in pipeline.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.leadPredictions.map(lead => (
                      <div key={lead.id} style={itemContainerStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '13px' }}>{lead.name}</span>
                          <span style={{
                            padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800',
                            background: lead.probability > 75 ? '#e6fbf3' : lead.probability > 50 ? '#fef8e7' : '#fee2e2',
                            color: lead.probability > 75 ? '#10b981' : lead.probability > 50 ? '#f59e0b' : '#ef4444'
                          }}>
                            {lead.probability}% Prob
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <span>Company: {lead.company} | Source: {lead.source}</span>
                          <span style={{ fontWeight: '700', color: 'var(--primary)' }}>₹{(lead.approxValue / 100000).toFixed(1)}L val</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', fontSize: '10px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '6px', padding: '6px', marginTop: '6px', color: 'var(--text-muted)' }}>
                          <span>Recommended Executive: <strong>{lead.recommendedExec}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invoice payment risk card */}
              <div className="glass-card" style={cardStyle}>
                <h3 style={cardTitleStyle}>🧾 Invoice Payment Delay Risk</h3>
                <p style={cardSubtitleStyle}>Likelihood of outstanding payments exceeding invoice due dates.</p>
                {data.outstandingInvoices.length === 0 ? (
                  <div style={emptyStyle}>No unpaid invoices found in ledgers.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.outstandingInvoices.map((inv, idx) => (
                      <div key={idx} style={itemContainerStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '13px' }}>{inv.invoiceNumber}</span>
                          <span style={{
                            padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800',
                            background: inv.delayProbability > 70 ? '#fee2e2' : '#e6fbf3',
                            color: inv.delayProbability > 70 ? '#ef4444' : '#10b981'
                          }}>
                            {inv.delayProbability}% delay risk
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <span>Project: {inv.projectName}</span>
                          <span style={{ fontWeight: '700' }}>₹{Number(inv.amount).toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#7c3aed', background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '6px', padding: '6px', marginTop: '6px', fontWeight: '600' }}>
                          💡 Recommendation: {inv.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Project & material delay card */}
              <div className="glass-card" style={cardStyle}>
                <h3 style={cardTitleStyle}>🏭 Project Delay & QA Risk</h3>
                <p style={cardSubtitleStyle}>Calculates completion risk due to inventory shortages or previous QC failures.</p>
                {data.projectDelays.length === 0 ? (
                  <div style={emptyStyle}>No active projects found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.projectDelays.map((del, idx) => (
                      <div key={idx} style={itemContainerStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '13px' }}>{del.projectName}</span>
                          <span style={{
                            padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800',
                            background: del.riskLevel === 'High' ? '#fee2e2' : del.riskLevel === 'Medium' ? '#fef8e7' : '#e6fbf3',
                            color: del.riskLevel === 'High' ? '#ef4444' : del.riskLevel === 'Medium' ? '#f59e0b' : '#10b981'
                          }}>
                            {del.delayDays > 0 ? `+${del.delayDays}d delay` : 'On track'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Deadline: {del.originalDeadline ? new Date(del.originalDeadline).toLocaleDateString('en-IN') : '-'} ➔ Predicted: {new Date(del.predictedCompletion).toLocaleDateString('en-IN')}
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Identified Risks:</div>
                          {del.reasons.map((r, rIdx) => (
                            <div key={rIdx} style={{ fontSize: '10px', color: '#64748b', display: 'flex', gap: '4px', marginBottom: '2px' }}>
                              <span>•</span> <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: ROADMAP */}
          {activeTab === 'roadmap' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                {ROADMAP.map((r, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveYear(idx)}
                    style={{
                      flex: 1, padding: '20px', borderRadius: '14px', cursor: 'pointer',
                      background: activeYear === idx ? 'rgba(212,175,55,0.06)' : 'var(--card-bg)',
                      border: activeYear === idx ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                      boxShadow: activeYear === idx ? '0 8px 24px rgba(212,175,55,0.1)' : 'var(--shadow-sm)',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '12px', background: r.status === 'ACTIVE' ? '#e6fbf3' : r.status === 'IN PROGRESS' ? '#fef8e7' : 'rgba(0,0,0,0.05)', color: r.status === 'ACTIVE' ? '#10b981' : r.status === 'IN PROGRESS' ? '#f59e0b' : 'var(--text-muted)' }}>
                        {r.status}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)' }}>{r.progress}% Ready</span>
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: '900', marginTop: '12px', color: 'var(--text-main)' }}>{r.year}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>{r.desc}</p>
                  </div>
                ))}
              </div>

              {/* Roadmap details card */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '14px' }}>
                  Target Modules & Deliverables for {ROADMAP[activeYear].year}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {ROADMAP[activeYear].deliverables.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px', background: 'var(--background)', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                      <span style={{ color: 'var(--primary)', fontSize: '16px' }}>✓</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '600' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EMPLOYEE SCORECARDS */}
          {activeTab === 'employee' && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '4px' }}>CEO Employee Intelligence Console</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>Productivity ratings and risk metrics calculated dynamically from recent actions.</p>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700' }}>
                    <th style={{ padding: '12px' }}>Employee</th>
                    <th style={{ padding: '12px' }}>Role</th>
                    <th style={{ padding: '12px' }}>Productivity Index</th>
                    <th style={{ padding: '12px' }}>Delays Index</th>
                    <th style={{ padding: '12px' }}>Output Quality</th>
                    <th style={{ padding: '12px' }}>Workload Risk</th>
                    <th style={{ padding: '12px' }}>Recent Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.employeeStats.map((emp, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--card-border)', fontSize: '13px', color: 'var(--text-main)' }}>
                      <td style={{ padding: '12px', fontWeight: '700' }}>{emp.name}</td>
                      <td style={{ padding: '12px', textTransform: 'capitalize' }}>{emp.role}</td>
                      <td style={{ padding: '12px', fontWeight: '800', color: 'var(--primary)' }}>{emp.productivity}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', background: emp.delays === 'Low' ? '#e6fbf3' : '#fee2e2', color: emp.delays === 'Low' ? '#10b981' : '#ef4444' }}>
                          {emp.delays}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{emp.quality}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ color: emp.risk === 'Low' ? '#10b981' : emp.risk === 'Medium' ? '#f59e0b' : '#ef4444', fontWeight: '700' }}>
                          {emp.risk}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{emp.actionsCount} events</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: SANDBOX */}
          {activeTab === 'sandbox' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px' }}>Simulation Query Sandbox</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>Type an employee name or forecast query to see the prediction generator output.</p>
                
                <form onSubmit={handleAISimulate}>
                  <textarea
                    value={aiQuery}
                    onChange={e => setAiQuery(e.target.value)}
                    placeholder="Example: 'Rahul performance', 'Lead win probability', 'Project delay forecast'..."
                    rows={4}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--card-border)',
                      outline: 'none', resize: 'none', background: 'var(--background)', color: 'var(--text-main)',
                      fontSize: '13px', lineHeight: '1.5', fontFamily: 'inherit', marginBottom: '12px'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="submit"
                      disabled={aiThinking || !aiQuery.trim()}
                      style={{
                        padding: '10px 18px', background: 'var(--primary)', color: '#fff', border: 'none',
                        borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px'
                      }}
                    >
                      {aiThinking ? 'Analyzing heuristics...' : '✦ Generate Prediction'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiQuery('How is Rahul performing?')}
                      style={{
                        padding: '10px 14px', background: 'none', border: '1px solid var(--card-border)',
                        borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '12px'
                      }}
                    >
                      Rahul stats
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiQuery('Show me project delay forecast')}
                      style={{
                        padding: '10px 14px', background: 'none', border: '1px solid var(--card-border)',
                        borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '12px'
                      }}
                    >
                      Project delays
                    </button>
                  </div>
                </form>
              </div>

              {/* Prediction result */}
              <div style={{
                background: '#0c0c14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px',
                padding: '20px', display: 'flex', flexDirection: 'column', color: '#fff',
                minHeight: '260px'
              }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
                  ✦ Nuera Prediction Response
                </div>
                {aiThinking ? (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '25px', height: '25px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'legend-spin 0.6s linear infinite' }} />
                  </div>
                ) : aiResponse ? (
                  <div style={{
                    fontSize: '13px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.6',
                    whiteSpace: 'pre-wrap', fontFamily: 'monospace', flex: 1
                  }}>
                    {aiResponse}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>
                    Awaiting prediction query input...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes legend-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const tabStyle = (active) => ({
  padding: '8px 16px',
  background: active ? 'var(--primary-light)' : 'none',
  border: 'none',
  borderBottom: active ? '2.5px solid var(--primary)' : 'none',
  color: active ? 'var(--primary)' : 'var(--text-muted)',
  fontWeight: '700',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  outline: 'none'
});

const cardStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '14px',
  padding: '20px',
  boxShadow: 'var(--shadow-sm)'
};

const cardTitleStyle = {
  fontSize: '15px',
  fontWeight: '900',
  color: 'var(--text-main)',
  margin: 0
};

const cardSubtitleStyle = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  marginTop: '4px',
  marginBottom: '16px'
};

const itemContainerStyle = {
  background: 'var(--background)',
  border: '1px solid var(--card-border)',
  borderRadius: '10px',
  padding: '12px'
};

const emptyStyle = {
  fontSize: '12px',
  color: 'var(--text-muted)',
  textAlign: 'center',
  padding: '20px 0'
};
