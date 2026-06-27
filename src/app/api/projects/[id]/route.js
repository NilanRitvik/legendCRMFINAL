import dbConnect from '@/lib/dbConnect';
import { Project, Payment, Expense, Invoice } from '@/lib/models';

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

    // Fetch invoices for project
    const invoices = await Invoice.find({ project: id }).sort({ due_date: 1 });

    // Calculate duration in months
    const start = project.start_date ? new Date(project.start_date) : new Date(project.createdAt);
    const end = project.end_date ? new Date(project.end_date) : new Date();
    const diffMs = Math.max(0, end - start);
    const durationMonths = Math.max(1, Math.round((diffMs / (1000 * 60 * 60 * 24 * 30.4375)) * 10) / 10);

    // Calculate team costs
    let teamCostTotal = 0;
    if (project.team && Array.isArray(project.team)) {
      project.team.forEach(alloc => {
        if (alloc.member) {
          const salary = alloc.member.basic_salary || alloc.member.monthly_cost || 0;
          const costPerMonth = alloc.member.rate_type === 'hourly' ? salary * 160 : salary;
          const cost = costPerMonth * (alloc.allocation / 100);
          teamCostTotal += cost * durationMonths;
        }
      });
    }

    // Profit margin calculation
    const projectProfit = project.value - teamCostTotal - directExpenseTotal;

    return Response.json({
      ...project.toObject(),
      totalPaid,
      advancePaid,
      accountsReceivable,
      directExpenses: directExpenseTotal,
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
