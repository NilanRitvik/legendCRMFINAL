import dbConnect from '@/lib/dbConnect';
import { TransportLogistics } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const logistics = await TransportLogistics.find({}).populate('project').sort({ createdAt: -1 });
    return Response.json(logistics);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { project, transport_service, amount, payment_status, payment_date, delivery_date, notes } = body;

    if (!transport_service || !amount) {
      return Response.json({ error: 'Transport service and amount are required' }, { status: 400 });
    }

    const record = await TransportLogistics.create({
      project: project || null,
      transport_service,
      amount: Number(amount),
      payment_status,
      payment_date: payment_status === 'paid' ? (payment_date || new Date()) : null,
      delivery_date,
      notes
    });

    const populated = await TransportLogistics.findById(record._id).populate('project');
    return Response.json(populated, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
