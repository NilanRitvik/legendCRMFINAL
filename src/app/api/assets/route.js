import dbConnect from '@/lib/dbConnect';
import { CompanyAsset, Expense } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const assets = await CompanyAsset.find({}).populate('linked_expense').sort({ purchase_date: -1 });
    return Response.json(assets);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.name || !body.category || !body.purchase_value || !body.purchase_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create the asset
    const asset = await CompanyAsset.create(body);

    // 2. Create corresponding Expense entry
    const expenseCategory = body.category === 'software license' ? 'software' : 'other';
    const expense = await Expense.create({
      category: expenseCategory,
      amount: body.purchase_value,
      expense_date: body.purchase_date,
      linked_asset: asset._id,
    });

    // 3. Link Expense back to Asset
    const updatedAsset = await CompanyAsset.findByIdAndUpdate(
      asset._id,
      { linked_expense: expense._id },
      { new: true }
    ).populate('linked_expense');

    return Response.json(updatedAsset, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
