import dbConnect from '@/lib/dbConnect';
import { SupervisorInput, WorkLog, DailyAttendance, Attendance, Employee, Project, Expense, SupervisorNotification } from '@/lib/models';

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

async function syncMonthlySummaryForEmployee(employeeId, date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const employee = await Employee.findById(employeeId);
  if (!employee) return;

  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const existing = await Attendance.findOne({ employee: employeeId, month, year });
  const total_working_days = existing ? existing.total_working_days : getWorkingDaysInMonth(month, year);

  if (employee.type === 'employee') {
    // Salaried monthly stats
    const dailyRecords = await DailyAttendance.find({
      employee: employeeId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    let present_days = 0;
    let half_days = 0;
    let late_days = 0;
    let absent_days = 0;

    dailyRecords.forEach(rec => {
      if (rec.status === 'present') present_days++;
      else if (rec.status === 'half_day') half_days++;
      else if (rec.status === 'late') late_days++;
      else if (rec.status === 'absent') absent_days++;
      else if (rec.status === 'holiday') present_days++; // Holiday (HD) counts as paid
    });

    const net_present_days = present_days + (half_days * 0.5);

    await Attendance.findOneAndUpdate(
      { employee: employeeId, month, year },
      {
        employee: employeeId,
        month,
        year,
        total_working_days,
        present_days: net_present_days,
        half_days,
        late_days,
        absent_days,
        status: 'submitted'
      },
      { upsert: true, new: true }
    );
  } else {
    // Hourly stats
    const worklogs = await WorkLog.find({
      employee: employeeId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    let total_hours = 0;
    worklogs.forEach(rec => {
      total_hours += rec.hours_worked || 0;
    });

    await Attendance.findOneAndUpdate(
      { employee: employeeId, month, year },
      {
        employee: employeeId,
        month,
        year,
        total_working_days,
        overtime_hours: total_hours, // used for hourly sum
        status: 'submitted'
      },
      { upsert: true, new: true }
    );
  }
}

export async function GET(request) {
  try {
    await dbConnect();
    const inputs = await SupervisorInput.find({})
      .populate('supervisor')
      .populate('records.employee')
      .populate('records.project')
      .sort({ date: -1, createdAt: -1 });
    return Response.json(inputs);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { supervisor, date, records } = body;

    if (!supervisor || !date || !Array.isArray(records)) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedDate = new Date(date + 'T00:00:00.000Z');

    // Create the supervisor input log
    const inputLog = await SupervisorInput.create({
      supervisor,
      date: parsedDate,
      records: records.map(r => ({
        employee: r.employeeId,
        hours_worked: parseFloat(r.hours_worked) || 0,
        project: r.projectId || null,
        notes: r.notes || ''
      }))
    });

    return Response.json({ success: true, record: inputLog });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, status, approval_notes } = body;

    if (!id || !status) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const inputLog = await SupervisorInput.findById(id).populate('records.employee');
    if (!inputLog) {
      return Response.json({ error: 'Supervisor log not found' }, { status: 404 });
    }

    // Process edits to hours if records are provided in the body
    if (body.records && Array.isArray(body.records)) {
      const changes = [];
      const logDateStr = new Date(inputLog.date).toLocaleDateString('en-IN');

      body.records.forEach(newRec => {
        const matchingIndex = inputLog.records.findIndex(r => r.employee && r.employee._id.toString() === newRec.employeeId);
        if (matchingIndex !== -1) {
          const oldRec = inputLog.records[matchingIndex];
          const oldHours = oldRec.hours_worked;
          const newHours = parseFloat(newRec.hours_worked) || 0;

          if (oldHours !== newHours) {
            oldRec.hours_worked = newHours;
            const empName = oldRec.employee?.name || 'Staff';
            changes.push(`${empName} (${oldHours}h ➡️ ${newHours}h)`);
          }
          if (newRec.notes !== undefined) {
            oldRec.notes = newRec.notes;
          }
          if (newRec.projectId !== undefined) {
            oldRec.project = newRec.projectId || null;
          }
        }
      });

      // Save Supervisor Notification if changes occurred
      if (changes.length > 0) {
        const msg = `HR edited hours for log on ${logDateStr}: ${changes.join(', ')}.`;
        await SupervisorNotification.create({
          supervisor: inputLog.supervisor,
          message: msg
        });
      }
    }

    inputLog.status = status;
    inputLog.approval_notes = approval_notes || '';
    await inputLog.save();

    // If approved, sync records to WorkLog/DailyAttendance
    if (status === 'approved') {
      for (const rec of inputLog.records) {
        const emp = rec.employee;
        if (!emp) continue;

        const hrs = rec.hours_worked || 0;

        if (emp.type === 'employee') {
          // Salaried: Map hours to status
          let attStatus = 'absent';
          if (hrs >= 7) attStatus = 'present';
          else if (hrs >= 4) attStatus = 'half_day';
          else if (hrs > 0) attStatus = 'late';

          await DailyAttendance.findOneAndUpdate(
            { employee: emp._id, date: inputLog.date },
            { 
              employee: emp._id, 
              date: inputLog.date, 
              status: attStatus,
              notes: rec.notes || `Supervisor input: ${hrs} hrs`
            },
            { upsert: true, new: true }
          );
        } else {
          // Hourly: Map to WorkLog
          if (hrs > 0) {
            await WorkLog.findOneAndUpdate(
              { employee: emp._id, date: inputLog.date, project: rec.project },
              { 
                employee: emp._id, 
                date: inputLog.date, 
                project: rec.project || null,
                hours_worked: hrs,
                description: rec.notes || 'Supervisor input log',
                approval_status: 'approved'
              },
              { upsert: true, new: true }
            );

            // Also trigger Expense generation if project is linked
            if (rec.project) {
              const rateType = emp.rate_type || 'hourly';
              let hourlyRate = emp.basic_salary || 0;
              if (rateType === 'monthly') {
                hourlyRate = Math.round(hourlyRate / 160);
              }
              const costAmount = Math.round(hrs * hourlyRate);
              
              if (costAmount > 0) {
                await Expense.create({
                  category: 'project_cost',
                  amount: costAmount,
                  expense_date: inputLog.date,
                  project: rec.project,
                  description: `Freelancer Cost (Supervisor Input): ${emp.name} (${hrs} hrs @ ₹${hourlyRate}/hr)`
                });
              }

              // Automatically add to project team if not allocated
              const project = await Project.findById(rec.project);
              if (project) {
                const isAllocated = project.team && project.team.some(t => t.member && t.member.toString() === emp._id.toString());
                if (!isAllocated) {
                  project.team = project.team || [];
                  project.team.push({ member: emp._id, allocation: 100 });
                  await project.save();
                }
              }
            }
          }
        }

        // Aggregate monthly totals for this employee
        await syncMonthlySummaryForEmployee(emp._id, inputLog.date);
      }
    }

    return Response.json({ success: true, record: inputLog });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
