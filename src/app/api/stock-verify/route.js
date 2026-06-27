import dbConnect from '@/lib/dbConnect';
import { MaterialTransaction, MaterialStock } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();

    // Fetch returns approved by CEO
    const transactions = await MaterialTransaction.find({
      transaction_type: 'return',
      approval_status: 'approved'
    }).populate('project').sort({ date: -1 });

    const pending = transactions.filter(t => t.stock_verified === null);
    const verified = transactions.filter(t => t.stock_verified !== null);

    return Response.json({ pending, verified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, verified, notes } = body;

    if (!id || verified === undefined) {
      return Response.json({ error: 'Transaction ID and verified status are required' }, { status: 400 });
    }

    const transaction = await MaterialTransaction.findById(id);
    if (!transaction) {
      return Response.json({ error: 'Material transaction not found' }, { status: 404 });
    }

    if (transaction.transaction_type !== 'return') {
      return Response.json({ error: 'Only return transactions can be stock verified' }, { status: 400 });
    }

    if (transaction.approval_status !== 'approved') {
      return Response.json({ error: 'This transaction must be approved by the CEO before stock verification' }, { status: 400 });
    }

    transaction.stock_verified = !!verified;
    transaction.stock_verify_notes = notes || '';
    transaction.stock_verify_date = new Date();
    await transaction.save();

    // If verified/accepted, add back to stock
    if (verified) {
      const cleanName = transaction.material_name.trim();
      let stockRecord = await MaterialStock.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
      if (!stockRecord) {
        stockRecord = await MaterialStock.create({
          name: cleanName,
          current_stock: 0,
          unit: 'pcs'
        });
      }
      stockRecord.current_stock = (stockRecord.current_stock || 0) + (transaction.quantity || 0);
      await stockRecord.save();
    }

    return Response.json({ success: true, transaction });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
