import dbConnect from '@/lib/dbConnect';
import { Team } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const team = await Team.find({}).sort({ createdAt: -1 });
    return Response.json(team);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.name || !body.role || !body.monthly_cost) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const member = await Team.create(body);
    return Response.json(member, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
