import dbConnect from '@/lib/dbConnect';
import { VendorPayable, Expense } from '@/lib/models';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const oldPayable = await VendorPayable.findById(id);
    if (!oldPayable) {
      return Response.json({ error: 'Payable not found' }, { status: 404 });
    }

    const payable = await VendorPayable.findByIdAndUpdate(id, body, { new: true, runValidators: true });

    // Automation: Payable marked paid -> auto-create Expense record
    if (body.status === 'paid' && oldPayable.status !== 'paid') {
      const existingExpense = await Expense.findOne({ linked_payable: id });
      if (!existingExpense) {
        await Expense.create({
          category: 'vendor_settlement',
          amount: payable.amount,
          expense_date: new Date(),
          linked_payable: id,
        });
      }
    }

    return Response.json(payable);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    
    // Also delete any associated expense
    await Expense.deleteMany({ linked_payable: id });
    const payable = await VendorPayable.findByIdAndDelete(id);
    if (!payable) {
      return Response.json({ error: 'Payable not found' }, { status: 404 });
    }
    return Response.json({ message: 'Payable and associated expenses deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
