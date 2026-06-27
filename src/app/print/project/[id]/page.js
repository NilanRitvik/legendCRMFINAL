'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function PrintProjectStatementPage() {
  const { id } = useParams();
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjectData() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        const json = await res.json();
        setProjectData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchProjectData();
  }, [id]);

  useEffect(() => {
    if (projectData) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [projectData]);

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>Generating Project Statement PDF...</div>;
  }

  if (!projectData || projectData.error) {
    return <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif', color: 'red' }}>Project not found.</div>;
  }

  const client = projectData.client || { name: 'Client Partner', company: 'Partner Corporation', email: '', phone: '' };
  const totalPaid = projectData.totalPaid || 0;
  const remaining = projectData.accountsReceivable || 0;
  const invoices = projectData.invoices || [];
  const payments = projectData.payments || [];

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
        borderBottom: '2px solid var(--primary, #d4af37)',
        paddingBottom: '20px',
        marginBottom: '40px'
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
        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, textTransform: 'uppercase', color: 'var(--primary, #d1123f)', letterSpacing: '0.5px' }}>
          PROJECT FINANCIAL STATEMENT
        </h2>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
          Statement Date: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Bill To Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '20px',
        backgroundColor: '#faf8f8',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #f1ecec',
        marginBottom: '30px',
        fontSize: '13px'
      }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#8c98a9', display: 'block', marginBottom: '6px' }}>Client Info</span>
          <strong>{client.name}</strong>
          <div>{client.company}</div>
          <div>{client.email}</div>
          {client.phone && <div>{client.phone}</div>}
        </div>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#8c98a9', display: 'block', marginBottom: '6px' }}>Project Summary</span>
          <div><strong>Project Name:</strong> {projectData.name}</div>
          <div><strong>Due/End Date:</strong> {projectData.end_date ? new Date(projectData.end_date).toLocaleDateString() : 'N/A'}</div>
          <div><strong>Status:</strong> <span style={{ fontWeight: '700', textTransform: 'uppercase', color: projectData.status === 'completed' ? 'var(--success, #10b981)' : '#e53e3e' }}>{projectData.status?.replace('_', ' ')}</span></div>
        </div>
      </div>

      {/* Summary Table */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary, #d1123f)', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '14px' }}>
          Overall Financial Balance
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#fefce8', borderBottom: '2px solid var(--primary, #d4af37)', color: 'var(--primary, #d4af37)', textAlign: 'left' }}>
              <th style={{ padding: '10px', fontWeight: '800' }}>Project Value</th>
              <th style={{ padding: '10px', fontWeight: '800', textAlign: 'right' }}>Total Paid</th>
              <th style={{ padding: '10px', fontWeight: '800', textAlign: 'right' }}>Remaining Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8f0', fontWeight: '700' }}>
              <td style={{ padding: '10px' }}>
                ₹{projectData.value?.toLocaleString()}
              </td>
              <td style={{ padding: '10px', textAlign: 'right', color: 'var(--success, #10b981)' }}>
                ₹{totalPaid.toLocaleString()}
              </td>
              <td style={{ padding: '10px', textAlign: 'right', color: remaining > 0 ? 'var(--primary, #d4af37)' : '#1a1a1a' }}>
                ₹{remaining.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Invoices List */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary, #d1123f)', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '14px' }}>
          Invoices Issued
        </h3>
        {invoices.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#faf8f8', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Invoice Number</th>
                <th style={{ padding: '8px' }}>Issue Date</th>
                <th style={{ padding: '8px' }}>Due Date</th>
                <th style={{ padding: '8px' }}>Status</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px', fontWeight: '600' }}>{inv.invoice_number}</td>
                  <td style={{ padding: '8px' }}>{new Date(inv.issue_date).toLocaleDateString()}</td>
                  <td style={{ padding: '8px' }}>{new Date(inv.due_date).toLocaleDateString()}</td>
                  <td style={{ padding: '8px', textTransform: 'uppercase', fontWeight: '700', color: inv.status === 'paid' ? 'var(--success, #10b981)' : inv.status === 'partial' ? 'var(--warning, #f59e0b)' : 'var(--danger, #ef4444)' }}>
                    {inv.status}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>₹{inv.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>No invoices issued yet.</div>
        )}
      </div>

      {/* Payments List */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary, #d1123f)', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '14px' }}>
          Payments Received
        </h3>
        {payments.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#faf8f8', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Payment Date</th>
                <th style={{ padding: '8px' }}>Method</th>
                <th style={{ padding: '8px' }}>Category</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pmt) => (
                <tr key={pmt._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px' }}>{new Date(pmt.payment_date).toLocaleDateString()}</td>
                  <td style={{ padding: '8px', textTransform: 'capitalize' }}>{pmt.method}</td>
                  <td style={{ padding: '8px', textTransform: 'uppercase', fontWeight: '600' }}>{pmt.category}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: 'var(--success, #10b981)', fontWeight: '600' }}>+₹{pmt.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>No payments recorded yet.</div>
        )}
      </div>

      {/* Signature lines */}
      <div style={{
        marginTop: '60px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        fontSize: '13px'
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
        paddingTop: '20px'
      }}>
        Legend Interiors — High-End Luxury Interior Designing & Space Planning.
      </div>
    </div>
  );
}
