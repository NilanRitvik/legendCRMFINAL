import dbConnect from '@/lib/dbConnect';
import { VendorPayable } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const payables = await VendorPayable.find({}).sort({ bill_date: -1 });
    return Response.json(payables);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.vendor_name || !body.amount || !body.bill_date || !body.due_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payable = await VendorPayable.create(body);
    return Response.json(payable, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
