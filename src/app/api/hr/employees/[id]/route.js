import dbConnect from '@/lib/dbConnect';
import { Employee } from '@/lib/models';

export async function GET(request, { params }) {
  await dbConnect();
  const { id } = await params;
  const employee = await Employee.findById(id);
  if (!employee) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(employee);
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const existing = await Employee.findById(id);
    if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

    // If basic salary / rate changed
    if (body.basic_salary !== undefined && Number(body.basic_salary) !== existing.basic_salary) {
      if (existing.approval_status === 'approved') {
        // Keep the old approved salary active, push the new one to pending, and set approval to pending
        body.pending_basic_salary = Number(body.basic_salary);
        body.basic_salary = existing.basic_salary;
        body.approval_status = 'pending';
        body.approval_notes = 'Salary/Rate change pending approval';
      } else {
        // For new/pending employees, save it directly to pending_basic_salary
        body.pending_basic_salary = Number(body.basic_salary);
      }
    }

    const employee = await Employee.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!employee) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(employee);
  } catch (error) {
    console.error('[PUT /api/hr/employees/[id]] Error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  await dbConnect();
  const { id } = await params;
  await Employee.findByIdAndDelete(id);
  return Response.json({ success: true });
}
