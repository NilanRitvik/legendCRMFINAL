import dbConnect from '@/lib/dbConnect';
import { Payroll, Employee, Attendance, LeaveRequest } from '@/lib/models';

// POST /api/hr/payroll/[id]/calculate
// Auto-calculates salary components from employee setup + attendance + approved leaves
export async function POST(request, { params }) {
  await dbConnect();
  const { id } = await params;
  
  const payroll = await Payroll.findById(id).populate('employee');
  if (!payroll) return Response.json({ error: 'Payroll not found' }, { status: 404 });
  
  const emp = payroll.employee;
  const { month, year } = payroll;

  // Fetch attendance record
  const attendance = await Attendance.findOne({ employee: emp._id, month, year });
  
  // Fetch approved leaves this month
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const approvedLeaves = await LeaveRequest.find({
    employee: emp._id,
    status: 'approved',
    from_date: { $lte: monthEnd },
    to_date: { $gte: monthStart }
  });
  
  const totalLeaveDays = approvedLeaves.reduce((sum, l) => {
    const paidTypes = ['casual', 'sick', 'annual', 'maternity'];
    return paidTypes.includes(l.leave_type) ? sum : sum + l.days; // only unpaid leaves cause deduction
  }, 0);

  // Compute earnings
  const basic = emp.basic_salary || 0;
  const hra = Math.round(basic * (emp.hra_percent || 40) / 100);
  const transport = emp.transport_allowance || 0;
  const otherAllow = emp.other_allowance || 0;
  
  // Overtime pay
  const otHours = attendance?.overtime_hours || 0;
  const perHourRate = Math.round(basic / (26 * 8)); // 26 working days, 8 hours
  const overtimePay = otHours * perHourRate * 1.5; // 1.5x for OT

  const grossSalary = basic + hra + transport + otherAllow + overtimePay;

  // Compute deductions
  const workingDays = attendance?.total_working_days || 26;
  const absentDays = attendance?.absent_days || 0;
  const perDayRate = Math.round(basic / 26);
  
  const leaveDeduction = Math.round(perDayRate * totalLeaveDays); // unpaid leave deduction
  const absentDeduction = Math.round(perDayRate * absentDays);
  const totalLeaveDeduction = leaveDeduction + absentDeduction;
  
  const pfDeduction = emp.type === 'employee' ? Math.round(basic * 0.12) : 0;
  const esiDeduction = emp.type === 'employee' ? Math.round(grossSalary * 0.0075) : 0;
  const tdsDeduction = emp.tds_percent ? Math.round(grossSalary * emp.tds_percent / 100) : 0;
  const ptDeduction = (emp.type === 'employee' && basic > 15000) ? 200 : 0;
  
  const totalDeductions = pfDeduction + esiDeduction + tdsDeduction + ptDeduction + totalLeaveDeduction + (payroll.advance_deduction || 0) + (payroll.other_deduction || 0);
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  // Update payroll record
  const updated = await Payroll.findByIdAndUpdate(id, {
    basic_salary: basic,
    hra,
    transport_allowance: transport,
    other_allowance: otherAllow,
    overtime_pay: Math.round(overtimePay),
    gross_salary: Math.round(grossSalary),
    pf_deduction: pfDeduction,
    esi_deduction: esiDeduction,
    tds_deduction: tdsDeduction,
    pt_deduction: ptDeduction,
    leave_deduction: totalLeaveDeduction,
    total_deductions: Math.round(totalDeductions),
    net_salary: Math.round(netSalary),
    status: 'processed'
  }, { new: true })
    .populate('employee', 'name designation type department email phone bank_name bank_account ifsc pan_number uan_number')
    .populate('project_ref', 'name');

  return Response.json(updated);
}
