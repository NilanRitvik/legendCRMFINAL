import dbConnect from '@/lib/dbConnect';
import { Client, Quotation, Project, Payment, Expense, Installation, MaterialStock, MaterialTransaction } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly'; // monthly | quarterly | half_yearly | yearly
    const currentYear = new Date().getFullYear();

    // Fetch all records to do in-memory aggregation (clean and fast for demo/standard DB scales)
    const clients = await Client.find({});
    const quotations = await Quotation.find({});
    const projects = await Project.find({});
    const payments = await Payment.find({});
    const expenses = await Expense.find({});
    const installations = await Installation.find({}).populate('project');

    // 1. Calculate General Overall/All-time stats
    const totalLeads = clients.filter(c => c.stage === 'lead' || c.stage === 'prospect').length;
    const totalQuotations = quotations.length;
    const projectsWon = projects.filter(p => p.status === 'completed' || p.status === 'in_progress').length;
    const projectsLost = clients.filter(c => c.stage === 'lost').length;

    // Financial totals (overall)
    const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalProjectRevenue = projects.reduce((sum, p) => sum + p.value, 0);
    const totalOutstanding = Math.max(0, totalProjectRevenue - totalReceived);

    // 2. Periodic Breakdowns
    let labels = [];
    let salesChart = []; // array of { leads, quotations, won, lost }
    let financialChart = []; // array of { revenue, received, expenses, outstanding }

    if (period === 'monthly') {
      labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let m = 0; m < 12; m++) {
        const startDate = new Date(currentYear, m, 1);
        const endDate = new Date(currentYear, m + 1, 0, 23, 59, 59);

        const mClients = clients.filter(c => c.createdAt >= startDate && c.createdAt <= endDate);
        const mQuotations = quotations.filter(q => q.sent_date >= startDate && q.sent_date <= endDate);
        const mProjects = projects.filter(p => p.createdAt >= startDate && p.createdAt <= endDate);
        const mPayments = payments.filter(p => p.payment_date >= startDate && p.payment_date <= endDate);
        const mExpenses = expenses.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);

        const leads = mClients.filter(c => c.stage === 'lead' || c.stage === 'prospect').length;
        const quotes = mQuotations.length;
        const won = mProjects.filter(p => p.status === 'completed' || p.status === 'in_progress').length;
        const lost = mClients.filter(c => c.stage === 'lost').length;

        const rev = mProjects.reduce((sum, p) => sum + p.value, 0);
        const rec = mPayments.reduce((sum, p) => sum + p.amount, 0);
        const exp = mExpenses.reduce((sum, e) => sum + e.amount, 0);
        const out = Math.max(0, rev - rec);

        salesChart.push({ leads, quotations: quotes, won, lost });
        financialChart.push({ revenue: rev, received: rec, expenses: exp, outstanding: out });
      }
    } else if (period === 'quarterly') {
      labels = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
      for (let q = 0; q < 4; q++) {
        const startMonth = q * 3;
        const startDate = new Date(currentYear, startMonth, 1);
        const endDate = new Date(currentYear, startMonth + 3, 0, 23, 59, 59);

        const qClients = clients.filter(c => c.createdAt >= startDate && c.createdAt <= endDate);
        const qQuotations = quotations.filter(q => q.sent_date >= startDate && q.sent_date <= endDate);
        const qProjects = projects.filter(p => p.createdAt >= startDate && p.createdAt <= endDate);
        const qPayments = payments.filter(p => p.payment_date >= startDate && p.payment_date <= endDate);
        const qExpenses = expenses.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);

        const leads = qClients.filter(c => c.stage === 'lead' || c.stage === 'prospect').length;
        const quotes = qQuotations.length;
        const won = qProjects.filter(p => p.status === 'completed' || p.status === 'in_progress').length;
        const lost = qClients.filter(c => c.stage === 'lost').length;

        const rev = qProjects.reduce((sum, p) => sum + p.value, 0);
        const rec = qPayments.reduce((sum, p) => sum + p.amount, 0);
        const exp = qExpenses.reduce((sum, e) => sum + e.amount, 0);
        const out = Math.max(0, rev - rec);

        salesChart.push({ leads, quotations: quotes, won, lost });
        financialChart.push({ revenue: rev, received: rec, expenses: exp, outstanding: out });
      }
    } else if (period === 'half_yearly') {
      labels = ['H1 (Jan-Jun)', 'H2 (Jul-Dec)'];
      for (let h = 0; h < 2; h++) {
        const startMonth = h * 6;
        const startDate = new Date(currentYear, startMonth, 1);
        const endDate = new Date(currentYear, startMonth + 6, 0, 23, 59, 59);

        const hClients = clients.filter(c => c.createdAt >= startDate && c.createdAt <= endDate);
        const hQuotations = quotations.filter(q => q.sent_date >= startDate && q.sent_date <= endDate);
        const hProjects = projects.filter(p => p.createdAt >= startDate && p.createdAt <= endDate);
        const hPayments = payments.filter(p => p.payment_date >= startDate && p.payment_date <= endDate);
        const hExpenses = expenses.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);

        const leads = hClients.filter(c => c.stage === 'lead' || c.stage === 'prospect').length;
        const quotes = hQuotations.length;
        const won = hProjects.filter(p => p.status === 'completed' || p.status === 'in_progress').length;
        const lost = hClients.filter(c => c.stage === 'lost').length;

        const rev = hProjects.reduce((sum, p) => sum + p.value, 0);
        const rec = hPayments.reduce((sum, p) => sum + p.amount, 0);
        const exp = hExpenses.reduce((sum, e) => sum + e.amount, 0);
        const out = Math.max(0, rev - rec);

        salesChart.push({ leads, quotations: quotes, won, lost });
        financialChart.push({ revenue: rev, received: rec, expenses: exp, outstanding: out });
      }
    } else if (period === 'yearly') {
      // Last 5 Years
      const startYear = currentYear - 4;
      for (let y = startYear; y <= currentYear; y++) {
        labels.push(y.toString());
        const startDate = new Date(y, 0, 1);
        const endDate = new Date(y, 11, 31, 23, 59, 59);

        const yClients = clients.filter(c => c.createdAt >= startDate && c.createdAt <= endDate);
        const yQuotations = quotations.filter(q => q.sent_date >= startDate && q.sent_date <= endDate);
        const yProjects = projects.filter(p => p.createdAt >= startDate && p.createdAt <= endDate);
        const yPayments = payments.filter(p => p.payment_date >= startDate && p.payment_date <= endDate);
        const yExpenses = expenses.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);

        const leads = yClients.filter(c => c.stage === 'lead' || c.stage === 'prospect').length;
        const quotes = yQuotations.length;
        const won = yProjects.filter(p => p.status === 'completed' || p.status === 'in_progress').length;
        const lost = yClients.filter(c => c.stage === 'lost').length;

        const rev = yProjects.reduce((sum, p) => sum + p.value, 0);
        const rec = yPayments.reduce((sum, p) => sum + p.amount, 0);
        const exp = yExpenses.reduce((sum, e) => sum + e.amount, 0);
        const out = Math.max(0, rev - rec);

        salesChart.push({ leads, quotations: quotes, won, lost });
        financialChart.push({ revenue: rev, received: rec, expenses: exp, outstanding: out });
      }
    }

    // Installations awaiting approval
    const pendingInstallations = installations.filter(i => i.approval_status === 'pending');

    // Stock Worth Metrics
    const allMaterials = await MaterialStock.find({});
    const allTransactions = await MaterialTransaction.find({ transaction_type: 'purchase' });
    let totalStockWorth = 0;
    allMaterials.forEach(mat => {
      const matPurchases = allTransactions.filter(t => t.material_name.toLowerCase() === mat.name.toLowerCase());
      let avgRate = 0;
      if (matPurchases.length > 0) {
        const totalQty = matPurchases.reduce((sum, p) => sum + p.quantity, 0);
        const totalVal = matPurchases.reduce((sum, p) => sum + (p.quantity * (p.rate || 0)), 0);
        if (totalQty > 0) {
          avgRate = totalVal / totalQty;
        }
      }
      totalStockWorth += mat.current_stock * (avgRate || 0);
    });

    return Response.json({
      summary: {
        totalLeads,
        totalQuotations,
        projectsWon,
        projectsLost,
        totalRevenue: totalProjectRevenue,
        totalOutstanding,
        totalReceived,
        totalExpenses,
        totalStockWorth
      },
      chart: {
        labels,
        sales: salesChart,
        financials: financialChart
      },
      pendingInstallations
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
