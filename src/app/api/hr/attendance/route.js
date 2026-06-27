import dbConnect from '@/lib/dbConnect';
import { Attendance } from '@/lib/models';

export async function GET(request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const employee = searchParams.get('employee');
  
  const filter = {};
  if (month) filter.month = parseInt(month);
  if (year) filter.year = parseInt(year);
  if (employee) filter.employee = employee;
  
  const records = await Attendance.find(filter)
    .populate('employee', 'name designation type department')
    .sort({ createdAt: -1 });
  return Response.json(records);
}

export async function POST(request) {
  await dbConnect();
  const body = await request.json();
  
  // Upsert: one record per employee per month/year
  const { employee, month, year, ...rest } = body;
  
  // Calculate absent days automatically
  if (rest.present_days !== undefined && rest.total_working_days !== undefined) {
    rest.absent_days = Math.max(0, rest.total_working_days - rest.present_days - (rest.half_days || 0) * 0.5);
  }
  
  const record = await Attendance.findOneAndUpdate(
    { employee, month: parseInt(month), year: parseInt(year) },
    { employee, month: parseInt(month), year: parseInt(year), ...rest },
    { upsert: true, new: true, runValidators: true }
  );
  return Response.json(record, { status: 201 });
}

export async function PUT(request) {
  await dbConnect();
  const body = await request.json();
  const { _id, employee, month, year, ...rest } = body;
  
  if (rest.present_days !== undefined && rest.total_working_days !== undefined) {
    rest.absent_days = Math.max(0, rest.total_working_days - rest.present_days - (rest.half_days || 0) * 0.5);
  }
  
  const record = await Attendance.findOneAndUpdate(
    { employee, month: parseInt(month), year: parseInt(year) },
    { ...rest },
    { new: true }
  );
  return Response.json(record);
}
