import dbConnect from '@/lib/dbConnect';
import {
  Client, Quotation, Project, Payment, Invoice, Design,
  MaterialTransaction, MaterialStock, Manufacturing, QC,
  Installation, AMC, Employee, LeaveRequest, Payroll, Expense,
  VendorPayable, Attendance, User, ActivityLog, SupervisorInput,
  DailyAttendance, WorkLog, Logistics, TransportLogistics, Settings
} from '@/lib/models';

const GEMINI_MODEL = 'gemini-2.5-flash';

// ─────────────────────────────────────────────
// Helper: format currency
// ─────────────────────────────────────────────
function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

// ─────────────────────────────────────────────
// Detect intent keywords (broadened)
// ─────────────────────────────────────────────
function matches(q, ...patterns) {
  return patterns.some(p => q.match(p));
}

// ─────────────────────────────────────────────
// CORE: Fetch ALL real data based on query + access
// ─────────────────────────────────────────────
async function fetchLiveContext(message, allowedPages, username, userRole) {
  await dbConnect();
  const q = message.toLowerCase();
  const isCEO = userRole === 'ceo' || userRole === 'admin';
  const ctx = {};

  const canAccess = (...pages) =>
    isCEO || pages.some(p => allowedPages.includes(p));

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  // ─── STOCK / PURCHASE ──────────────────────────────────────────────
  if (matches(q, /stock|material|inventory|purchase|item|low stock|return stock|issue stock|raw material/)) {
    if (canAccess('purchase', 'dashboard')) {
      const stocks = await MaterialStock.find({}).lean();
      const allTxs = await MaterialTransaction.find({}).populate('material').lean();
      const todayTxs = allTxs.filter(t => new Date(t.createdAt) >= todayStart);

      ctx.stock = {
        totalItems: stocks.length,
        totalValue: stocks.reduce((s, i) => s + ((i.current_stock || 0) * (i.rate || 0)), 0),
        lowStockItems: stocks.filter(s => (s.current_stock || 0) <= (s.min_stock || 10)).map(s => ({
          name: s.material_name, current: s.current_stock, unit: s.unit, min: s.min_stock || 10
        })),
        allItems: stocks.map(s => ({
          name: s.material_name, qty: s.current_stock, unit: s.unit,
          rate: s.rate, value: (s.current_stock || 0) * (s.rate || 0)
        })),
        todayIssued: todayTxs.filter(t => t.transaction_type === 'issue').map(t => ({
          material: t.material?.material_name || t.material_name, qty: t.quantity, project: t.project_site
        })),
        todayReturned: todayTxs.filter(t => t.transaction_type === 'return').map(t => ({
          material: t.material?.material_name || t.material_name, qty: t.quantity
        })),
        todayPurchased: todayTxs.filter(t => t.transaction_type === 'purchase').map(t => ({
          material: t.material?.material_name || t.material_name, qty: t.quantity, cost: t.total_cost
        }))
      };
    }
  }

  // ─── CLIENTS / CRM / SALES ──────────────────────────────────────────
  if (matches(q, /client|lead|prospect|quotation|crm|sale|pipeline|won|lost/)) {
    if (canAccess('clients', 'dashboard')) {
      const clients = await Client.find({}).lean();
      const quotations = await Quotation.find({}).populate('client').lean();

      ctx.sales = {
        totalClients: clients.length,
        leads: clients.filter(c => c.stage === 'lead').length,
        prospects: clients.filter(c => c.stage === 'prospect').length,
        quotationSent: clients.filter(c => c.stage === 'quotation_sent').length,
        won: clients.filter(c => c.stage === 'won').length,
        lost: clients.filter(c => c.stage === 'lost').length,
        totalPipelineValue: inr(clients.reduce((s, c) => s + (c.approx_value || 0), 0)),
        wonValue: inr(clients.filter(c => c.stage === 'won').reduce((s, c) => s + (c.approx_value || 0), 0)),
        totalQuotations: quotations.length,
        acceptedQuotes: quotations.filter(q => q.status === 'accepted').length,
        pendingQuotes: quotations.filter(q => q.status === 'sent' || q.status === 'pending').length,
        rejectedQuotes: quotations.filter(q => q.status === 'rejected').length,
        recentClients: clients.slice(-10).map(c => ({
          name: c.name, company: c.company, stage: c.stage, value: inr(c.approx_value), source: c.source
        })),
        thisWeekClients: clients.filter(c => new Date(c.createdAt) >= weekStart).map(c => ({
          name: c.name, stage: c.stage
        }))
      };
    }
  }

  // ─── PROJECTS ──────────────────────────────────────────────────────
  if (matches(q, /project|contract|site|budget|ongoing|profit|loss|p&l|pl|pending|complete/)) {
    if (canAccess('projects', 'dashboard')) {
      const projects = await Project.find({}).populate('client').lean();
      const allInvoices = await Invoice.find({}).populate('project').lean();
      const allExpenses = await Expense.find({}).lean();
      const allPayments = await Payment.find({}).populate('project').lean();

      const projectPL = projects.map(p => {
        const pid = p._id.toString();
        const projInvoices = allInvoices.filter(i => i.project?.toString() === pid || i.project?._id?.toString() === pid);
        const projExpenses = allExpenses.filter(e => e.project?.toString() === pid);
        const projPayments = allPayments.filter(pay => pay.project?.toString() === pid || pay.project?._id?.toString() === pid);
        const revenue = projPayments.reduce((s, pay) => s + (pay.amount || 0), 0);
        const expenses = projExpenses.reduce((s, e) => s + (e.amount || 0), 0);
        const invoiced = projInvoices.reduce((s, i) => s + (i.amount || 0), 0);
        const profit = revenue - expenses;
        return {
          name: p.name,
          client: p.client?.name,
          status: p.status,
          contractValue: inr(p.value || 0),
          totalInvoiced: inr(invoiced),
          totalCollected: inr(revenue),
          totalExpenses: inr(expenses),
          profit: inr(profit),
          profitStatus: profit >= 0 ? 'PROFIT' : 'LOSS',
          startDate: p.start_date,
          endDate: p.end_date
        };
      });

      ctx.projects = {
        total: projects.length,
        inProgress: projects.filter(p => p.status === 'in_progress').length,
        completed: projects.filter(p => p.status === 'completed').length,
        onHold: projects.filter(p => p.status === 'on_hold').length,
        totalContractValue: inr(projects.reduce((s, p) => s + (p.value || 0), 0)),
        profitLossPerProject: projectPL,
        completedThisWeek: projects.filter(p => p.status === 'completed' && new Date(p.updatedAt) >= weekStart).map(p => p.name),
        completedThisMonth: projects.filter(p => p.status === 'completed' && new Date(p.updatedAt) >= monthStart).map(p => p.name),
        completedThisYear: projects.filter(p => p.status === 'completed' && new Date(p.updatedAt) >= yearStart).length
      };
    }
  }

  // ─── FINANCE: PAYMENTS / INVOICES / EXPENSES / OUTSTANDING ──────────
  if (matches(q, /payment|invoice|revenue|account|expense|outstanding|receivable|payable|profit|loss|cash|finance|money|tax|gst|received|due/)) {
    if (canAccess('payments', 'dashboard')) {
      const invoices = await Invoice.find({}).populate({ path: 'project', populate: { path: 'client' } }).lean();
      const payments = await Payment.find({}).lean();
      const expenses = await Expense.find({}).lean();
      const vendorPayables = await VendorPayable.find({}).lean();

      const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const totalInvoiced = invoices.reduce((s, i) => s + (i.amount || 0), 0);
      const outstandingInvoices = invoices.filter(i => i.status === 'unpaid' || i.status === 'partial');
      const outstandingAmount = outstandingInvoices.reduce((s, i) => s + (i.outstanding_amount || i.amount || 0), 0);
      const vendorDue = vendorPayables.filter(v => v.status !== 'paid').reduce((s, v) => s + (v.amount || 0), 0);
      const todayPayments = payments.filter(p => new Date(p.payment_date) >= todayStart);

      ctx.finance = {
        summary: {
          totalInvoiced: inr(totalInvoiced),
          totalReceived: inr(totalRevenue),
          outstandingDue: inr(outstandingAmount),
          totalExpenses: inr(totalExpenses),
          netProfit: inr(totalRevenue - totalExpenses),
          vendorPayablesDue: inr(vendorDue)
        },
        todayReceived: {
          count: todayPayments.length,
          amount: inr(todayPayments.reduce((s, p) => s + (p.amount || 0), 0)),
          details: todayPayments.map(p => ({ amount: inr(p.amount), method: p.payment_method, ref: p.reference }))
        },
        outstandingClients: outstandingInvoices.slice(0, 20).map(i => ({
          client: i.project?.client?.name || 'N/A', project: i.project?.name || 'N/A',
          amount: inr(i.outstanding_amount || i.amount), invoiceNo: i.invoice_number, status: i.status
        })),
        recentExpenses: expenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10).map(e => ({
          category: e.category, amount: inr(e.amount), date: e.expense_date, description: e.description
        })),
        expenseByCategory: expenses.reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
          return acc;
        }, {}),
        thisMonthRevenue: inr(payments.filter(p => new Date(p.payment_date) >= monthStart).reduce((s, p) => s + (p.amount || 0), 0)),
        thisMonthExpenses: inr(expenses.filter(e => new Date(e.expense_date) >= monthStart).reduce((s, e) => s + (e.amount || 0), 0))
      };
    }
  }

  // ─── HR / EMPLOYEES / PAYROLL / ATTENDANCE ────────────────────────
  if (matches(q, /employee|staff|hr|payroll|salary|leave|attendance|team|freelancer|consultant|active hour|working hour|department|who work/)) {
    if (canAccess('hr', 'dashboard')) {
      const employees = await Employee.find({}).lean();
      const leaves = await LeaveRequest.find({}).lean();
      const payrolls = await Payroll.find({}).lean();
      const supervisorInputs = await SupervisorInput.find({
        date: { $gte: weekStart }
      }).populate('records.employee').lean();

      // Today's attendance via supervisor logs
      const todaySupervisorInputs = await SupervisorInput.find({
        date: { $gte: todayStart }
      }).populate('supervisor').populate('records.employee').lean();

      const employeeHours = {};
      supervisorInputs.forEach(log => {
        (log.records || []).forEach(rec => {
          const eid = rec.employee?._id?.toString() || rec.employee?.toString();
          const empName = rec.employee?.name || 'Unknown';
          if (!employeeHours[eid]) {
            employeeHours[eid] = { name: empName, designation: rec.employee?.designation, totalHours: 0, days: 0 };
          }
          employeeHours[eid].totalHours += (rec.hours_worked || 0);
          employeeHours[eid].days += 1;
        });
      });

      // Group by department
      const byDept = employees.reduce((acc, e) => {
        const dept = e.department || 'General';
        if (!acc[dept]) acc[dept] = { total: 0, active: 0 };
        acc[dept].total++;
        if (e.status === 'active') acc[dept].active++;
        return acc;
      }, {});

      ctx.hr = {
        totalEmployees: employees.length,
        activeEmployees: employees.filter(e => e.status === 'active').length,
        byDepartment: byDept,
        byType: {
          salaried: employees.filter(e => e.type === 'employee').length,
          freelancers: employees.filter(e => e.type === 'freelancer').length,
          consultants: employees.filter(e => e.type === 'consultant').length
        },
        pendingLeaves: leaves.filter(l => l.status === 'pending').length,
        approvedLeavesToday: leaves.filter(l => l.status === 'approved' &&
          new Date(l.start_date) <= now && new Date(l.end_date) >= now).length,
        thisMonthPayrollPaid: inr(payrolls.filter(p => p.status === 'paid' &&
          new Date(p.createdAt) >= monthStart).reduce((s, p) => s + (p.net_salary || 0), 0)),
        totalPayrollThisMonth: inr(payrolls.filter(p => p.month === now.getMonth() + 1 &&
          p.year === now.getFullYear()).reduce((s, p) => s + (p.net_salary || 0), 0)),
        weeklyHoursByEmployee: Object.values(employeeHours).sort((a, b) => b.totalHours - a.totalHours),
        todaySupervisorInputsSubmitted: todaySupervisorInputs.length > 0,
        todaySupervisorDetails: todaySupervisorInputs.map(s => ({
          supervisor: s.supervisor?.name || 'Unknown',
          employees: (s.records || []).map(r => ({
            name: r.employee?.name, hours: r.hours_worked, notes: r.notes
          }))
        })),
        employeeList: employees.map(e => ({
          name: e.name, code: e.employee_code, designation: e.designation,
          department: e.department, type: e.type, status: e.status,
          salary: isCEO ? inr(e.basic_salary) : undefined
        }))
      };
    }
  }

  // ─── MANUFACTURING / QC / PRODUCTION ─────────────────────────────
  if (matches(q, /manufactur|fabricat|production|qc|quality|dispatch|deliver|complete|pending/)) {
    if (canAccess('manufacturing', 'dashboard')) {
      const mfgs = await Manufacturing.find({}).populate('project').lean();
      const qcs = await QC.find({}).populate('project').lean();
      const logistics = await Logistics.find({}).populate('project').lean().catch(() => []);

      const completedToday = mfgs.filter(m => m.status === 'finished' && new Date(m.updatedAt) >= todayStart);
      const completedThisWeek = mfgs.filter(m => m.status === 'finished' && new Date(m.updatedAt) >= weekStart);
      const completedThisMonth = mfgs.filter(m => m.status === 'finished' && new Date(m.updatedAt) >= monthStart);

      ctx.manufacturing = {
        totalJobs: mfgs.length,
        scheduled: mfgs.filter(m => m.status === 'scheduled').length,
        inProgress: mfgs.filter(m => m.status === 'in_progress').length,
        completed: mfgs.filter(m => m.status === 'finished').length,
        inProgressList: mfgs.filter(m => m.status === 'in_progress').map(m => ({
          project: m.project?.name || 'N/A', notes: m.notes || 'In progress manufacturing'
        })),
        completedToday: completedToday.map(m => ({ project: m.project?.name || 'N/A', notes: m.notes || 'Completed job' })),
        completedThisWeek: completedThisWeek.map(m => ({ project: m.project?.name || 'N/A', notes: m.notes || 'Completed job' })),
        completedThisMonth: completedThisMonth.length,
        qc: {
          total: qcs.length,
          passed: qcs.filter(q => q.status === 'approved').length,
          failed: qcs.filter(q => q.status === 'rejected').length,
          pending: qcs.filter(q => q.status === 'pending').length,
          pendingList: qcs.filter(q => q.status === 'pending').map(q => ({
            project: q.project?.name || 'N/A', checklist: q.description || 'Pending QC checklist check'
          })),
          recentFailed: qcs.filter(q => q.status === 'rejected').slice(-5).map(q => ({
            project: q.project?.name || 'N/A', reason: q.approval_notes || q.description || 'Failed verification', date: q.createdAt
          }))
        },
        deliveries: logistics.map(l => ({
          project: l.project?.name || 'N/A', status: l.status, scheduledDate: l.date, driver: l.driver
        }))
      };
    }
  }

  // ─── INSTALLATION / SUPERVISOR ────────────────────────────────────
  if (matches(q, /install|site|supervisor|schedule|completion|active project/)) {
    if (canAccess('installation', 'dashboard')) {
      const installs = await Installation.find({}).populate('project').lean();
      const supervisorInputsToday = await SupervisorInput.find({
        date: { $gte: todayStart }
      }).populate('supervisor').lean();

      const completedThisWeek = installs.filter(i => i.status === 'completed' && new Date(i.updatedAt) >= weekStart);
      const completedThisMonth = installs.filter(i => i.status === 'completed' && new Date(i.updatedAt) >= monthStart);
      const completedThisYear = installs.filter(i => i.status === 'completed' && new Date(i.updatedAt) >= yearStart);

      // Get all supervisors from employees
      const supervisors = await Employee.find({
        $or: [{ designation: /supervisor/i }, { department: /site/i }]
      }).lean();

      const supervisorsWhoSubmittedToday = supervisorInputsToday.map(s => s.supervisor?.name || s.supervisor?._id);

      ctx.installation = {
        total: installs.length,
        scheduled: installs.filter(i => i.status === 'scheduled').length,
        active: installs.filter(i => i.status === 'in_progress').length,
        completed: installs.filter(i => i.status === 'completed').length,
        completedThisWeek: completedThisWeek.map(i => ({ project: i.project?.name, supervisor: i.supervisor })),
        completedThisMonth: completedThisMonth.map(i => ({ project: i.project?.name })),
        completedThisYearCount: completedThisYear.length,
        activeProjectsList: installs.filter(i => i.status !== 'completed').map(i => ({
          project: i.project?.name, status: i.status, scheduledDate: i.scheduled_date,
          supervisor: i.supervisor, manpower: i.manpower_count
        })),
        supervisorAttendanceToday: {
          submitted: supervisorInputsToday.length,
          supervisorNames: supervisorsWhoSubmittedToday,
          totalSupervisors: supervisors.length,
          notSubmitted: supervisors.filter(s => !supervisorsWhoSubmittedToday.some(n => n === s.name)).map(s => s.name)
        }
      };
    }
  }

  // ─── DESIGN ─────────────────────────────────────────────────────
  if (matches(q, /design|2d|3d|drawing|plan|render|approval/)) {
    if (canAccess('designing', 'dashboard')) {
      const designs = await Design.find({}).populate('client').lean();
      ctx.designs = {
        total: designs.length,
        approved: designs.filter(d => d.approval_status === 'approved').length,
        pending: designs.filter(d => d.approval_status === 'pending').length,
        rejected: designs.filter(d => d.approval_status === 'rejected').length,
        pendingList: designs.filter(d => d.approval_status === 'pending').map(d => ({
          client: d.client?.name || 'N/A', type: d.design_type
        })),
        recentApproved: designs.filter(d => d.approval_status === 'approved').slice(-5).map(d => ({
          client: d.client?.name || 'N/A', type: d.design_type, date: d.updatedAt
        }))
      };
    }
  }

  // ─── AMC ─────────────────────────────────────────────────────────
  if (matches(q, /amc|maintenance|contract|service|annual/)) {
    if (canAccess('amc', 'dashboard')) {
      const amcs = await AMC.find({}).populate('client').lean();
      const expiringSoon = amcs.filter(a => {
        const exp = new Date(a.expiry_date);
        const diff = (exp - now) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 30;
      });
      ctx.amc = {
        total: amcs.length,
        active: amcs.filter(a => a.status === 'active').length,
        expired: amcs.filter(a => a.status === 'expired').length,
        expiringSoon: expiringSoon.map(a => ({ client: a.client?.name, expiresOn: a.expiry_date })),
        totalValue: inr(amcs.reduce((s, a) => s + (a.amount || 0), 0)),
        list: amcs.map(a => ({ client: a.client?.name, status: a.status, amount: inr(a.amount), expiry: a.expiry_date }))
      };
    }
  }

  // ─── ACTIVITY LOG / WEEKLY REPORTS / ERRORS ──────────────────────
  if (matches(q, /report|work|activity|week|performed|log|active hour|download|error|mistake|who did|what did|employee action|audit/)) {
    const since = new Date(now); since.setDate(now.getDate() - 7);
    const logQuery = { createdAt: { $gte: since } };
    if (!isCEO && username) logQuery.username = username;

    const logs = await ActivityLog.find(logQuery).sort({ createdAt: -1 }).limit(1000).lean();

    const userStats = {};
    for (const log of logs) {
      const u = log.username;
      if (!userStats[u]) {
        userStats[u] = { username: u, role: log.user_role, totalActions: 0, downloads: [], errors: [], actionsByType: {}, byModule: {}, logsByDay: {} };
      }
      userStats[u].totalActions++;
      userStats[u].actionsByType[log.action_type] = (userStats[u].actionsByType[log.action_type] || 0) + 1;
      userStats[u].byModule[log.module] = (userStats[u].byModule[log.module] || 0) + 1;

      if (log.action_type === 'download') {
        userStats[u].downloads.push({ time: log.createdAt, desc: log.description, module: log.module });
      }
      if (log.action_type === 'error' || log.description?.toLowerCase().includes('error') || log.description?.toLowerCase().includes('failed')) {
        userStats[u].errors.push({ time: log.createdAt, desc: log.description, module: log.module });
      }

      const day = new Date(log.createdAt).toISOString().split('T')[0];
      if (!userStats[u].logsByDay[day]) userStats[u].logsByDay[day] = [];
      userStats[u].logsByDay[day].push(new Date(log.createdAt).getTime());
    }

    const teamStats = Object.values(userStats).map(u => {
      let ms = 0;
      for (const day in u.logsByDay) {
        const ts = u.logsByDay[day].sort((a, b) => a - b);
        if (ts.length === 1) { ms += 10 * 60000; continue; }
        let start = ts[0]; let last = ts[0];
        for (let i = 1; i < ts.length; i++) {
          if (ts[i] - last <= 30 * 60000) { last = ts[i]; }
          else { ms += (last - start) + 10 * 60000; start = ts[i]; last = ts[i]; }
        }
        ms += (last - start) + 10 * 60000;
      }
      return {
        username: u.username, role: u.role,
        totalActions: u.totalActions,
        estimatedHours: parseFloat((ms / 3600000).toFixed(1)),
        downloads: u.downloads,
        errors: u.errors,
        topModules: u.byModule,
        actionBreakdown: u.actionsByType
      };
    });

    ctx.activityReport = {
      period: 'Last 7 Days',
      currentUser: username,
      userRole,
      totalLogs: logs.length,
      teamStats,
      recentLogs: logs.slice(0, 30).map(l => ({
        user: l.username, time: l.createdAt, action: l.action_type, module: l.module, description: l.description
      }))
    };
  }

  // ─── GENERIC DASHBOARD (always for CEO or broad queries) ──────────
  if (isCEO || matches(q, /dashboard|overview|summary|status|everything|all|total|today/)) {
    if (canAccess('dashboard')) {
      const [clients, projects, invoices, payments, employees, mfgs, installs] = await Promise.all([
        Client.countDocuments(),
        Project.find({}).lean(),
        Invoice.find({}).lean(),
        Payment.find({}).lean(),
        Employee.find({ status: 'active' }).lean(),
        Manufacturing.find({}).lean(),
        Installation.find({}).lean()
      ]);

      const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
      const totalExpenses = await Expense.find({}).lean().then(es => es.reduce((s, e) => s + (e.amount || 0), 0));
      const outstanding = invoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + (i.amount || 0), 0);

      ctx.dashboard = {
        totalClients: clients,
        activeProjects: projects.filter(p => p.status === 'in_progress').length,
        completedProjects: projects.filter(p => p.status === 'completed').length,
        totalRevenue: inr(totalRevenue),
        totalExpenses: inr(totalExpenses),
        netProfit: inr(totalRevenue - totalExpenses),
        outstandingDue: inr(outstanding),
        activeEmployees: employees.length,
        manufacturingInProgress: mfgs.filter(m => m.status === 'in_progress').length,
        installationsActive: installs.filter(i => i.status === 'in_progress').length,
        todayPayments: inr(payments.filter(p => new Date(p.payment_date) >= todayStart).reduce((s, p) => s + (p.amount || 0), 0))
      };
    }
  }

  return ctx;
}

