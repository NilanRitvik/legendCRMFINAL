import dbConnect from '@/lib/dbConnect';
import { Expense } from '@/lib/models';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const expense = await Expense.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!expense) {
      return Response.json({ error: 'Expense not found' }, { status: 404 });
    }
    return Response.json(expense);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) {
      return Response.json({ error: 'Expense not found' }, { status: 404 });
    }
    return Response.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
