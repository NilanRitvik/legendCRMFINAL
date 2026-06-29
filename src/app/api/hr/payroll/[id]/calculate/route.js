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
  const basicRate = emp.basic_salary || 0;
  let basicPay = 0;
  let overtimePay = 0;
  let hra = 0;
  let transport = emp.transport_allowance || 0;
  let otherAllow = emp.other_allowance || 0;

  const totalWorkingDays = attendance?.total_working_days || 26;
  const presentDays = attendance?.present_days || 0;
  const absentDays = attendance?.absent_days || 0;
  const otHours = attendance?.overtime_hours || 0; // For freelancers, this is total logged hours

  if (emp.type === 'employee') {
    // Full-time Employee: payout = basic_salary / 26 * present_days
    basicPay = Math.round((basicRate / 26) * presentDays);

    // HRA is calculated as % of monthly base salary rate
    hra = Math.round(basicRate * (emp.hra_percent || 40) / 100);

    // Overtime pay only for Supervisors (designation contains supervisor)
    const isSupervisor = (emp.designation || '').toLowerCase().includes('supervisor');
    if (isSupervisor) {
      const perHourRate = basicRate / (26 * 8);
      overtimePay = Math.round(otHours * perHourRate); // 1.0x rate (same salary & hourly rate)
    } else {
      overtimePay = 0;
    }
  } else {
    // Freelancer & Consultant (Hourly Rate)
    // basicRate is their hourly rate
    const totalHours = otHours; // total logged hours is stored in overtime_hours field for freelancers/consultants
    const stdHours = totalWorkingDays * 8;

    if (emp.type === 'freelancer') {
      const regularHours = Math.min(totalHours, stdHours);
      const freelancerOtHours = Math.max(0, totalHours - stdHours);

      basicPay = Math.round(regularHours * basicRate);
      overtimePay = Math.round(freelancerOtHours * basicRate); // same hourly rate
    } else {
      // Consultant: all hours paid at hourly rate, no overtime split
      basicPay = Math.round(totalHours * basicRate);
      overtimePay = 0;
    }

    hra = 0; // HRA is not applicable to freelancers/consultants
  }

  const grossSalary = basicPay + hra + transport + otherAllow + overtimePay;

  // Compute deductions
  let totalLeaveDeduction = 0;
  const perDayRate = Math.round(basicRate / 26);
  
  if (emp.type === 'employee') {
    const leaveDeduction = Math.round(perDayRate * totalLeaveDays); // unpaid leave deduction
    const absentDeduction = Math.round(perDayRate * absentDays);
    totalLeaveDeduction = leaveDeduction + absentDeduction;
  }

  const pfDeduction = emp.type === 'employee' ? Math.round(basicRate * 0.12) : 0;
  const esiDeduction = emp.type === 'employee' ? Math.round(grossSalary * 0.0075) : 0;
  const tdsDeduction = emp.tds_percent ? Math.round(grossSalary * emp.tds_percent / 100) : 0;
  const ptDeduction = (emp.type === 'employee' && basicRate > 15000) ? 200 : 0;

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
