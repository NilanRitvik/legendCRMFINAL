import dbConnect from '@/lib/dbConnect';
import { DailyAttendance, Attendance } from '@/lib/models';

function getWorkingDaysInMonth(m, y) {
  let count = 0;
  const d = new Date(Date.UTC(y, m - 1, 1));
  while (d.getUTCMonth() === m - 1) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count || 26;
}

export async function GET(request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');
  const employee = searchParams.get('employee');
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  const filter = {};
  if (dateStr) {
    filter.date = new Date(dateStr + 'T00:00:00.000Z');
  } else if (month && year) {
    const y = parseInt(year);
    const m = parseInt(month);
    const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    
    filter.date = { $gte: startOfMonth, $lte: endOfMonth };
    if (employee) {
      filter.employee = employee;
    }
  } else {
    return Response.json({ error: 'Missing query parameters. Provide date OR (month AND year).' }, { status: 400 });
  }

  const records = await DailyAttendance.find(filter).sort({ date: 1 });
  return Response.json(records);
}

export async function POST(request) {
  await dbConnect();
  const body = await request.json();
  let { action, employeeId, month, year, status, date, records } = body;

  if (action === 'bulk_employee_month') {
    if (!employeeId || !month || !year || !status) {
      return Response.json({ error: 'Missing parameters for bulk update' }, { status: 400 });
    }

    const y = parseInt(year);
    const m = parseInt(month);
    const daysInMonth = new Date(y, m, 0).getDate();
    
    // Save daily attendance records for all days of the month
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const parsedDate = new Date(dateStr + 'T00:00:00.000Z');
      
      await DailyAttendance.findOneAndUpdate(
        { employee: employeeId, date: parsedDate },
        { 
          employee: employeeId, 
          date: parsedDate, 
          status: status, 
          overtime_hours: 0, 
          notes: 'Bulk month fill' 
        },
        { upsert: true, new: true }
      );
    }

    // Aggregate monthly summary
    const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    const dailyRecords = await DailyAttendance.find({
      employee: employeeId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    let present_days = 0;
    let absent_days = 0;
    let half_days = 0;
    let late_days = 0;
    let overtime_hours = 0;

    dailyRecords.forEach(rec => {
      if (rec.status === 'present') {
        present_days += 1;
      } else if (rec.status === 'late') {
        present_days += 1;
        late_days += 1;
      } else if (rec.status === 'half_day') {
        present_days += 0.5;
        absent_days += 0.5;
        half_days += 1;
      } else if (rec.status === 'absent') {
        absent_days += 1;
      }
      overtime_hours += rec.overtime_hours || 0;
    });

    const existing = await Attendance.findOne({ employee: employeeId, month: m, year: y });
    const total_working_days = existing ? existing.total_working_days : getWorkingDaysInMonth(m, y);

    await Attendance.findOneAndUpdate(
      { employee: employeeId, month: m, year: y },
      {
        employee: employeeId,
        month: m,
        year: y,
        total_working_days,
        present_days,
        absent_days,
        half_days,
        late_days,
        overtime_hours
      },
      { upsert: true, new: true }
    );

    return Response.json({ success: true });
  }

  if (!date || !Array.isArray(records)) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const parsedDate = new Date(date + 'T00:00:00.000Z');
  year = parsedDate.getUTCFullYear();
  month = parsedDate.getUTCMonth() + 1;

  // 1. Save all daily attendance records
  for (const r of records) {
    await DailyAttendance.findOneAndUpdate(
      { employee: r.employeeId, date: parsedDate },
      { 
        employee: r.employeeId, 
        date: parsedDate, 
        status: r.status, 
        overtime_hours: parseFloat(r.overtime_hours) || 0, 
        notes: r.notes || '' 
      },
      { upsert: true, new: true }
    );
  }

  // 2. Aggregate monthly attendance summaries for all affected employees
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  for (const r of records) {
    const employeeId = r.employeeId;

    // Fetch all daily records for this employee in this month
    const dailyRecords = await DailyAttendance.find({
      employee: employeeId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    let present_days = 0;
    let absent_days = 0;
    let half_days = 0;
    let late_days = 0;
    let overtime_hours = 0;

    dailyRecords.forEach(rec => {
      if (rec.status === 'present') {
        present_days += 1;
      } else if (rec.status === 'late') {
        present_days += 1;
        late_days += 1;
      } else if (rec.status === 'half_day') {
        present_days += 0.5;
        absent_days += 0.5;
        half_days += 1;
      } else if (rec.status === 'absent') {
        absent_days += 1;
      }
      overtime_hours += rec.overtime_hours || 0;
    });

    // Determine working days
    const existing = await Attendance.findOne({ employee: employeeId, month, year });
    const total_working_days = existing ? existing.total_working_days : getWorkingDaysInMonth(month, year);

    // Upsert monthly summary
    await Attendance.findOneAndUpdate(
      { employee: employeeId, month, year },
      {
        employee: employeeId,
        month,
        year,
        total_working_days,
        present_days,
        absent_days,
        half_days,
        late_days,
        overtime_hours
      },
      { upsert: true, new: true }
    );
  }

  return Response.json({ success: true });
}
