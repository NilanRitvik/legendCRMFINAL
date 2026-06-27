import dbConnect from '@/lib/dbConnect';
import { AMC } from '@/lib/models';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    if (!body.amount || !body.payment_date || !body.method || !body.category) {
      return Response.json({ error: 'Missing required payment fields' }, { status: 400 });
    }

    const amc = await AMC.findById(id);
    if (!amc) {
      return Response.json({ error: 'AMC record not found' }, { status: 404 });
    }

    amc.payments.push({
      amount: Number(body.amount),
      payment_date: body.payment_date,
      method: body.method,
      category: body.category,
      transaction_number: body.transaction_number || '',
      bank_account_received: body.bank_account_received || '',
      crypto_platform: body.crypto_platform || ''
    });

    await amc.save();

    const populated = await AMC.findById(id).populate('client');
    return Response.json(populated, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