// ─────────────────────────────────────────────
// PAGE NAVIGATION MAP
// ─────────────────────────────────────────────
const PAGE_ROUTES = {
  'stock': '/purchase', 'purchase': '/purchase', 'material': '/purchase', 'inventory': '/purchase',
  'client': '/clients', 'lead': '/clients', 'crm': '/clients', 'sales': '/clients',
  'project': '/projects', 'contract': '/projects',
  'payment': '/payments', 'invoice': '/payments', 'finance': '/payments', 'accounts': '/payments',
  'employee': '/hr/employees', 'staff': '/hr/employees', 'hr': '/hr/employees',
  'payroll': '/hr/payroll', 'salary': '/hr/payroll',
  'attendance': '/hr/attendance', 'leave': '/hr/leaves',
  'manufacturing': '/manufacturing', 'production': '/manufacturing', 'fabrication': '/manufacturing',
  'qc': '/manufacturing', 'quality': '/manufacturing',
  'installation': '/installation', 'site': '/installation',
  'design': '/designing', '2d': '/designing', '3d': '/designing',
  'amc': '/amc', 'maintenance': '/amc',
  'supervisor': '/hr/supervisor-input',
  'analytics': '/analytics', 'report': '/analytics',
  'ceo': '/ceo', 'dashboard': '/ceo'
};

