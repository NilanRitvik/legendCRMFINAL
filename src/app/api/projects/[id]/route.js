import dbConnect from '@/lib/dbConnect';
import { Project, Payment, Expense, Invoice, MaterialTransaction, Attendance, WorkLog } from '@/lib/models';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const project = await Project.findById(id)
      .populate('client')
      .populate('quotation')
      .populate('team.member');
      
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch payments for project
    const payments = await Payment.find({ project: id }).populate('invoice');
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const advancePaid = payments
      .filter(p => p.invoice && p.invoice.type === 'advance')
      .reduce((sum, p) => sum + p.amount, 0);
    const accountsReceivable = Math.max(0, project.value - totalPaid);

    // Fetch direct project expenses
    const directExpensesList = await Expense.find({ project: id });
    const directExpenseTotal = directExpensesList.reduce((sum, e) => sum + e.amount, 0);

    // Fetch approved & accounts-finalized material transactions (Issues and Returns)
    const materialTransactions = await MaterialTransaction.find({ 
      project: id, 
      approval_status: 'approved',
      accounts_approved: true
    });
     
    let materialCostTotal = 0;
    materialTransactions.forEach(t => {
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

    // Fetch invoices for project
    const invoices = await Invoice.find({ project: id }).sort({ due_date: 1 });

    // Calculate duration in months
    const start = project.start_date ? new Date(project.start_date) : new Date(project.createdAt);
    const end = project.end_date ? new Date(project.end_date) : new Date();
    const diffMs = Math.max(0, end - start);
    const durationMonths = Math.max(1, Math.round((diffMs / (1000 * 60 * 60 * 24 * 30.4375)) * 10) / 10);

    // Calculate team costs using type-aware formulas
    let teamCostTotal = 0;
    if (project.team && Array.isArray(project.team)) {
      const pStart = project.start_date ? new Date(project.start_date) : new Date(project.createdAt);
      const pEnd = project.end_date ? new Date(project.end_date) : new Date();

      // Find all months/years project was active
      const monthsActive = [];
      let current = new Date(pStart.getFullYear(), pStart.getMonth(), 1);
      while (current <= pEnd) {
        monthsActive.push({
          month: current.getMonth() + 1,
          year: current.getFullYear()
        });
        current.setMonth(current.getMonth() + 1);
      }

      for (const alloc of project.team) {
        if (alloc.member) {
          const emp = alloc.member;
          const basic = emp.basic_salary || 0;
          let cost = 0;

          if (emp.type === 'employee') {
            // Full-time: total salary / 26 * present days * allocation%
            let totalPresentDays = 0;
            for (const active of monthsActive) {
              const att = await Attendance.findOne({
                employee: emp._id,
                month: active.month,
                year: active.year
              });
              if (att) {
                totalPresentDays += att.present_days || 0;
              } else {
                totalPresentDays += 26; // Default to 26 working days if no logs exist
              }
            }
            cost = (basic / 26) * totalPresentDays * (alloc.allocation / 100);
          } else {
            // Freelancer / Consultant: sum of hours_worked * hourly rate from approved WorkLogs
            const logs = await WorkLog.find({
              employee: emp._id,
              project: id,
              approval_status: 'approved'
            });
            const totalHours = logs.reduce((sum, l) => sum + (l.hours_worked || 0), 0);
            cost = totalHours * basic;
          }

          teamCostTotal += Math.round(cost);
        }
      }
    }

    // Profit margin calculation
    const projectProfit = project.value - teamCostTotal - directExpenseTotal - materialCostTotal;

    return Response.json({
      ...project.toObject(),
      totalPaid,
      advancePaid,
      accountsReceivable,
      directExpenses: directExpenseTotal,
      materialExpenses: materialCostTotal,
      teamCost: teamCostTotal,
      durationMonths,
      projectProfit,
      directExpensesList,
      payments,
      invoices
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const oldProject = await Project.findById(id);
    if (!oldProject) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Handle status change history logging
    if (body.status && body.status !== oldProject.status) {
      const description = body.status_description || body.status_notes || 'Status updated';
      const newHistoryItem = {
        status: body.status,
        description: description,
        changed_at: new Date()
      };
      
      const currentHistory = oldProject.status_history || [];
      body.status_history = [...currentHistory, newHistoryItem];
      body.status_notes = description;
    }

    const project = await Project.findByIdAndUpdate(id, body, { new: true, runValidators: true })
      .populate('client')
      .populate('team.member');

    return Response.json(project);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const project = await Project.findByIdAndDelete(id);
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }
    return Response.json({ message: 'Project deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
