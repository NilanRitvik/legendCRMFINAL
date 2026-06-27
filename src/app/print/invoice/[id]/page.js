'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function PrintInvoicePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/invoices/${id}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchInvoice();
  }, [id]);

  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>Generating Branded Invoice...</div>;
  }

  if (!data || !data.invoice) {
    return <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif', color: 'red' }}>Invoice not found.</div>;
  }

  const { invoice, payments } = data;
  const project = invoice.project || { name: 'Interior Design Project', value: 0 };
  const client = project.client || { name: 'Client Partner', company: 'Partner Corporation', email: '' };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, invoice.amount - totalPaid);

  const handleWhatsAppShare = () => {
    const phone = client.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const msg = `Hello ${client.name},\n\nPlease find your Invoice ${invoice.invoice_number} from Legend Interiors.\nTotal Amount: ₹${invoice.amount.toLocaleString()}\nView link: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleEmailShare = () => {
    const email = client.email || '';
    const subject = `Invoice ${invoice.invoice_number} from Legend Interiors`;
    const body = `Dear ${client.name},\n\nPlease find below the details for Invoice ${invoice.invoice_number}.\nTotal Amount: ₹${invoice.amount.toLocaleString()}\nLink to view/download: ${window.location.href}\n\nBest regards,\nLegend Interiors`;
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

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
      {/* Action Toolbar */}
      <div className="no-print" style={{
        background: '#1e293b',
        color: '#ffffff',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '8px',
        marginBottom: '30px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => window.history.back()}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            ← Back to App
          </button>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>
            Branded Invoice Viewer
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* WhatsApp Share */}
          <button
            onClick={handleWhatsAppShare}
            style={{
              background: '#25D366',
              border: 'none',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>💬</span> WhatsApp
          </button>

          {/* Email Share */}
          <button
            onClick={handleEmailShare}
            style={{
              background: '#0284c7',
              border: 'none',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📧</span> Email
          </button>

          {/* Download / Print PDF */}
          <button
            onClick={() => window.print()}
            style={{
              background: '#d4af37',
              border: 'none',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📥</span> Download PDF
          </button>
        </div>
      </div>
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
        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, textTransform: 'uppercase', color: '#d4af37', letterSpacing: '0.5px' }}>
          TAX INVOICE
        </h2>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
          Invoice No: {invoice.invoice_number} | Issue Date: {new Date(invoice.issue_date).toLocaleDateString()}
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
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#8c98a9', display: 'block', marginBottom: '6px' }}>Invoice To</span>
          <strong>{client.name}</strong>
          <div>{client.company}</div>
          <div>{client.email}</div>
          <div>{client.phone}</div>
        </div>
        <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '20px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#8c98a9', display: 'block', marginBottom: '6px' }}>Project Context</span>
          <strong>{project.name}</strong>
          <div>Type: <span style={{ textTransform: 'capitalize' }}>{project.type}</span></div>
          <div>Status: <span style={{ textTransform: 'capitalize' }}>{project.status.replace('_', ' ')}</span></div>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', marginBottom: '30px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>Description</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#475569', width: '80px' }}>Type</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#475569', width: '120px' }}>Invoice Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '16px 12px', verticalAlign: 'top' }}>
                <strong>{invoice.type.toUpperCase()} BILLING</strong>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Professional interior design deliverables, site staging, and turnkey installation milestone settlement.
                </div>
              </td>
              <td style={{ padding: '16px 12px', textAlign: 'center', verticalAlign: 'top', textTransform: 'capitalize' }}>
                {invoice.type}
              </td>
              <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', fontSize: '14px', verticalAlign: 'top' }}>
                ₹{invoice.amount.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Total Calculations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start', pageBreakInside: 'avoid' }}>
        <div style={{ fontSize: '12px', color: '#64748b', padding: '10px' }}>
          <strong>Terms & Conditions:</strong>
          <div style={{ marginTop: '6px' }}>1. Payment is due within 10 days of issue date.</div>
          <div>2. Interest of 1.5% per month will be charged on late payments.</div>
          <div>3. All disputes are subject to Udumalpet jurisdiction.</div>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
            <span>Subtotal</span>
            <strong>₹{invoice.amount.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: 'var(--success)' }}>
            <span>Amount Paid</span>
            <span>-₹{totalPaid.toLocaleString()}</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '12px 16px', 
            backgroundColor: '#d4af37', 
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '15px'
          }}>
            <span>Remaining Balance</span>
            <span>₹{remaining.toLocaleString()}</span>
          </div>
        </div>
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
