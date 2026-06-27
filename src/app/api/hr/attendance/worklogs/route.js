import dbConnect from '@/lib/dbConnect';
import { WorkLog, Attendance, Project } from '@/lib/models';

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

  const records = await WorkLog.find(filter)
    .populate('project', 'name client_name')
    .sort({ date: 1 });
  return Response.json(records);
}

export async function POST(request) {
  await dbConnect();
  const body = await request.json();
  const { date, records } = body; // date: YYYY-MM-DD, records: [{ employeeId, hours_worked, description }]

  if (!date || !Array.isArray(records)) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const parsedDate = new Date(date + 'T00:00:00.000Z');
  const now = new Date();
  const diffMs = now.getTime() - parsedDate.getTime();
  const limitMs = 48 * 60 * 60 * 1000;

  if (diffMs > limitMs) {
    return Response.json({ error: 'Attendance window closed. Cannot mark or edit work logs older than 48 hours.' }, { status: 400 });
  }
  if (diffMs < 0) {
    const todayMidnight = new Date(now.toISOString().slice(0, 10) + 'T00:00:00.000Z');
    if (parsedDate.getTime() > todayMidnight.getTime()) {
      return Response.json({ error: 'Cannot mark work logs for future dates.' }, { status: 400 });
    }
  }
  const year = parsedDate.getUTCFullYear();
  const month = parsedDate.getUTCMonth() + 1;

  // 1. Delete all existing work logs for the affected freelancers on this date
  const employeeIds = [...new Set(records.map(r => r.employeeId))];
  await WorkLog.deleteMany({ date: parsedDate, employee: { $in: employeeIds } });

  // 2. Save all daily work log records
  for (const r of records) {
    if ((parseFloat(r.hours_worked) || 0) > 0) {
      await WorkLog.create({
        employee: r.employeeId,
        date: parsedDate,
        project: r.projectId || null,
        hours_worked: parseFloat(r.hours_worked) || 0,
        description: r.description || '',
        approval_status: 'pending'
      });

      // Automatically add freelancer to project team allocation if they are not already allocated
      if (r.projectId) {
        const project = await Project.findById(r.projectId);
        if (project) {
          const isAllocated = project.team && project.team.some(t => t.member && t.member.toString() === r.employeeId);
          if (!isAllocated) {
            project.team = project.team || [];
            project.team.push({ member: r.employeeId, allocation: 100 });
            await project.save();
          }
        }
      }
    }
  }

  // 2. Aggregate monthly attendance summaries for affected freelancers
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  for (const r of records) {
    const employeeId = r.employeeId;

    // Fetch all daily worklogs for this employee in this month
    const worklogs = await WorkLog.find({
      employee: employeeId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    let total_hours = 0;
    worklogs.forEach(rec => {
      total_hours += rec.hours_worked || 0;
    });

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
        present_days: Math.ceil(total_hours / 8), // approximate present days for summary display
        absent_days: 0,
        half_days: 0,
        late_days: 0,
        overtime_hours: total_hours // Store total logged hours in overtime_hours for freelancers
      },
      { upsert: true, new: true }
    );
  }

  return Response.json({ success: true });
}
