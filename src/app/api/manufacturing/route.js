import dbConnect from '@/lib/dbConnect';
import { Manufacturing, MaterialTransaction, Project } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    
    // Fetch all manufacturing jobs
    const manufacturingList = await Manufacturing.find({})
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('material_issue')
      .sort({ createdAt: -1 });

    // Fetch all CEO-approved material issues
    const allApprovedIssues = await MaterialTransaction.find({
      transaction_type: 'issue',
      approval_status: 'approved'
    }).populate({ path: 'project', populate: { path: 'client' } }).sort({ date: -1 });

    // Filter out issues that have already been scheduled for manufacturing
    const scheduledIssueIds = manufacturingList.map(m => m.material_issue?._id?.toString() || m.material_issue?.toString());
    const pendingIssues = allApprovedIssues.filter(issue => !scheduledIssueIds.includes(issue._id.toString()));

    return Response.json({
      manufacturingList,
      pendingIssues
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { project, material_issue, scheduled_start_date, scheduled_start_time, notes } = body;

    if (!project || !material_issue || !scheduled_start_date || !scheduled_start_time) {
      return Response.json({ error: 'Project, material issue reference, and start date/time are required' }, { status: 400 });
    }

    const mfg = await Manufacturing.create({
      project,
      material_issue,
      scheduled_start_date: new Date(scheduled_start_date),
      scheduled_start_time,
      status: 'scheduled',
      notes: notes || '',
      approval_status: 'approved' // Created as approved, needs CEO approval once marked finished
    });

    return Response.json({ success: true, record: mfg }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, action, finished_date, finished_time, notes } = body;

    if (!id || !action) {
      return Response.json({ error: 'Manufacturing ID and action are required' }, { status: 400 });
    }

    const mfg = await Manufacturing.findById(id);
    if (!mfg) {
      return Response.json({ error: 'Manufacturing record not found' }, { status: 404 });
    }

    if (action === 'start') {
      mfg.status = 'in_progress';
      mfg.notes = notes || mfg.notes;
      await mfg.save();
    } else if (action === 'finish') {
      if (!finished_date || !finished_time) {
        return Response.json({ error: 'Finished date and time are required to complete manufacturing' }, { status: 400 });
      }
      mfg.status = 'finished';
      mfg.finished_date = new Date(finished_date);
      mfg.finished_time = finished_time;
      mfg.notes = notes || mfg.notes;
      // Mark as pending CEO approval before releasing to QC
      mfg.approval_status = 'pending';
      await mfg.save();
    } else {
      return Response.json({ error: 'Invalid action specified' }, { status: 400 });
    }

    return Response.json({ success: true, record: mfg });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
