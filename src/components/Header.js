'use client';

import { useEffect, useState } from 'react';
import NueraAI from '@/components/NueraAI';

export default function Header() {
  const [user, setUser] = useState({ username: 'Administrator', role: 'admin' });
  const [currentTheme, setCurrentTheme] = useState('golden');

  const applyTheme = (themeName) => {
    const root = document.documentElement;
    if (themeName === 'cherry') {
      root.style.setProperty('--primary', '#d1123f');
      root.style.setProperty('--primary-hover', '#b00c32');
      root.style.setProperty('--primary-light', '#fff0f3');
      root.style.setProperty('--primary-border', '#fcc2cd');
    } else if (themeName === 'navy') {
      root.style.setProperty('--primary', '#1e3a8a');
      root.style.setProperty('--primary-hover', '#172554');
      root.style.setProperty('--primary-light', '#eff6ff');
      root.style.setProperty('--primary-border', '#bfdbfe');
    } else if (themeName === 'tether') {
      root.style.setProperty('--primary', '#26a17b');
      root.style.setProperty('--primary-hover', '#1e8062');
      root.style.setProperty('--primary-light', '#f0fdf4');
      root.style.setProperty('--primary-border', '#bbf7d0');
    } else if (themeName === 'golden') {
      root.style.setProperty('--primary', '#d4af37');
      root.style.setProperty('--primary-hover', '#b89528');
      root.style.setProperty('--primary-light', '#fefce8');
      root.style.setProperty('--primary-border', '#fef08a');
    }
  };

  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem('legendin_theme') || 'golden';
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);

    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    };

    const session = getCookie('legendin_session');
    if (session) {
      try {
        const decoded = atob(session);
        const sessionData = JSON.parse(decoded);
        if (sessionData && sessionData.username && sessionData.role) {
          setUser({ username: sessionData.username, role: sessionData.role });
        }
      } catch (e) {
        setUser({ username: 'Admin User', role: 'admin' });
      }
    }
  }, []);

  const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName);
    localStorage.setItem('legendin_theme', themeName);
    applyTheme(themeName);
  };

  const handleLogout = () => {
    document.cookie = "legendin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = '/login';
  };

  const getInitials = (name) => {
    if (!name) return 'LI';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="top-header">
      <div className="page-title">LegendIn ERP</div>
      <div className="top-header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {/* Nuera AI Button */}
        <NueraAI />

        {/* Theme Switcher Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>🎨 Theme:</label>
          <select 
            value={currentTheme}
            onChange={(e) => handleThemeChange(e.target.value)}
            style={{ 
              padding: '5px 10px', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: '700', 
              border: '1px solid var(--card-border)',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              color: 'var(--text-main)',
              outline: 'none'
            }}
          >
            <option value="golden">Golden Yellow (Default)</option>
            <option value="cherry">Cherry Red</option>
            <option value="navy">Navy Blue</option>
            <option value="tether">Tether Green</option>
          </select>
        </div>

        <div className="user-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="user-avatar" style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--primary)', 
            color: '#ffffff', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontWeight: '700',
            fontSize: '13px'
          }}>
            {getInitials(user.username)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
            <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)', textTransform: 'capitalize' }}>
              {user.username}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {user.role}
            </span>
          </div>
        </div>
        <button 
          onClick={handleLogout} 
          style={{ 
            background: 'none', 
            border: '1px solid var(--card-border)', 
            padding: '6px 12px', 
            borderRadius: '6px', 
            cursor: 'pointer', 
            fontSize: '12px', 
            fontWeight: '700',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#ffffff',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.15s'
          }}
          className="logout-btn"
        >
          🚪 Logout
        </button>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .logout-btn:hover {
          background-color: var(--danger-light) !important;
          border-color: var(--danger-border) !important;
        }
      `}} />
    </header>
  );
}
