'use client';
import { useState, useEffect } from 'react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const getLocalDateString = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AttendancePage() {
  const now = new Date();
  
  // Tabs: 'daily' | 'worklogs' | 'grid' | 'monthly'
  const [activeTab, setActiveTab] = useState('daily');
  
  // Common states
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');

  // Tab 1: Daily Marking (Salaried) states
  const [dailyDate, setDailyDate] = useState(getLocalDateString(now));
  const [dailyAttendance, setDailyAttendance] = useState({}); // { [empId]: { status, overtime_hours, notes } }
  const [loadingDaily, setLoadingDaily] = useState(false);

  // Tab 2: Freelancer Work Logs states
  const [workLogDate, setWorkLogDate] = useState(getLocalDateString(now));
  const [dailyWorkLogs, setDailyWorkLogs] = useState({}); // { [empId]: { hours_worked, description } }
  const [loadingWorkLogs, setLoadingWorkLogs] = useState(false);

  // Tab 3: Monthly Grid Sheet states
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [gridFilter, setGridFilter] = useState('all'); // 'all' | 'employee' | 'freelancer'
  const [gridDailyData, setGridDailyData] = useState({}); // { [empId]: { [day]: status } }
  const [gridWorkData, setGridWorkData] = useState({}); // { [empId]: { [day]: hours_worked } }
  const [loadingGrid, setLoadingGrid] = useState(false);

  // Tab 4: Monthly Summary states
  const [attendance, setAttendance] = useState({}); // { [empId]: { total_working_days, present_days, half_days, late_days, overtime_hours, notes } }
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const getDaysInMonth = (m, y) => new Date(y, m, 0).getDate();
  const daysCount = getDaysInMonth(month, year);

  const workingDaysInMonth = (m, y) => {
    let count = 0;
    const d = new Date(y, m - 1, 1);
    while (d.getMonth() === m - 1) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  };
  const defaultWorkingDays = workingDaysInMonth(month, year);

  // 1. Initial load of active employees
  useEffect(() => {
    const loadEmps = async () => {
      setLoading(true);
      try {
        const er = await fetch('/api/hr/employees?status=active');
        const emps = await er.json();
        setEmployees(Array.isArray(emps) ? emps.filter(e => e.status === 'active') : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadEmps();
  }, []);

  // 2. Load daily attendance when employees or dailyDate changes
  useEffect(() => {
    if (employees.length === 0) return;
    const loadDaily = async () => {
      setLoadingDaily(true);
      try {
        const res = await fetch(`/api/hr/attendance/daily?date=${dailyDate}`);
        const dailyRecords = await res.json();
        const dailyMap = {};
        employees.filter(e => e.type === 'employee').forEach(emp => {
          const existing = Array.isArray(dailyRecords) ? dailyRecords.find(r => r.employee === emp._id) : null;
          dailyMap[emp._id] = {
            status: existing?.status ?? 'present',
            overtime_hours: existing?.overtime_hours ?? 0,
            notes: existing?.notes ?? ''
          };
        });
        setDailyAttendance(dailyMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDaily(false);
      }
    };
    loadDaily();
  }, [employees, dailyDate]);

  // 3. Load daily freelancer work logs when employees or workLogDate changes
  useEffect(() => {
    if (employees.length === 0) return;
    const loadWorkLogs = async () => {
      setLoadingWorkLogs(true);
      try {
        const res = await fetch(`/api/hr/attendance/worklogs?date=${workLogDate}`);
        const logRecords = await res.json();
        const logsMap = {};
        employees.filter(e => e.type !== 'employee').forEach(emp => {
          const existing = Array.isArray(logRecords) ? logRecords.find(r => r.employee === emp._id) : null;
          logsMap[emp._id] = {
            hours_worked: existing?.hours_worked ?? 0,
            description: existing?.description ?? ''
          };
        });
        setDailyWorkLogs(logsMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingWorkLogs(false);
      }
    };
    loadWorkLogs();
  }, [employees, workLogDate]);

  // 4. Load Monthly Grid Sheet data
  const loadGridData = async () => {
    if (employees.length === 0) return;
    setLoadingGrid(true);
    try {
      const [resDaily, resWork] = await Promise.all([
        fetch(`/api/hr/attendance/daily?month=${month}&year=${year}`),
        fetch(`/api/hr/attendance/worklogs?month=${month}&year=${year}`)
      ]);
      const dailyRecords = await resDaily.json();
      const workRecords = await resWork.json();

      const dailyGrid = {};
      const workGrid = {};

      employees.forEach(emp => {
        dailyGrid[emp._id] = {};
        workGrid[emp._id] = {};
      });

      if (Array.isArray(dailyRecords)) {
        dailyRecords.forEach(r => {
          const empId = r.employee?._id || r.employee;
          if (dailyGrid[empId]) {
            const dayNum = new Date(r.date).getUTCDate();
            dailyGrid[empId][dayNum] = r.status;
          }
        });
      }

      if (Array.isArray(workRecords)) {
        workRecords.forEach(r => {
          const empId = r.employee?._id || r.employee;
          if (workGrid[empId]) {
            const dayNum = new Date(r.date).getUTCDate();
            workGrid[empId][dayNum] = r.hours_worked;
          }
        });
      }

      setGridDailyData(dailyGrid);
      setGridWorkData(workGrid);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGrid(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'grid') {
      loadGridData();
    }
  }, [employees, month, year, activeTab, refreshTrigger]);

  // 5. Load monthly summaries when employees or month/year changes
  useEffect(() => {
    if (employees.length === 0) return;
    const loadMonthly = async () => {
      setLoadingMonthly(true);
      try {
        const res = await fetch(`/api/hr/attendance?month=${month}&year=${year}`);
        const attRecords = await res.json();
        const attList = Array.isArray(attRecords) ? attRecords : [];
        const attMap = {};
        employees.forEach(e => {
          const existing = attList.find(a => a.employee?._id === e._id || a.employee === e._id);
          attMap[e._id] = {
            total_working_days: existing?.total_working_days ?? workingDaysInMonth(month, year),
            present_days: existing?.present_days ?? (e.type === 'employee' ? workingDaysInMonth(month, year) : 0),
            half_days: existing?.half_days ?? 0,
            late_days: existing?.late_days ?? 0,
            overtime_hours: existing?.overtime_hours ?? 0,
            notes: existing?.notes ?? ''
          };
        });
        setAttendance(attMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMonthly(false);
      }
    };
    loadMonthly();
  }, [employees, month, year, refreshTrigger]);

  // Updaters
  const updateDailyStatus = (empId, status) => {
    setDailyAttendance(prev => ({ ...prev, [empId]: { ...prev[empId], status } }));
  };

  const updateDailyField = (empId, field, value) => {
    setDailyAttendance(prev => ({ ...prev, [empId]: { ...prev[empId], [field]: value } }));
  };

  const updateWorkLogField = (empId, field, value) => {
    setDailyWorkLogs(prev => ({ ...prev, [empId]: { ...prev[empId], [field]: value } }));
  };

  const updateMonthlyField = (empId, field, value) => {
    setAttendance(prev => ({ ...prev, [empId]: { ...prev[empId], [field]: parseFloat(value) || 0 } }));
  };

  const numInput = (empId, field, label, min = 0, max = 31) => {
    const rec = attendance[empId] || {};
    const val = rec[field] ?? (field === 'total_working_days' ? defaultWorkingDays : 0);
    return (
      <td style={{ padding: '8px', textAlign: 'center' }}>
        <input 
          type="number" 
          min={min} 
          max={max} 
          value={val} 
          onChange={e => updateMonthlyField(empId, field, e.target.value)}
          style={{ 
            width: '60px', 
            padding: '4px 6px', 
            borderRadius: '4px', 
            border: '1px solid var(--card-border)', 
            textAlign: 'center',
            fontSize: '12px' 
          }} 
          title={label}
        />
      </td>
    );
  };

  // Click-to-Cycle status in Grid Sheet
  const cycleGridStatus = async (empId, dayNum) => {
    const currentStatus = gridDailyData[empId]?.[dayNum] || 'unmarked';
    const cycle = {
      unmarked: 'present',
      present: 'late',
      late: 'half_day',
      half_day: 'absent',
      absent: 'unmarked'
    };
    const nextStatus = cycle[currentStatus];

    // Optimistic Update
    setGridDailyData(prev => ({
      ...prev,
      [empId]: { ...prev[empId], [dayNum]: nextStatus }
    }));

    // Save to Database
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    try {
      await fetch('/api/hr/attendance/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dayStr,
          records: [{ employeeId: empId, status: nextStatus, overtime_hours: 0, notes: 'Grid entry' }]
        })
      });
    } catch (e) {
      console.error('Failed to update grid cell', e);
      // Revert if failed
      setGridDailyData(prev => ({
        ...prev,
        [empId]: { ...prev[empId], [dayNum]: currentStatus }
      }));
    }
  };

  const handleBulkFill = async (employeeId, status) => {
    setLoadingGrid(true);
    try {
      const res = await fetch('/api/hr/attendance/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_employee_month',
          employeeId,
          month,
          year,
          status
        })
      });
      if (res.ok) {
        setRefreshTrigger(prev => prev + 1);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to bulk update');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to server.');
    } finally {
      setLoadingGrid(false);
    }
  };

  // Edit Freelancer Hours in Grid Sheet
  const editGridHours = async (empId, dayNum) => {
    const emp = employees.find(e => e._id === empId);
    if (!emp) return;
    const currentHours = gridWorkData[empId]?.[dayNum] || 0;
    const dayLabel = `${dayNum} ${MONTHS[month-1]} ${year}`;
    const newHoursStr = prompt(`Enter hours worked for ${emp.name} on ${dayLabel}:`, currentHours);
    if (newHoursStr === null) return; // cancelled

    const newHours = parseFloat(newHoursStr) || 0;

    // Optimistic Update
    setGridWorkData(prev => ({
      ...prev,
      [empId]: { ...prev[empId], [dayNum]: newHours }
    }));

    // Save
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    try {
      await fetch('/api/hr/attendance/worklogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dayStr,
          records: [{ employeeId: empId, hours_worked: newHours, description: 'Grid entry' }]
        })
      });
    } catch (e) {
      console.error(e);
      // Revert
      setGridWorkData(prev => ({
        ...prev,
        [empId]: { ...prev[empId], [dayNum]: currentHours }
      }));
    }
  };

  // Save Handlers
  const saveDaily = async () => {
    setSaving(true);
    try {
      const salariedRecords = Object.keys(dailyAttendance).map(empId => ({
        employeeId: empId,
        status: dailyAttendance[empId].status,
        overtime_hours: dailyAttendance[empId].overtime_hours,
        notes: dailyAttendance[empId].notes
      }));

      await fetch('/api/hr/attendance/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dailyDate, records: salariedRecords })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const saveWorkLogs = async () => {
    setSaving(true);
    try {
      const flRecords = Object.keys(dailyWorkLogs).map(empId => ({
        employeeId: empId,
        hours_worked: dailyWorkLogs[empId].hours_worked,
        description: dailyWorkLogs[empId].description
      }));

      await fetch('/api/hr/attendance/worklogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: workLogDate, records: flRecords })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const saveMonthly = async () => {
    setSaving(true);
    try {
      await Promise.all(employees.map(emp => {
        const rec = attendance[emp._id] || {};
        const absentDays = Math.max(0, (rec.total_working_days || 0) - (rec.present_days || 0) - (rec.half_days || 0) * 0.5);
        return fetch('/api/hr/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee: emp._id, month, year, ...rec, absent_days: absentDays })
        });
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const filteredEmp = employees.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || (e.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const gridEmployees = filteredEmp.filter(e => {
    if (gridFilter === 'all') return true;
    if (gridFilter === 'employee') return e.type === 'employee';
    if (gridFilter === 'freelancer') return e.type !== 'employee';
    return true;
  });

  const getAttColor = (empId) => {
    const rec = attendance[empId];
    if (!rec) return 'transparent';
    const pct = rec.total_working_days > 0 ? (rec.present_days / rec.total_working_days) * 100 : 0;
    if (pct >= 95) return '#ecfdf5';
    if (pct >= 80) return '#fffbeb';
    return '#fef2f2';
  };

  const getGridCellDisplay = (emp, dayNum) => {
    if (emp.type === 'employee') {
      const status = gridDailyData[emp._id]?.[dayNum] || 'unmarked';
      const styles = {
        present: { text: 'P', bg: '#10b981', color: '#fff' },
        late: { text: 'L', bg: '#f59e0b', color: '#fff' },
        half_day: { text: 'H', bg: '#3b82f6', color: '#fff' },
        absent: { text: 'A', bg: '#ef4444', color: '#fff' },
        unmarked: { text: '-', bg: '#f3f4f6', color: '#9ca3af' }
      };
      const info = styles[status] || styles.unmarked;
      return (
        <div 
          onClick={() => cycleGridStatus(emp._id, dayNum)}
          title={`Click to cycle status. Current: ${status.toUpperCase()}`}
          style={{
            width: '24px', height: '24px', borderRadius: '50%',
            background: info.bg, color: info.color, display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto',
            fontSize: '11px', fontWeight: '800', cursor: 'pointer',
            transition: 'transform 0.1s', userSelect: 'none'
          }}
          onMouseOver={e => e.target.style.transform = 'scale(1.15)'}
          onMouseOut={e => e.target.style.transform = 'scale(1)'}
        >
          {info.text}
        </div>
      );
    } else {
      // Freelancer - Display hours worked
      const hours = gridWorkData[emp._id]?.[dayNum] || 0;
      return (
        <div 
          onClick={() => editGridHours(emp._id, dayNum)}
          title="Click to log hours"
          style={{
            minWidth: '24px', height: '24px', borderRadius: '4px',
            background: hours > 0 ? 'rgba(139, 92, 246, 0.15)' : '#f9fafb',
            color: hours > 0 ? '#8b5cf6' : '#9ca3af', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto',
            fontSize: '11px', fontWeight: '800', border: hours > 0 ? '1px solid rgba(139, 92, 246, 0.3)' : '1px dashed #cbd5e1',
            cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none'
          }}
          onMouseOver={e => e.target.style.background = hours > 0 ? 'rgba(139, 92, 246, 0.25)' : '#f1f5f9'}
          onMouseOut={e => e.target.style.background = hours > 0 ? 'rgba(139, 92, 246, 0.15)' : '#f9fafb'}
        >
          {hours > 0 ? `${hours}h` : '-'}
        </div>
      );
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1350px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>✅ Attendance Panel</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            {activeTab === 'daily' && 'Mark daily check-in states for salaried staff'}
            {activeTab === 'worklogs' && 'Log hours and task descriptions for contract freelancers'}
            {activeTab === 'grid' && 'Detailed day-by-day calendar matrix with inline quick-editing'}
            {activeTab === 'monthly' && 'Review aggregated statistics and monthly payroll calculations'}
          </p>
        </div>
        
        {activeTab !== 'grid' && (
          <button 
            onClick={activeTab === 'daily' ? saveDaily : activeTab === 'worklogs' ? saveWorkLogs : saveMonthly} 
            disabled={saving || loading} 
            style={{
              background: saved ? '#10b981' : 'var(--primary)', color: '#fff', border: 'none',
              padding: '10px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              transition: 'background 0.3s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : '💾 Save Attendance'}
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', flexWrap: 'wrap' }}>
        {[
          { key: 'daily', label: '📅 Daily marking (Salaried)' },
          { key: 'worklogs', label: '🧑‍💻 Freelancer Work Logs' },
          { key: 'grid', label: '🗓️ Monthly Sheet (Day-Wise)' },
          { key: 'monthly', label: '📊 Summaries & Calculate' }
        ].map(t => (
          <button 
            key={t.key}
            onClick={() => setActiveTab(t.key)} 
            style={{
              padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              background: activeTab === t.key ? 'var(--primary)' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--text-muted)',
              border: 'none', transition: 'all 0.2s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Daily Marking (Salaried) */}
      {activeTab === 'daily' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', background: '#fff', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Date:</span>
            <input 
              type="date" 
              value={dailyDate} 
              onChange={e => setDailyDate(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', fontWeight: '700', background: '#fff', color: 'var(--text-main)', outline: 'none' }}
            />
            <input 
              placeholder="Search employee..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ marginLeft: 'auto', padding: '7px 12px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', background: '#fff', color: 'var(--text-main)', outline: 'none', width: '220px' }} 
            />
          </div>

          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)', overflow: 'auto' }}>
            {loading || loadingDaily ? (
              <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: 'var(--card-bg)' }}>
                    {['#', 'Salaried Employee', 'Attendance Status', 'Overtime (Hrs)', 'Daily Comments / Status Notes'].map((h, i) => (
                      <th key={h} style={{ 
                        padding: '12px 10px', 
                        textAlign: i === 1 || i === 4 ? 'left' : 'center', 
                        fontWeight: '700', 
                        color: 'var(--text-muted)', 
                        fontSize: '11px', 
                        textTransform: 'uppercase', 
                        borderBottom: '1px solid var(--card-border)' 
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmp.filter(e => e.type === 'employee').map((emp, idx) => {
                    const rec = dailyAttendance[emp._id] || { status: 'present', overtime_hours: 0, notes: '' };
                    return (
                      <tr key={emp._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{idx + 1}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{emp.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.designation} · {emp.department}</div>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {[
                              { key: 'present', label: 'Present', activeBg: '#ecfdf5', activeColor: '#065f46', activeBorder: '#10b981' },
                              { key: 'late', label: 'Late', activeBg: '#fffbeb', activeColor: '#b45309', activeBorder: '#f59e0b' },
                              { key: 'half_day', label: 'Half-Day', activeBg: '#eff6ff', activeColor: '#1d4ed8', activeBorder: '#3b82f6' },
                              { key: 'absent', label: 'Absent', activeBg: '#fef2f2', activeColor: '#b91c1c', activeBorder: '#ef4444' }
                            ].map(btn => {
                              const isSelected = rec.status === btn.key;
                              return (
                                <button
                                  key={btn.key}
                                  onClick={() => updateDailyStatus(emp._id, btn.key)}
                                  style={{
                                    padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                                    border: isSelected ? `1.5px solid ${btn.activeBorder}` : '1.5px solid #e5e7eb',
                                    background: isSelected ? btn.activeBg : '#f9fafb',
                                    color: isSelected ? btn.activeColor : '#4b5563', transition: 'all 0.15s'
                                  }}
                                >
                                  {btn.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <input 
                            type="number" min="0" max="24" step="0.5"
                            value={rec.overtime_hours}
                            onChange={e => updateDailyField(emp._id, 'overtime_hours', e.target.value)}
                            style={{ width: '58px', padding: '6px 4px', border: '1px solid var(--card-border)', borderRadius: '6px', textAlign: 'center', fontSize: '13px', fontWeight: '700', outline: 'none', background: '#fafafa', color: 'var(--text-main)' }}
                          />
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <input 
                            type="text" placeholder="E.g. Site audit, late due to train, etc."
                            value={rec.notes}
                            onChange={e => updateDailyField(emp._id, 'notes', e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--card-border)', borderRadius: '6px', fontSize: '12px', outline: 'none', background: '#fafafa', color: 'var(--text-main)' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Tab 2: Freelancer Work Logs */}
      {activeTab === 'worklogs' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', background: '#fff', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Date:</span>
            <input 
              type="date" 
              value={workLogDate} 
              onChange={e => setWorkLogDate(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', fontWeight: '700', background: '#fff', color: 'var(--text-main)', outline: 'none' }}
            />
            <input 
              placeholder="Search freelancer..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ marginLeft: 'auto', padding: '7px 12px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', background: '#fff', color: 'var(--text-main)', outline: 'none', width: '220px' }} 
            />
          </div>

          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)', overflow: 'auto' }}>
            {loading || loadingWorkLogs ? (
              <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: 'var(--card-bg)' }}>
                    {['#', 'Freelancer / Consultant', 'Billing Type', 'Hours Performed', 'Work Performed / Tasks Completed'].map((h, i) => (
                      <th key={h} style={{ 
                        padding: '12px 10px', 
                        textAlign: i === 1 || i === 4 ? 'left' : 'center', 
                        fontWeight: '700', 
                        color: 'var(--text-muted)', 
                        fontSize: '11px', 
                        textTransform: 'uppercase', 
                        borderBottom: '1px solid var(--card-border)' 
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmp.filter(e => e.type !== 'employee').map((emp, idx) => {
                    const rec = dailyWorkLogs[emp._id] || { hours_worked: 0, description: '' };
                    return (
                      <tr key={emp._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{idx + 1}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{emp.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.designation} · {emp.department}</div>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '600', color: '#8b5cf6' }}>
                          {emp.rate_type?.toUpperCase()} (₹{emp.basic_salary}/{emp.rate_type === 'hourly' ? 'hr' : 'proj'})
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <input 
                            type="number" min="0" max="24" step="0.5"
                            value={rec.hours_worked}
                            onChange={e => updateWorkLogField(emp._id, 'hours_worked', e.target.value)}
                            style={{ width: '70px', padding: '6px 4px', border: '1px solid var(--card-border)', borderRadius: '6px', textAlign: 'center', fontSize: '13px', fontWeight: '700', outline: 'none', background: '#fafafa', color: 'var(--text-main)' }}
                          />
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <input 
                            type="text" placeholder="E.g. Completed bedroom furniture 3D renders, site wiring layout, etc."
                            value={rec.description}
                            onChange={e => updateWorkLogField(emp._id, 'description', e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--card-border)', borderRadius: '6px', fontSize: '12px', outline: 'none', background: '#fafafa', color: 'var(--text-main)' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {employees.filter(e => e.type !== 'employee').length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No freelancers found. Add active consultants under HR Employees menu.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Tab 3: Monthly Attendance Grid Matrix */}
      {activeTab === 'grid' && (
        <>
          {/* Grid Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', background: '#fff', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Month:</span>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
              style={{ padding: '7px 12px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', fontWeight: '700', background: '#fff' }}>
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}
              style={{ padding: '7px 12px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', fontWeight: '700', background: '#fff' }}>
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginLeft: '16px' }}>Filter Staff:</span>
            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'employee', label: 'Salaried' },
                { key: 'freelancer', label: 'Freelancers' }
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setGridFilter(opt.key)}
                  style={{
                    padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', border: 'none',
                    background: gridFilter === opt.key ? 'var(--primary)' : 'transparent',
                    color: gridFilter === opt.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ marginLeft: 'auto', padding: '7px 12px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', background: '#fff', color: 'var(--text-main)', outline: 'none', width: '200px' }} 
            />
          </div>

          {/* Grid Layout Container */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)', overflow: 'auto' }}>
            {loading || loadingGrid ? (
              <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading month matrix...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--card-bg)' }}>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--card-border)', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', minWidth: '150px', position: 'sticky', left: 0, background: 'var(--card-bg)', zIndex: 5 }}>Employee</th>
                    {Array.from({ length: daysCount }).map((_, i) => (
                      <th key={i+1} style={{ padding: '10px 6px', borderBottom: '1px solid var(--card-border)', textTransform: 'uppercase', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textAlign: 'center', minWidth: '32px' }}>{i+1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gridEmployees.map((emp) => (
                    <tr key={emp._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      {/* Fixed name column on scroll */}
                      <td style={{ 
                        padding: '10px 12px', 
                        position: 'sticky', left: 0, 
                        background: '#ffffff', 
                        borderRight: '1.5px solid var(--card-border)',
                        fontWeight: '700', 
                        color: 'var(--text-main)',
                        boxShadow: '4px 0 6px -4px rgba(0,0,0,0.1)',
                        zIndex: 2
                      }}>
                        <div style={{ fontSize: '12px' }}>{emp.name}</div>
                        <div style={{ fontSize: '9px', color: emp.type === 'employee' ? '#10b981' : '#8b5cf6', fontWeight: '700' }}>
                          {emp.type === 'employee' ? 'Salaried' : 'Hourly'}
                        </div>
                        {emp.type === 'employee' && (
                          <div style={{ marginTop: '6px' }}>
                            <select 
                              defaultValue=""
                              onChange={async (e) => {
                                const val = e.target.value;
                                if (!val) return;
                                if (confirm(`Mark all days of the month as ${val.toUpperCase()} for ${emp.name}?`)) {
                                  await handleBulkFill(emp._id, val);
                                }
                                e.target.value = "";
                              }}
                              style={{ 
                                padding: '2px 4px', 
                                fontSize: '10px', 
                                border: '1px solid #cbd5e1', 
                                borderRadius: '4px', 
                                background: '#f8fafc',
                                color: 'var(--text-muted)',
                                outline: 'none',
                                cursor: 'pointer',
                                width: '100%'
                              }}
                            >
                              <option value="">⚡ Quick Fill</option>
                              <option value="present">All Present</option>
                              <option value="late">All Late</option>
                              <option value="half_day">All Half Day</option>
                              <option value="absent">All Absent</option>
                              <option value="unmarked">All Unmarked</option>
                            </select>
                          </div>
                        )}
                      </td>

                      {/* Calendar date grid columns */}
                      {Array.from({ length: daysCount }).map((_, i) => {
                        const dayNum = i + 1;
                        return (
                          <td key={dayNum} style={{ padding: '8px 4px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                            {getGridCellDisplay(emp, dayNum)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {gridEmployees.length === 0 && (
                    <tr>
                      <td colSpan={daysCount + 1} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No records match the filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Grid Legend */}
          <div style={{ display: 'flex', gap: '14px', marginTop: '14px', flexWrap: 'wrap', background: '#fafafa', padding: '12px 16px', borderRadius: '8px', border: '1px dashed var(--card-border)', fontSize: '12px', color: 'var(--text-muted)' }}>
            <strong>Salaried Grid:</strong>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}/> P = Present (Click to cycle)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}/> L = Late</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}/> H = Half-Day</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}/> A = Absent</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f3f4f6', border: '1px solid #cbd5e1' }}/> - = Unmarked</span>
            <div style={{ borderLeft: '1.5px solid #cbd5e1', height: '16px', margin: '0 8px' }} />
            <strong>Hourly Grid:</strong>
            <span>Shows hours performed (e.g. 8h). Double click a cell to directly log/edit work hours.</span>
          </div>
        </>
      )}

      {/* Tab 4: Monthly Summaries (Summaries & Calculations) */}
      {activeTab === 'monthly' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', background: '#fff', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Period:</span>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
              style={{ padding: '7px 12px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', fontWeight: '700', background: '#fff' }}>
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}
              style={{ padding: '7px 12px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', fontWeight: '700', background: '#fff' }}>
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
              📅 Working Days in {MONTHS[month-1]}: <strong>{defaultWorkingDays}</strong>
            </div>
            
            <input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ marginLeft: 'auto', padding: '7px 12px', border: '1px solid var(--card-border)', borderRadius: '7px', fontSize: '13px', background: '#fff', color: 'var(--text-main)', outline: 'none', width: '220px' }} />
          </div>

          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)', overflow: 'auto' }}>
            {loading || loadingMonthly ? (
              <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading summaries...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '850px' }}>
                <thead>
                  <tr style={{ background: 'var(--card-bg)' }}>
                    {['#', 'Employee Name', 'Staff Type', 'Working Days', 'Present Days', 'Half Days', 'Late Days', 'OT / Logged Hours', 'Absent Calc', 'Attendance %'].map(h => (
                      <th key={h} style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid var(--card-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmp.map((emp, idx) => {
                    const rec = attendance[emp._id] || {};
                    const absent = emp.type === 'employee' ? Math.max(0, (rec.total_working_days || 0) - (rec.present_days || 0) - (rec.half_days || 0) * 0.5) : 0;
                    const pct = emp.type === 'employee' && rec.total_working_days > 0 ? Math.round((rec.present_days || 0) / rec.total_working_days * 100) : 100;
                    return (
                      <tr key={emp._id} style={{ borderBottom: '1px solid var(--card-border)', background: emp.type === 'employee' ? getAttColor(emp._id) : 'transparent' }}>
                        <td style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'left' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{emp.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.designation} · {emp.department}</div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: '700', color: emp.type === 'employee' ? '#10b981' : '#8b5cf6' }}>
                          {emp.type === 'employee' ? 'Salaried' : 'Hourly'}
                        </td>
                        {numInput(emp._id, 'total_working_days', 'Total Working Days', 1, 31)}
                        {numInput(emp._id, 'present_days', 'Present Days', 0, 31)}
                        {numInput(emp._id, 'half_days', 'Half Days', 0, 31)}
                        {numInput(emp._id, 'late_days', 'Late Days', 0, 31)}
                        {numInput(emp._id, 'overtime_hours', emp.type === 'employee' ? 'Overtime Hours' : 'Total Logged Hours', 0, 500)}
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: '800', color: absent > 3 ? '#ef4444' : 'var(--text-main)' }}>
                          {emp.type === 'employee' ? absent.toFixed(1) : '—'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {emp.type === 'employee' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontWeight: '800', fontSize: '13px', color: pct >= 95 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#ef4444' }}>{pct}%</span>
                              <div style={{ width: '60px', height: '5px', background: '#f3f4f6', borderRadius: '3px' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 95 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#ef4444', borderRadius: '3px' }} />
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Hourly Sum</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
