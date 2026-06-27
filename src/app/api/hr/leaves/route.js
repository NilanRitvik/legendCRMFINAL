import dbConnect from '@/lib/dbConnect';
import { LeaveRequest } from '@/lib/models';

export async function GET(request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const employee = searchParams.get('employee');
  const status = searchParams.get('status');
  
  const filter = {};
  if (employee) filter.employee = employee;
  if (status) filter.status = status;
  
  const leaves = await LeaveRequest.find(filter)
    .populate('employee', 'name designation type')
    .sort({ createdAt: -1 });
  return Response.json(leaves);
}

export async function POST(request) {
  await dbConnect();
  const body = await request.json();
  // Auto-calculate days
  if (body.from_date && body.to_date) {
    const from = new Date(body.from_date);
    const to = new Date(body.to_date);
    const diff = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
    body.days = diff > 0 ? diff : 1;
  }
  const leave = await LeaveRequest.create(body);
  return Response.json(leave, { status: 201 });
}
