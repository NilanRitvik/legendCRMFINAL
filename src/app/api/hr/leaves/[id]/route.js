import dbConnect from '@/lib/dbConnect';
import { LeaveRequest } from '@/lib/models';

export async function GET(request, { params }) {
  await dbConnect();
  const { id } = await params;
  const leave = await LeaveRequest.findById(id).populate('employee', 'name designation type');
  if (!leave) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(leave);
}

export async function PUT(request, { params }) {
  await dbConnect();
  const { id } = await params;
  const body = await request.json();
  const leave = await LeaveRequest.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!leave) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(leave);
}

export async function DELETE(request, { params }) {
  await dbConnect();
  const { id } = await params;
  await LeaveRequest.findByIdAndDelete(id);
  return Response.json({ success: true });
}
