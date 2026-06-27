import dbConnect from '@/lib/dbConnect';
import { Payroll, Expense } from '@/lib/models';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export async function GET(request, { params }) {
  await dbConnect();
  const { id } = await params;
  const payroll = await Payroll.findById(id)
    .populate('employee', 'name designation type department email phone bank_name bank_account ifsc pan_number uan_number rate_type basic_salary address hra_percent transport_allowance other_allowance pf_applicable esi_applicable tds_percent join_date')
    .populate('project_ref', 'name');
  if (!payroll) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(payroll);
}

export async function PUT(request, { params }) {
  await dbConnect();
  const { id } = await params;
  const body = await request.json();
  const prevPayroll = await Payroll.findById(id).populate('employee', 'name type');

  const payroll = await Payroll.findByIdAndUpdate(id, body, { new: true, runValidators: true })
    .populate('employee', 'name designation type department email phone bank_name bank_account ifsc pan_number uan_number rate_type')
    .populate('project_ref', 'name');

  if (!payroll) return Response.json({ error: 'Not found' }, { status: 404 });

  // ─── AUTO-CREATE EXPENSE WHEN MARKED AS PAID ─────────────────────────────
  // This ensures payroll costs flow into the main financial dashboard,
  // monthly statements, and analytics automatically.
  if (body.status === 'paid' && prevPayroll?.status !== 'paid') {
    const empName = prevPayroll?.employee?.name || 'Unknown';
    const empType = prevPayroll?.employee?.type || 'employee';
    const monthLabel = MONTH_NAMES[(payroll.month || 1) - 1];
    const yearLabel = payroll.year || new Date().getFullYear();

    // Check if expense already created for this payroll (avoid duplicates)
    const existingExp = await Expense.findOne({ description: { $regex: `PAYROLL-${id}` } });
    
    if (!existingExp) {
      await Expense.create({
        category: 'salary',
        amount: payroll.net_salary || 0,
        expense_date: body.payment_date || new Date(),
        description: `${empType === 'employee' ? 'Salary' : 'Freelancer/Consultant Payment'} — ${empName} (${monthLabel} ${yearLabel}) [PAYROLL-${id}]`,
        project: payroll.project_ref || undefined,
      });
    }
  }

  return Response.json(payroll);
}

export async function DELETE(request, { params }) {
  await dbConnect();
  const { id } = await params;

  // Also remove linked expense if it exists
  await Expense.deleteOne({ description: { $regex: `PAYROLL-${id}` } });

  await Payroll.findByIdAndDelete(id);
  return Response.json({ success: true });
}
