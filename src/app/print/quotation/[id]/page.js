'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function PrintQuotationPage() {
  const { id } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const res = await fetch('/api/quotations');
        const data = await res.json();
        const found = data.find(q => q._id === id);
        setQuote(found);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchQuote();
  }, [id]);

  useEffect(() => {
    if (quote) {
      // Trigger browser print dialog after content is fully loaded
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [quote]);

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>Generating Branded Quotation...</div>;
  }

  if (!quote) {
    return <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif', color: 'red' }}>Quotation not found.</div>;
  }

  const client = quote.client || { name: 'Client Partner', company: 'Partner Corporation', email: '' };

  const taxableVal = Math.max(0, (quote.total_actual_value || quote.quoted_value) - (quote.total_discount || 0) - (quote.discount || 0));
  const calculatedGst = quote.has_gst ? Math.round(taxableVal * ((quote.gst_rate || 18) / 100)) : 0;

  const handleWhatsAppShare = () => {
    const phone = client.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const msg = `Hello ${client.name},\n\nPlease find your Quotation ${quote.quotation_number || 'Doc'} from Legend Interiors.\nQuoted Value: ₹${(quote.quoted_value || 0).toLocaleString()}\nView link: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleEmailShare = () => {
    const email = client.email || '';
    const subject = `Quotation ${quote.quotation_number || 'Doc'} from Legend Interiors`;
    const body = `Dear ${client.name},\n\nPlease find below the details for your Quotation.\nQuoted Value: ₹${(quote.quoted_value || 0).toLocaleString()}\nLink to view/download: ${window.location.href}\n\nBest regards,\nLegend Interiors`;
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
            Branded Quotation Viewer
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
        opacity: '0.03',
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
        <h1 style={{ fontSize: '56px', fontWeight: '900', color: '#000000', margin: '-15px 0 0 0', letterSpacing: '-2px' }}>
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
          Interior Design & Fit-Out Quotation
        </h2>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
          Ref ID: QTE-{quote._id.substring(quote._id.length - 8).toUpperCase()} | Date: {new Date(quote.sent_date).toLocaleDateString()}
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
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#8c98a9', display: 'block', marginBottom: '6px' }}>Prepared For</span>
          <strong>{client.name}</strong>
          <div>{client.company}</div>
          <div>{client.email}</div>
          {client.phone && <div>{client.phone}</div>}
        </div>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#8c98a9', display: 'block', marginBottom: '6px' }}>Project Summary</span>
          <div><strong>Quotation Status:</strong> {quote.status.toUpperCase()}</div>
          <div><strong>Validity:</strong> 15 Days from issue</div>
        </div>
      </div>

      {/* Itemized Products/Services Table */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#d4af37', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '14px' }}>
          Scope of Work & Itemized Specifications
        </h3>
        
        {quote.items && quote.items.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#fcfaf5', borderBottom: '2px solid #d4af37', color: '#b89528', textAlign: 'left' }}>
                <th style={{ padding: '10px', fontWeight: '800' }}>Item Name</th>
                <th style={{ padding: '10px', fontWeight: '800' }}>Specifications</th>
                <th style={{ padding: '10px', fontWeight: '800', textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ padding: '10px', fontWeight: '800', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '10px', fontWeight: '800', textAlign: 'right' }}>Discount (₹)</th>
                <th style={{ padding: '10px', fontWeight: '800', textAlign: 'right' }}>Final Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px', fontWeight: '600' }}>{item.product_name}</td>
                  <td style={{ padding: '10px', color: '#4a5568' }}>{item.description || '-'}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>₹{item.unit_value?.toLocaleString() || '0'}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{item.quantity || 1}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#e53e3e' }}>
                    {item.discount > 0 ? `-₹${(item.discount * (item.quantity || 1)).toLocaleString()}` : '₹0'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700' }}>
                    ₹{item.final_value?.toLocaleString() || '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>
            <p style={{ fontSize: '13px', color: '#2d3748', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {quote.scope_description || 'No custom scope description logged.'}
            </p>
          </div>
        )}
      </div>

      {/* Financial totals block */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '40px'
      }}>
        <div style={{
          width: '340px',
          border: '1px solid #d4af37',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
            <span>Subtotal (Before Discount)</span>
            <span>₹{(quote.total_actual_value || quote.quoted_value).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: '#e53e3e' }}>
            <span>Itemized Discounts</span>
            <span>-₹{(quote.total_discount || 0).toLocaleString()}</span>
          </div>
          {quote.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: '#e53e3e' }}>
              <span>Overall Discount</span>
              <span>-₹{quote.discount.toLocaleString()}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
            <span>Taxable Value</span>
            <span>₹{taxableVal.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: '#3182ce' }}>
            <span>GST ({quote.has_gst ? quote.gst_rate : 0}%)</span>
            <span>₹{calculatedGst.toLocaleString()}</span>
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
            <span>Net Grand Total</span>
            <span>₹{quote.quoted_value.toLocaleString()}</span>
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
          <strong>Client Acceptance Signature</strong>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Acceptance of Scope & Date</div>
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
