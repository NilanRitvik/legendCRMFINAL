'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const user = await res.json();
        const sessionData = { username: user.username, role: user.role, allowedPages: user.allowedPages };
        const base64Session = btoa(JSON.stringify(sessionData));
        document.cookie = `legendin_session=${base64Session}; path=/; max-age=86400; SameSite=Strict`;
        window.location.href = '/';
      } else {
        const err = await res.json();
        setError(err.error || 'Invalid username or password. Please try again.');
      }
    } catch {
      setError('An error occurred during authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: '🎨', title: '2D & 3D Visualizer', desc: 'Upload and manage architectural floor plans and 3D interior renders' },
    { icon: '🛒', title: 'Purchase & Inventory', desc: 'Track raw materials, project allocations, tool assets, and machine logs' },
    { icon: '💰', title: 'Dynamic Bookkeeping', desc: 'Real-time Accounts Payable, Receivables, GST tracking, and General Ledgers' },
    { icon: '👨‍💼', title: 'Payroll Console', desc: 'Manage employees, calculate ESI/PF/PT, and print branded payslips' },
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0.25; transform: scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        .login-input {
          width: 100%;
          padding: 13px 16px;
          font-size: 14px;
          border-radius: 10px;
          border: 1.5px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #ffffff;
          outline: none;
          transition: border-color 0.25s, background 0.25s;
          font-family: inherit;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.3); }
        .login-input:focus {
          border-color: #d4af37;
          background: rgba(255,255,255,0.08);
        }
        .login-btn {
          width: 100%;
          padding: 14px;
          font-size: 15px;
          font-weight: 800;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #d4af37 0%, #b89528 100%);
          color: #ffffff;
          cursor: pointer;
          letter-spacing: 0.5px;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(212,175,55,0.4);
          font-family: inherit;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(212,175,55,0.55);
        }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .feature-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          animation: fadeUp 0.6s ease both;
          transition: background 0.2s;
        }
        .feature-card:hover { background: rgba(255,255,255,0.07); }
      `}</style>

      <div style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        background: 'linear-gradient(135deg, #0d0e15 0%, #120e02 50%, #0a0a0f 100%)',
        position: 'fixed',
        top: 0, left: 0,
        zIndex: 9999,
        overflow: 'hidden',
        fontFamily: "'Outfit', 'Segoe UI', sans-serif"
      }}>

        {/* ── Ambient glow orbs ── */}
        <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)', top: '-100px', left: '-100px', animation: 'pulse 6s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,149,40,0.12) 0%, transparent 70%)', bottom: '-80px', left: '30%', animation: 'pulse 8s ease-in-out infinite 2s', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)', top: '20%', right: '5%', animation: 'pulse 7s ease-in-out infinite 1s', pointerEvents: 'none' }} />

        {/* ══════════════════════════════════════
            LEFT PANEL — Branding & Content
        ══════════════════════════════════════ */}
        <div style={{
          flex: '1 1 55%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 64px',
          position: 'relative',
          animation: 'fadeUp 0.7s ease both',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
            <div style={{
              width: '52px', height: '52px',
              borderRadius: '14px',
              border: '2px solid rgba(212,175,55,0.6)',
              overflow: 'hidden',
              backgroundColor: '#1c1d26',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(212,175,55,0.3)',
              animation: 'float 4s ease-in-out infinite',
              flexShrink: 0,
            }}>
              <img src="/logo.png?v=2" alt="LegendIn" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>
                LegendIn
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '3px' }}>
                Interior Designer Console
              </div>
            </div>
          </div>

          {/* Hero Text */}
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{
              fontSize: '38px',
              fontWeight: '900',
              color: '#ffffff',
              lineHeight: '1.2',
              letterSpacing: '-1px',
              marginBottom: '20px',
              animation: 'fadeUp 0.7s ease 0.1s both',
            }}>
              Luxury Interior Designing &{' '}
              <span style={{
                background: 'linear-gradient(90deg, #d4af37, #f39c12, #e67e22)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Creative Space Planning
              </span>{' '}
              ERP Platform
            </h1>
            <p style={{
              fontSize: '13px',
              fontWeight: '700',
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '16px',
              animation: 'fadeUp 0.7s ease 0.15s both',
            }}>
              Where Artistry Meets Operational Excellence.
            </p>
            <p style={{
              fontSize: '15px',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: '1.8',
              maxWidth: '520px',
              animation: 'fadeUp 0.7s ease 0.2s both',
            }}>
              From conceptual 2D/3D blueprint creations to inventory purchasing, dynamic cashflow ledgers, and branded salary payslip generation, 
              <strong style={{ color: 'rgba(255,255,255,0.75)' }}> LegendIn</strong> offers a connected, seamless interface for scaling high-end interior architecture teams.
            </p>
          </div>

          {/* Feature Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '560px' }}>
            {features.map((f, i) => (
              <div key={f.title} className="feature-card" style={{ animationDelay: `${0.25 + i * 0.08}s` }}>
                <div style={{ fontSize: '22px', flexShrink: 0, marginTop: '2px' }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>{f.title}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom badges */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '36px', flexWrap: 'wrap', animation: 'fadeUp 0.7s ease 0.5s both' }}>
            {['💎 Luxury Gold', '⚡ Real-time Stock', '📐 2D & 3D blueprints', '📊 Unified Bookkeeper'].map(badge => (
              <span key={badge} style={{
                padding: '5px 12px',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.5)',
                fontWeight: '600',
              }}>{badge}</span>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════
            RIGHT PANEL — Login Form
        ══════════════════════════════════════ */}
        <div style={{
          flex: '0 0 420px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 44px',
          animation: 'fadeUp 0.7s ease 0.2s both',
        }}>
          <div style={{ width: '100%', maxWidth: '360px' }}>

            {/* Form Header */}
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px', height: '56px',
                borderRadius: '16px',
                background: 'rgba(212,175,55,0.12)',
                border: '1.5px solid rgba(212,175,55,0.3)',
                marginBottom: '16px',
                fontSize: '24px',
              }}>🔑</div>
              <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#fff', marginBottom: '6px' }}>Welcome Back</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Sign in to your LegendIn workspace</p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px',
                padding: '11px 14px',
                color: '#f87171',
                fontSize: '12px',
                marginBottom: '16px',
                textAlign: 'center',
                animation: 'fadeUp 0.3s ease',
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Username
                </label>
                <input
                  className="login-input"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Password
                </label>
                <input
                  className="login-input"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: '8px' }}>
                {loading ? '⏳ Authenticating...' : '🚀 Authenticate Access'}
              </button>
            </form>

            {/* Footer note */}
            <div style={{ marginTop: '28px', padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', lineHeight: '1.8' }}>
                🔒 Secured access · Session valid for 24 hours<br />
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>LegendIn Console © {new Date().getFullYear()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
