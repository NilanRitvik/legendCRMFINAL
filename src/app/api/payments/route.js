import dbConnect from '@/lib/dbConnect';
import { Payment, Invoice } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const payments = await Payment.find({})
      .populate('invoice')
      .populate({
        path: 'project',
        populate: { path: 'client' }
      })
      .sort({ payment_date: -1 });
    return Response.json(payments);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.invoice || !body.project || !body.amount || !body.payment_date || !body.method) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payment = await Payment.create(body);

    // Automation: Update associated Invoice status
    const invoiceId = body.invoice;
    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
      const allPayments = await Payment.find({ invoice: invoiceId });
      const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

      let status = 'unpaid';
      if (totalPaid >= invoice.amount) {
        status = 'paid';
      } else if (totalPaid > 0) {
        status = 'partial';
      }

      await Invoice.findByIdAndUpdate(invoiceId, { status });
    }

    const populated = await Payment.findById(payment._id)
      .populate('invoice')
      .populate('project');

    return Response.json(populated, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
