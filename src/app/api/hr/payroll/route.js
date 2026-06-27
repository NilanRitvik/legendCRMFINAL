import dbConnect from '@/lib/dbConnect';
import { Payroll } from '@/lib/models';

export async function GET(request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const employee = searchParams.get('employee');
  const status = searchParams.get('status');
  
  const filter = {};
  if (month) filter.month = parseInt(month);
  if (year) filter.year = parseInt(year);
  if (employee) filter.employee = employee;
  if (status) filter.status = status;
  
  const payrolls = await Payroll.find(filter)
    .populate('employee', 'name designation type department email phone bank_name bank_account ifsc pan_number uan_number rate_type basic_salary')
    .populate('project_ref', 'name')
    .sort({ createdAt: -1 });
  return Response.json(payrolls);
}

export async function POST(request) {
  await dbConnect();
  const body = await request.json();
  const payroll = await Payroll.create(body);
  const populated = await Payroll.findById(payroll._id)
    .populate('employee', 'name designation type department email phone bank_name bank_account ifsc pan_number uan_number')
    .populate('project_ref', 'name');
  return Response.json(populated, { status: 201 });
}
