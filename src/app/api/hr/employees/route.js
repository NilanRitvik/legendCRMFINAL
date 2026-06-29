import dbConnect from '@/lib/dbConnect';
import { Employee } from '@/lib/models';

export async function GET(request) {
  await dbConnect();
  
  // Migration block for missing employee codes
  const missingEmps = await Employee.find({ employee_code: { $exists: false } });
  for (const emp of missingEmps) {
    const empType = emp.type || 'employee';
    let baseCode = 10001;
    let prefix = '1';
    if (empType === 'freelancer') {
      baseCode = 20001;
      prefix = '2';
    } else if (empType === 'consultant') {
      baseCode = 30001;
      prefix = '3';
    }

    const regex = new RegExp(`^${prefix}\\d{4}$`);
    const lastEmp = await Employee.findOne({ employee_code: regex }).sort({ employee_code: -1 });
    let nextCode = baseCode;
    if (lastEmp && lastEmp.employee_code) {
      const lastNum = parseInt(lastEmp.employee_code, 10);
      if (!isNaN(lastNum)) {
        nextCode = lastNum + 1;
      }
    }
    emp.employee_code = String(nextCode);
    await emp.save();
  }

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
    
    // Generate unique employee code based on type
    const empType = body.type || 'employee';
    let baseCode = 10001;
    let prefix = '1';
    if (empType === 'freelancer') {
      baseCode = 20001;
      prefix = '2';
    } else if (empType === 'consultant') {
      baseCode = 30001;
      prefix = '3';
    }

    const regex = new RegExp(`^${prefix}\\d{4}$`);
    const lastEmp = await Employee.findOne({ employee_code: regex }).sort({ employee_code: -1 });
    let nextCode = baseCode;
    if (lastEmp && lastEmp.employee_code) {
      const lastNum = parseInt(lastEmp.employee_code, 10);
      if (!isNaN(lastNum)) {
        nextCode = lastNum + 1;
      }
    }
    body.employee_code = String(nextCode);

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
