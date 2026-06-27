import dbConnect from '@/lib/dbConnect';
import { Project, Payment, Expense } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    
    // Fetch all projects
    const projects = await Project.find({})
      .populate('client')
      .populate('quotation')
      .populate('team.member')
      .sort({ createdAt: -1 });

    // Fetch all payments and direct project expenses
    const payments = await Payment.find({}).populate('invoice');
    const directExpenses = await Expense.find({ project: { $ne: null } });

    const projectsWithFinancials = projects.map(proj => {
      const projIdStr = proj._id.toString();
      
      // 1. Payments Received (Revenue)
      const projPayments = payments.filter(p => p.project.toString() === projIdStr);
      const totalPaid = projPayments.reduce((sum, p) => sum + p.amount, 0);
      const advancePaid = projPayments
        .filter(p => p.invoice && p.invoice.type === 'advance')
        .reduce((sum, p) => sum + p.amount, 0);
      const accountsReceivable = Math.max(0, proj.value - totalPaid);

      // 2. Direct Expenses
      const projExpenses = directExpenses.filter(e => e.project && e.project.toString() === projIdStr);
      const directExpenseTotal = projExpenses.reduce((sum, e) => sum + e.amount, 0);

      // 3. Team Cost over project duration
      const start = proj.start_date ? new Date(proj.start_date) : new Date(proj.createdAt);
      const end = proj.end_date ? new Date(proj.end_date) : new Date();
      const diffMs = Math.max(0, end - start);
      const durationMonths = Math.max(1, Math.round((diffMs / (1000 * 60 * 60 * 24 * 30.4375)) * 10) / 10);

      let teamCostTotal = 0;
      if (proj.team && Array.isArray(proj.team)) {
        proj.team.forEach(alloc => {
          if (alloc.member && alloc.member.monthly_cost) {
            const costPerMonth = alloc.member.monthly_cost * (alloc.allocation / 100);
            teamCostTotal += costPerMonth * durationMonths;
          }
        });
      }

      // 4. Project-wise Profit and Loss (P&L)
      const projectProfit = proj.value - teamCostTotal - directExpenseTotal;

      return {
        ...proj.toObject(),
        totalPaid,
        advancePaid,
        accountsReceivable,
        directExpenses: directExpenseTotal,
        teamCost: teamCostTotal,
        durationMonths,
        projectProfit
      };
    });

    return Response.json(projectsWithFinancials);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.client || !body.name || !body.value) {
      return Response.json({ error: 'Client, Project Name, and Value are required' }, { status: 400 });
    }

    const project = await Project.create(body);
    const populated = await Project.findById(project._id).populate('client').populate('team.member');
    return Response.json(populated, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
