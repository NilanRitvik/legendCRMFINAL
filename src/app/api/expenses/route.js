import dbConnect from '@/lib/dbConnect';
import { Expense } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const expenses = await Expense.find({})
      .populate('linked_payable')
      .populate('linked_asset')
      .sort({ expense_date: -1 });
    return Response.json(expenses);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.category || !body.amount || !body.expense_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const expense = await Expense.create(body);
    return Response.json(expense, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
