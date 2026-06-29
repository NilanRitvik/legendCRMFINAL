'use client';
import { useState, useEffect } from 'react';

const RECHARGE_PLANS = [
  { amount: 500, label: 'Standard Plan', desc: 'Approx. 5,000 AI queries & report downloads', popular: false },
  { amount: 1000, label: 'Professional Plan', desc: 'Approx. 12,000 AI queries, P&L forecasts & custom exports', popular: true },
  { amount: 2000, label: 'Enterprise Plan', desc: 'Approx. 30,000 AI queries with priority response speeds', popular: false }
];

export default function TopUpNuera() {
  const [customKey, setCustomKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [currentConfig, setCurrentConfig] = useState({});
  
  // Recharge states
  const [selectedPlan, setSelectedPlan] = useState(1000);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [creditsBalance, setCreditsBalance] = useState(1250);
  const [rechargeSuccess, setRechargeSuccess] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([
    { id: 'TXN-99881', date: '25/06/2026', amount: 1000, method: 'Visa *4421', status: 'Completed' },
    { id: 'TXN-88761', date: '01/06/2026', amount: 500, method: 'MasterCard *8890', status: 'Completed' }
  ]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/nuera-ai/settings');
      const data = await res.json();
      setCurrentConfig(data);
      if (data.gemini_api_key) {
        setCustomKey(data.gemini_api_key);
      }
      if (data.ai_credits_balance) {
        setCreditsBalance(Number(data.ai_credits_balance));
      }
      if (data.ai_recharges_list) {
        setRecentTransactions(JSON.parse(data.ai_recharges_list));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSaveKey = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      const res = await fetch('/api/nuera-ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'gemini_api_key', value: customKey })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        fetchSettings();
        window.dispatchEvent(new CustomEvent('nuera-key-updated'));
      } else {
        setError(data.error || 'Failed to save key. Please check connection.');
      }
    } catch (err) {
      setError('Network error saving key. Please try again.');
    }
    setLoading(false);
  };

  // Perform recharge payment simulation
  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setRechargeSuccess(false);
    setError('');

    try {
      const transactionId = `TXN-${Math.floor(10000 + Math.random() * 90000)}`;
      const todayDate = new Date().toLocaleDateString('en-IN');
      const newBalance = creditsBalance + selectedPlan;
      
      const newTransaction = {
        id: transactionId,
        date: todayDate,
        amount: selectedPlan,
        method: `${cardNumber.startsWith('5') ? 'MasterCard' : 'Visa'} *${cardNumber.slice(-4) || '9982'}`,
        status: 'Completed'
      };

      const updatedHistory = [newTransaction, ...recentTransactions];

      // Save new balance & history to DB
      await fetch('/api/nuera-ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ai_credits_balance', value: String(newBalance) })
      });

      await fetch('/api/nuera-ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ai_recharges_list', value: JSON.stringify(updatedHistory) })
      });

      setCreditsBalance(newBalance);
      setRecentTransactions(updatedHistory);
      setRechargeSuccess(true);

      // Reset card inputs
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setCardName('');

    } catch (err) {
      setError('Payment gateway processing error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)' }}>
      
      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '28px', paddingBottom: '16px', borderBottom: '1px solid var(--card-border)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px', color: 'var(--primary)' }}>⚡</span>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Top up Nuera</h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Top up your AI credits and manage your premium API credentials
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        
        {/* TOP PANEL: CARD BALANCE */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)',
          borderRadius: '16px', padding: '24px', color: '#fff',
          boxShadow: '0 8px 30px rgba(49,16,66,0.25)', display: 'flex',
          flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Nuera Premium Credits Balance
            </div>
            <div style={{ fontSize: '36px', fontWeight: '900', marginTop: '12px', color: '#fff' }}>
              ₹{creditsBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.6)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
            <span>Status: <strong>ACTIVE</strong></span>
            <span>API Quota Limit: <strong>UNLIMITED</strong></span>
          </div>
        </div>

        {/* TOP PANEL: GOOGLE BILLING GATEWAY */}
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '6px' }}>
              🔒 Google API Billing Portal
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
              To activate unlimited requests on your API key (`AQ.Ab8RN6...`), you must link a card directly in Google AI Studio. Click the link below to pay and configure.
            </p>
          </div>
          <a
            href="https://aistudio.google.com/app/billing"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '800',
              fontSize: '13px', textDecoration: 'none', textAlign: 'center',
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)', marginTop: '14px'
            }}
          >
            💳 Go to Google Billing & Pay Now ➔
          </a>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* BOTTOM LEFT: PAYMENT GATEWAY FORM */}
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '6px' }}>
            Top up Balance
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Select a top-up plan and enter card details below. Recharged credits are instantly credited.
          </p>

          {rechargeSuccess && (
            <div style={{
              background: '#e6fbf3', border: '1px solid #10b98140', borderRadius: '10px',
              padding: '14px', color: '#10b981', fontSize: '13px', fontWeight: '700',
              textAlign: 'center', marginBottom: '18px'
            }}>
              🎉 Payment Completed! ₹{selectedPlan} has been added to your balance.
            </div>
          )}

          {/* Plan Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {RECHARGE_PLANS.map(plan => (
              <div
                key={plan.amount}
                onClick={() => setSelectedPlan(plan.amount)}
                style={{
                  padding: '14px', borderRadius: '12px', cursor: 'pointer',
                  border: selectedPlan === plan.amount ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                  background: selectedPlan === plan.amount ? 'var(--primary-light)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '13px' }}>{plan.label}</span>
                  <span style={{ fontWeight: '900', color: 'var(--primary)', fontSize: '15px' }}>₹{plan.amount}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{plan.desc}</div>
              </div>
            ))}
          </div>

          {/* Card Form */}
          <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Cardholder Name</label>
              <input type="text" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Full Name" required style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Card Number</label>
              <input type="text" maxLength="16" value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, ''))} placeholder="4111 2222 3333 4444" required style={inputStyle} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Expiry Date</label>
                <input type="text" maxLength="5" value={expiry} onChange={e => setExpiry(e.target.value)} placeholder="MM/YY" required style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>CVV</label>
                <input type="password" maxLength="3" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, ''))} placeholder="•••" required style={inputStyle} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', background: 'var(--primary)', color: '#fff',
                border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '800',
                fontSize: '14px', boxShadow: '0 4px 14px rgba(212,175,55,0.3)', marginTop: '8px'
              }}
            >
              {loading ? 'Processing Payment...' : `💳 Pay & Recharge ₹${selectedPlan}`}
            </button>
          </form>
        </div>

        {/* BOTTOM RIGHT: TRANSACTION HISTORY & KEYS SETUP */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)'
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px' }}>
              Manage Custom Key override
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Swap Gemini API key dynamically in MongoDB. Bypasses cached environment variables.
            </p>

            {success && (
              <div style={{ padding: '8px', background: '#e6fbf3', color: '#10b981', fontSize: '11px', fontWeight: '700', borderRadius: '8px', marginBottom: '10px', textAlign: 'center' }}>
                ✓ Key successfully updated!
              </div>
            )}

            <form onSubmit={handleSaveKey} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={customKey}
                onChange={e => setCustomKey(e.target.value)}
                placeholder="Google API Key (AIzaSy...)"
                required
                style={{
                  flex: 1, padding: '10px 12px', fontSize: '12px',
                  borderRadius: '8px', border: '1.5px solid var(--card-border)',
                  background: 'var(--background)', color: 'var(--text-main)',
                  fontFamily: 'monospace', outline: 'none'
                }}
              />
              <button type="submit" disabled={loading} style={{ padding: '10px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                Save
              </button>
            </form>
          </div>

          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)',
            flex: 1
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '14px' }}>
              Recharge Transaction Log
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentTransactions.map(txn => (
                <div key={txn.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--background)', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>{txn.id}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Date: {txn.date} · Method: {txn.method}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--primary)' }}>+₹{txn.amount}</div>
                    <div style={{ fontSize: '10px', color: '#10b981', fontWeight: '700', marginTop: '2px' }}>● {txn.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '11px 12px',
  fontSize: '13px',
  borderRadius: '8px',
  border: '1.5px solid var(--card-border)',
  background: 'var(--background)',
  color: 'var(--text-main)',
  outline: 'none',
  transition: 'border-color 0.2s'
};
