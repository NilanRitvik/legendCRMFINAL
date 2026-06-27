'use client';

import { useState, useEffect } from 'react';

export default function PrintAIReportPage() {
  const [reportHtml, setReportHtml] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Reusable markdown parser function
  function parseMarkdown(md) {
    if (!md) return '';
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h4 style="font-size: 14px; margin: 16px 0 8px 0; color: #d4af37; font-weight: 800;">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 style="font-size: 17px; margin: 20px 0 10px 0; color: #1a1a1a; font-weight: 800; border-bottom: 2px solid #fefce8; padding-bottom: 6px;">$1</h3>')
      .replace(/^# (.*$)/gim, '<h2 style="font-size: 20px; margin: 24px 0 12px 0; color: #d4af37; font-weight: 900; text-transform: uppercase;">$1</h2>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .split('\n').map(line => {
        if (line.trim().startsWith('- ')) {
          return `<li style="margin-left: 20px; margin-bottom: 6px; color: #334155; font-size: 13px;">${line.trim().substring(2)}</li>`;
        }
        if (line.trim().startsWith('|')) {
          const cols = line.split('|').map(c => c.trim()).filter(c => c !== '');
          if (line.includes('---')) return '';
          const isHeader = line.includes('Revenue') || line.includes('Metric') || line.includes('Project Name') || line.includes('Pros') || line.includes('Category') || line.includes('Value');
          const tag = isHeader ? 'th' : 'td';
          const style = isHeader 
            ? 'padding: 8px; background-color: #fefce8; color: #d4af37; font-weight: 800; border: 1px solid #e2e8f0; font-size: 12px;' 
            : 'padding: 8px; border: 1px solid #e2e8f0; font-size: 12px;';
          return `<tr style="border-bottom: 1px solid #e2e8f0;">${cols.map(c => `<${tag} style="${style}">${c}</${tag}>`).join('')}</tr>`;
        }
        return line.trim() ? `<p style="margin-bottom: 10px; line-height: 1.6; color: #334155; font-size: 13px;">${line}</p>` : '';
      }).join('\n');

    html = html.replace(/(<tr style[\s\S]*?<\/tr>)/g, '<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">$1</table>');
    html = html.replace(/<\/table>\n<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">/g, '');

    return html;
  }

  useEffect(() => {
    const reportMd = localStorage.getItem('legendin_ai_report') || '';
    if (reportMd) {
      setReportHtml(parseMarkdown(reportMd));
      setLoaded(true);
    } else {
      setReportHtml('<div style="text-align: center; color: red;">No AI analysis report found in local storage.</div>');
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded && reportHtml) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loaded, reportHtml]);

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px',
      backgroundColor: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      color: '#1a1a1a',
      lineHeight: '1.5',
      position: 'relative'
    }}>
      {/* Light Center Watermark */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: '0.04',
        pointerEvents: 'none',
        zIndex: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        userSelect: 'none'
      }}>
        <img 
          src="/logo.png?v=2" 
          alt="Watermark Logo" 
          style={{ width: '400px', height: '400px', objectFit: 'contain' }} 
        />
        <h1 style={{ fontSize: '64px', fontWeight: '900', color: '#000000', margin: '-15px 0 0 0', letterSpacing: '-2px' }}>
          LEGENDIN
        </h1>
      </div>

      {/* Printable CSS to hide everything except printable area */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* Top Header branding bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #d4af37',
        paddingBottom: '20px',
        marginBottom: '45px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="/logo.png?v=2" 
              alt="Legend Interiors Logo" 
              style={{ width: '45px', height: '45px', objectFit: 'contain' }} 
            />
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
              Legend Interiors
            </h1>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', display: 'block', marginTop: '4px' }}>
            Legend Interiors — Premium Interior Designers
          </span>
        </div>

        <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
          <strong>Legend Interiors</strong>
          <div>legendinteriorudumalpet@gmail.com</div>
          <div>+91 95975 33099</div>
          <div>No 13/113 A, Palani Road, Palappampatti, Udumalpet - 642 128.</div>
          <div>GST: 33DFSPB1768C1ZL | CIN: U45200TG2016PTC112460</div>
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, textTransform: 'uppercase', color: '#d4af37', letterSpacing: '0.5px' }}>
          AI EXECUTIVE GROWTH REPORT
        </h2>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
          Analysis Compiled: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Report Content */}
      <div 
        style={{ position: 'relative', zIndex: 1, marginBottom: '50px' }}
        dangerouslySetInnerHTML={{ __html: reportHtml }} 
      />

      {/* Signature lines */}
      <div style={{
        marginTop: '60px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        fontSize: '13px',
        pageBreakInside: 'avoid'
      }}>
        <div>
          <div style={{ position: 'relative', height: '40px', marginBottom: '8px' }}>
            <img 
              src="/signature.png" 
              alt="CEO Signature" 
              style={{ height: '45px', objectFit: 'contain', position: 'absolute', bottom: '2px', left: '10px' }} 
            />
            <div style={{ borderBottom: '1px solid #cbd5e1', width: '100%', position: 'absolute', bottom: 0 }}></div>
          </div>
          <strong>Founder, Legend Interiors</strong>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Authorized Signature & Date</div>
        </div>
        <div>
          <div style={{ borderBottom: '1px solid #cbd5e1', height: '40px', marginBottom: '8px' }}></div>
          <strong>Client Acknowledgment Signature</strong>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Date & Sign</div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div style={{
        marginTop: '80px',
        textAlign: 'center',
        fontSize: '11px',
        color: '#94a3b8',
        borderTop: '1px solid #e2e8f0',
        paddingTop: '20px',
        pageBreakInside: 'avoid'
      }}>
        Legend Interiors — High-End Luxury Interior Designing & Space Planning.
      </div>
    </div>
  );
}
