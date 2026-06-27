import dbConnect from '@/lib/dbConnect';
import { Logistics, QC, Project } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();

    // Fetch all logistics dispatches
    const logisticsList = await Logistics.find({})
      .populate('qc')
      .populate({ path: 'project', populate: { path: 'client' } })
      .sort({ createdAt: -1 });

    // Fetch all QC records approved by the CEO
    const approvedQCs = await QC.find({
      status: 'approved',
      approval_status: 'approved'
    }).populate({ path: 'project', populate: { path: 'client' } }).populate({
      path: 'manufacturing',
      populate: { path: 'material_issue' }
    }).sort({ updatedAt: -1 });

    // Filter out QC records that have already been scheduled for logistics dispatch
    const processedQCIds = logisticsList.map(l => l.qc?._id?.toString() || l.qc?.toString());
    const pendingQC = approvedQCs.filter(q => !processedQCIds.includes(q._id.toString()));

    return Response.json({
      logisticsList,
      pendingQC
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { project, qc, item, site, transport, date, time, distance, driver } = body;

    if (!project || !qc || !item || !site || !transport || !date || !time || !distance || !driver) {
      return Response.json({ error: 'All fields (project, qc reference, item, destination site, transport type, date, time, distance, driver) are required' }, { status: 400 });
    }

    // Create logistics dispatch schedule
    const delivery = await Logistics.create({
      project,
      qc,
      item,
      site,
      transport,
      date: new Date(date),
      time,
      distance: Number(distance),
      driver,
      status: 'scheduled',
      approval_status: 'pending' // Queues in CEO approvals feed for dispatch release
    });

    return Response.json({ success: true, record: delivery }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
