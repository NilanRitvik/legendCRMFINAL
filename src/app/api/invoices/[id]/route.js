import dbConnect from '@/lib/dbConnect';
import { Invoice, Payment, Project } from '@/lib/models';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const invoice = await Invoice.findById(id).populate({
      path: 'project',
      populate: { path: 'client' }
    });
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const payments = await Payment.find({ invoice: id });
    return Response.json({ invoice, payments });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const oldInvoice = await Invoice.findById(id);
    if (!oldInvoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = await Invoice.findByIdAndUpdate(id, body, { new: true, runValidators: true }).populate('project');

    // Automation: if manually marked paid, create a payment for the remaining balance if needed
    if (body.status === 'paid' && oldInvoice.status !== 'paid') {
      const existingPayments = await Payment.find({ invoice: id });
      const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = invoice.amount - totalPaid;

      if (remaining > 0) {
        await Payment.create({
          invoice: id,
          project: invoice.project._id,
          amount: remaining,
          payment_date: new Date(),
          method: 'Auto-generated on Mark Paid'
        });
      }
    }

    return Response.json(invoice);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    
    // Also delete any payments linked to this invoice
    await Payment.deleteMany({ invoice: id });
    const invoice = await Invoice.findByIdAndDelete(id);
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }
    return Response.json({ message: 'Invoice and associated payments deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
