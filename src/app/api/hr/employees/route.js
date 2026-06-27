import dbConnect from '@/lib/dbConnect';
import { Employee } from '@/lib/models';

export async function GET(request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // employee | freelancer | consultant
  const status = searchParams.get('status');
  
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (status === 'active') {
    filter.approval_status = 'approved';
  }
  
  const employees = await Employee.find(filter).sort({ createdAt: -1 });
  return Response.json(employees);
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    if (body.basic_salary !== undefined) {
      body.pending_basic_salary = Number(body.basic_salary);
    }
    const employee = await Employee.create(body);
    return Response.json(employee, { status: 201 });
  } catch (error) {
    console.error('[POST /api/hr/employees] Error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
}
