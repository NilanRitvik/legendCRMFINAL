import dbConnect from '@/lib/dbConnect';
import { Client } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const source = searchParams.get('source');

    let query = {};
    if (stage) query.stage = stage;
    if (source) query.source = source;

    const clients = await Client.find(query).sort({ createdAt: -1 });
    return Response.json(clients);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    if (!body.name || !body.company || !body.email || !body.source) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await Client.create(body);
    return Response.json(client, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
