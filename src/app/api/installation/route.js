import dbConnect from '@/lib/dbConnect';
import { Installation } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const records = await Installation.find({})
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('installation_team')
      .sort({ createdAt: -1 });
    return Response.json(records);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { project, installation_team, location, start_date, end_date, manpower_used, hours_worked, supervisor, status, notes } = body;

    if (!project || !location || !start_date || !end_date || !supervisor) {
      return Response.json({ error: 'Project, location, start date, end date, and supervisor are required' }, { status: 400 });
    }

    const record = await Installation.create({
      project,
      installation_team: installation_team || [],
      location,
      start_date,
      end_date,
      manpower_used: Number(manpower_used) || 0,
      hours_worked: Number(hours_worked) || 0,
      supervisor,
      status: status || 'scheduled',
      notes,
      approval_status: 'pending'
    });

    const populated = await Installation.findById(record._id)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('installation_team');
    return Response.json(populated, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
