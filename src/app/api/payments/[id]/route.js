import dbConnect from '@/lib/dbConnect';
import { Payment, Invoice } from '@/lib/models';

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const payment = await Payment.findById(id);
    if (!payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    const invoiceId = payment.invoice;
    await Payment.findByIdAndDelete(id);

    // Automation: Re-evaluate invoice status
    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
      const remainingPayments = await Payment.find({ invoice: invoiceId });
      const totalPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);

      let status = 'unpaid';
      if (totalPaid >= invoice.amount) {
        status = 'paid';
      } else if (totalPaid > 0) {
        status = 'partial';
      }

      await Invoice.findByIdAndUpdate(invoiceId, { status });
    }

    return Response.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
