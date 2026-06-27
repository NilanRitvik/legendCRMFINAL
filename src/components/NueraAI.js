'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const MODULE_TERMINAL_LINES = {
  sales: [
    'nuera> connecting to CRM sales pipeline....',
    'nuera> fetching client leads [30d]....',
    'nuera> running quotation conversion model....',
    'nuera> analyzing win/loss ratio with stage transitions....',
    'nuera> computing avg days per pipeline stage....',
    'nuera> running revenue forecasting ML model....',
    'nuera> applying Nuera pattern detection on lost deals....',
    'nuera> cross-referencing lead source performance....',
    'nuera> insights ready. rendering dashboard...',
  ],
  design: [
    'nuera> initializing design module data bus....',
    'nuera> loading 2D/3D project records [30d]....',
    'nuera> computing approval turnaround time....',
    'nuera> analyzing revision frequency per design type....',
    'nuera> detecting bottleneck designers via heuristic model....',
    'nuera> correlating client feedback patterns....',
    'nuera> NLP scan on design description vectors....',
    'nuera> output matrix compiled. rendering...',
  ],
  purchase: [
    'nuera> connecting to stock & purchase ledger....',
    'nuera> fetching all purchase transactions [30d]....',
    'nuera> running inventory delta analysis....',
    'nuera> detecting low-stock threshold alerts....',
    'nuera> computing vendor spend distribution....',
    'nuera> evaluating approval pipeline delays....',
    'nuera> trend model: purchase vs issue ratio....',
    'nuera> generating stock health score....',
    'nuera> analytics compiled. rendering...',
  ],
  manufacturing: [
    'nuera> initializing production floor data stream....',
    'nuera> loading manufacturing job records [30d]....',
    'nuera> parsing machine utilization logs....',
    'nuera> computing avg job completion duration....',
    'nuera> detecting QC failure correlation with production batch....',
    'nuera> running efficiency scoring model....',
    'nuera> analyzing material wastage patterns....',
    'nuera> manufacturing intelligence ready. rendering...',
  ],
  qc: [
    'nuera> connecting to QC inspection records....',
    'nuera> loading quality reports [30d]....',
    'nuera> computing pass/fail distribution....',
    'nuera> analyzing most common defect categories....',
    'nuera> correlating QC outcomes with supplier data....',
    'nuera> running predictive defect scoring....',
    'nuera> generating quality KPI matrix....',
    'nuera> QC intelligence compiled. rendering...',
  ],
  accounts: [
    'nuera> connecting to financial ledger....',
    'nuera> fetching payment & invoice records [30d]....',
    'nuera> computing total billed vs collected....',
    'nuera> analyzing outstanding receivables aging....',
    'nuera> detecting payment delay patterns....',
    'nuera> running cash flow projection model....',
    'nuera> computing vendor payable health score....',
    'nuera> accounts intelligence ready. rendering...',
  ],
  projects: [
    'nuera> connecting to project & contracts module....',
    'nuera> loading active/completed project data [30d]....',
    'nuera> computing project completion rate....',
    'nuera> analyzing budget variance per project....',
    'nuera> detecting timeline deviation patterns....',
    'nuera> running project risk scoring model....',
    'nuera> cross-referencing invoice collection per project....',
    'nuera> project analytics ready. rendering...',
  ],
  installation: [
    'nuera> initializing site installation data feed....',
    'nuera> loading field installation records [30d]....',
    'nuera> computing avg days from dispatch to site completion....',
    'nuera> analyzing technician performance metrics....',
    'nuera> detecting approval delay patterns....',
    'nuera> running site risk heuristic model....',
    'nuera> installation intelligence compiled. rendering...',
  ],
  amc: [
    'nuera> connecting to AMC contract management....',
    'nuera> fetching AMC contracts & service logs [30d]....',
    'nuera> computing contract renewal probability....',
    'nuera> analyzing service call frequency per client....',
    'nuera> detecting contracts nearing expiry....',
    'nuera> running client satisfaction prediction model....',
    'nuera> AMC revenue & retention report compiled. rendering...',
  ],
  hr: [
    'nuera> connecting to HR & payroll module....',
    'nuera> loading employee & attendance records [30d]....',
    'nuera> computing headcount vs active project ratio....',
    'nuera> analyzing leave & absenteeism patterns....',
    'nuera> running payroll accuracy verification....',
    'nuera> detecting employee performance outliers....',
    'nuera> HR intelligence matrix compiled. rendering...',
  ],
};

