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
