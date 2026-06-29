import dbConnect from '@/lib/dbConnect';
import { Installation } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const url = new URL(request.url);
    const supervisor = url.searchParams.get('supervisor');
    
    const query = {};
    if (supervisor) query.supervisor = supervisor;
    
    const records = await Installation.find(query)
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
      approval_status: 'pending',
      documents: []
    });

    const populated = await Installation.findById(record._id)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('installation_team');
    return Response.json(populated, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, status, approval_status, approval_notes, add_document, remove_document_index } = body;

    if (!id) {
      return Response.json({ error: 'Installation ID is required' }, { status: 400 });
    }

    const installation = await Installation.findById(id);
    if (!installation) {
      return Response.json({ error: 'Installation not found' }, { status: 404 });
    }

    // Update status
    if (status) installation.status = status;
    if (approval_status) installation.approval_status = approval_status;
    if (approval_notes !== undefined) installation.approval_notes = approval_notes;

    // Add a document
    if (add_document) {
      installation.documents = installation.documents || [];
      installation.documents.push({
        file_name: add_document.file_name,
        file_url: add_document.file_url,
        uploaded_at: new Date()
      });
    }

    // Remove a document by index
    if (remove_document_index !== undefined && remove_document_index >= 0) {
      installation.documents = (installation.documents || []).filter((_, i) => i !== remove_document_index);
    }

    await installation.save();

    const updated = await Installation.findById(id)
      .populate({ path: 'project', populate: { path: 'client' } })
      .populate('installation_team');

    return Response.json(updated);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
