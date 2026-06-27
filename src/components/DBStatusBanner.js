'use client';

import { useState, useEffect } from 'react';

export default function DBStatusBanner() {
  const [offline, setOffline] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/db-status');
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'demo') {
            setOffline(true);
            setErrorMsg(data.error || 'Authentication failed.');
          } else {
            setOffline(false);
          }
        } else {
          setOffline(true);
          setErrorMsg('Failed to check database status.');
        }
      } catch (err) {
        setOffline(true);
        setErrorMsg('Failed to reach local server.');
      }
    }
    
    checkStatus();
    // Re-check every 15 seconds
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!offline) return null;

  return (
    <div style={{
      backgroundColor: 'var(--danger-light)',
      border: '1px solid var(--danger)',
      borderRadius: '8px',
      padding: '12px 20px',
      marginBottom: '20px',
      color: 'var(--danger)',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div>
        <strong style={{ fontSize: '14px' }}>⚠️ MongoDB Offline (Demo Mode Active)</strong>
        <p style={{ marginTop: '2px', color: '#7f1d1d' }}>
          Running in-memory Demo/Offline Mode. The connection to your MongoDB Atlas cluster failed. Please verify the <code>MONGODB_URI</code> credentials in <code>.env.local</code> to connect to your live database.
        </p>
        <span style={{ fontSize: '11px', opacity: 0.8, wordBreak: 'break-all' }}>Connection error: {errorMsg}</span>
      </div>
      <button 
        onClick={async () => {
          try {
            await fetch('/api/db-status?retry=true');
          } catch (e) {}
          window.location.reload();
        }}
        className="btn btn-sm btn-danger"
        style={{ whiteSpace: 'nowrap', backgroundColor: 'var(--danger)', border: 'none' }}
      >
        Retry Connection
      </button>
    </div>
  );
}
