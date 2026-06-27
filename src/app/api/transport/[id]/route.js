import dbConnect from '@/lib/dbConnect';
import { TransportLogistics } from '@/lib/models';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const record = await TransportLogistics.findByIdAndUpdate(id, body, { new: true });
    return Response.json(record);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    await TransportLogistics.findByIdAndDelete(id);
    return Response.json({ message: 'Transport record deleted' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
