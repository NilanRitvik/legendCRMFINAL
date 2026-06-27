'use client';

import { useState, useEffect } from 'react';

export default function CEOPage() {
  const [period, setPeriod] = useState('monthly');
  const [report, setReport] = useState(null);
  const [approvals, setApprovals] = useState({
    purchases: [],
    stock: [],
    hr: [],
    design: [],
    installation: [],
    manufacturing: [],
    qc: [],
    logistics: []
  });
  
  const [activeApprovalTab, setActiveApprovalTab] = useState('purchases');
  const [actionNotes, setActionNotes] = useState({}); // id -> string
  const [loadingReport, setLoadingReport] = useState(true);
  const [loadingApprovals, setLoadingApprovals] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  // --- EXECUTIVE DASHBOARD ROADMAP AND MODALS ---
  const [selectedBreakup, setSelectedBreakup] = useState(null); // breakup metric name
  const [metrics, setMetrics] = useState(null); // dashboard detailed data
  const [roadmapClientId, setRoadmapClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [roadmapData, setRoadmapData] = useState(null);
  const [roadmapSearch, setRoadmapSearch] = useState('');
  const [allClientsList, setAllClientsList] = useState([]);
  const [allProjectsList, setAllProjectsList] = useState([]);
  const [smartAnalysis, setSmartAnalysis] = useState(null);
  const [wakeUpOpen, setWakeUpOpen] = useState(false);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [selectedApprovalDetail, setSelectedApprovalDetail] = useState(null); // Detail modal for approval

  // --- WAKE UP ROADMAP TRACKER ---
  const [wakeUpSearch, setWakeUpSearch] = useState('');
  const [wakeUpSelectedProjectId, setWakeUpSelectedProjectId] = useState('');
  const [wakeUpRoadmapData, setWakeUpRoadmapData] = useState(null);
  const [wakeUpLoadingRoadmap, setWakeUpLoadingRoadmap] = useState(false);
  const [wakeUpInspectStage, setWakeUpInspectStage] = useState(null);
  const [wakeUpTab, setWakeUpTab] = useState('roadmap'); // 'roadmap' | 'approvals'
  const [stagePopup, setStagePopup] = useState(null); // {stage, index, prevDate}

  // --- NEW INTEGRATED TABS & PARAMETERS FOR CEO CONSOLE ---
  const [activeConsoleTab, setActiveConsoleTab] = useState('executive'); // executive | reminders | cashflow | expenses | team | assets
  const [cashflowSearchQuery, setCashflowSearchQuery] = useState('');
  const [expensesSearchQuery, setExpensesSearchQuery] = useState('');

  // --- STATE FOR TEAM TAB ---
  const [team, setTeam] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [newMember, setNewMember] = useState({ name: '', role: '', monthly_cost: '', resource_type: 'fulltime' });
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [teamActiveSubTab, setTeamActiveSubTab] = useState('resources'); // resources | logins
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'viewer' });
  const [selectedPages, setSelectedPages] = useState(['dashboard']);

  // --- STATE FOR ASSETS TAB ---
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsSearchQuery, setAssetsSearchQuery] = useState('');
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'hardware',
    purchase_value: '',
    purchase_date: '',
    depreciation_rate: '20'
  });

  // --- STATE FOR PAYMENT REMINDER CONSOLE ---
  const [reminderSearch, setReminderSearch] = useState('');
  const [reminderFilter, setReminderFilter] = useState('all'); // all | overdue
  const [customReminderTemplate, setCustomReminderTemplate] = useState(
    `*LEGEND INTERIORS PAYMENT NOTICE*\n\nDear Client,\n\nThis is a friendly reminder regarding the outstanding balance for your interior designing project: *{projectName}*.\n\n*Statement Status as of {todayDate}:*\n- *Total Project Value:* ₹{projectValue}\n- *Total Paid Amount:* ₹{paidAmount}\n- *Outstanding Due:* ₹{outstandingDue}\n- *Expected Due Date:* {dueDate}\n\nPlease arrange for the transfer at your earliest convenience. Thank you.\n\n_Legend Interiors — Premium Interior Designers_\n+91 95975 33099 | legendinteriorudumalpet@gmail.com`
  );
  const [customEmailTemplate, setCustomEmailTemplate] = useState(
    `Dear Client,\n\nWe hope this email finds you well.\n\nThis is a notification regarding the outstanding balance on your project: {projectName}.\n\nFinancial Breakdown:\n- Contract Value: ₹{projectValue}\n- Paid Amount: ₹{paidAmount}\n- Remaining Balance: ₹{outstandingDue}\n- Expected Due Date: {dueDate}\n\nPlease transfer the outstanding amount to our bank account at your earliest convenience.\n\nThank you,\nLegend Interiors Support Team\n+91 95975 33099\nlegendinteriorudumalpet@gmail.com`
  );

  const handleCloseWakeUp = () => {
    setWakeUpOpen(false);
    setWakeUpSearch('');
    setWakeUpSelectedProjectId('');
    setWakeUpRoadmapData(null);
    setWakeUpInspectStage(null);
    setWakeUpTab('roadmap');
    setStagePopup(null);
  };

  const fetchReport = async () => {
    try {
      setLoadingReport(true);
      const res = await fetch(`/api/ceo/report?period=${period}`);
      const data = await res.json();
      if (!data.error) {
        setReport(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReport(false);
    }
  };

  const fetchApprovals = async () => {
    try {
      setLoadingApprovals(true);
      const res = await fetch('/api/ceo/approvals');
      const data = await res.json();
      if (!data.error) {
        setApprovals(data);
        
        // Auto-focus first tab that has items if current is empty
        const keys = ['purchases', 'stock', 'hr', 'design', 'installation', 'manufacturing', 'qc', 'logistics'];
        if (data[activeApprovalTab]?.length === 0) {
          const nextPopulated = keys.find(k => data[k] && data[k].length > 0);
          if (nextPopulated) setActiveApprovalTab(nextPopulated);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingApprovals(false);
    }
  };

  // Fetch all dashboard metrics (for card click breakup details and payment reminders)
  const fetchDashboardMetrics = async () => {
    try {
      const res = await fetch('/api/dashboard?filter=12months');
      const data = await res.json();
      if (!data.error) {
        setMetrics(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch roadmap clients list and general smart analysis on mount
  const fetchRoadmapAndAnalysis = async () => {
    try {
      const res = await fetch('/api/ceo/roadmap');
      const data = await res.json();
      if (!data.error) {
        setAllClientsList(data.clients || []);
        setAllProjectsList(data.projectsList || []);
        setSmartAnalysis(data.smartAnalysis || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch roadmap data for a specific client or project
  const fetchClientRoadmap = async (clientId, projectId = '') => {
    if (!clientId && !projectId) {
      setRoadmapData(null);
      return;
    }
    try {
      setLoadingRoadmap(true);
      const query = projectId ? `project=${projectId}` : `client=${clientId}`;
      const res = await fetch(`/api/ceo/roadmap?${query}`);
      const data = await res.json();
      if (!data.error && data.clientRoadmap) {
        setRoadmapData(data.clientRoadmap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRoadmap(false);
    }
  };

  // Fetch roadmap for Wake Up analyzer modal
  const fetchWakeUpRoadmap = async (clientId, projectId = '') => {
    if (!clientId && !projectId) {
      setWakeUpRoadmapData(null);
      return;
    }
    try {
      setWakeUpLoadingRoadmap(true);
      const query = projectId ? `project=${projectId}` : `client=${clientId}`;
      const res = await fetch(`/api/ceo/roadmap?${query}`);
      const data = await res.json();
      if (!data.error && data.clientRoadmap) {
        setWakeUpRoadmapData(data.clientRoadmap);
        // Default inspected stage to the latest active stage
        const stages = data.clientRoadmap.stages || [];
        const activeIdx = stages.findIndex(s => s.status === 'in_progress');
        if (activeIdx !== -1) {
          setWakeUpInspectStage(activeIdx);
        } else {
          const lastCompleted = [...stages].reverse().findIndex(s => s.status === 'completed');
          if (lastCompleted !== -1) {
            setWakeUpInspectStage(stages.length - 1 - lastCompleted);
          } else {
            setWakeUpInspectStage(0);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWakeUpLoadingRoadmap(false);
    }
  };

  // --- TABS DATA FETCHERS ---
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTeamData = async () => {
    try {
      setTeamLoading(true);
      const [resTeam, resProj] = await Promise.all([
        fetch('/api/team').then(r => r.json()),
        fetch('/api/projects').then(r => r.json())
      ]);
      setTeam(resTeam);
      setProjects(resProj);
      
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
      };
      const session = getCookie('legendin_session');
      if (session) {
        try {
          const decoded = JSON.parse(atob(session));
          if (decoded.role === 'admin') {
            await fetchUsers();
          }
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTeamLoading(false);
    }
  };

  const fetchAssetsData = async () => {
    try {
      setAssetsLoading(true);
      const res = await fetch('/api/assets');
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAssetsLoading(false);
    }
  };

  // Load executive summaries on mount
  useEffect(() => {
    fetchReport();
    fetchApprovals();
    fetchDashboardMetrics();
    fetchRoadmapAndAnalysis();

    // Decode session details
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    };
    const session = getCookie('legendin_session');
    if (session) {
      try {
        const decoded = JSON.parse(atob(session));
        setCurrentUser(decoded);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Fetch relevant tab data on console tab change
  useEffect(() => {
    if (activeConsoleTab === 'team') {
      fetchTeamData();
    } else if (activeConsoleTab === 'assets') {
      fetchAssetsData();
    }
  }, [activeConsoleTab]);

  // Read tab parameter from URL query string
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['executive', 'reminders', 'team', 'assets'].includes(tab)) {
        setActiveConsoleTab(tab);
      }
    }
  }, []);

  const handleApprovalAction = async (module, id, status) => {
    const notes = actionNotes[id] || '';
    if (status === 'rejected' && !notes.trim()) {
      return alert('Please enter feedback/notes explaining the rejection.');
    }

    try {
      setActioningId(id);
      const res = await fetch('/api/ceo/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, id, status, notes })
      });
      const data = await res.json();

      if (res.ok) {
        // Clear notes
        setActionNotes(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        alert(`Request successfully ${status}!`);
        // Refresh everything
        await Promise.all([fetchReport(), fetchApprovals(), fetchRoadmapAndAnalysis()]);
        setSelectedApprovalDetail(null);
      } else {
        alert(data.error || 'Failed to process approval action');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating approval status');
    } finally {
      setActioningId(null);
    }
  };

  const handleNotesChange = (id, val) => {
    setActionNotes(prev => ({
      ...prev,
      [id]: val
    }));
  };

  // Standard WhatsApp reminder trigger (uses default template)
  const handleSendWhatsAppReminder = (r) => {
    let phone = r.clientPhone || '';
    if (!phone) {
      phone = window.prompt("Client phone number is missing. Please enter phone number (including country code, e.g. +919597533099):");
      if (!phone) return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const dateStr = new Date().toLocaleDateString('en-IN');
    const dueStr = r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-IN') : 'N/A';
    
    const msg = `*LEGEND INTERIORS PAYMENT NOTICE*\n\nDear Client,\n\nThis is a friendly reminder regarding the outstanding balance for your interior designing project: *${r.name}*.\n\n*Statement Status as of (${dateStr}):*\n- *Total Project Value:* ₹${r.value.toLocaleString()}\n- *Total Paid Amount:* ₹${r.paid.toLocaleString()}\n- *Outstanding Due:* ₹${r.remaining.toLocaleString()}\n- *Expected Due Date:* ${dueStr}\n\nPlease arrange for the transfer at your earliest convenience. Thank you.\n\n_Legend Interiors — Premium Interior Designers_\n+91 95975 33099 | legendinteriorudumalpet@gmail.com`;
    
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Standard Email Reminder trigger (uses default body)
  const handleSendEmailReminder = (r) => {
    const email = r.clientEmail || '';
    if (!email) {
      alert("No email address configured for this client.");
      return;
    }
    const subject = encodeURIComponent("Payment Reminder: Legend Interiors Project Balance");
    const body = encodeURIComponent(`Dear Client,\n\nWe hope this email finds you well.\n\nThis is a notification regarding the outstanding balance on your project: ${r.name}.\n\nFinancial Breakdown:\n- Contract Value: ₹${r.value.toLocaleString()}\n- Paid Amount: ₹${r.paid.toLocaleString()}\n- Remaining Balance: ₹${r.remaining.toLocaleString()}\n- Expected Due Date: ${r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-IN') : 'N/A'}\n\nPlease transfer the outstanding amount to our bank account.\n\nThank you,\nLegend Interiors Support Team\n+91 95975 33099\nlegendinteriorudumalpet@gmail.com`);
    
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  // Customized Template Token Replacer
  const getFormattedMessage = (template, r) => {
    const todayStr = new Date().toLocaleDateString('en-IN');
    const dueStr = r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-IN') : 'N/A';
    return template
      .replace(/{projectName}/g, r.name || '')
      .replace(/{clientCompany}/g, r.clientCompany || '')
      .replace(/{todayDate}/g, todayStr)
      .replace(/{projectValue}/g, (r.value || 0).toLocaleString('en-IN'))
      .replace(/{paidAmount}/g, (r.paid || 0).toLocaleString('en-IN'))
      .replace(/{outstandingDue}/g, (r.remaining || 0).toLocaleString('en-IN'))
      .replace(/{dueDate}/g, dueStr);
  };

  const handleSendCustomWhatsAppReminder = (r) => {
    let phone = r.clientPhone || '';
    if (!phone) {
      phone = window.prompt("Client phone number is missing. Please enter phone number (including country code, e.g. +919597533099):");
      if (!phone) return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const msg = getFormattedMessage(customReminderTemplate, r);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleSendCustomEmailReminder = (r) => {
    const email = r.clientEmail || '';
    if (!email) {
      alert("No email address configured for this client.");
      return;
    }
    const subject = encodeURIComponent("Payment Reminder: Legend Interiors Project Balance");
    const body = encodeURIComponent(getFormattedMessage(customEmailTemplate, r));
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  // CSV Report Exporter
  const handleExportCSV = () => {
    if (!report) return;
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'LEGEND INTERIORS - CEO EXECUTIVE COMMAND REPORT\n';
    csv += `Generated Date: ${new Date().toLocaleDateString('en-IN')}\n`;
    csv += `Selected Periodicity: ${period.toUpperCase()}\n\n`;

    csv += 'EXECUTIVE SUMMARY\n';
    csv += `Gross Booked Revenue,₹${stats.totalRevenue}\n`;
    csv += `Total Inflows Received,₹${stats.totalReceived}\n`;
    csv += `Outstanding Receivables,₹${stats.totalOutstanding}\n`;
    csv += `Logged Business Expenses,₹${stats.totalExpenses}\n`;
    csv += `Estimated Stock Valuation,₹${stats.totalStockWorth}\n\n`;

    csv += 'SALES CONVERSION METRICS\n';
    csv += `Active Leads,${stats.totalLeads}\n`;
    csv += `Quotations Sent,${stats.totalQuotations}\n`;
    csv += `Projects Won,${stats.projectsWon}\n`;
    csv += `Deals Lost,${stats.projectsLost}\n\n`;

    if (smartAnalysis) {
      csv += 'SMART ROADMAP INSIGHTS\n';
      smartAnalysis.insights.forEach((ins, idx) => {
        csv += `${idx + 1},"${ins.replace(/"/g, '""')}"\n`;
      });
    }

    const encoded = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `legend_interiors_ceo_report_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- ACTIONS FOR TEAM & USERS PERMS ---
  const handleCreateMember = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMember,
          monthly_cost: Number(newMember.monthly_cost)
        })
      });
      if (res.ok) {
        setNewMember({ name: '', role: '', monthly_cost: '', resource_type: 'fulltime' });
        fetchTeamData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this team member? All project allocations for this member will be unassigned.')) return;
    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTeamData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          role: newUser.role,
          allowedPages: selectedPages
        })
      });
      if (res.ok) {
        setNewUser({ username: '', password: '', role: 'viewer' });
        setSelectedPages(['dashboard']);
        fetchUsers();
        alert('User login created successfully!');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (currentUser && currentUser.username === username.toLowerCase()) {
      alert('You cannot delete your own logged-in user account!');
      return;
    }
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchUsers();
      } else {
        alert('Failed to delete user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getMemberAllocations = (memberId) => {
    const list = [];
    projects.forEach(proj => {
      if (proj.team && Array.isArray(proj.team)) {
        proj.team.forEach(alloc => {
          if (alloc.member && alloc.member._id === memberId) {
            list.push({
              projectId: proj._id,
              projectName: proj.name,
              allocation: alloc.allocation
            });
          }
        });
      }
    });
    return list;
  };

  // --- ACTIONS FOR ASSETS ---
  const handleCreateAsset = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAsset.name,
          category: newAsset.category,
          purchase_value: Number(newAsset.purchase_value),
          purchase_date: newAsset.purchase_date,
          depreciation_rate: Number(newAsset.depreciation_rate)
        })
      });
      if (res.ok) {
        setNewAsset({
          name: '',
          category: 'hardware',
          purchase_value: '',
          purchase_date: '',
          depreciation_rate: '20'
        });
        fetchAssetsData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!confirm('Are you sure you want to delete this asset? This will also delete the associated expense record.')) return;
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAssetsData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const calculateCurrentValue = (purchaseValue, purchaseDate, depreciationRate) => {
    const yearsPassed = (new Date() - new Date(purchaseDate)) / (1000 * 60 * 60 * 24 * 365.25);
    const accumulatedDepreciation = purchaseValue * (depreciationRate / 100) * Math.max(0, yearsPassed);
    return Math.max(0, purchaseValue - accumulatedDepreciation);
  };

  // --- RENDER FINANCIAL CHART ---
  const renderFinancialChart = () => {
    if (!report || !report.chart || !report.chart.labels || report.chart.labels.length === 0) {
      return <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}>No data points available</div>;
    }

    const { labels, financials } = report.chart;
    
    const maxVal = Math.max(
      100000, 
      ...financials.map(f => Math.max(f.revenue, f.received, f.expenses))
    ) * 1.1;

    const width = 640;
    const height = 240;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    const barGroupWidth = plotWidth / labels.length;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', minHeight: '220px' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = paddingTop + plotHeight * (1 - ratio);
          const val = maxVal * ratio;
          return (
            <g key={idx}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeDasharray="3 3" />
              <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fontSize="9" fontWeight="700" fill="var(--text-muted)">
                ₹{val >= 10000000 ? `${(val/10000000).toFixed(1)}Cr` : val >= 100000 ? `${(val/100000).toFixed(1)}L` : val >= 1000 ? `${(val/1000).toFixed(0)}k` : val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {financials.map((f, i) => {
          const xCenter = paddingLeft + barGroupWidth * i + barGroupWidth / 2;
          const groupPadding = barGroupWidth * 0.15;
          const usableWidth = barGroupWidth - groupPadding * 2;
          const barWidth = usableWidth / 3;

          const revHeight = (f.revenue / maxVal) * plotHeight;
          const recHeight = (f.received / maxVal) * plotHeight;
          const expHeight = (f.expenses / maxVal) * plotHeight;

          const revY = paddingTop + plotHeight - revHeight;
          const recY = paddingTop + plotHeight - recHeight;
          const expY = paddingTop + plotHeight - expHeight;

          const xStart = paddingLeft + barGroupWidth * i + groupPadding;

          return (
            <g key={i}>
              <rect x={xStart} y={revY} width={barWidth - 2} height={Math.max(2, revHeight)} fill="var(--primary)" rx="2" style={{ cursor: 'pointer' }}>
                <title>Revenue: ₹{f.revenue.toLocaleString()}</title>
              </rect>

              <rect x={xStart + barWidth} y={recY} width={barWidth - 2} height={Math.max(2, recHeight)} fill="#10b981" rx="2" style={{ cursor: 'pointer' }}>
                <title>Received: ₹{f.received.toLocaleString()}</title>
              </rect>

              <rect x={xStart + barWidth * 2} y={expY} width={barWidth - 2} height={Math.max(2, expHeight)} fill="#ef4444" rx="2" style={{ cursor: 'pointer' }}>
                <title>Expenses: ₹{f.expenses.toLocaleString()}</title>
              </rect>

              <text x={xCenter} y={height - paddingBottom + 16} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--text-muted)">
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // --- RENDER SALES CHART ---
  const renderSalesChart = () => {
    if (!report || !report.chart || !report.chart.labels || report.chart.labels.length === 0) {
      return <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}>No data points available</div>;
    }

    const { labels, sales } = report.chart;
    
    const maxVal = Math.max(5, ...sales.map(s => Math.max(s.leads, s.quotations, s.won, s.lost))) + 1;

    const width = 640;
    const height = 240;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    const stepX = plotWidth / (labels.length - 1 || 1);

    const getPath = (key) => {
      const points = sales.map((s, idx) => {
        const x = paddingLeft + stepX * idx;
        const ratio = s[key] / maxVal;
        const y = paddingTop + plotHeight * (1 - ratio);
        return { x, y };
      });
      if (points.length === 0) return '';
      return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    };

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', minHeight: '220px' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = paddingTop + plotHeight * (1 - ratio);
          return (
            <g key={idx}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
              <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fontSize="9" fontWeight="700" fill="var(--text-muted)">
                {Math.round(maxVal * ratio)}
              </text>
            </g>
          );
        })}

        <path d={getPath('leads')} fill="none" stroke="var(--primary)" strokeWidth="2.5" />
        <path d={getPath('quotations')} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
        <path d={getPath('won')} fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="3 3" />
        <path d={getPath('lost')} fill="none" stroke="#ef4444" strokeWidth="2.5" />

        {labels.map((l, idx) => {
          const x = paddingLeft + stepX * idx;
          return (
            <text key={idx} x={x} y={height - paddingBottom + 16} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--text-muted)">
              {l}
            </text>
          );
        })}
      </svg>
    );
  };

  const getActiveList = () => {
    return approvals[activeApprovalTab] || [];
  };

  const stats = report?.summary || {
    totalLeads: 0, totalQuotations: 0, projectsWon: 0, projectsLost: 0,
    totalRevenue: 0, totalOutstanding: 0, totalReceived: 0, totalExpenses: 0, totalStockWorth: 0
  };

  // --- DETAIL POPUP FOR KPI CARDS ---
  const renderBreakupModal = () => {
    if (!metrics) return null;

    let title = '';
    let headers = [];
    let rows = [];

    if (selectedBreakup === 'projects' || selectedBreakup === 'won') {
      title = 'Interior Projects Directory';
      headers = ['Project Name', 'Client Company', 'Type', 'Status', 'Contract Value', 'Start Date'];
      rows = (metrics.detailedProjects || []).map(p => ({
        col1: p.name,
        col2: p.client ? p.client.company : 'N/A',
        col3: p.type === 'new' ? 'New Development' : 'Rework',
        col4: <span className={`badge badge-${p.status}`}>{p.status.replace('_', ' ')}</span>,
        col5: `₹${p.value.toLocaleString()}`,
        col6: p.start_date ? new Date(p.start_date).toLocaleDateString('en-IN') : 'N/A'
      }));
    } else if (selectedBreakup === 'revenue' || selectedBreakup === 'inflow') {
      title = 'Gross Revenue Inflows Breakdown';
      headers = ['Date', 'Invoice No', 'Project Name', 'Client Company', 'Payment Method', 'Bank/Wallet', 'Category', 'Amount'];
      rows = (metrics.detailedPayments || []).map(p => ({
        col1: new Date(p.payment_date).toLocaleDateString('en-IN'),
        col2: p.invoice ? p.invoice.invoice_number : 'Direct Link',
        col3: p.project ? p.project.name : 'N/A',
        col4: p.project && p.project.client ? p.project.client.company : 'N/A',
        col5: p.method,
        col6: p.bank_account_received || 'N/A',
        col7: <span className="badge badge-paid" style={{ fontSize: '10px' }}>{p.category}</span>,
        col8: <strong style={{ color: 'var(--success)' }}>+₹{p.amount.toLocaleString()}</strong>
      }));
    } else if (selectedBreakup === 'expenses') {
      title = 'Business Outflow Expenses Log';
      headers = ['Date', 'Category', 'Description', 'Linked Project', 'Amount'];
      rows = (metrics.detailedExpenses || []).map(e => ({
        col1: new Date(e.expense_date).toLocaleDateString('en-IN'),
        col2: <span className="funnel-card-source" style={{ textTransform: 'uppercase', fontSize: '9px' }}>{e.category.replace('_', ' ')}</span>,
        col3: e.description || 'General Expense',
        col4: e.project ? e.project.name : 'N/A',
        col5: <strong style={{ color: 'var(--danger)' }}>-₹{e.amount.toLocaleString()}</strong>
      }));
    } else if (selectedBreakup === 'receivables' || selectedBreakup === 'outstanding') {
      title = 'Outstanding Client Receivables (Active Debtors)';
      headers = ['Project Name', 'Client Company', 'Contract Value', 'Paid Amount', 'Remaining Outstanding', 'Actions'];
      rows = (metrics.detailedReceivables || []).map(r => ({
        col1: r.name,
        col2: r.clientCompany,
        col3: `₹${r.value.toLocaleString()}`,
        col4: `₹${r.paid.toLocaleString()}`,
        col5: <strong style={{ color: 'var(--primary)' }}>₹{r.remaining.toLocaleString()}</strong>,
        col6: (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-sm btn-primary" onClick={() => handleSendWhatsAppReminder(r)}>💬 WhatsApp</button>
            <button className="btn btn-sm btn-secondary" onClick={() => handleSendEmailReminder(r)}>✉️ Email</button>
          </div>
        )
      }));
    } else if (selectedBreakup === 'stock') {
      title = 'Material Stock Worth Valuation';
      headers = ['Material Name', 'Current Stock', 'Unit', 'Avg Purchase Rate', 'Total Valuation'];
      rows = (metrics.stockDetails || []).map(s => ({
        col1: s.name,
        col2: s.current_stock,
        col3: s.unit,
        col4: `₹${(s.avgRate || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        col5: <strong style={{ color: 'var(--primary)' }}>₹{(s.worth || 0).toLocaleString()}</strong>
      }));
    } else if (selectedBreakup === 'leads') {
      title = 'Sales Leads & Inquiries Pipeline';
      headers = ['Client Name', 'Company Name', 'Contact Info', 'Lead Source', 'Stage Status', 'Estimated Worth'];
      rows = (allClientsList || []).filter(c => c.stage === 'lead' || c.stage === 'prospect').map(c => ({
        col1: c.name,
        col2: c.company,
        col3: `${c.phone || ''} / ${c.email || ''}`,
        col4: c.source,
        col5: <span className={`badge badge-${c.stage}`}>{c.stage}</span>,
        col6: `₹${(c.approx_value || 0).toLocaleString()}`
      }));
    } else if (selectedBreakup === 'quotes' || selectedBreakup === 'totalQuotations') {
      title = 'Quotations Sent Log';
      headers = ['Client Company', 'Quoted Value', 'Date Sent', 'Status'];
      rows = (allClientsList || []).map(c => ({
        col1: c.company,
        col2: `₹${(c.approx_value || 0).toLocaleString()}`,
        col3: new Date(c.createdAt).toLocaleDateString('en-IN'),
        col4: <span className={`badge badge-${c.stage}`}>{c.stage}</span>
      }));
    } else if (selectedBreakup === 'lost') {
      title = 'Deals Lost Details';
      headers = ['Client Name', 'Company', 'Source', 'Lost Reason', 'Estimated Loss'];
      rows = (allClientsList || []).filter(c => c.stage === 'lost').map(c => ({
        col1: c.name,
        col2: c.company,
        col3: c.source,
        col4: c.lost_reason || 'Quotation rejected by client.',
        col5: <strong style={{ color: 'var(--danger)' }}>₹${(c.approx_value || 0).toLocaleString()}</strong>
      }));
    }

    return (
      <div className="modal-backdrop" style={{ zIndex: 1100 }}>
        <div className="modal-content" style={{ maxWidth: '850px', maxHeight: '85vh', overflowY: 'auto' }}>
          <div className="modal-header">
            <div>
              <h3 className="modal-title">{title}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Showing detailed indicators for executive review
              </p>
            </div>
            <button type="button" className="modal-close" onClick={() => setSelectedBreakup(null)}>×</button>
          </div>

          <div className="table-container" style={{ marginTop: '16px' }}>
            <table className="table-list" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  {headers.map((h, i) => <th key={i}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {Object.keys(row).map((k, idx) => <td key={idx}>{row[k]}</td>)}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={headers.length} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedBreakup(null)}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  // Filter projects based on roadmap search dropdown input
  const filteredProjects = allProjectsList.filter(proj => {
    const term = roadmapSearch.toLowerCase();
    const matchName = proj.name?.toLowerCase().includes(term);
    const matchCompany = proj.company?.toLowerCase().includes(term);
    const matchClient = proj.clientName?.toLowerCase().includes(term);
    const matchPhone = proj.phone?.toLowerCase().includes(term);
    const matchInvoice = proj.invoices?.some(inv => inv.toLowerCase().includes(term));
    return matchName || matchCompany || matchClient || matchPhone || matchInvoice;
  });

  // Filter projects for the Wake Up analyzer modal
  const filteredProjectsWakeUp = allProjectsList.filter(proj => {
    const term = wakeUpSearch.toLowerCase();
    const matchName = proj.name?.toLowerCase().includes(term);
    const matchCompany = proj.company?.toLowerCase().includes(term);
    const matchClient = proj.clientName?.toLowerCase().includes(term);
    const matchPhone = proj.phone?.toLowerCase().includes(term);
    const matchInvoice = proj.invoices?.some(inv => inv.toLowerCase().includes(term));
    return matchName || matchCompany || matchClient || matchPhone || matchInvoice;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 1; box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6); }
          70% { transform: scale(1.1); opacity: 0.5; box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
          100% { transform: scale(0.95); opacity: 0; box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popup-in {
          from { opacity: 0; transform: scale(0.88) translateY(24px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes nuera-scan {
          0%, 100% { opacity: 1; transform: scaleX(1); }
          50% { opacity: 0.5; transform: scaleX(0.6); }
        }
        @keyframes nuera-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes tab-slide {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes finance-card-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pulse-glow {
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .stage-card-anim {
          animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .stage-popup-anim {
          animation: popup-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .tab-content-anim {
          animation: tab-slide 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .finance-card-anim {
          animation: finance-card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .nuera-dot { display: inline-block; animation: nuera-dot 1.4s ease-in-out infinite; }
        .nuera-dot:nth-child(2) { animation-delay: 0.2s; }
        .nuera-dot:nth-child(3) { animation-delay: 0.4s; }
        .wakeup-tab-btn {
          padding: 8px 20px;
          border: none;
          border-radius: 8px 8px 0 0;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: var(--text-muted);
          border-bottom: 2px solid transparent;
        }
        .wakeup-tab-btn.active {
          background: white;
          color: var(--primary);
          border-bottom: 2px solid var(--primary);
          box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
        }
        .wakeup-tab-btn:hover:not(.active) {
          background: rgba(0,0,0,0.03);
          color: var(--text-main);
        }
        .stage-node:hover > div:first-child {
          transform: scale(1.15) !important;
          box-shadow: 0 0 12px rgba(59,130,246,0.4) !important;
        }
      `}</style>
      
      {/* Header and Period Filter */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '4px' }}>👑 CEO Executive Command Console</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Corporate checkpoints, department approvals feed, and periodic consolidated financials.</div>
        </div>
        
        {/* Actions panel */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn btn-primary"
            onClick={() => setWakeUpOpen(true)}
            style={{ 
              background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', 
              boxShadow: '0 4px 15px rgba(225, 29, 72, 0.4)',
              fontWeight: '900',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ⚡ Wake Up Analyzer
          </button>

          <button className="btn btn-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            📥 Export Excel
          </button>
          
          <button className="btn btn-secondary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            🖨️ Print PDF
          </button>

          {/* Period Selector Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--card-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            {[{ k: 'monthly', l: 'Monthly' }, { k: 'quarterly', l: 'Quarterly' }, { k: 'half_yearly', l: 'Half-Yearly' }, { k: 'yearly', l: 'Yearly' }].map(p => (
              <button
                key={p.k}
                onClick={() => setPeriod(p.k)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  background: period === p.k ? 'var(--primary)' : 'transparent',
                  color: period === p.k ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s'
                }}
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CEO Console Core Tab Switcher */}
      <div className="no-print" style={{ 
        display: 'flex', 
        gap: '12px', 
        borderBottom: '2px solid var(--card-border)', 
        paddingBottom: '0', 
        marginBottom: '4px',
        marginTop: '10px'
      }}>
        {[
          { id: 'executive', name: '👑 Executive Overview' },
          { id: 'reminders', name: '💰 Payment Reminders' },
          { id: 'cashflow', name: '📈 Cash Flow Ledger' },
          { id: 'expenses', name: '📉 Expenses Book' },
          { id: 'team', name: '🤝 Team & Logins' },
          { id: 'assets', name: '🖥️ Company Assets' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveConsoleTab(tab.id)}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '800',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeConsoleTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeConsoleTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* PRINT-ONLY HEADER */}
      <div style={{ display: 'none' }} className="visible-print">
        <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#000', marginBottom: '4px' }}>LEGEND INTERIORS</h1>
        <div style={{ fontSize: '12px', color: '#555', marginBottom: '20px' }}>
          No 13/113 A, Palani Road, Palappampatti, Udumalpet - 642 128.<br />
          GST: 33DFSPB1768C1ZL | Phone: +91 95975 33099<br />
          <strong>Consolidated Financials Report - Period: {period.toUpperCase()}</strong>
        </div>
      </div>

      {/* ============ TAB: EXECUTIVE OVERVIEW ============ */}
      {activeConsoleTab === 'executive' && (
        <div className="tab-content-anim" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* KPI grids */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            
            {/* Financial metrics block */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.5px' }}>📈 Periodic Financial Metrics</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div 
                  onClick={() => setSelectedBreakup('revenue')}
                  style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Click to view Project Revenue Inflow details"
                >
                  <div style={{ fontSize: '10px', color: '#b89528', fontWeight: '700', textTransform: 'uppercase' }}>Gross Revenue</div>
                  <div style={{ fontSize: '17px', fontWeight: '900', color: '#854d0e', marginTop: '4px' }}>₹{stats.totalRevenue.toLocaleString()}</div>
                </div>
                
                <div 
                  onClick={() => setSelectedBreakup('inflow')}
                  style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Click to view Inflows Received details"
                >
                  <div style={{ fontSize: '10px', color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>Inflows Received</div>
                  <div style={{ fontSize: '17px', fontWeight: '900', color: '#065f46', marginTop: '4px' }}>₹{stats.totalReceived.toLocaleString()}</div>
                </div>

                <div 
                  onClick={() => setSelectedBreakup('outstanding')}
                  style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Click to view Outstanding Receivables"
                >
                  <div style={{ fontSize: '10px', color: '#e11d48', fontWeight: '700', textTransform: 'uppercase' }}>Outstanding Due</div>
                  <div style={{ fontSize: '17px', fontWeight: '900', color: '#9f1239', marginTop: '4px' }}>₹{stats.totalOutstanding.toLocaleString()}</div>
                </div>

                <div 
                  onClick={() => setSelectedBreakup('expenses')}
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Click to view Business Expenses details"
                >
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Expenses</div>
                  <div style={{ fontSize: '17px', fontWeight: '900', color: '#334155', marginTop: '4px' }}>₹{stats.totalExpenses.toLocaleString()}</div>
                </div>

                <div 
                  onClick={() => setSelectedBreakup('stock')}
                  style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Click to view Stock Available details"
                >
                  <div style={{ fontSize: '10px', color: '#1e40af', fontWeight: '700', textTransform: 'uppercase' }}>Stock Available</div>
                  <div style={{ fontSize: '17px', fontWeight: '900', color: '#1e3a8a', marginTop: '4px' }}>₹{(stats.totalStockWorth || 0).toLocaleString()}</div>
                </div>
              </div>

              <div style={{ height: '240px', position: 'relative' }}>
                {loadingReport ? (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)' }}>Aggregating Ledger...</div>
                ) : renderFinancialChart()}
              </div>
              
              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '10px', fontSize: '10px', fontWeight: '800' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span> Revenue</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Inflow</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> Expenses</span>
              </div>
            </div>

            {/* Sales metrics block */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.5px' }}>👥 CRM Sales Conversion</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div 
                  onClick={() => setSelectedBreakup('leads')}
                  style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Click to view Leads breakup"
                >
                  <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: '700', textTransform: 'uppercase' }}>Active Leads</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e40af', marginTop: '4px' }}>{stats.totalLeads}</div>
                </div>

                <div 
                  onClick={() => setSelectedBreakup('quotes')}
                  style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Click to view Quotations sent"
                >
                  <div style={{ fontSize: '11px', color: '#6d28d9', fontWeight: '700', textTransform: 'uppercase' }}>Quotations Sent</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#5b21b6', marginTop: '4px' }}>{stats.totalQuotations}</div>
                </div>

                <div 
                  onClick={() => setSelectedBreakup('projects')}
                  style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Click to view Projects won"
                >
                  <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '700', textTransform: 'uppercase' }}>Projects Won</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#166534', marginTop: '4px' }}>{stats.projectsWon}</div>
                </div>

                <div 
                  onClick={() => setSelectedBreakup('lost')}
                  style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Click to view Deals lost"
                >
                  <div style={{ fontSize: '11px', color: '#c2410c', fontWeight: '700', textTransform: 'uppercase' }}>Deals Lost</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#9a3412', marginTop: '4px' }}>{stats.projectsLost}</div>
                </div>
              </div>

              <div style={{ height: '240px', position: 'relative' }}>
                {loadingReport ? (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)' }}>Computing Pipeline...</div>
                ) : renderSalesChart()}
              </div>

              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '10px', fontSize: '10px', fontWeight: '800' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span> Leads</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span> Quotes</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Won</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> Lost</span>
              </div>
            </div>

          </div>

          {/* --- SMART ROADMAP PROJECT TRACKER --- */}
          <div className="panel no-print" style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid var(--card-border)', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔍 Project Work Status Roadmap Tracker
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Select any interior design project by project name, client phone, or invoice number to visually track their complete operational and financial roadmap.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', position: 'relative' }}>
              <div style={{ position: 'relative', width: '320px' }}>
                <input
                  type="text"
                  placeholder="Search by Project, Phone, Invoice..."
                  value={roadmapSearch}
                  onChange={(e) => {
                    setRoadmapSearch(e.target.value);
                    setSelectedProjectId(''); // Clear selected
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#fff'
                  }}
                />
                {roadmapSearch && !selectedProjectId && filteredProjects.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '42px',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 10,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {filteredProjects.map(proj => (
                      <div
                        key={proj._id}
                        onClick={() => {
                          setSelectedProjectId(proj._id);
                          setRoadmapSearch(`${proj.name} (${proj.company})`);
                          fetchClientRoadmap('', proj._id);
                        }}
                        style={{
                          padding: '10px 14px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.target.style.background = '#f8fafc'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}
                      >
                        <strong>{proj.name}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>— {proj.company} ({proj.clientName})</span>
                        {proj.phone && <div style={{ fontSize: '10px', color: 'var(--text-light)' }}>📞 {proj.phone}</div>}
                        {proj.invoices?.length > 0 && <div style={{ fontSize: '10px', color: 'var(--primary)' }}>📄 Inv: {proj.invoices.join(', ')}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedProjectId && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setSelectedProjectId('');
                    setRoadmapSearch('');
                    setRoadmapData(null);
                  }}
                >
                  Clear Search
                </button>
              )}
            </div>

            {loadingRoadmap ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Analysing project milestones...</div>
            ) : roadmapData ? (
              <div>
                <div style={{ padding: '16px', background: 'var(--primary-light)', borderRadius: '10px', border: '1px solid var(--primary-border)', marginBottom: '24px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--primary)', fontWeight: '800' }}>
                    Roadmap Overview: {roadmapData.projectName} — {roadmapData.company} ({roadmapData.clientName})
                  </h4>
                </div>

                {/* Horizontal Timeline Roadmap Visualizer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 20px', overflowX: 'auto', gap: '20px' }}>
                    {/* Timeline connector bar */}
                    <div style={{
                      position: 'absolute',
                      top: '18px',
                      left: '40px',
                      right: '40px',
                      height: '4px',
                      backgroundColor: '#e2e8f0',
                      zIndex: 1
                    }} />

                    {roadmapData.stages.map((stg, i) => {
                      let dotColor = '#cbd5e1';
                      let textColor = 'var(--text-muted)';
                      let icon = '⚪';
                      
                      if (stg.status === 'completed') {
                        dotColor = '#10b981';
                        textColor = 'var(--text-main)';
                        icon = '✔️';
                      } else if (stg.status === 'in_progress') {
                        dotColor = '#3b82f6';
                        textColor = 'var(--primary)';
                        icon = '⏳';
                      } else if (stg.status === 'failed') {
                        dotColor = '#ef4444';
                        textColor = '#ef4444';
                        icon = '❌';
                      }

                      return (
                        <div 
                          key={stg.id} 
                          style={{ 
                            flex: '1', 
                            minWidth: '120px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            textAlign: 'center', 
                            zIndex: 2, 
                            position: 'relative' 
                          }}
                        >
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#fff',
                            border: `3px solid ${dotColor}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            boxShadow: 'var(--shadow-sm)',
                            marginBottom: '8px'
                          }}>
                            {icon}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: textColor, marginBottom: '4px' }}>
                            {stg.title}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.3', padding: '0 4px' }}>
                            {stg.description}
                          </div>
                          {stg.date && (
                            <div style={{ fontSize: '9px', color: 'var(--text-light)', marginTop: '4px' }}>
                              {new Date(stg.date).toLocaleDateString('en-IN')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Financial Summary */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '16px',
                  marginTop: '24px',
                  paddingTop: '20px',
                  borderTop: '1px solid #e2e8f0'
                }}>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Project Value</span>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>₹{roadmapData.projectValue?.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Invoices Raised</span>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>₹{roadmapData.totalInvoiced?.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Received Amount</span>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>₹{roadmapData.totalReceived?.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Logged Expenses</span>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>₹{roadmapData.totalExpenses?.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Projected Net Profit</span>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: roadmapData.netProfit >= 0 ? '#16a34a' : '#dc2626', marginTop: '4px' }}>
                      ₹{roadmapData.netProfit?.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Total Project Days</span>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>{roadmapData.totalDays} Days</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)', border: '2px dashed var(--card-border)', borderRadius: '10px' }}>
                Search and select a project above to view its real-time operational milestones (Quotes, Invoices, Materials, Manufacturing, QC, Logistics, and Installation) along with a financial summary.
              </div>
            )}
          </div>

          {/* Checkpoint approvals segment */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ borderBottom: '2px solid var(--primary-light)', paddingBottom: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>🛡️ Checkpoint Approvals Feed</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Review and sign off on purchases, stock issuances, hiring decisions, and project milestones.</div>
              </div>
              <button onClick={fetchApprovals} style={{ padding: '6px 12px', fontSize: '12px', background: 'none', border: '1px solid var(--card-border)', color: 'var(--primary)', cursor: 'pointer', borderRadius: '6px', fontWeight: '700' }}>
                🔄 Refresh List
              </button>
            </div>

            {/* Approvals tab selection */}
            <div className="no-print" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', marginBottom: '20px', overflowX: 'auto' }}>
              {[
                { k: 'purchases', l: '🛒 Finance Purchases', count: approvals.purchases?.length || 0, bg: '#fefce8', color: '#ca8a04' },
                { k: 'stock', l: '📦 Stock Logs', count: approvals.stock?.length || 0, bg: '#eff6ff', color: '#2563eb' },
                { k: 'hr', l: '👨‍💼 HR Hiring', count: approvals.hr?.length || 0, bg: '#f5f3ff', color: '#7c3aed' },
                { k: 'design', l: '🎨 2D & 3D Designs', count: approvals.design?.length || 0, bg: '#f0fdf4', color: '#16a34a' },
                { k: 'installation', l: '🔧 Site Installations', count: approvals.installation?.length || 0, bg: '#fff7ed', color: '#ea580c' },
                { k: 'manufacturing', l: '🏭 Production', count: approvals.manufacturing?.length || 0, bg: '#e0f2fe', color: '#0369a1' },
                { k: 'qc', l: '🔍 QC Clearance', count: approvals.qc?.length || 0, bg: '#dcfce7', color: '#15803d' },
                { k: 'logistics', l: '🚚 Logistics', count: approvals.logistics?.length || 0, bg: '#faf5ff', color: '#6b21a8' },
              ].map(t => (
                <button
                  key={t.k}
                  onClick={() => setActiveApprovalTab(t.k)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    background: activeApprovalTab === t.k ? 'var(--primary)' : 'rgba(0,0,0,0.02)',
                    color: activeApprovalTab === t.k ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>{t.l}</span>
                  {t.count > 0 && (
                    <span style={{ background: activeApprovalTab === t.k ? '#fff' : t.bg, color: activeApprovalTab === t.k ? 'var(--primary)' : t.color, fontSize: '11px', fontWeight: '800', padding: '1px 7px', borderRadius: '20px' }}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* List content */}
            <div style={{ minHeight: '200px', position: 'relative' }}>
              {loadingApprovals ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Checking checklists...</div>
              ) : getActiveList().length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-light)', border: '2px dashed var(--card-border)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🛡️</div>
                  <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-muted)' }}>All clear! No pending approval requests in this queue.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {getActiveList().map(item => {
                    let cardTitle = '';
                    let detailsGrid = [];

                    if (activeApprovalTab === 'purchases' || activeApprovalTab === 'stock') {
                      cardTitle = `${item.transaction_type?.toUpperCase()}: ${item.material_name}`;
                      detailsGrid = [
                        ['Quantity', `${item.quantity}`],
                        ...(item.rate ? [['Rate', `₹${item.rate.toLocaleString()}`]] : []),
                        ...(item.rate ? [['Total Cost', `₹${(item.rate * item.quantity).toLocaleString()}`]] : []),
                        ...(item.supplier ? [['Supplier', item.supplier]] : []),
                        ...(item.invoice_number ? [['Invoice No', item.invoice_number]] : []),
                        ...(item.project ? [['Linked Project', item.project.name]] : []),
                        ['Date Logged', new Date(item.date).toLocaleDateString('en-IN')],
                        ...(item.notes ? [['Notes', item.notes]] : [])
                      ];
                    } else if (activeApprovalTab === 'hr') {
                      const isSalaryChange = item.basic_salary && item.pending_basic_salary !== null && item.pending_basic_salary !== undefined && item.pending_basic_salary !== item.basic_salary;
                      cardTitle = isSalaryChange ? `Salary/Rate Update: ${item.name}` : `Hiring Request: ${item.name}`;
                      const rateUnit = item.rate_type === 'hourly' ? '/hr' : item.rate_type === 'project' ? '/proj' : '/mo';
                      detailsGrid = [
                        ['Designation', item.designation],
                        ['Department', item.department],
                        ['Employment Type', item.employment_type?.replace('_', ' ').toUpperCase()],
                        ['Proposed Rate/Salary', isSalaryChange 
                          ? `₹${item.basic_salary.toLocaleString()} ➡️ ₹${item.pending_basic_salary.toLocaleString()} ${rateUnit}`
                          : `₹${(item.pending_basic_salary || item.basic_salary || 0).toLocaleString()} ${rateUnit}`
                        ],
                        ['Phone', item.phone || 'N/A'],
                        ['Email', item.email || 'N/A'],
                        ['Join Date', item.join_date ? new Date(item.join_date).toLocaleDateString('en-IN') : 'Immediate']
                      ];
                    } else if (activeApprovalTab === 'design') {
                      cardTitle = `${item.design_type?.toUpperCase()} Drawing: ${item.file_name}`;
                      detailsGrid = [
                        ['Client Company', item.client?.company],
                        ['Client Contact', item.client?.name],
                        ['Drawing Link', <a href={item.file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'underline' }}>View Design File</a>],
                        ['Uploaded', new Date(item.uploaded_at).toLocaleDateString('en-IN')],
                        ['Designer Notes', item.notes || '—']
                      ];
                    } else if (activeApprovalTab === 'installation') {
                      cardTitle = `Installation Setup: ${item.project?.name}`;
                      detailsGrid = [
                        ['Supervisor', item.supervisor],
                        ['Site Location', item.location],
                        ['Planned Start', new Date(item.start_date).toLocaleDateString('en-IN')],
                        ['Planned End', new Date(item.end_date).toLocaleDateString('en-IN')],
                        ['Manpower Allocated', `${item.manpower_used} helpers`],
                        ['Expected Hours', `${item.hours_worked} hrs`],
                        ['Status Notes', item.notes || '—']
                      ];
                    } else if (activeApprovalTab === 'manufacturing') {
                      cardTitle = `Production Finished: ${item.project?.name || 'Project'}`;
                      const issueName = item.material_issue ? `${item.material_issue.quantity}x ${item.material_issue.material_name}` : 'N/A';
                      detailsGrid = [
                        ['Materials Issued', issueName],
                        ['Start Date/Time', `${item.scheduled_start_date ? new Date(item.scheduled_start_date).toLocaleDateString('en-IN') : 'N/A'} ${item.scheduled_start_time || ''}`],
                        ['Finished Date/Time', `${item.finished_date ? new Date(item.finished_date).toLocaleDateString('en-IN') : 'N/A'} ${item.finished_time || ''}`],
                        ['Workshop Notes', item.notes || '—']
                      ];
                    } else if (activeApprovalTab === 'qc') {
                      cardTitle = `QC Report Sign-off: ${item.project?.name || 'Project'}`;
                      const passed = item.checked_items?.filter(c => c.checked).map(c => c.item_name).join(', ') || 'None';
                      detailsGrid = [
                        ['Passed Checks', passed],
                        ['Inspection Notes', item.description || '—'],
                        ['Submit Date', new Date(item.createdAt).toLocaleDateString('en-IN')]
                      ];
                    } else if (activeApprovalTab === 'logistics') {
                      cardTitle = `Logistics Cargo Release: ${item.project?.name || 'Project'}`;
                      detailsGrid = [
                        ['Cargo Item', item.item],
                        ['Destination Site', item.site],
                        ['Transport Vehicle', item.transport],
                        ['Driver Details', item.driver],
                        ['Dispatch Time', `${item.date ? new Date(item.date).toLocaleDateString('en-IN') : 'N/A'} ${item.time || ''}`],
                        ['Est. Distance', `${item.distance} km`]
                      ];
                    }

                    return (
                      <div
                        key={item._id}
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '10px',
                          padding: '20px',
                          boxShadow: 'var(--shadow-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                          transition: 'border-color 0.2s',
                          opacity: actioningId === item._id ? 0.6 : 1,
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setSelectedApprovalDetail({
                            item,
                            cardTitle,
                            detailsGrid,
                            activeApprovalTab
                          });
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
                            {cardTitle} <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '500', marginLeft: '6px' }}>(🔍 Click details)</span>
                          </h4>
                          <span style={{ fontSize: '11px', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: '800', textTransform: 'uppercase' }}>
                            {activeApprovalTab}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px 20px', background: 'rgba(0,0,0,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)' }}>
                          {detailsGrid.slice(0, 4).map(([k, v]) => (
                            <div key={k} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{k}:</span>
                              <strong style={{ color: 'var(--text-main)', textAlign: 'right' }}>{v}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB: PAYMENT REMINDERS ============ */}
      {activeConsoleTab === 'reminders' && (
        <div className="tab-content-anim" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top summary cards */}
          <div className="grid-3">
            <div className="card-metric accent-primary">
              <div className="metric-title">Total Accounts Receivable</div>
              <div className="metric-value">₹{(metrics?.globalAccountsReceivable ?? 0).toLocaleString()}</div>
              <div className="metric-subtitle">Total outstanding balance from all active projects</div>
            </div>
            <div className="card-metric accent-warning">
              <div className="metric-title">Due Invoices Count</div>
              <div className="metric-value">{(metrics?.detailedInvoices || []).length} Invoices</div>
              <div className="metric-subtitle">Unpaid or partially paid client bills</div>
            </div>
            <div className="card-metric accent-danger">
              <div className="metric-title">Overdue Invoices</div>
              <div className="metric-value">
                {(metrics?.detailedInvoices || []).filter(inv => new Date(inv.due_date) < new Date()).length} Overdue
              </div>
              <div className="metric-subtitle">Invoices passed their expected due date</div>
            </div>
          </div>

          {/* Template Editors & Receivables List */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.24fr 1fr', gap: '24px' }}>
            
            {/* Outstanding Receivables List */}
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 className="panel-title">Outstanding Client Receivables</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    className="form-control"
                    style={{ padding: '6px 12px', fontSize: '12px', width: '130px' }}
                    value={reminderFilter}
                    onChange={e => setReminderFilter(e.target.value)}
                  >
                    <option value="all">All Receivables</option>
                    <option value="overdue">Overdue Invoices</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="🔍 Search outstanding projects by name or company..."
                  value={reminderSearch}
                  onChange={e => setReminderSearch(e.target.value)}
                  style={{ padding: '10px 14px', fontSize: '13px', borderRadius: '8px' }}
                />
              </div>

              <div className="table-container">
                <table className="table-list" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Project / Client Details</th>
                      <th>Contract Value</th>
                      <th>Paid So Far</th>
                      <th>Outstanding</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metrics?.detailedReceivables || [])
                      .filter(r => {
                        const term = reminderSearch.toLowerCase();
                        const matchText = r.name?.toLowerCase().includes(term) || r.clientCompany?.toLowerCase().includes(term);
                        if (!matchText) return false;

                        if (reminderFilter === 'overdue') {
                          const projInvoices = (metrics?.detailedInvoices || []).filter(inv => inv.project?._id === r._id);
                          const hasOverdue = projInvoices.some(inv => new Date(inv.due_date) < new Date());
                          return hasOverdue;
                        }
                        return true;
                      })
                      .map(r => {
                        const projInvoices = (metrics?.detailedInvoices || []).filter(inv => inv.project?._id === r._id);
                        const isOverdue = projInvoices.some(inv => new Date(inv.due_date) < new Date());

                        return (
                          <tr key={r._id}>
                            <td>
                              <strong>{r.name}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {r.clientCompany} · 📞 {r.clientPhone || 'No Phone'}
                              </div>
                              {isOverdue && (
                                <span style={{ fontSize: '9px', fontWeight: '800', background: 'var(--danger-light)', color: 'var(--danger)', padding: '1px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>
                                  ⚠️ OVERDUE BILLS
                                </span>
                              )}
                            </td>
                            <td>₹{r.value?.toLocaleString()}</td>
                            <td style={{ color: 'var(--success)', fontWeight: '600' }}>₹{r.paid?.toLocaleString()}</td>
                            <td style={{ color: 'var(--primary)', fontWeight: '800' }}>₹{r.remaining?.toLocaleString()}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button 
                                  className="btn btn-sm btn-primary" 
                                  onClick={() => handleSendCustomWhatsAppReminder(r)}
                                  title="Send Customized WhatsApp"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                >
                                  💬 WhatsApp
                                </button>
                                <button 
                                  className="btn btn-sm btn-secondary" 
                                  onClick={() => handleSendCustomEmailReminder(r)}
                                  title="Send Customized Email"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                >
                                  ✉️ Email
                                </button>
                                <a 
                                  className="btn btn-sm btn-secondary" 
                                  href={`/print/project/${r._id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View Statement"
                                  style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                                >
                                  📄 Statement
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {(!metrics || (metrics.detailedReceivables || []).length === 0) && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>
                          No outstanding client receivables found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Template Customize Editors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div className="panel" style={{ margin: 0 }}>
                <div className="panel-header">
                  <h2 className="panel-title">💬 WhatsApp Reminder Template</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    Customize the message sent via WhatsApp. Available tokens: <code>{"{projectName}"}</code>, <code>{"{clientCompany}"}</code>, <code>{"{todayDate}"}</code>, <code>{"{projectValue}"}</code>, <code>{"{paidAmount}"}</code>, <code>{"{outstandingDue}"}</code>, <code>{"{dueDate}"}</code>.
                  </p>
                  <textarea
                    className="form-control"
                    rows="8"
                    value={customReminderTemplate}
                    onChange={e => setCustomReminderTemplate(e.target.value)}
                    style={{ fontSize: '12px', fontFamily: 'monospace', padding: '10px', borderRadius: '8px', lineHeight: '1.4', background: '#fafafa' }}
                  />
                </div>
              </div>

              <div className="panel" style={{ margin: 0 }}>
                <div className="panel-header">
                  <h2 className="panel-title">✉️ Email Reminder Template</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    Customize the message sent via Email. Same tokens are supported.
                  </p>
                  <textarea
                    className="form-control"
                    rows="8"
                    value={customEmailTemplate}
                    onChange={e => setCustomEmailTemplate(e.target.value)}
                    style={{ fontSize: '12px', fontFamily: 'monospace', padding: '10px', borderRadius: '8px', lineHeight: '1.4', background: '#fafafa' }}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ============ TAB: TEAM & LOGINS ============ */}
      {activeConsoleTab === 'team' && (
        <div className="tab-content-anim" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>👥 Team Directory & User Access Management</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
                Manage interior designers, technicians, monthly salary rates, and system login credentials.
              </p>
            </div>
            
            {/* Tab Selector - Admin Only */}
            {currentUser?.role === 'admin' && (
              <div className="date-presets" style={{ padding: '2px', borderRadius: '6px' }}>
                <button 
                  className={`preset-btn ${teamActiveSubTab === 'resources' ? 'active' : ''}`}
                  onClick={() => setTeamActiveSubTab('resources')}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  👥 Team Directory & Utilization
                </button>
                <button 
                  className={`preset-btn ${teamActiveSubTab === 'logins' ? 'active' : ''}`}
                  onClick={() => setTeamActiveSubTab('logins')}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  🔑 RBAC User Logins
                </button>
              </div>
            )}
          </div>

          <div style={{ marginTop: '10px' }}>
            {teamActiveSubTab === 'resources' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }}>
                
                {/* Team Directory List */}
                <div className="panel" style={{ margin: 0 }}>
                  <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h2 className="panel-title">Active Team Members & utilization</h2>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="🔍 Search team by name or role..." 
                      value={teamSearchQuery}
                      onChange={e => setTeamSearchQuery(e.target.value)}
                      style={{ maxWidth: '200px', padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
                    />
                  </div>

                  {teamLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading directory...</div>
                  ) : (
                    <div className="table-container">
                      <table className="table-list" style={{ fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Monthly Cost</th>
                            <th>Allocations & Utilization</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {team
                            .filter(member => 
                              member.name?.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
                              member.role?.toLowerCase().includes(teamSearchQuery.toLowerCase())
                            )
                            .map(member => {
                              const allocs = getMemberAllocations(member._id);
                              const totalUtil = allocs.reduce((sum, a) => sum + a.allocation, 0);
                              const isOverallocated = totalUtil > 100;

                              return (
                                <tr key={member._id}>
                                  <td style={{ fontWeight: '700' }}>{member.name}</td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span className="funnel-card-source" style={{ textTransform: 'capitalize', fontSize: '10px', margin: 0 }}>
                                        {member.role}
                                      </span>
                                      <span style={{ 
                                        fontSize: '9px', 
                                        backgroundColor: member.resource_type === 'fulltime' ? '#ecfdf5' : member.resource_type === 'freelancer' ? '#eff6ff' : '#fffbeb', 
                                        color: member.resource_type === 'fulltime' ? '#065f46' : member.resource_type === 'freelancer' ? '#1d4ed8' : '#b45309',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontWeight: '700',
                                        textTransform: 'uppercase'
                                      }}>
                                        {member.resource_type || 'fulltime'}
                                      </span>
                                    </div>
                                  </td>
                                  <td style={{ fontWeight: '600' }}>₹{member.monthly_cost?.toLocaleString()} / mo</td>
                                  <td>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                                      {allocs.map(a => (
                                        <span 
                                          key={a.projectId} 
                                          className="badge badge-lead" 
                                          style={{ fontSize: '9px', backgroundColor: '#e2e8f0', color: '#334155' }}
                                        >
                                          {a.projectName.substring(0, 16)} ({a.allocation}%)
                                        </span>
                                      ))}
                                      {allocs.length === 0 && (
                                        <span style={{ fontSize: '11px', color: 'var(--text-light)', fontStyle: 'italic' }}>
                                          Bench (0%)
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Utilization bar */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ flex: 1, height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ 
                                          height: '100%', 
                                          width: `${Math.min(100, totalUtil)}%`, 
                                          backgroundColor: isOverallocated ? 'var(--danger)' : totalUtil > 0 ? 'var(--success)' : '#94a3b8' 
                                        }} />
                                      </div>
                                      <span style={{ 
                                        fontSize: '11px', 
                                        fontWeight: '700', 
                                        color: isOverallocated ? 'var(--danger)' : totalUtil > 0 ? 'var(--success)' : 'var(--text-muted)' 
                                      }}>
                                        {totalUtil}%
                                      </span>
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                      <button 
                                        className="btn btn-sm btn-danger" style={{ padding: '4px 8px', fontSize: '11px' }}
                                        onClick={() => handleDeleteMember(member._id)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          {team.length === 0 && (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>
                                No team members registered.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Add Team Member form */}
                <div className="panel" style={{ margin: 0, height: 'fit-content' }}>
                  <div className="panel-header">
                    <h2 className="panel-title">Add Team Member</h2>
                  </div>
                  <form onSubmit={handleCreateMember} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '11px' }}>Full Name</label>
                      <input 
                        type="text" className="form-control" placeholder="E.g. Sarah Connor" required
                        value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label style={{ fontSize: '11px' }}>Role / Title</label>
                      <input 
                        type="text" className="form-control" placeholder="E.g. Lead Architect, Technician" required
                        value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '11px' }}>Monthly Basic Salary Cost (₹)</label>
                      <input 
                        type="number" className="form-control" placeholder="Salary rate in INR per month" required
                        value={newMember.monthly_cost} onChange={e => setNewMember({ ...newMember, monthly_cost: e.target.value })}
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '11px' }}>Resource / Engagement Type</label>
                      <select 
                        className="form-control" required
                        value={newMember.resource_type || 'fulltime'} onChange={e => setNewMember({ ...newMember, resource_type: e.target.value })}
                        style={{ padding: '8px 12px', fontSize: '12px', background: '#fff' }}
                      >
                        <option value="fulltime">Full-Time (Salaried)</option>
                        <option value="freelancer">Freelancer</option>
                        <option value="consultant">Consultant</option>
                      </select>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', padding: '8px', fontSize: '13px' }}>
                      Add Team Member
                    </button>
                  </form>
                </div>

              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }}>
                
                {/* Active user accounts logins list */}
                <div className="panel" style={{ margin: 0 }}>
                  <div className="panel-header">
                    <h2 className="panel-title">Active User Logins</h2>
                  </div>
                  <div className="table-container">
                    <table className="table-list" style={{ fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Password</th>
                          <th>Role</th>
                          <th>Permissions</th>
                          <th style={{ textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u._id}>
                            <td style={{ fontWeight: '700', textTransform: 'capitalize' }}>{u.username}</td>
                            <td><code>{u.password}</code></td>
                            <td>
                              <span className={`badge badge-${u.role === 'admin' ? 'success' : u.role === 'manager' ? 'info' : 'secondary'}`} style={{ textTransform: 'capitalize', fontSize: '10px' }}>
                                {u.role}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {u.allowedPages?.map(page => (
                                  <span 
                                    key={page} 
                                    className="badge badge-lead" 
                                    style={{ fontSize: '9px', backgroundColor: '#e2e8f0', color: '#334155', textTransform: 'capitalize' }}
                                  >
                                    {page.replace('-', ' ')}
                                  </span>
                                ))}
                                {(!u.allowedPages || u.allowedPages.length === 0) && (
                                  <span style={{ fontSize: '11px', color: 'var(--text-light)', fontStyle: 'italic' }}>None</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <button 
                                  className="btn btn-sm btn-danger" 
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  onClick={() => handleDeleteUser(u._id, u.username)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Create Login Form */}
                <div className="panel" style={{ margin: 0, height: 'fit-content' }}>
                  <div className="panel-header">
                    <h2 className="panel-title">Create Login Account</h2>
                  </div>
                  <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '11px' }}>Username</label>
                      <input 
                        type="text" className="form-control" required placeholder="E.g. designer_jane"
                        value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '11px' }}>Password</label>
                      <input 
                        type="text" className="form-control" required placeholder="E.g. Nilan@101088"
                        value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '11px' }}>System Access Role</label>
                      <select 
                        className="form-control"
                        value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                      >
                        <option value="viewer">Viewer (View-only, restricted tabs)</option>
                        <option value="manager">Manager (Read & edit, restricted tabs)</option>
                        <option value="admin">Administrator (Full control & User Management)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '11px', fontWeight: '700', marginBottom: '6px', display: 'block' }}>Allowed Navigation Pages</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--card-border)', padding: '10px', borderRadius: '6px' }}>
                        {[
                          { key: 'dashboard', label: '📊 Dashboard' },
                          { key: 'ceo', label: '👑 CEO Console' },
                          { key: 'clients', label: '👥 Sales Pipeline' },
                          { key: 'designing', label: '🎨 2D & 3D Designs' },
                          { key: 'purchase', label: '🛒 Purchase & Stock' },
                          { key: 'manufacturing', label: '🏭 Manufacturing & QC' },
                          { key: 'payments', label: '💰 Accounts & Ledgers' },
                          { key: 'projects', label: '📁 Projects & Contracts' },
                          { key: 'installation', label: '🔧 Site Installation' },
                          { key: 'monthly-statements', label: '📅 Monthly Statements' },
                          { key: 'analytics', label: '📈 Advanced Analytics' },
                          { key: 'assets', label: '🖥️ Company Assets' },
                          { key: 'team', label: '🤝 Team & Resources (RBAC)' },
                          { key: 'amc', label: '🔄 AMC Management' },
                          { key: 'hr', label: '👔 HR Dashboard' },
                          { key: 'hr-employees', label: '👨‍💼 HR — Employees' },
                          { key: 'hr-leaves', label: '🏖️ HR — Leaves' },
                          { key: 'hr-attendance', label: '✅ HR — Attendance' },
                          { key: 'hr-payroll', label: '💵 HR — Payroll' },
                        ].map(page => {
                          const isChecked = selectedPages.includes(page.key);
                          return (
                            <label key={page.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', margin: 0 }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedPages(selectedPages.filter(p => p !== page.key));
                                  } else {
                                    setSelectedPages([...selectedPages, page.key]);
                                  }
                                }}
                              />
                              {page.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', padding: '8px', fontSize: '13px' }}>
                      Create Login Account
                    </button>
                  </form>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ TAB: COMPANY ASSETS ============ */}
      {activeConsoleTab === 'assets' && (
        <div className="tab-content-anim" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>🖥️ Company Asset Inventory & Depreciation</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
              Track hardware properties, CAD/CRM software licenses, office furniture, and written down book values.
            </p>
          </div>

          {/* Metrics summary cards */}
          <div className="grid-3">
            <div className="card-metric accent-info">
              <div className="metric-title">Asset Count</div>
              <div className="metric-value">{assets.length} items</div>
              <div className="metric-subtitle">Total company properties cataloged</div>
            </div>
            <div className="card-metric accent-primary">
              <div className="metric-title">Historical Purchase Cost</div>
              <div className="metric-value">
                ₹{assets.reduce((sum, a) => sum + (a.purchase_value || 0), 0).toLocaleString()}
              </div>
              <div className="metric-subtitle">Consolidated purchasing expenditure</div>
            </div>
            <div className="card-metric accent-success">
              <div className="metric-title">Estimated Book Value (Current)</div>
              <div className="metric-value">
                ₹{Math.round(assets.reduce((sum, a) => sum + calculateCurrentValue(a.purchase_value, a.purchase_date, a.depreciation_rate), 0)).toLocaleString()}
              </div>
              <div className="metric-subtitle">Reflecting annual asset straight-line depreciation</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }}>
            
            {/* Assets List Table */}
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 className="panel-title">Asset Log List</h2>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="🔍 Search assets..." 
                  value={assetsSearchQuery}
                  onChange={e => setAssetsSearchQuery(e.target.value)}
                  style={{ maxWidth: '200px', padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
                />
              </div>

              {assetsLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading assets...</div>
              ) : (
                <div className="table-container">
                  <table className="table-list" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Asset Details</th>
                        <th>Category</th>
                        <th>Purchase Date</th>
                        <th>Cost Value</th>
                        <th>Current Value</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets
                        .filter(asset => 
                          asset.name?.toLowerCase().includes(assetsSearchQuery.toLowerCase()) ||
                          asset.category?.toLowerCase().includes(assetsSearchQuery.toLowerCase())
                        )
                        .map(asset => {
                          const currentVal = calculateCurrentValue(asset.purchase_value, asset.purchase_date, asset.depreciation_rate);
                          return (
                            <tr key={asset._id}>
                              <td>
                                <strong>{asset.name}</strong>
                                <div style={{ fontSize: '10px', color: 'var(--success)', fontWeight: '600', marginTop: '2px' }}>
                                  ✓ Expense Logged
                                </div>
                              </td>
                              <td>
                                <span className="funnel-card-source" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                                  {asset.category}
                                </span>
                              </td>
                              <td>{new Date(asset.purchase_date).toLocaleDateString('en-IN')}</td>
                              <td style={{ fontWeight: '600' }}>₹{asset.purchase_value?.toLocaleString()}</td>
                              <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                                ₹{Math.round(currentVal).toLocaleString()}
                                <span style={{ fontSize: '10px', color: 'var(--text-light)', fontWeight: 'normal', marginLeft: '4px' }}>
                                  ({asset.depreciation_rate}%)
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                  <button 
                                    className="btn btn-sm btn-danger" style={{ padding: '4px 8px', fontSize: '11px' }}
                                    onClick={() => handleDeleteAsset(asset._id)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      {assets.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>
                            No assets registered in catalog.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add Asset Form */}
            <div className="panel" style={{ margin: 0, height: 'fit-content' }}>
              <div className="panel-header">
                <h2 className="panel-title">Add Company Asset</h2>
              </div>
              <form onSubmit={handleCreateAsset} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11px' }}>Asset Name</label>
                  <input 
                    type="text" className="form-control" placeholder="CAD Software, screen, worktables..." required
                    value={newAsset.name} onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ fontSize: '11px' }}>Category</label>
                  <select 
                    className="form-control"
                    value={newAsset.category} onChange={e => setNewAsset({ ...newAsset, category: e.target.value })}
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                  >
                    <option value="hardware">Hardware (Laptops, Screens, Tablets)</option>
                    <option value="software license">Software License (CAD, 3ds Max, CRM)</option>
                    <option value="furniture">Furniture (Office desks, Ergonomic chairs)</option>
                    <option value="office equipment">Office Equipment (Wi-Fi, routers, printers)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '11px' }}>Purchase Price (₹)</label>
                    <input 
                      type="number" className="form-control" required
                      value={newAsset.purchase_value} onChange={e => setNewAsset({ ...newAsset, purchase_value: e.target.value })}
                      style={{ padding: '8px 12px', fontSize: '12px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '11px' }}>Depreciation Rate (% / yr)</label>
                    <input 
                      type="number" className="form-control" min="0" max="100" required
                      value={newAsset.depreciation_rate} onChange={e => setNewAsset({ ...newAsset, depreciation_rate: e.target.value })}
                      style={{ padding: '8px 12px', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '11px' }}>Purchase Date</label>
                  <input 
                    type="date" className="form-control" required
                    value={newAsset.purchase_date} onChange={e => setNewAsset({ ...newAsset, purchase_date: e.target.value })}
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', padding: '8px', fontSize: '13px' }}>
Register Asset & Auto-Log Expense
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB: CASH FLOW LEDGER ============ */}
      {activeConsoleTab === 'cashflow' && (
        <div className="tab-content-anim" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>📈 Daily Cash Inflow & Outflow Ledger</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
              Consolidated cashbook showing chronological revenue payments (inflows) and business expenditures (outflows).
            </p>
          </div>

          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 className="panel-title">Transaction History</h2>
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Search ledger..." 
                value={cashflowSearchQuery}
                onChange={e => setCashflowSearchQuery(e.target.value)}
                style={{ maxWidth: '300px', padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
              />
            </div>

            <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="table-list" style={{ fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafbfc', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reference / Ref ID</th>
                    <th>Description</th>
                    <th>Payment Method</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const inflows = (metrics?.detailedPayments || []).map(p => ({
                      date: new Date(p.payment_date),
                      type: 'inflow',
                      ref: p.invoice ? p.invoice.invoice_number : 'Direct Inflow',
                      description: `Payment for project "${p.project?.name || 'N/A'}" (${p.project?.client?.company || 'N/A'})`,
                      method: p.method || 'Bank Transfer',
                      amount: p.amount
                    }));

                    const outflows = (metrics?.detailedExpenses || []).map(e => ({
                      date: new Date(e.expense_date),
                      type: 'outflow',
                      ref: e.linked_payable ? 'Vendor Settlement' : 'Direct Expense',
                      description: `${e.description || 'General operational cost'} [Category: ${e.category ? e.category.replace('_', ' ').toUpperCase() : 'OTHER'}]${e.project ? ` for project "${e.project.name}"` : ''}`,
                      method: '—',
                      amount: e.amount
                    }));

                    const combined = [...inflows, ...outflows]
                      .sort((a, b) => b.date - a.date);

                    const filtered = combined.filter(tx => {
                      const q = cashflowSearchQuery.toLowerCase();
                      return tx.ref.toLowerCase().includes(q) ||
                             tx.description.toLowerCase().includes(q) ||
                             tx.method.toLowerCase().includes(q) ||
                             tx.type.toLowerCase().includes(q);
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>
                            No matching ledger entries found.
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((tx, idx) => (
                      <tr key={idx}>
                        <td>{tx.date.toLocaleDateString('en-IN')}</td>
                        <td>
                          <span className={`badge badge-${tx.type === 'inflow' ? 'success' : 'danger'}`} style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                            {tx.type}
                          </span>
                        </td>
                        <td><code>{tx.ref}</code></td>
                        <td>{tx.description}</td>
                        <td>{tx.method}</td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: tx.type === 'inflow' ? 'var(--success)' : 'var(--danger)' }}>
                          {tx.type === 'inflow' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB: EXPENSES BOOK ============ */}
      {activeConsoleTab === 'expenses' && (
        <div className="tab-content-anim" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>📉 Business Outflow Expenses</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
              Detailed overview of business expenditures, cataloged and filterable by operational category.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '4px'
          }}>
            {(() => {
              const categoryTotals = {
                salary: 0,
                rent: 0,
                electricity: 0,
                software: 0,
                machine_maintenance: 0,
                office_expenses: 0,
                project_cost: 0,
                other: 0
              };
              
              const detailedExp = metrics?.detailedExpenses || [];
              detailedExp.forEach(e => {
                const cat = e.category || 'other';
                if (categoryTotals[cat] !== undefined) {
                  categoryTotals[cat] += e.amount;
                } else {
                  categoryTotals.other = (categoryTotals.other || 0) + e.amount;
                }
              });

              const categoryLabels = {
                salary: '👥 Salaries & HR',
                rent: '🏢 Office Rent',
                electricity: '⚡ Electricity & Util',
                software: '💻 Software Licences',
                machine_maintenance: '⚙️ Machine Maint',
                office_expenses: '📁 Office Stationery',
                project_cost: '🛠️ Direct Project Costs',
                other: '🌀 Other Operations'
              };

              return Object.entries(categoryTotals).map(([cat, total]) => (
                <div key={cat} style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {categoryLabels[cat] || cat}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--danger)', marginTop: '4px' }}>
                    ₹{total.toLocaleString()}
                  </div>
                </div>
              ));
            })()}
          </div>

          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 className="panel-title">Expenses Log Details</h2>
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Search expenses..." 
                value={expensesSearchQuery}
                onChange={e => setExpensesSearchQuery(e.target.value)}
                style={{ maxWidth: '300px', padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
              />
            </div>

            <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="table-list" style={{ fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafbfc', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Linked Project</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const detailedExp = metrics?.detailedExpenses || [];
                    const filtered = detailedExp.filter(e => {
                      const q = expensesSearchQuery.toLowerCase();
                      return (e.category || '').toLowerCase().includes(q) ||
                             (e.description && e.description.toLowerCase().includes(q)) ||
                             (e.project && e.project.name.toLowerCase().includes(q));
                    });

                    const sorted = [...filtered].sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));

                    if (sorted.length === 0) {
                      return (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>
                            No matching expenses found.
                          </td>
                        </tr>
                      );
                    }

                    return sorted.map((e, idx) => (
                      <tr key={idx}>
                        <td>{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                        <td>
                          <span className="funnel-card-source" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                            {e.category ? e.category.replace('_', ' ') : 'OTHER'}
                          </span>
                        </td>
                        <td>{e.description || 'General operational expense'}</td>
                        <td>{e.project ? e.project.name : '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--danger)' }}>
                          -₹{e.amount.toLocaleString()}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- WAKE UP SMART ANALYSIS MODAL --- */}
      {wakeUpOpen && smartAnalysis && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '940px', maxHeight: '90vh', overflowY: 'auto', padding: '0' }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f4c81 100%)',
              borderRadius: '14px 14px 0 0',
              padding: '22px 28px 0 28px',
            }}>
              <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#fff', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
                    ⚡ Wake Up Analyzer
                  </h3>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                    Real-time operational roadmaps & outstanding checkpoint bottlenecks.
                  </p>
                </div>
                <button type="button" onClick={handleCloseWakeUp} style={{
                  background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff',
                  width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>×</button>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className={`wakeup-tab-btn${wakeUpTab === 'roadmap' ? ' active' : ''}`}
                  onClick={() => setWakeUpTab('roadmap')}
                  style={{ color: wakeUpTab === 'roadmap' ? 'var(--primary)' : 'rgba(255,255,255,0.65)' }}
                >
                  🔍 Project Roadmap
                </button>
                <button
                  className={`wakeup-tab-btn${wakeUpTab === 'approvals' ? ' active' : ''}`}
                  onClick={() => setWakeUpTab('approvals')}
                  style={{ color: wakeUpTab === 'approvals' ? 'var(--primary)' : 'rgba(255,255,255,0.65)' }}
                >
                  ✅ Pending Approvals
                  {(smartAnalysis.pendingApprovals.finance.length + smartAnalysis.pendingApprovals.stock.length + smartAnalysis.pendingApprovals.hr.length + (smartAnalysis.pendingApprovals.manufacturing?.length || 0) + (smartAnalysis.pendingApprovals.qc?.length || 0) + (smartAnalysis.pendingApprovals.logistics?.length || 0) + smartAnalysis.pendingApprovals.installation.length) > 0 && (
                    <span style={{ marginLeft: '6px', background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '800' }}>
                      {smartAnalysis.pendingApprovals.finance.length + smartAnalysis.pendingApprovals.stock.length + smartAnalysis.pendingApprovals.hr.length + (smartAnalysis.pendingApprovals.manufacturing?.length || 0) + (smartAnalysis.pendingApprovals.qc?.length || 0) + (smartAnalysis.pendingApprovals.logistics?.length || 0) + smartAnalysis.pendingApprovals.installation.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* ============ TAB: PROJECT ROADMAP ============ */}
              {wakeUpTab === 'roadmap' && (
                <div className="tab-content-anim">
                  {/* Smart Executive Insights */}
                  <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', marginBottom: '4px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#15803d', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🤖 Smart Executive Insights
                    </h4>
                    <ul style={{ paddingLeft: '18px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '5px', color: '#166534', margin: 0 }}>
                      {smartAnalysis.insights.map((ins, i) => (
                        <li key={i}>{ins}</li>
                      ))}
                    </ul>
                  </div>

                  {/* CLIENT/PROJECT MILESTONE ROADMAP */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                        🔍 Client/Project Milestone Roadmap
                      </h4>
                      {/* Nuera AI scanning animation */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
                        border: '1px solid #c4b5fd',
                        borderRadius: '20px', padding: '3px 10px',
                        fontSize: '11px', fontWeight: '700', color: '#6d28d9'
                      }}>
                        <span style={{ fontSize: '10px' }}>✦</span>
                        Nuera AI analyzing
                        <span className="nuera-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#7c3aed' }} />
                        <span className="nuera-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#7c3aed' }} />
                        <span className="nuera-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#7c3aed' }} />
                      </div>
                    </div>

                    {/* Search box */}
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="Search by Project Name, Client Phone, or Invoice #..."
                          value={wakeUpSearch}
                          onChange={(e) => {
                            setWakeUpSearch(e.target.value);
                            setWakeUpSelectedProjectId('');
                          }}
                          style={{
                            flex: 1, padding: '10px 14px',
                            border: '1.5px solid #e2e8f0', borderRadius: '8px',
                            fontSize: '13px', outline: 'none', background: '#fff',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)'
                          }}
                        />
                        {wakeUpSelectedProjectId && (
                          <button
                            onClick={() => { setWakeUpSelectedProjectId(''); setWakeUpSearch(''); setWakeUpRoadmapData(null); setWakeUpInspectStage(null); setStagePopup(null); }}
                            style={{ padding: '8px 14px', fontSize: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: '700' }}
                          >
                            ✕ Clear
                          </button>
                        )}
                      </div>

                      {wakeUpSearch && !wakeUpSelectedProjectId && filteredProjectsWakeUp.length > 0 && (
                        <div style={{
                          position: 'absolute', top: '44px', left: 0, right: 0,
                          background: '#fff', border: '1.5px solid #e2e8f0',
                          borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          zIndex: 100, maxHeight: '200px', overflowY: 'auto'
                        }}>
                          {filteredProjectsWakeUp.map(proj => (
                            <div
                              key={proj._id}
                              onClick={() => { setWakeUpSelectedProjectId(proj._id); setWakeUpSearch(`${proj.name} (${proj.company})`); fetchWakeUpRoadmap('', proj._id); setStagePopup(null); }}
                              style={{ padding: '10px 14px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <strong>{proj.name}</strong>
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}> — {proj.company} ({proj.clientName})</span>
                              {proj.phone && <div style={{ fontSize: '10px', color: 'var(--text-light)' }}>📞 {proj.phone}</div>}
                              {proj.invoices?.length > 0 && <div style={{ fontSize: '10px', color: 'var(--primary)' }}>📄 Inv: {proj.invoices.join(', ')}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Roadmap content */}
                    {wakeUpLoadingRoadmap ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#7c3aed', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span className="nuera-dot" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#7c3aed' }} />
                          <span className="nuera-dot" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#7c3aed' }} />
                          <span className="nuera-dot" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#7c3aed' }} />
                        </div>
                        <span style={{ fontWeight: '700' }}>Nuera AI analyzing operational stages...</span>
                      </div>
                    ) : wakeUpRoadmapData ? (
                      <div>
                        {/* Project Header Info Bar */}
                        <div style={{
                          background: 'linear-gradient(135deg, #1e293b, #0f4c81)',
                          borderRadius: '10px', padding: '14px 18px', marginBottom: '18px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
                        }}>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: '900', color: '#fff' }}>{wakeUpRoadmapData.projectName}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>
                              {wakeUpRoadmapData.clientName} · {wakeUpRoadmapData.company}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {wakeUpRoadmapData.projectValue > 0 && (
                              <div className="finance-card-anim" style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 14px', textAlign: 'center', minWidth: '100px' }}>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase' }}>Project Value</div>
                                <div style={{ fontSize: '14px', fontWeight: '900', color: '#4ade80' }}>₹{(wakeUpRoadmapData.projectValue || 0).toLocaleString('en-IN')}</div>
                              </div>
                            )}
                            {wakeUpRoadmapData.totalExpenses > 0 && (
                              <div className="finance-card-anim" style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 14px', textAlign: 'center', minWidth: '100px', animationDelay: '0.1s' }}>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase' }}>Expenses</div>
                                <div style={{ fontSize: '14px', fontWeight: '900', color: '#f87171' }}>₹{(wakeUpRoadmapData.totalExpenses || 0).toLocaleString('en-IN')}</div>
                              </div>
                            )}
                            {(wakeUpRoadmapData.projectValue > 0 || wakeUpRoadmapData.totalExpenses > 0) && (
                              <div className="finance-card-anim" style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 14px', textAlign: 'center', minWidth: '100px', animationDelay: '0.2s' }}>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase' }}>Net Profit</div>
                                <div style={{ fontSize: '14px', fontWeight: '900', color: ((wakeUpRoadmapData.projectValue || 0) - (wakeUpRoadmapData.totalExpenses || 0)) >= 0 ? '#4ade80' : '#f87171' }}>
                                  ₹{((wakeUpRoadmapData.projectValue || 0) - (wakeUpRoadmapData.totalExpenses || 0)).toLocaleString('en-IN')}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Interactive Nodes Roadmap */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px 16px', overflowX: 'auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', gap: '14px', minWidth: '800px' }}>
                            {/* Connector line */}
                            <div style={{ position: 'absolute', top: '16px', left: '20px', right: '20px', height: '3px', background: '#e2e8f0', zIndex: 1 }} />
                            
                            {wakeUpRoadmapData.stages.map((stg, i) => {
                              const isCompleted = stg.status === 'completed';
                              const isInProgress = stg.status === 'in_progress';
                              const isFailed = stg.status === 'failed';
                              
                              let dotColor = '#e2e8f0';
                              let borderGlow = 'none';
                              
                              if (isCompleted) {
                                dotColor = '#10b981';
                              } else if (isInProgress) {
                                dotColor = '#3b82f6';
                                borderGlow = '0 0 10px rgba(59, 130, 246, 0.5)';
                              } else if (isFailed) {
                                dotColor = '#ef4444';
                              }
                              
                              const stageIcons = ['📞','📄','💰','🛒','📦','🏭','🔍','🚚','🔧','🏁'];

                              return (
                                <div
                                  key={stg.id}
                                  className="stage-node"
                                  onClick={() => {
                                    const prev = wakeUpRoadmapData.stages.slice(0, i).reverse().find(s => s.date);
                                    setWakeUpInspectStage(i);
                                    setStagePopup({
                                      stage: stg,
                                      index: i,
                                      prevDate: prev?.date || null,
                                      stageIcons
                                    });
                                  }}
                                  style={{
                                    flex: 1, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer'
                                  }}
                                >
                                  <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%', background: '#fff',
                                    border: `3.5px solid ${dotColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: borderGlow, fontSize: '13px', transition: 'all 0.2s', marginBottom: '8px'
                                  }}>
                                    {stageIcons[i]}
                                  </div>
                                  <span style={{ fontSize: '11px', fontWeight: '800', color: isInProgress ? 'var(--primary)' : 'var(--text-main)', textAlign: 'center', display: 'block', maxWidth: '80px' }}>
                                    {stg.title}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', margin: '12px 0 4px 0' }}>
                          👆 Click any stage node to view detailed process info, timestamps & responsible personnel
                        </p>
                      </div>
                    ) : (
                      <div style={{ padding: '32px', textAlign: 'center', border: '1.5px dashed #cbd5e1', borderRadius: '10px', fontSize: '13px', color: 'var(--text-light)' }}>
                        🔍 Search and select a project above to view its real-time milestone roadmap with AI insights.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============ TAB: PENDING APPROVALS ============ */}
              {wakeUpTab === 'approvals' && (
                <div className="tab-content-anim">
                  <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '12px', padding: '16px', marginBottom: '4px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--primary)', fontWeight: '800' }}>🤖 Smart Executive Insights</h4>
                    <ul style={{ paddingLeft: '18px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-main)', margin: 0 }}>
                      {smartAnalysis.insights.map((ins, i) => <li key={i}>{ins}</li>)}
                    </ul>
                  </div>

                  <div>
                    <h4 style={{ margin: '14px 0 12px 0', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                      ⏳ Outstanding Checkpoint Breakdown
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { icon: '🛒', label: 'Finance Stock Purchases (Pending Approval)', count: smartAnalysis.pendingApprovals.finance.length, color: 'var(--primary)' },
                        { icon: '📦', label: 'Material Allocations / Returns', count: smartAnalysis.pendingApprovals.stock.length, color: '#ca8a04' },
                        { icon: '👨‍💼', label: 'HR Hiring & Basic Salary Sign-offs', count: smartAnalysis.pendingApprovals.hr.length, color: '#7c3aed' },
                        { icon: '🎨', label: '2D & 3D Drawing Design Clearance', count: smartAnalysis.pendingApprovals.design.length, color: '#16a34a' },
                        { icon: '🏭', label: 'Production / Manufacturing Releases', count: smartAnalysis.pendingApprovals.manufacturing?.length || 0, color: '#0369a1' },
                        { icon: '🔍', label: 'Quality Control (QC) Sign-offs', count: smartAnalysis.pendingApprovals.qc?.length || 0, color: '#15803d' },
                        { icon: '🚚', label: 'Cargo Dispatch Logistics Releases', count: smartAnalysis.pendingApprovals.logistics?.length || 0, color: '#6b21a8' },
                        { icon: '🔧', label: 'Site Installation Clearances', count: smartAnalysis.pendingApprovals.installation.length, color: '#ea580c' },
                      ].map(({ icon, label, count, color }) => (
                        <div key={label} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 16px', background: count > 0 ? '#fffbeb' : '#fafafa',
                          borderRadius: '10px', border: `1px solid ${count > 0 ? '#fde68a' : '#eee'}`,
                          fontSize: '13px', transition: 'all 0.2s'
                        }}>
                          <span>{icon} {label}</span>
                          <strong style={{ color: count > 0 ? color : '#94a3b8', fontSize: '14px' }}>
                            {count > 0 ? `${count} request${count > 1 ? 's' : ''}` : '—'}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 28px 24px 28px' }}>
              <button className="btn btn-secondary" onClick={handleCloseWakeUp}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ STAGE DETAIL POPUP OVERLAY ============ */}
      {stagePopup && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 1350 }}
          onClick={(e) => { if (e.target === e.currentTarget) setStagePopup(null); }}
        >
          <div className="stage-popup-anim" style={{
            background: '#fff',
            borderRadius: '18px',
            padding: '0',
            maxWidth: '540px',
            width: '100%',
            margin: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            {/* Popup Header */}
            {(() => {
              const stg = stagePopup.stage;
              const idx = stagePopup.index;
              const stageIcons = stagePopup.stageIcons || ['📞','📄','💰','🛒','📦','🏭','🔍','🚚','🔧','🏁'];
              const statusColors = {
                completed: { bg: '#d1fae5', text: '#065f46', label: '✔ Completed' },
                in_progress: { bg: '#dbeafe', text: '#1e40af', label: '⏳ In Progress' },
                failed: { bg: '#fee2e2', text: '#991b1b', label: '✖ Failed' },
                pending: { bg: '#f1f5f9', text: '#475569', label: '◷ Pending' },
              };
              const sc = statusColors[stg.status] || statusColors.pending;

              // Duration calculations
              let stageDuration = '';
              if (stg.date && stagePopup.prevDate) {
                const diff = new Date(stg.date) - new Date(stagePopup.prevDate);
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                stageDuration = days > 0 ? `${days} day${days > 1 ? 's' : ''}` : hours > 0 ? `${hours} hr${hours > 1 ? 's' : ''}` : `${mins} min`;
              }

              return (
                <>
                  {/* Coloured header band */}
                  <div style={{
                    background: stg.status === 'completed' ? 'linear-gradient(135deg,#059669,#10b981)' :
                               stg.status === 'in_progress' ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' :
                               stg.status === 'failed' ? 'linear-gradient(135deg,#b91c1c,#ef4444)' :
                               'linear-gradient(135deg,#475569,#64748b)',
                    padding: '20px 24px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '28px' }}>{stageIcons[idx]}</div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Stage {idx + 1} of {wakeUpRoadmapData?.stages?.length || 10}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff', lineHeight: 1.2 }}>{stg.title}</div>
                      </div>
                    </div>
                    <button onClick={() => setStagePopup(null)} style={{
                      background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                      width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>×</button>
                  </div>

                  {/* Popup Content */}
                  <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Status badge */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', background: sc.bg, color: sc.text }}>
                        {sc.label}
                      </span>
                      {stageDuration && (
                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: '#f0f9ff', color: '#0369a1' }}>
                          ⏱ {stageDuration} to complete
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {stg.description && (
                      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Stage Description</div>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.6 }}>{stg.description}</p>
                      </div>
                    )}

                    {/* Timestamps Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {stg.date && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px' }}>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', marginBottom: '4px' }}>📅 Stage Completed</div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534' }}>
                            {new Date(stg.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '2px' }}>
                            🕒 {new Date(stg.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      )}
                      {stagePopup.prevDate && (
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px' }}>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#1d4ed8', textTransform: 'uppercase', marginBottom: '4px' }}>📅 Previous Stage</div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e3a8a' }}>
                            {new Date(stagePopup.prevDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '2px' }}>
                            🕒 {new Date(stagePopup.prevDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Processed By */}
                    {stg.processedBy && (
                      <div style={{ background: 'linear-gradient(135deg,#faf5ff,#ede9fe)', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '16px', color: '#fff', fontWeight: '900', flexShrink: 0
                        }}>
                          {stg.processedBy?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase' }}>👤 Processed By</div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#4c1d95' }}>{stg.processedBy}</div>
                          {stg.processedByRole && <div style={{ fontSize: '11px', color: '#7c3aed' }}>{stg.processedByRole}</div>}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {stg.notes && (
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#b45309', textTransform: 'uppercase', marginBottom: '4px' }}>📝 Notes</div>
                        <p style={{ margin: 0, fontSize: '12.5px', color: '#78350f', lineHeight: 1.5 }}>{stg.notes}</p>
                      </div>
                    )}

                    {/* Navigation between stages */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '4px' }}>
                      <button
                        onClick={() => {
                          if (idx > 0) {
                            const newIdx = idx - 1;
                            const newStg = wakeUpRoadmapData.stages[newIdx];
                            const prev = wakeUpRoadmapData.stages.slice(0, newIdx).reverse().find(s => s.date);
                            setWakeUpInspectStage(newIdx);
                            setStagePopup({ stage: newStg, index: newIdx, prevDate: prev?.date || null, stageIcons });
                          }
                        }}
                        disabled={idx === 0}
                        style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', background: idx === 0 ? '#f8fafc' : '#fff', color: idx === 0 ? '#cbd5e1' : 'var(--text-main)', cursor: idx === 0 ? 'default' : 'pointer', fontSize: '13px', fontWeight: '700' }}
                      >
                        ← Prev Stage
                      </button>
                      <button
                        onClick={() => setStagePopup(null)}
                        style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}
                      >
                        Done
                      </button>
                      <button
                        onClick={() => {
                          if (wakeUpRoadmapData && idx < wakeUpRoadmapData.stages.length - 1) {
                            const newIdx = idx + 1;
                            const newStg = wakeUpRoadmapData.stages[newIdx];
                            const prev = wakeUpRoadmapData.stages.slice(0, newIdx).reverse().find(s => s.date);
                            setWakeUpInspectStage(newIdx);
                            setStagePopup({ stage: newStg, index: newIdx, prevDate: prev?.date || null, stageIcons });
                          }
                        }}
                        disabled={!wakeUpRoadmapData || idx === wakeUpRoadmapData.stages.length - 1}
                        style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', background: (!wakeUpRoadmapData || idx === wakeUpRoadmapData.stages.length - 1) ? '#f8fafc' : '#fff', color: (!wakeUpRoadmapData || idx === wakeUpRoadmapData.stages.length - 1) ? '#cbd5e1' : 'var(--text-main)', cursor: (!wakeUpRoadmapData || idx === wakeUpRoadmapData.stages.length - 1) ? 'default' : 'pointer', fontSize: '13px', fontWeight: '700' }}
                      >
                        Next Stage →
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* --- APPROVAL DETAIL DRILL DOWN MODAL --- */}
      {selectedApprovalDetail && (
        <div className="modal-backdrop" style={{ zIndex: 1250 }}>
          <div className="modal-content" style={{ maxWidth: '550px', padding: '24px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedApprovalDetail.cardTitle}</h3>
              <button type="button" className="modal-close" onClick={() => setSelectedApprovalDetail(null)}>×</button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '10px',
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginTop: '12px'
            }}>
              {selectedApprovalDetail.detailsGrid.map(([k, v]) => (
                <div key={k} style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}:</span>
                  <strong style={{ color: 'var(--text-main)', textAlign: 'right' }}>{v}</strong>
                </div>
              ))}
            </div>

            {/* Decision panel inside Modal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              <input
                placeholder="Add CEO feedback / notes (required to Reject)..."
                value={actionNotes[selectedApprovalDetail.item._id] || ''}
                onChange={e => handleNotesChange(selectedApprovalDetail.item._id, e.target.value)}
                disabled={actioningId === selectedApprovalDetail.item._id}
                style={{
                  padding: '10px 14px',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: '#fff',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleApprovalAction(
                    selectedApprovalDetail.activeApprovalTab === 'purchases' || selectedApprovalDetail.activeApprovalTab === 'stock' ? 'purchase' : selectedApprovalDetail.activeApprovalTab, 
                    selectedApprovalDetail.item._id, 
                    'approved'
                  )}
                  disabled={actioningId === selectedApprovalDetail.item._id}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#10b981' }}
                >
                  ✔️ Approve Request
                </button>
                <button
                  onClick={() => handleApprovalAction(
                    selectedApprovalDetail.activeApprovalTab === 'purchases' || selectedApprovalDetail.activeApprovalTab === 'stock' ? 'purchase' : selectedApprovalDetail.activeApprovalTab, 
                    selectedApprovalDetail.item._id, 
                    'rejected'
                  )}
                  disabled={actioningId === selectedApprovalDetail.item._id}
                  className="btn btn-danger"
                >
                  ❌ Reject Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Render breakup modal details */}
      {selectedBreakup && renderBreakupModal()}

    </div>
  );
}
