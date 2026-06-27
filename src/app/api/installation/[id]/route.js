import dbConnect from '@/lib/dbConnect';
import { Installation } from '@/lib/models';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const record = await Installation.findByIdAndUpdate(id, body, { new: true })
      .populate('project')
      .populate('installation_team');
    return Response.json(record);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    await Installation.findByIdAndDelete(id);
    return Response.json({ message: 'Installation record deleted' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