// ─────────────────────────────────────────────
// POST Handler
// ─────────────────────────────────────────────
export async function POST(request) {
  try {
    const { message, allowedPages, username, userRole, conversationHistory = [] } = await request.json();

    if (!message?.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    // Connect and check if a custom user-defined API key exists in MongoDB
    await dbConnect();
    let apiKey0 = '';
    try {
      const customKeySetting = await Settings.findOne({ key: 'gemini_api_key' }).lean();
      if (customKeySetting && customKeySetting.value?.trim()) {
        apiKey0 = customKeySetting.value.trim();
      }
    } catch (setErr) {
      console.warn('Could not read custom API key setting:', setErr.message);
    }

    const apiKey1 = apiKey0 || process.env.GEMINI_API_KEY;
    const apiKey2 = process.env.GEMINI_API_KEY_2;
    if (!apiKey1 && !apiKey2) {
      return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // Detect navigation intent before calling AI
    const msgLower = message.toLowerCase();
    let navigationAction = null;
    if (msgLower.match(/take me|go to|open|navigate|show me the|open the/)) {
      for (const [keyword, path] of Object.entries(PAGE_ROUTES)) {
        if (msgLower.includes(keyword)) {
          navigationAction = { action: 'navigate', path, label: keyword.charAt(0).toUpperCase() + keyword.slice(1) + ' Page' };
          break;
        }
      }
    }

    // Detect download intent
    let downloadAction = null;
    if (msgLower.match(/download|export|excel|pdf|generate report/)) {
      if (msgLower.includes('stock') || msgLower.includes('material') || msgLower.includes('inventory')) {
        downloadAction = { action: 'download_excel', module: 'stock', label: 'Stock Report' };
      } else if (msgLower.includes('project')) {
        downloadAction = { action: 'download_excel', module: 'projects', label: 'Projects Report' };
      } else if (msgLower.includes('payroll') || msgLower.includes('salary')) {
        downloadAction = { action: 'download_excel', module: 'payroll', label: 'Payroll Report' };
      } else if (msgLower.includes('payment') || msgLower.includes('invoice') || msgLower.includes('finance')) {
        downloadAction = { action: 'download_excel', module: 'payments', label: 'Financial Report' };
      } else if (msgLower.includes('employee') || msgLower.includes('staff')) {
        downloadAction = { action: 'download_excel', module: 'employees', label: 'Employee Report' };
      } else if (msgLower.includes('client') || msgLower.includes('crm')) {
        downloadAction = { action: 'download_excel', module: 'clients', label: 'Client Report' };
      }
    }

    // Join conversation history text to query string to maintain context in follow-up queries
    const historyText = conversationHistory.slice(-4).map(h => h.content).join(' ');
    const combinedMessage = `${message} ${historyText}`;

    // Fetch live DB context
    let liveContext = {};
    try {
      liveContext = await fetchLiveContext(combinedMessage, allowedPages || [], username, userRole);
    } catch (dbErr) {
      console.error('DB context error:', dbErr.message);
    }

    const isCEO = userRole === 'ceo' || userRole === 'admin';
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const contextJson = Object.keys(liveContext).length > 0
      ? JSON.stringify(liveContext, null, 1)
      : '{}';

    const systemPrompt = `You are Nuera, the intelligent AI assistant for LegendIn ERP — a premium interior design company management system.

User: ${username || 'User'} | Role: ${userRole || 'viewer'} | Access: ${(allowedPages || []).join(', ') || 'limited'}
Today: ${today}

═══════════════════════════════════════════
LIVE DATABASE CONTEXT (REAL DATA ONLY):
${contextJson}
═══════════════════════════════════════════

CRITICAL RULES:
1. ONLY use data from the LIVE DATABASE CONTEXT above. NEVER invent, assume, or guess any numbers, names, or details.
2. If the context is empty or a field is missing, say "I don't have that data right now" — do NOT make up values.
3. ${isCEO ? 'This user is CEO/Admin — provide FULL details on all modules, financials, employee data, and any user activity.' : 'Only answer questions within this user\'s access permissions. If outside access, politely decline.'}
4. For financial data, always format in Indian Rupees (₹) with proper comma formatting.
5. For navigation commands (e.g. "take me to stock", "open projects"), respond with a JSON block:
   {"action": "navigate", "path": "/purchase", "label": "Stock & Purchase Page"}
6. For download commands, respond with:
   {"action": "download_excel", "module": "stock", "label": "Stock Report"}
   {"action": "download_pdf", "module": "projects", "label": "Projects Report"}
7. For logout: {"action": "logout"}
8. For opening forms: {"action": "open_form", "form": "add_stock"}
9. WEEKLY WORK REPORTS: Use activityReport.teamStats to show each employee's hours, actions, downloads, and errors. For CEO, show all staff. For regular users, show only their own.
10. PROJECT P&L: Use projects.profitLossPerProject to show profit/loss per project with revenue vs expenses.
11. SUPERVISOR ATTENDANCE: Use installation.supervisorAttendanceToday to report who submitted/not submitted today.
12. EMPLOYEE ERRORS: Use activityReport.teamStats[].errors to report mistakes/failed actions by employees.
13. Keep responses professional, concise, and data-driven. Use bullet points and bold headers for clarity.
14. When showing lists, show the actual names/amounts from the database, not summaries.
15. Maximum 500 words per response. For large datasets, show top 10 and mention total count.`;

    // Build conversation contents
    const contents = [];
    const recentHistory = conversationHistory.slice(-8);
    for (const msg of recentHistory) {
      contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    // Call Gemini with primary key, falling back to backup if it fails (e.g. rate-limit / 429)
    let geminiRes;
    let fallbackUsed = false;

    async function fetchGemini(key) {
      return await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1200,
              topP: 0.85
            }
          })
        }
      );
    }

    try {
      geminiRes = await fetchGemini(apiKey1 || apiKey2);

      if (!geminiRes.ok && apiKey1 && apiKey2) {
        console.warn('Primary API key failed or rate-limited. Trying backup Gemini key...');
        fallbackUsed = true;
        geminiRes = await fetchGemini(apiKey2);
      }
    } catch (err) {
      if (apiKey1 && apiKey2 && !fallbackUsed) {
        console.warn('Gemini primary fetch error, trying backup key...', err.message);
        try {
          geminiRes = await fetchGemini(apiKey2);
        } catch (backupErr) {
          throw backupErr;
        }
      } else {
        throw err;
      }
    }

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({}));
      const errMsg = errBody?.error?.message || 'Unknown error';
      console.error('Gemini API error after fallback:', errMsg);

      return Response.json({
        reply: `⚠️ AI service issue: ${errMsg.includes('quota') ? 'API quota reached. Please try again in a moment.' : 'Temporarily unavailable. Please retry.'}`,
        action: navigationAction || downloadAction,
        contextUsed: Object.keys(liveContext)
      });
    }

    const geminiData = await geminiRes.json();
    let aiText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response. Please try again.';

    // Extract action JSON from the AI response
    let parsedAction = navigationAction || downloadAction;
    const jsonMatch = aiText.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        parsedAction = JSON.parse(jsonMatch[0]);
        // Remove the JSON block from the displayed text
        aiText = aiText.replace(jsonMatch[0], '').trim();
      } catch { /* keep existing action */ }
    }

    return Response.json({
      reply: aiText,
      action: parsedAction,
      contextUsed: Object.keys(liveContext)
    });

  } catch (error) {
    console.error('Nuera Assistant error:', error);
    return Response.json({
      reply: `⚠️ Error: ${error.message}. Please try again.`,
      action: null
    }, { status: 500 });
  }
}
