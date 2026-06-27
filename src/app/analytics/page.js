'use client';

import { useState, useEffect } from 'react';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [aiReport, setAiReport] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  
  // Custom analysis queries for the AI Strategy deck
  const [activeAnalysisQuery, setActiveAnalysisQuery] = useState('overall');

  // Reusable markdown parser function
  function parseMarkdown(md) {
    if (!md) return '';
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h4 style="font-size: 13.5px; margin: 16px 0 8px 0; color: var(--primary); font-weight: 800; text-transform: uppercase;">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 style="font-size: 16px; margin: 20px 0 10px 0; color: var(--text-main); font-weight: 800; border-bottom: 2px solid var(--primary-light); padding-bottom: 6px;">$1</h3>')
      .replace(/^# (.*$)/gim, '<h2 style="font-size: 19px; margin: 24px 0 12px 0; color: var(--primary); font-weight: 900; text-transform: uppercase; border-bottom: 2.5px solid var(--primary); padding-bottom: 8px;">$1</h2>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .split('\n').map(line => {
        if (line.trim().startsWith('- ')) {
          return `<li style="margin-left: 20px; margin-bottom: 6px; color: var(--foreground); font-size: 12.5px;">${line.trim().substring(2)}</li>`;
        }
        if (line.trim().startsWith('|')) {
          const cols = line.split('|').map(c => c.trim()).filter(c => c !== '');
          if (line.includes('---')) return '';
          const isHeader = line.includes('Revenue') || line.includes('Metric') || line.includes('Value');
          const tag = isHeader ? 'th' : 'td';
          const style = isHeader 
            ? 'padding: 8px 12px; background-color: var(--primary-light); color: var(--primary); font-weight: 800; border: 1px solid var(--card-border);' 
            : 'padding: 8px 12px; border: 1px solid var(--card-border);';
          return `<tr style="border-bottom: 1px solid var(--card-border);">${cols.map(c => `<${tag} style="${style}">${c}</${tag}>`).join('')}</tr>`;
        }
        return line.trim() ? `<p style="margin-bottom: 10px; line-height: 1.6; color: var(--foreground); font-size: 12.5px;">${line}</p>` : '';
      }).join('\n');

    html = html.replace(/(<tr style[\s\S]*?<\/tr>)/g, '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12.5px;">$1</table>');
    html = html.replace(/<\/table>\n<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12.5px;">/g, '');

    return html;
  }

  const filteredProjectProfits = data?.projectProfits.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.client.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const saved = localStorage.getItem('legendin_ai_report') || '';
    if (saved) setAiReport(saved);
  }, []);

  const handleRunAIAnalysis = async (queryType = 'overall') => {
    try {
      setAnalyzing(true);
      setAiError('');
      setActiveAnalysisQuery(queryType);
      
      const res = await fetch('/api/analytics/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryType })
      });
      const json = await res.json();
      
      if (res.ok && json.report) {
        setAiReport(json.report);
        localStorage.setItem('legendin_ai_report', json.report);
      } else {
        setAiError(json.error || 'Failed to generate strategist report.');
      }
    } catch (err) {
      setAiError(err.message || 'Error occurred while generating strategy brief.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!data) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += '"LEGEND INTERIORS - CONSOLIDATED ADVANCED ANALYTICS REPORT"\n';
    csvContent += `"Report Generated On: ${new Date().toLocaleString('en-IN')}"\n\n`;

    // Section 1: KPI Metrics
    csvContent += '--- OVERALL PERFORMANCE METRICS ---\n';
    csvContent += 'Metric,Value\n';
    csvContent += `Total Revenue,₹${data.metrics.totalRevenue}\n`;
    csvContent += `Total Expenses,₹${data.metrics.totalExpenses}\n`;
    csvContent += `Net Profit,₹${data.metrics.netProfit}\n`;
    csvContent += `Average Project Value,₹${data.metrics.averageProjectValue}\n`;
    csvContent += `Average Profit Margin,${data.metrics.averageProfitMargin}%\n`;
    csvContent += `Total Projects,${data.metrics.projectsCount}\n`;
    csvContent += `Design Conversion Ratio,${data.metrics.designConversionRatio}%\n`;
    csvContent += `Active AMC Value,₹${data.metrics.totalAMCValue}\n\n`;

    // Section 2: Revenue vs Expenses Month by Month
    csvContent += '--- MONTHLY PERFORMANCE (LAST 12 MONTHS) ---\n';
    csvContent += 'Month,Revenue,Expenses,Net Profit\n';
    data.revenueVsExpenses.forEach(row => {
      csvContent += `"${row.month}",${row.revenue},${row.expenses},${row.profit}\n`;
    });
    csvContent += '\n';

    // Section 3: Project Profit Margins
    csvContent += '--- INDIVIDUAL PROJECT MARGINS ---\n';
    csvContent += 'Project Name,Client Company,Value,Direct Expenses,Team Cost,Net Profit,Margin %\n';
    data.projectProfits.forEach(p => {
      csvContent += `"${p.name.replace(/"/g, '""')}","${p.client.replace(/"/g, '""')}",${p.value},${p.directExpenses},${p.teamCost},${p.profit},${p.margin}%\n`;
    });
    csvContent += '\n';

    // Section 4: Expense Categories
    csvContent += '--- EXPENSES BY CATEGORY ---\n';
    csvContent += 'Category,Total Spent\n';
    data.categoryExpenses.forEach(c => {
      csvContent += `"${c.category}",${c.amount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Consolidated_Advanced_Analytics.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-muted)', fontSize: '18px' }}>Generating advanced charts & reports...</div>;
  }

  if (!data) {
    return (
      <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>
        Failed to fetch analytics datasets.
      </div>
    );
  }

  const maxMonthlyVal = Math.max(
    ...data.revenueVsExpenses.map(r => Math.max(r.revenue, r.expenses)),
    1000 // avoid divide by zero
  );

  // Core Pipeline Steps with current metrics
  const pipelineSteps = [
    { label: 'Leads', count: data.pipelineFlow?.lead || 0, icon: '👥', color: '#64748b' },
    { label: 'Quotation', count: data.pipelineFlow?.quotation || 0, icon: '📄', color: '#3b82f6' },
    { label: 'Won Client', count: data.pipelineFlow?.prospect || 0, icon: '🤝', color: '#10b981' },
    { label: 'Invoices', count: data.pipelineFlow?.invoice || 0, icon: '🧾', color: '#8b5cf6' },
    { label: 'Purchases', count: data.pipelineFlow?.purchase || 0, icon: '📥', color: '#059669' },
    { label: 'Stock Issue', count: data.pipelineFlow?.material_issue || 0, icon: '📤', color: '#d97706' },
    { label: 'Mfg Queue', count: data.pipelineFlow?.manufacturing || 0, icon: '🏭', color: '#ca8a04' },
    { label: 'QC Passed', count: data.metrics?.qcApproved || 0, icon: '✅', color: '#10b981' },
    { label: 'Logistics', count: data.pipelineFlow?.logistics || 0, icon: '🚚', color: '#3b82f6' },
    { label: 'Installation', count: data.pipelineFlow?.installation || 0, icon: '🔧', color: '#8b5cf6' }
  ];

  return (
    <div>
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .sidebar, .navbar, .no-print, button, select, input {
            display: none !important;
          }
          main, .content {
            margin-left: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .grid-2, .grid-3 {
            display: block !important;
          }
          .panel {
            page-break-inside: avoid !important;
            margin-bottom: 20px !important;
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
          .svg-chart-container {
            max-height: 250px !important;
          }
        }
      `}} />

      {/* Title Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '4px' }}>
            📈 Advanced Analytics & Operations Insights
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Unified ERP performance, multi-module pipeline auditing, SVG charts, and interactive AI strategist
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handlePrintPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            🖨️ Download PDF Report
          </button>
          <button className="btn btn-primary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            📊 Export CSV (Excel)
          </button>
        </div>
      </div>

      {/* Advanced multi-module CRM KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Core Financial Summary */}
        <div className="card-metric accent-primary">
          <div className="metric-title">💰 EBITDA Net Cashflow</div>
          <div className="metric-value">₹{data.metrics.netProfit.toLocaleString('en-IN')}</div>
          <div className="metric-subtitle" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
            <span>Rev: ₹{data.metrics.totalRevenue.toLocaleString()}</span>
            <span>Exp: ₹{data.metrics.totalExpenses.toLocaleString()}</span>
          </div>
        </div>

        {/* Design Conversion */}
        <div className="card-metric accent-primary">
          <div className="metric-title">🎨 Design Stage Rate</div>
          <div className="metric-value" style={{ color: 'var(--primary)' }}>{data.metrics.designConversionRatio}%</div>
          <div className="metric-subtitle" style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
            Ratio of clients with visual 2D/3D uploads
          </div>
        </div>

        {/* Manufacturing & Quality Assurance */}
        <div className="card-metric accent-info">
          <div className="metric-title">🏭 Manufacturing & QA</div>
          <div className="metric-value" style={{ color: 'var(--info)' }}>{data.metrics.qcApproved} / {data.pipelineFlow.manufacturing} Pass</div>
          <div className="metric-subtitle" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
            <span>Active MFG: {data.metrics.mfgInProgress}</span>
            <span>QA Rejects: {data.metrics.qcRejected}</span>
          </div>
        </div>

        {/* Logistics Operations */}
        <div className="card-metric accent-success">
          <div className="metric-title">🚚 Logistics Dispatch</div>
          <div className="metric-value" style={{ color: 'var(--success)' }}>{data.metrics.logisticsDelivered} Trips</div>
          <div className="metric-subtitle" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
            <span>Distance: {data.metrics.logisticsTotalDistance} km</span>
            <span>Active: {data.metrics.logisticsDispatched}</span>
          </div>
        </div>

        {/* Workshop Cost Leaks */}
        <div className="card-metric accent-danger">
          <div className="metric-title">⚠️ Workshop Cost Leaks</div>
          <div className="metric-value" style={{ color: 'var(--danger)' }}>₹{(data.metrics.materialWastageCost + data.metrics.damagedToolsLoss).toLocaleString('en-IN')}</div>
          <div className="metric-subtitle" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
            <span>Waste: ₹{data.metrics.materialWastageCost.toLocaleString()}</span>
            <span>Tools: {data.metrics.damagedToolsCount}</span>
          </div>
        </div>

        {/* AMC Portfolios */}
        <div className="card-metric accent-info" style={{ borderColor: '#8b5cf6' }}>
          <div className="metric-title">🔄 Active AMC Portfolio</div>
          <div className="metric-value" style={{ color: '#8b5cf6' }}>₹{data.metrics.totalAMCValue.toLocaleString('en-IN')}</div>
          <div className="metric-subtitle" style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
            Active Maintenance Contracts: <strong>{data.metrics.totalActiveAMCs}</strong>
          </div>
        </div>
      </div>

      {/* CORE CRM FUNNEL timeline */}
      <div className="panel" style={{ marginBottom: '24px', padding: '20px 24px' }}>
        <h2 className="panel-title" style={{ fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ⛓️ Unified CRM & Fabrication Core Flow Pipeline
        </h2>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px',
          background: '#fafafa',
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid var(--card-border)'
        }}>
          {pipelineSteps.map((step, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center',
              flex: '1 1 80px',
              minWidth: '80px',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '6px',
                textAlign: 'center'
              }}>
                <div style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '50%', 
                  backgroundColor: step.color + '15', 
                  color: step.color,
                  border: `2px solid ${step.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {step.icon}
                </div>
                <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {step.label}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)' }}>
                  {step.count}
                </div>
              </div>
              
              {index < pipelineSteps.length - 1 && (
                <div className="no-print" style={{ 
                  position: 'absolute', 
                  right: '-18px', 
                  top: '18px', 
                  fontSize: '14px', 
                  color: '#cbd5e1',
                  fontWeight: 'bold',
                  userSelect: 'none'
                }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Strategist Deck & PDF Report */}
      <div className="panel no-print" style={{ marginBottom: '28px', border: '1.5px solid var(--primary-border)', backgroundColor: 'var(--primary-light)', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🤖 LegendIn AI CFO & Growth Strategist Console
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Select a specialized query module to run audit reports on materials wastage, logistics costs, or overall strategic conversion.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => handlePrintPDF()}
              style={{ fontSize: '12px', fontWeight: '700', backgroundColor: '#ffffff', border: '1px solid var(--card-border)' }}
            >
              🖨️ Export PDF Brief
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => handleRunAIAnalysis('overall')} 
              disabled={analyzing}
              style={{ fontSize: '12px', fontWeight: '800' }}
            >
              {analyzing ? '⚡ Auditing CRM...' : '⚡ Audit Overall Operations'}
            </button>
          </div>
        </div>

        {/* Specialized audit selection buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap', borderTop: '1px solid rgba(212,175,55,0.15)', paddingTop: '14px' }}>
          {[
            { key: 'overall', label: '📊 Overall Strategy & Yield', icon: '📈' },
            { key: 'logistics', label: '🚚 Logistics & Fleet Efficiency', icon: '🛣️' },
            { key: 'wastage', label: '⚠️ Materials wastage & Cost Control', icon: '🪵' },
            { key: 'conversion', label: '🎨 Design Staging & Lead Funnel', icon: '📐' }
          ].map(q => (
            <button
              key={q.key}
              onClick={() => handleRunAIAnalysis(q.key)}
              disabled={analyzing}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: activeAnalysisQuery === q.key ? '1px solid var(--primary)' : '1px solid var(--primary-border)',
                backgroundColor: activeAnalysisQuery === q.key ? 'var(--primary)' : '#ffffff',
                color: activeAnalysisQuery === q.key ? '#ffffff' : 'var(--primary)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <span>{q.icon}</span> {q.label}
            </button>
          ))}
        </div>

        {aiError && (
          <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', fontSize: '12px', fontWeight: '600' }}>
            ⚠️ Failed to query API: {aiError}
          </div>
        )}

        {aiReport && (
          <div style={{ 
            marginTop: '20px', 
            padding: '24px', 
            backgroundColor: '#ffffff', 
            border: '1px solid var(--card-border)', 
            borderRadius: '12px', 
            maxHeight: '450px', 
            overflowY: 'auto',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div dangerouslySetInnerHTML={{ __html: parseMarkdown(aiReport) }} />
          </div>
        )}
      </div>

      {/* Visualizations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {/* Chart 1: Revenue vs Expenses comparative SVG */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <h2 className="panel-title">Revenue vs Operating Expenses (Last 12 Months)</h2>
          </div>
          
          <div className="svg-chart-container" style={{ position: 'relative', height: '300px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '20px 10px 30px 40px', borderBottom: '1px solid #e2e8f0' }}>
            {/* Y Axis grid lines */}
            <div style={{ position: 'absolute', left: 0, right: 0, height: '100%', top: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
              <div style={{ borderTop: '1px dashed #e2e8f0', width: '100%', position: 'relative' }}><span style={{ position: 'absolute', left: '2px', top: '-10px', fontSize: '9px', color: '#94a3b8' }}>₹{Math.round(maxMonthlyVal).toLocaleString()}</span></div>
              <div style={{ borderTop: '1px dashed #e2e8f0', width: '100%', position: 'relative' }}><span style={{ position: 'absolute', left: '2px', top: '-10px', fontSize: '9px', color: '#94a3b8' }}>₹{Math.round(maxMonthlyVal * 0.66).toLocaleString()}</span></div>
              <div style={{ borderTop: '1px dashed #e2e8f0', width: '100%', position: 'relative' }}><span style={{ position: 'absolute', left: '2px', top: '-10px', fontSize: '9px', color: '#94a3b8' }}>₹{Math.round(maxMonthlyVal * 0.33).toLocaleString()}</span></div>
              <div style={{ borderTop: '1px solid #cbd5e1', width: '100%', position: 'relative' }}><span style={{ position: 'absolute', left: '2px', top: '-10px', fontSize: '9px', color: '#64748b' }}>₹0</span></div>
            </div>

            {/* Bars */}
            {data.revenueVsExpenses.map((m, idx) => {
              const revHeightPercent = Math.max(2, (m.revenue / maxMonthlyVal) * 100);
              const expHeightPercent = Math.max(2, (m.expenses / maxMonthlyVal) * 100);
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative', zIndex: 1, gap: '4px' }}>
                  {/* Two comparative bars */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100%', width: '80%' }}>
                    {/* Revenue Bar */}
                    <div 
                      style={{ height: `${revHeightPercent}%`, backgroundColor: 'var(--success)', flex: 1, borderRadius: '2px 2px 0 0', position: 'relative' }} 
                      title={`${m.month} Revenue: ₹${m.revenue.toLocaleString()}`}
                    />
                    {/* Expense Bar */}
                    <div 
                      style={{ height: `${expHeightPercent}%`, backgroundColor: 'var(--danger)', flex: 1, borderRadius: '2px 2px 0 0', position: 'relative' }} 
                      title={`${m.month} Expenses: ₹${m.expenses.toLocaleString()}`}
                    />
                  </div>
                  {/* Label */}
                  <span style={{ position: 'absolute', bottom: '-22px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '12px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'var(--success)', borderRadius: '2px' }} />
              <strong>Revenue (Payments Recv)</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'var(--danger)', borderRadius: '2px' }} />
              <strong>Expenses Logged</strong>
            </div>
          </div>
        </div>

        {/* Chart 2: Operating Expense Category Breakdown progress bars */}
        <div className="panel" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="panel-header">
              <h2 className="panel-title">Expense Allocations</h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              {data.categoryExpenses.map((c, idx) => {
                const total = data.metrics.totalExpenses || 1;
                const percentage = Math.round((c.amount / total) * 100);
                
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-main)' }}>{c.category}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        ₹{c.amount.toLocaleString()} ({percentage}%)
                      </span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${percentage}%`, 
                          backgroundColor: idx === 0 ? 'var(--primary)' : idx === 1 ? 'var(--info)' : idx === 2 ? 'var(--warning)' : idx === 3 ? 'var(--success)' : 'var(--danger)',
                          borderRadius: '4px'
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
              {data.categoryExpenses.reduce((sum, e) => sum + e.amount, 0) === 0 && (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-light)', fontSize: '13px', fontStyle: 'italic' }}>
                  No operating expenses recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', marginBottom: '28px' }}>
        {/* Chart 3: Project Status Distributions */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <h2 className="panel-title">Project Pipelines & Status Distribution</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            {data.statusDistribution.map((st, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '10px 14px', 
                  backgroundColor: '#fafafa', 
                  border: '1px solid #f1ecec', 
                  borderRadius: '8px' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: st.status.includes('COMPLETED') ? 'var(--success)' : st.status.includes('PROGRESS') ? 'var(--info)' : st.status.includes('HOLD') ? 'var(--warning)' : st.status.includes('CANCELLED') ? 'var(--danger)' : '#64748b' 
                  }} />
                  <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>{st.status}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{st.count} Projects</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Valued: ₹{st.value.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Client Value Distributions (Top 10 Clients) */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <h2 className="panel-title">Client Portfolio Contributions (Top 10 Clients)</h2>
          </div>

          <div className="table-container" style={{ marginTop: '10px' }}>
            <table className="table-list" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Client Company</th>
                  <th>Primary Contact</th>
                  <th style={{ textAlign: 'center' }}>Projects Count</th>
                  <th style={{ textAlign: 'right' }}>Portfolio Value</th>
                </tr>
              </thead>
              <tbody>
                {data.clientValueDistribution.map((c, idx) => (
                  <tr key={idx}>
                    <td><strong>{c.company}</strong></td>
                    <td>{c.name}</td>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>{c.projectsCount}</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--primary)' }}>
                      ₹{c.totalValue.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {data.clientValueDistribution.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>
                      No client profiles registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 5: Margin Performance Table */}
      <div className="panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h2 className="panel-title">Project Profit Margin & Yield Matrix</h2>
          <input 
            type="text" 
            className="form-control" 
            placeholder="🔍 Search yield table by project or client..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '260px', padding: '6px 12px', fontSize: '13px', borderRadius: '6px', margin: 0 }}
          />
        </div>

        <div className="table-container">
          <table className="table-list" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Client Partner</th>
                <th style={{ textAlign: 'right' }}>Project Value</th>
                <th style={{ textAlign: 'right' }}>Direct Expenses</th>
                <th style={{ textAlign: 'right' }}>Resource Team Cost</th>
                <th style={{ textAlign: 'right' }}>Net Margin Profit</th>
                <th style={{ textAlign: 'right' }}>Profit Yield %</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjectProfits.map((p, idx) => {
                let marginColor = 'var(--success)';
                if (p.margin < 15) marginColor = 'var(--warning)';
                if (p.margin <= 0) marginColor = 'var(--danger)';

                return (
                  <tr key={idx}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.client}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>₹{p.value.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: '600' }}>-₹{p.directExpenses.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: '600' }}>-₹{Math.round(p.teamCost).toLocaleString()}</td>
                    <td style={{ 
                      textAlign: 'right', 
                      fontWeight: '700', 
                      color: p.profit >= 0 ? 'var(--success)' : 'var(--danger)' 
                    }}>
                      {p.profit < 0 ? '-' : ''}₹{Math.abs(Math.round(p.profit)).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: marginColor }}>
                      {p.margin}%
                    </td>
                  </tr>
                );
              })}
              {filteredProjectProfits.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>
                    {data.projectProfits.length === 0 
                      ? 'No project parameters logged yet. Assign resources and values to track yield metrics!' 
                      : 'No projects match your search criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
