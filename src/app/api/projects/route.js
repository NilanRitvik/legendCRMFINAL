import dbConnect from '@/lib/dbConnect';
import { Project, Payment, Expense, Attendance, WorkLog, MaterialTransaction } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    
    // Fetch all projects
    const projects = await Project.find({})
      .populate('client')
      .populate('quotation')
      .populate('team.member')
      .sort({ createdAt: -1 });

    // Fetch all payments, direct project expenses, attendance summaries, work logs, and material transactions
    const payments = await Payment.find({}).populate('invoice');
    const directExpenses = await Expense.find({ project: { $ne: null } });
    const allAttendance = await Attendance.find({});
    const allWorkLogs = await WorkLog.find({ approval_status: 'approved' });
    const allMaterialTxns = await MaterialTransaction.find({ approval_status: 'approved', accounts_approved: true });

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

      // 3. Team Cost over project duration using type-aware formulas (in-memory)
      let teamCostTotal = 0;
      if (proj.team && Array.isArray(proj.team)) {
        const pStart = proj.start_date ? new Date(proj.start_date) : new Date(proj.createdAt);
        const pEnd = proj.end_date ? new Date(proj.end_date) : new Date();

        const monthsActive = [];
        let current = new Date(pStart.getFullYear(), pStart.getMonth(), 1);
        while (current <= pEnd) {
          monthsActive.push({ month: current.getMonth() + 1, year: current.getFullYear() });
          current.setMonth(current.getMonth() + 1);
        }

        proj.team.forEach(alloc => {
          if (alloc.member) {
            const emp = alloc.member;
            const basic = emp.basic_salary || 0;
            let cost = 0;

            if (emp.type === 'employee') {
              let totalPresentDays = 0;
              monthsActive.forEach(active => {
                const att = allAttendance.find(a => 
                  a.employee.toString() === emp._id.toString() &&
                  a.month === active.month &&
                  a.year === active.year
                );
                if (att) {
                  totalPresentDays += att.present_days || 0;
                } else {
                  totalPresentDays += 26;
                }
              });
              cost = (basic / 26) * totalPresentDays * (alloc.allocation / 100);
            } else {
              const logs = allWorkLogs.filter(l => 
                l.employee.toString() === emp._id.toString() &&
                l.project && l.project.toString() === projIdStr
              );
              const totalHours = logs.reduce((sum, l) => sum + (l.hours_worked || 0), 0);
              cost = totalHours * basic;
            }
            teamCostTotal += Math.round(cost);
          }
        });
      }

      // 4. Material Expenses
      const projMaterials = allMaterialTxns.filter(t => t.project && t.project.toString() === projIdStr);
      let materialCostTotal = 0;
      projMaterials.forEach(t => {
        const rate = t.rate || 0;
        const qty = t.quantity || 0;
        const gst = t.gst_percentage || 0;
        const transport = t.transport_charges || 0;
        const val = (qty * rate * (1 + gst / 100)) + transport;
        if (t.transaction_type === 'issue') {
          materialCostTotal += val;
        } else if (t.transaction_type === 'return') {
          materialCostTotal -= val;
        }
      });

      // 5. Project-wise Profit and Loss (P&L)
      const projectProfit = proj.value - teamCostTotal - directExpenseTotal - materialCostTotal;

      return {
        ...proj.toObject(),
        totalPaid,
        advancePaid,
        accountsReceivable,
        directExpenses: directExpenseTotal,
        materialExpenses: materialCostTotal,
        teamCost: teamCostTotal,
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
