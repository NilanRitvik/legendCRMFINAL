import dbConnect from '@/lib/dbConnect';
import { AMC } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const amcs = await AMC.find({})
      .populate('client')
      .sort({ end_date: 1 }); // Sort by end date so upcoming renewals are first
    return Response.json(amcs);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.client || !body.product || !body.start_date || !body.end_date || !body.amount) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const amc = await AMC.create(body);
    const populated = await AMC.findById(amc._id).populate('client');
    return Response.json(populated, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