const MODULE_LABELS = {
  sales: '📊 Sales Pipeline Analytics',
  design: '🎨 2D & 3D Design Analytics',
  purchase: '🛒 Purchase & Stock Analytics',
  manufacturing: '🏭 Manufacturing Analytics',
  qc: '🔍 Quality Control Analytics',
  accounts: '💰 Accounts Ledger Analytics',
  projects: '📁 Projects & Contracts Analytics',
  installation: '🔧 Site Installation Analytics',
  amc: '🔄 AMC Management Analytics',
  hr: '👥 HR Analytics',
};

export default function NueraAI({ module: propModule }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState('greeting'); // 'greeting' | 'terminal' | 'data'
  const [greetText, setGreetText] = useState('');
  const [termLines, setTermLines] = useState([]);
  const [data, setData] = useState(null);
  const [userName, setUserName] = useState('User');
  const termRef = useRef(null);
  const intervalRef = useRef(null);

  // Exclude Login and Print pages from showing the Nuera AI floating button (moved to render check below)


  // Determine active module based on current pathname
  let module = propModule;
  if (!module) {
    if (pathname === '/clients') {
      module = 'sales';
    } else if (pathname === '/designing') {
      module = 'design';
    } else if (pathname === '/purchase') {
      module = 'purchase';
    } else if (pathname === '/manufacturing') {
      module = 'manufacturing';
    } else if (pathname === '/payments') {
      module = 'accounts';
    } else if (pathname === '/projects') {
      module = 'projects';
    } else if (pathname === '/installation') {
      module = 'installation';
    } else if (pathname === '/amc') {
      module = 'amc';
    } else if (pathname && pathname.startsWith('/hr')) {
      module = 'hr';
    } else {
      module = 'sales'; // Default fallback
    }
  }

  const GREETING_MSG = `Hello ${userName}, I'm Nuera AI by LegendInd.\nI process and organize your data, deliver quick analytics, and use AI and Machine Learning to help you improve performance and make better decisions. I'm always here to assist and optimize your processes.`;

  useEffect(() => {
    try {
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
      };
      const session = getCookie('legendin_session');
      if (session) {
        const decoded = atob(session);
        const sessionData = JSON.parse(decoded);
        if (sessionData && sessionData.username) {
          setUserName(sessionData.username);
        }
      }
    } catch {}
  }, []);

  const runSequence = async () => {
    setOpen(true);
    setPhase('greeting');
    setGreetText('');
    setTermLines([]);
    setData(null);

    const msg = `Hello ${userName}, I'm Nuera AI by LegendInd.\nI process and organize your data, deliver quick analytics, and use AI and Machine Learning to help you improve performance and make better decisions. I'm always here to assist and optimize your processes.`;

    // Phase 1: Typing greeting
    for (let i = 0; i <= msg.length; i++) {
      await sleep(18);
      setGreetText(msg.slice(0, i));
    }
    await sleep(700);

    // Phase 2: Terminal
    setPhase('terminal');
    const lines = MODULE_TERMINAL_LINES[module] || MODULE_TERMINAL_LINES.sales;
    for (let i = 0; i < lines.length; i++) {
      await sleep(500 + Math.random() * 400);
      setTermLines(prev => [...prev, lines[i]]);
    }
    await sleep(600);

    // Phase 3: Fetch real data
    try {
      const res = await fetch(`/api/nuera-ai?module=${module}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setData({ error: 'Unable to fetch analytics data.' });
    }
    setPhase('data');
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [termLines]);

  const handleClose = () => {
    setOpen(false);
    setPhase('greeting');
    setGreetText('');
    setTermLines([]);
    setData(null);
  };

  const renderMetricCard = (label, value, sub, color = '#6d28d9', emoji = '', key) => (
    <div key={key} style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: '0',
    }}>
      <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {emoji} {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: '900', color: color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );

  const renderInsightRow = (text, type = 'info', key) => {
    const colors = { info: '#60a5fa', warn: '#fbbf24', good: '#4ade80', bad: '#f87171' };
    const icons = { info: '💡', warn: '⚠️', good: '✅', bad: '🔴' };
    return (
      <div key={key} style={{
        display: 'flex', gap: '10px', alignItems: 'flex-start',
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${colors[type]}33`,
        borderRadius: '8px',
        fontSize: '12.5px',
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1.5
      }}>
        <span style={{ flexShrink: 0 }}>{icons[type]}</span>
        <span>{text}</span>
      </div>
    );
  };

  const renderDataPanel = () => {
    if (!data || data.error) {
      return (
        <div style={{ color: '#f87171', textAlign: 'center', padding: '30px', fontSize: '13px' }}>
          {data?.error || 'No data available.'}
        </div>
      );
    }

    const { metrics = [], insights = [], chartData = [], tableRows = [], tableHeaders = [] } = data;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Metrics Grid */}
        {metrics.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
            {metrics.map((m, i) => renderMetricCard(m.label, m.value, m.sub, m.color || '#a78bfa', m.emoji || '', i))}
          </div>
        )}

        {/* AI Insights */}
        {insights.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              🧠 Nuera AI Insights & Recommendations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {insights.map((ins, i) => renderInsightRow(ins.text, ins.type, i))}
            </div>
          </div>
        )}

        {/* Simple bar chart */}
        {chartData.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              📈 30-Day Trend
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px', padding: '0 4px' }}>
              {chartData.map((pt, i) => {
                const maxVal = Math.max(...chartData.map(p => p.value), 1);
                const h = Math.max((pt.value / maxVal) * 70, 2);
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '100%', height: `${h}px`,
                      background: 'linear-gradient(180deg, #a78bfa, #6d28d9)',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 0.5s ease',
                      title: `${pt.label}: ${pt.value}`
                    }} title={`${pt.label}: ${pt.value}`} />
                    <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', transform: 'rotate(-30deg)', transformOrigin: 'center' }}>
                      {pt.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Table */}
        {tableRows.length > 0 && tableHeaders.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              📋 Detailed Report
            </div>
            <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'rgba(109,40,217,0.3)' }}>
                    {tableHeaders.map((h, i) => (
                      <th key={i} style={{ padding: '10px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ padding: '9px 12px', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '4px' }}>
          ✦ Nuera AI by LegendInd — Analytics powered by ML pattern recognition · Last 30 days
        </div>
      </div>
    );
  };

  if (pathname === '/login' || (pathname && pathname.startsWith('/print'))) {
    return null;
  }

  return (
    <>
      {/* ─── HEADER BUTTON ─── */}
      <button
        onClick={runSequence}
        style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #0ea5e9 100%)',
          border: 'none',
          borderRadius: '8px',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          color: '#fff',
          fontWeight: '800',
          fontSize: '12px',
          boxShadow: '0 0 0 0 rgba(124,58,237,0.5)',
          animation: 'nuera-float-pulse 2.5s ease-in-out infinite',
          letterSpacing: '0.2px',
          transition: 'transform 0.2s, box-shadow 0.2s',
          height: '32px',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(124,58,237,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 0 0 rgba(124,58,237,0.5)'; }}
      >
        <span style={{ fontSize: '14px' }}>✦</span>
        Nuera AI
        <span style={{ display: 'flex', gap: '2px' }}>
          <span className="ndot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)' }} />
          <span className="ndot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)', animationDelay: '0.2s' }} />
          <span className="ndot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)', animationDelay: '0.4s' }} />
        </span>
      </button>

      {/* ─── NUERA AI POPUP ─── */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: 'linear-gradient(160deg, #0f0f1a 0%, #1a0a2e 40%, #0a1628 100%)',
            borderRadius: '20px',
            border: '1px solid rgba(124,58,237,0.4)',
            boxShadow: '0 0 60px rgba(109,40,217,0.3), 0 25px 60px rgba(0,0,0,0.5)',
            width: '100%',
            maxWidth: '780px',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'nuera-popup-in 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(124,58,237,0.08)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px',
                  background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px',
                  boxShadow: '0 0 14px rgba(124,58,237,0.5)',
                }}>✦</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '900', color: '#fff', lineHeight: 1 }}>Nuera AI</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                    by LegendInd · {MODULE_LABELS[module] || 'Analytics'}
                  </div>
                </div>
                {phase !== 'data' && (
                  <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: '#7c3aed',
                        animation: `nuera-dot 1.4s ${i * 0.2}s ease-in-out infinite`,
                      }} />
                    ))}
                  </div>
                )}
                {phase === 'data' && (
                  <span style={{ background: '#4ade8020', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', marginLeft: '8px' }}>
                    ✓ Analysis Complete
                  </span>
                )}
              </div>
              <button onClick={handleClose} style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff',
                width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              >×</button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

              {/* PHASE: GREETING */}
              {(phase === 'greeting' || (phase !== 'data' && greetText)) && (
                <div style={{
                  background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: '14px',
                  padding: '20px',
                  marginBottom: phase === 'terminal' || phase === 'data' ? '20px' : '0',
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px',
                    }}>✦</div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#a78bfa', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Nuera AI
                      </div>
                      <p style={{
                        fontSize: '14px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.7,
                        margin: 0, whiteSpace: 'pre-line',
                        fontWeight: '500',
                      }}>
                        {greetText}
                        {phase === 'greeting' && <span style={{ borderRight: '2px solid #a78bfa', marginLeft: '2px', animation: 'cursor-blink 0.8s infinite' }}>&nbsp;</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PHASE: TERMINAL */}
              {(phase === 'terminal' || phase === 'data') && (
                <div
                  ref={termRef}
                  style={{
                    background: '#0a0a14',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '16px',
                    fontFamily: '"Fira Code", "Courier New", monospace',
                    fontSize: '11.5px',
                    maxHeight: phase === 'data' ? '120px' : '260px',
                    overflowY: 'auto',
                    marginBottom: phase === 'data' ? '20px' : '0',
                    transition: 'max-height 0.5s ease',
                  }}
                >
                  <div style={{ color: '#4ade80', marginBottom: '8px', fontSize: '10px' }}>
                    ● nuera-ai-engine v3.2.1 — {MODULE_LABELS[module]}
                  </div>
                  {termLines.map((line, i) => (
                    <div key={i} style={{
                      color: i === termLines.length - 1 && phase === 'terminal' ? '#e2e8f0' : '#64748b',
                      marginBottom: '3px',
                      animation: 'term-line-in 0.2s ease forwards',
                    }}>
                      <span style={{ color: '#4ade80' }}>$</span> {line}
                      {i === termLines.length - 1 && phase === 'terminal' && (
                        <span style={{ borderRight: '1px solid #4ade80', marginLeft: '2px', animation: 'cursor-blink 0.6s infinite' }}>&nbsp;</span>
                      )}
                    </div>
                  ))}
                  {phase === 'data' && (
                    <div style={{ color: '#4ade80', marginTop: '6px', fontWeight: '700' }}>
                      $ nuera&gt; ✓ Analysis complete in {(termLines.length * 0.5).toFixed(1)}s. All data processed.
                    </div>
                  )}
                </div>
              )}

              {/* PHASE: DATA */}
              {phase === 'data' && renderDataPanel()}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 24px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
              background: 'rgba(0,0,0,0.2)',
            }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
                ✦ Nuera AI by LegendInd · Data from last 30 days
              </div>
              {phase === 'data' && (
                <button
                  onClick={runSequence}
                  style={{
                    background: 'rgba(124,58,237,0.2)',
                    border: '1px solid rgba(124,58,237,0.4)',
                    color: '#a78bfa',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '700',
                  }}
                >
                  🔄 Refresh Analysis
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── GLOBAL KEYFRAMES ─── */}
      <style>{`
        @keyframes nuera-float-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); }
          50% { box-shadow: 0 0 0 10px rgba(124,58,237,0); }
        }
        @keyframes nuera-popup-in {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes nuera-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.6); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes term-line-in {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .ndot { animation: nuera-dot 1.4s ease-in-out infinite; }
      `}</style>
    </>
  );
}
