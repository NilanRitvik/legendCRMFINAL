import dbConnect from '@/lib/dbConnect';
import { CompanyAsset, Expense } from '@/lib/models';

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const asset = await CompanyAsset.findById(id);
    if (!asset) {
      return Response.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Delete associated expense
    if (asset.linked_expense) {
      await Expense.findByIdAndDelete(asset.linked_expense);
    }
    
    // Fallback: delete expenses linked to this asset ID
    await Expense.deleteMany({ linked_asset: id });

    await CompanyAsset.findByIdAndDelete(id);
    return Response.json({ message: 'Asset and associated expenses deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
