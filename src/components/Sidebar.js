'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const ALL_PAGES = [
  'ceo',
  'dashboard','clients','projects','payments','monthly-statements',
  'analytics','assets','team','amc','designing','purchase',
  'hr','hr-employees','hr-leaves','hr-attendance','hr-payroll',
  'installation', 'manufacturing'
];

const RAW_MENU = [
  { type: 'item', name: 'Dashboard',             path: '/',                   icon: '📊', key: 'dashboard' },
  { type: 'item', name: 'CEO Console',           path: '/ceo',                icon: '👑', key: 'ceo' },
  { type: 'item', name: 'Sales Pipeline',         path: '/clients',            icon: '👥', key: 'clients' },
  { type: 'item', name: '2D & 3D Designs',        path: '/designing',          icon: '🎨', key: 'designing' },
  { type: 'item', name: 'Purchase & Stock',       path: '/purchase',           icon: '🛒', key: 'purchase' },
  { type: 'item', name: 'Manufacturing & QC',     path: '/manufacturing',      icon: '🏭', key: 'manufacturing' },
  { type: 'item', name: 'Accounts & Ledgers',     path: '/payments',           icon: '💰', key: 'payments' },
  { type: 'item', name: 'Projects & Contracts',   path: '/projects',           icon: '📁', key: 'projects' },
  { type: 'item', name: 'Site Installation',      path: '/installation',       icon: '🔧', key: 'installation' },
  { type: 'item', name: 'Monthly Statements',     path: '/monthly-statements', icon: '📅', key: 'monthly-statements' },
  { type: 'item', name: 'Advanced Analytics',     path: '/analytics',          icon: '📈', key: 'analytics' },
  { type: 'item', name: 'Company Assets',         path: '/ceo?tab=assets',             icon: '🖥️', key: 'ceo' },
  { type: 'item', name: 'Team & Resources',       path: '/ceo?tab=team',               icon: '🤝', key: 'ceo' },
  { type: 'item', name: 'AMC Management',         path: '/amc',                icon: '🔄', key: 'amc' },
  // HR section
  { type: 'divider', label: 'HR & Payroll', key: '__divider_hr' },
  { type: 'item', name: 'HR Overview',            path: '/hr',                 icon: '👔', key: 'hr' },
  { type: 'item', name: 'Employees',              path: '/hr/employees',       icon: '👨‍💼', key: 'hr-employees' },
  { type: 'item', name: 'Leave Management',       path: '/hr/leaves',          icon: '🏖️', key: 'hr-leaves' },
  { type: 'item', name: 'Attendance',             path: '/hr/attendance',      icon: '✅', key: 'hr-attendance' },
  { type: 'item', name: 'Payroll',                path: '/hr/payroll',         icon: '💵', key: 'hr-payroll' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [allowedPages, setAllowedPages] = useState([]);

  useEffect(() => {
    setMounted(true);
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    };

    const session = getCookie('legendin_session');
    if (!session) { setAllowedPages([]); return; }

    try {
      const sessionData = JSON.parse(atob(session));
      // Admin always gets every page automatically
      if (sessionData?.role === 'admin') {
        setAllowedPages(ALL_PAGES);
      } else if (Array.isArray(sessionData?.allowedPages) && sessionData.allowedPages.length > 0) {
        setAllowedPages(sessionData.allowedPages);
      } else {
        setAllowedPages(ALL_PAGES);
      }
    } catch {
      setAllowedPages(ALL_PAGES);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="sidebar">
        <div className="sidebar-brand">
          LegendIn
        </div>
      </div>
    );
  }

  // Build a flat list of what to render, inserting dividers only when
  // at least one item in their section is visible.
  const renderList = [];
  let pendingDivider = null;

  for (const entry of RAW_MENU) {
    if (entry.type === 'divider') {
      pendingDivider = entry;
    } else {
      // It's a nav item
      if (allowedPages.includes(entry.key)) {
        // Flush any pending divider before this item
        if (pendingDivider) {
          renderList.push(pendingDivider);
          pendingDivider = null;
        }
        renderList.push(entry);
      }
    }
  }

  return (
    <div className="sidebar">
      <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 16px' }}>
        <img 
          src="/logo.png?v=2" 
          alt="LegendIn Logo" 
          style={{ width: '30px', height: '30px', objectFit: 'contain', borderRadius: '6px', border: '1.5px solid rgba(255,255,255,0.2)' }} 
        />
        <span>LegendIn</span>
      </div>
      <ul className="sidebar-menu" style={{ padding: 0, margin: 0, listStyle: 'none' }}>
        {renderList.map((entry) => {
          const reactKey = entry.path ? `${entry.key}-${entry.path}` : entry.key;
          if (entry.type === 'divider') {
            return (
              <li key={reactKey} style={{
                padding: '18px 16px 6px 16px',
                fontSize: '9px',
                fontWeight: '800',
                letterSpacing: '1.8px',
                color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                listStyle: 'none',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                marginTop: '6px',
                userSelect: 'none',
              }}>
                {entry.label}
              </li>
            );
          }

          // Nav item
          const isActive = entry.path === '/'
            ? pathname === '/'
            : pathname === entry.path || pathname.startsWith(entry.path + '/');

          return (
            <li key={reactKey} className={`sidebar-item ${isActive ? 'active' : ''}`}>
              <Link href={entry.path}>
                <span>{entry.icon}</span> {entry.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
