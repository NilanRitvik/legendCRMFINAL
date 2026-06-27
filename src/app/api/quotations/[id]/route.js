import dbConnect from '@/lib/dbConnect';
import { Quotation, Project, Client } from '@/lib/models';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const quotation = await Quotation.findById(id).populate('client');
    if (!quotation) {
      return Response.json({ error: 'Quotation not found' }, { status: 404 });
    }
    return Response.json(quotation);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    // Check if quotation exists
    const existingQuotation = await Quotation.findById(id).populate('client');
    if (!existingQuotation) {
      return Response.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const previousStatus = existingQuotation.status;
    const newStatus = body.status;

    // Perform status transition logic
    const quotation = await Quotation.findByIdAndUpdate(id, body, { new: true, runValidators: true }).populate('client');

    if (newStatus === 'accepted' && previousStatus !== 'accepted') {
      // 1. Create a Project
      // Check if project already exists for this quotation to avoid duplicate projects
      const existingProject = await Project.findOne({ quotation: id });
      if (!existingProject) {
        await Project.create({
          client: quotation.client._id,
          quotation: quotation._id,
          name: `${quotation.client.company} - ${quotation.scope_description || 'New Development Project'}`,
          type: 'new',
          status: 'not_started',
          value: quotation.quoted_value,
          start_date: new Date(),
        });
      }

      // 2. Set Client stage to 'won'
      await Client.findByIdAndUpdate(quotation.client._id, { stage: 'won' });
    } else if (newStatus === 'rejected' && previousStatus !== 'rejected') {
      // Set Client stage to 'lost'
      await Client.findByIdAndUpdate(quotation.client._id, { 
        stage: 'lost',
        lost_reason: 'Quotation rejected by client.' 
      });
    }

    return Response.json(quotation);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const quotation = await Quotation.findByIdAndDelete(id);
    if (!quotation) {
      return Response.json({ error: 'Quotation not found' }, { status: 404 });
    }
    return Response.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
