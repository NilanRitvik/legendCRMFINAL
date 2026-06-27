import dbConnect from '@/lib/dbConnect';
import { Client } from '@/lib/models';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const client = await Client.findById(id);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }
    return Response.json(client);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const client = await Client.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }
    return Response.json(client);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const client = await Client.findByIdAndDelete(id);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }
    return Response.json({ message: 'Client deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
