import dbConnect from '@/lib/dbConnect';
import { AMC } from '@/lib/models';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const amc = await AMC.findByIdAndUpdate(id, body, { new: true }).populate('client');
    if (!amc) {
      return Response.json({ error: 'AMC record not found' }, { status: 404 });
    }
    return Response.json(amc);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const amc = await AMC.findByIdAndDelete(id);
    if (!amc) {
      return Response.json({ error: 'AMC record not found' }, { status: 404 });
    }
    return Response.json({ message: 'AMC deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
