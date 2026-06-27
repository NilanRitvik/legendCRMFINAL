import dbConnect from '@/lib/dbConnect';
import { 
  Project, Payment, Expense, Client, Team, 
  Design, Manufacturing, QC, Logistics, AMC, 
  MaterialTransaction, ToolAsset, Machine, Installation 
} from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    
    // Fetch all records for full system metrics
    const [
      projects, payments, expenses, clients, teamMembers,
      designs, manufacturing, qcs, logisticsList, amcs,
      materialTxns, tools, machines, installations
    ] = await Promise.all([
      Project.find({}).populate('client'),
      Payment.find({}),
      Expense.find({}).populate('project'),
      Client.find({}),
      Team.find({}),
      Design.find({}),
      Manufacturing.find({}),
      QC.find({}),
      Logistics.find({}),
      AMC.find({}),
      MaterialTransaction.find({}),
      ToolAsset.find({}),
      Machine.find({}),
      Installation.find({})
    ]);

    // 1. Revenue vs Expenses Month-by-Month (Last 12 Months)
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }

    const revenueVsExpenses = months.map(m => {
      const rev = payments
        .filter(p => {
          const d = new Date(p.payment_date);
          return d.getFullYear() === m.year && d.getMonth() === m.month;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const exp = expenses
        .filter(e => {
          const d = new Date(e.expense_date);
          return d.getFullYear() === m.year && d.getMonth() === m.month;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        month: m.label,
        revenue: rev,
        expenses: exp,
        profit: rev - exp
      };
    });

    // 2. Project Status Distributions
    const statuses = ['not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'];
    const statusDistribution = statuses.map(st => {
      const list = projects.filter(p => p.status === st);
      const totalVal = list.reduce((sum, p) => sum + p.value, 0);
      return {
        status: st.replace('_', ' ').toUpperCase(),
        count: list.length,
        value: totalVal
      };
    });

    // 3. Client Value Distributions (Top 10 Clients)
    const clientValueDistribution = clients.map(c => {
      const clientProjects = projects.filter(p => p.client && p.client._id.toString() === c._id.toString());
      const totalVal = clientProjects.reduce((sum, p) => sum + p.value, 0);
      return {
        company: c.company,
        name: c.name,
        projectsCount: clientProjects.length,
        totalValue: totalVal
      };
    }).sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);

    // 4. Expenses Breakdown by Category
    const categories = ['salary', 'rent', 'software', 'marketing', 'vendor_settlement', 'project_cost', 'other'];
    const categoryExpenses = categories.map(cat => {
      const amount = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
      return {
        category: cat.replace('_', ' ').toUpperCase(),
        amount
      };
    });

    // 5. Individual Project Profit Margins
    const projectProfits = projects.map(p => {
      const projExpenses = expenses.filter(e => e.project && e.project._id.toString() === p._id.toString());
      const directExpenseTotal = projExpenses.reduce((sum, e) => sum + e.amount, 0);

      const start = p.start_date ? new Date(p.start_date) : new Date(p.createdAt);
      const end = p.end_date ? new Date(p.end_date) : new Date();
      const diffMs = Math.max(0, end - start);
      const durationMonths = Math.max(1, Math.round((diffMs / (1000 * 60 * 60 * 24 * 30.4375)) * 10) / 10);

      let teamCostTotal = 0;
      if (p.team && Array.isArray(p.team)) {
        p.team.forEach(alloc => {
          const memberObj = teamMembers.find(t => t._id.toString() === alloc.member.toString());
          if (memberObj && memberObj.monthly_cost) {
            const costPerMonth = memberObj.monthly_cost * (alloc.allocation / 100);
            teamCostTotal += costPerMonth * durationMonths;
          }
        });
      }

      const profit = p.value - teamCostTotal - directExpenseTotal;
      const margin = p.value > 0 ? Math.round((profit / p.value) * 100) : 0;

      return {
        name: p.name,
        client: p.client ? p.client.company : 'N/A',
        value: p.value,
        directExpenses: directExpenseTotal,
        teamCost: teamCostTotal,
        profit,
        margin
      };
    }).sort((a, b) => b.profit - a.profit);

    // 6. Overall Performance Ratios
    const totalRevenueSum = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpensesSum = expenses.reduce((sum, e) => sum + e.amount, 0);
    const averageProjectValue = projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + p.value, 0) / projects.length) : 0;
    const averageProfitMargin = projectProfits.length > 0 ? Math.round(projectProfits.reduce((sum, p) => sum + p.margin, 0) / projectProfits.length) : 0;

    // 7. Advanced Pipeline & Operations aggregations
    const totalClientsCount = clients.length;
    const clientsWithDesigns = new Set(designs.map(d => d.client.toString())).size;
    const designConversionRatio = totalClientsCount > 0 ? Math.round((clientsWithDesigns / totalClientsCount) * 100) : 0;

    const totalActiveAMCs = amcs.filter(a => a.status === 'active').length;
    const totalAMCValue = amcs.filter(a => a.status === 'active').reduce((sum, a) => sum + (a.amount || 0), 0);

    const mfgScheduled = manufacturing.filter(m => m.status === 'scheduled').length;
    const mfgInProgress = manufacturing.filter(m => m.status === 'in_progress').length;
    const mfgFinished = manufacturing.filter(m => m.status === 'finished').length;

    const qcPending = qcs.filter(q => q.status === 'pending').length;
    const qcApproved = qcs.filter(q => q.status === 'approved').length;
    const qcRejected = qcs.filter(q => q.status === 'rejected').length;

    const logisticsScheduled = logisticsList.filter(l => l.status === 'scheduled').length;
    const logisticsDispatched = logisticsList.filter(l => l.status === 'dispatched').length;
    const logisticsDelivered = logisticsList.filter(l => l.status === 'delivered').length;
    const logisticsTotalDistance = logisticsList.reduce((sum, l) => sum + (l.distance || 0), 0);

    const materialWastageCost = materialTxns
      .filter(t => t.transaction_type === 'waste')
      .reduce((sum, t) => sum + ((t.quantity || 0) * (t.rate || 0)), 0);

    const damagedToolsCount = tools.filter(t => t.status === 'damaged').length;
    const damagedToolsLoss = tools.reduce((sum, t) => sum + (t.damage_cost || 0), 0);
    const machineMaintenanceSpent = machines.reduce((sum, m) => sum + (m.service_expenses_total || 0), 0);

    // Pipeline counts for Funnel Flow
    const pipelineFlow = {
      lead: clients.filter(c => c.stage === 'lead').length,
      quotation: clients.filter(c => c.stage === 'quotation_sent').length,
      prospect: clients.filter(c => c.stage === 'won').length,
      invoice: projects.length,
      purchase: materialTxns.filter(t => t.transaction_type === 'purchase').length,
      material_issue: materialTxns.filter(t => t.transaction_type === 'issue').length,
      manufacturing: manufacturing.length,
      qc: qcs.length,
      logistics: logisticsList.length,
      installation: installations.length
    };

    return Response.json({
      revenueVsExpenses,
      statusDistribution,
      clientValueDistribution,
      categoryExpenses,
      projectProfits,
      metrics: {
        totalRevenue: totalRevenueSum,
        totalExpenses: totalExpensesSum,
        netProfit: totalRevenueSum - totalExpensesSum,
        averageProjectValue,
        averageProfitMargin,
        projectsCount: projects.length,
        designConversionRatio,
        totalActiveAMCs,
        totalAMCValue,
        mfgScheduled,
        mfgInProgress,
        mfgFinished,
        qcPending,
        qcApproved,
        qcRejected,
        logisticsScheduled,
        logisticsDispatched,
        logisticsDelivered,
        logisticsTotalDistance,
        materialWastageCost,
        damagedToolsCount,
        damagedToolsLoss,
        machineMaintenanceSpent
      },
      pipelineFlow
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
