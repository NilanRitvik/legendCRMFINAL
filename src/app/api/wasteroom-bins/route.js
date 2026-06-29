import dbConnect from '@/lib/dbConnect';
import { MaterialTransaction } from '@/lib/models';
import mongoose from 'mongoose';

// Define a simple Schema for Waste Bin Assignments if not already present
const WasteBinSchema = new mongoose.Schema({
  bin_code: { type: String, required: true, unique: true }, // e.g. W-L01 to W-L30, W-R01 to W-R30
  category_name: { type: String, default: '' }, // e.g., MDF Scrap, Veneer Offcuts
  capacity: { type: Number, default: 200 } // Max limit for visual fill level calc
}, { timestamps: true });

const WasteBin = mongoose.models.WasteBin || mongoose.model('WasteBin', WasteBinSchema);

// GET: Fetch all 60 waste bins and calculate accumulated quantities & actual cost
export async function GET(request) {
  try {
    await dbConnect();

    // Fetch bin configuration data
    let bins = await WasteBin.find({}).sort({ bin_code: 1 }).lean();

    // Auto-initialize 40 waste bins (W-L01 to W-L20, W-R01 to W-R20) if not found
    if (bins.length !== 40) {
      await WasteBin.deleteMany({});
      const initialBins = [];
      for (let i = 1; i <= 20; i++) {
        const num = String(i).padStart(2, '0');
        initialBins.push({ bin_code: `W-L${num}`, category_name: 'Wood Offcuts', capacity: 200 });
      }
      for (let i = 1; i <= 20; i++) {
        const num = String(i).padStart(2, '0');
        initialBins.push({ bin_code: `W-R${num}`, category_name: 'Hardware Scrap', capacity: 200 });
      }
      await WasteBin.insertMany(initialBins);
      bins = await WasteBin.find({}).sort({ bin_code: 1 }).lean();
    }

    // Query approved waste transactions
    const wasteTxs = await MaterialTransaction.find({
      transaction_type: 'waste',
      approval_status: 'approved'
    }).lean();

    // Map accumulated totals (quantity, cost) to each bin
    const binMetrics = {};
    wasteTxs.forEach(t => {
      if (!t.waste_bin_code) return;
      const code = t.waste_bin_code.trim().toUpperCase();
      if (!binMetrics[code]) {
        binMetrics[code] = { total_quantity: 0, total_cost: 0, unit: t.unit || 'pcs' };
      }
      const qty = Number(t.quantity) || 0;
      const rate = Number(t.rate) || 0;
      binMetrics[code].total_quantity += qty;
      binMetrics[code].total_cost += qty * rate;
    });

    const enrichedBins = bins.map(b => {
      const code = b.bin_code.trim().toUpperCase();
      const metrics = binMetrics[code] || { total_quantity: 0, total_cost: 0, unit: 'pcs' };
      return {
        ...b,
        current_stock: metrics.total_quantity,
        total_cost: metrics.total_cost,
        unit: metrics.unit
      };
    });

    return Response.json({ bins: enrichedBins });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: Update waste bin settings
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { bin_code, category_name, capacity } = body;

    if (!bin_code) {
      return Response.json({ error: 'Bin code is required' }, { status: 400 });
    }

    const bin = await WasteBin.findOneAndUpdate(
      { bin_code },
      { category_name: category_name || 'General Scrap', capacity: Number(capacity) || 200 },
      { new: true, upsert: true }
    );

    return Response.json({ success: true, bin });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
