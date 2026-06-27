import dbConnect from '@/lib/dbConnect';
import { QC, Manufacturing, Project } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();

    // Fetch all QC records
    const qcList = await QC.find({})
      .populate({
        path: 'manufacturing',
        populate: { path: 'material_issue' }
      })
      .populate({ path: 'project', populate: { path: 'client' } })
      .sort({ createdAt: -1 });

    // Fetch all finished manufacturing runs that have been approved by the CEO
    const approvedManufacturing = await Manufacturing.find({
      status: 'finished',
      approval_status: 'approved'
    }).populate({ path: 'project', populate: { path: 'client' } }).populate('material_issue').sort({ finished_date: -1 });

    // Filter out manufacturing runs that already have a QC record
    const processedMfgIds = qcList.map(q => q.manufacturing?._id?.toString() || q.manufacturing?.toString());
    const pendingManufacturing = approvedManufacturing.filter(m => !processedMfgIds.includes(m._id.toString()));

    return Response.json({
      qcList,
      pendingManufacturing
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { manufacturing, project, checked_items, description } = body;

    if (!manufacturing || !project || !checked_items) {
      return Response.json({ error: 'Manufacturing reference, project reference, and checked checklist items are required' }, { status: 400 });
    }

    // Create QC inspection entry
    const qc = await QC.create({
      manufacturing,
      project,
      checked_items,
      description: description || '',
      status: 'pending', // Pending CEO review
      approval_status: 'pending' // Queues in CEO approvals feed
    });

    return Response.json({ success: true, record: qc }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
