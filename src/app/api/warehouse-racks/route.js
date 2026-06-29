import dbConnect from '@/lib/dbConnect';
import { WarehouseRack, MaterialStock, MaterialTransaction } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';

// GET: Fetch all 60 racks (auto-initializes them if not found)
export async function GET(request) {
  try {
    await dbConnect();
    
    // Fetch all racks from DB
    let racks = await WarehouseRack.find({}).sort({ rack_code: 1 }).lean();

    // If database rack count is not 60, clear and regenerate L-01 to L-30 and R-01 to R-30
    if (racks.length !== 60) {
      await WarehouseRack.deleteMany({});
      const initialRacks = [];
      // Generate Left side (L-01 to L-30)
      for (let i = 1; i <= 30; i++) {
        const num = String(i).padStart(2, '0');
        initialRacks.push({ rack_code: `L-${num}`, material_name: '', capacity: 100 });
      }
      // Generate Right side (R-01 to R-30)
      for (let i = 1; i <= 30; i++) {
        const num = String(i).padStart(2, '0');
        initialRacks.push({ rack_code: `R-${num}`, material_name: '', capacity: 100 });
      }
      
      // Bulk insert
      await WarehouseRack.insertMany(initialRacks);
      racks = await WarehouseRack.find({}).sort({ rack_code: 1 }).lean();
    }

    // Fetch all material stocks to map their quantities
    const stocks = await MaterialStock.find({}).lean();
    const stockMap = {};
    stocks.forEach(s => {
      stockMap[s.name.toLowerCase().trim()] = {
        current_stock: s.current_stock,
        unit: s.unit || 'pcs'
      };
    });

    // Fetch all approved material transactions to calculate rack-level stock
    const transactions = await MaterialTransaction.find({ approval_status: 'approved' }).lean();
    
    // Build a map of rack stock values based on transactions
    const rackStockMap = {};
    transactions.forEach(t => {
      if (!t.rack_code) return;
      const code = t.rack_code.trim().toUpperCase();
      if (typeof rackStockMap[code] === 'undefined') {
        rackStockMap[code] = 0;
      }
      const qty = Number(t.quantity) || 0;
      if (t.transaction_type === 'purchase' || t.transaction_type === 'return') {
        rackStockMap[code] += qty;
      } else if (t.transaction_type === 'issue' || t.transaction_type === 'waste') {
        rackStockMap[code] -= qty;
      }
    });

    // Map current stock to each rack based on assigned material name
    const enrichedRacks = racks.map(r => {
      const code = r.rack_code.trim().toUpperCase();
      const matName = r.material_name ? r.material_name.toLowerCase().trim() : '';
      const stockInfo = matName ? stockMap[matName] : null;
      
      // Use rack-specific ledger value if it has transaction records, else fallback to material's total stock
      const hasRackTx = typeof rackStockMap[code] !== 'undefined';
      const current_stock = hasRackTx ? Math.max(0, rackStockMap[code]) : (stockInfo ? stockInfo.current_stock : 0);

      return {
        ...r,
        current_stock,
        unit: stockInfo ? stockInfo.unit : 'pcs'
      };
    });

    return Response.json({ racks: enrichedRacks, materials: stocks });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: Update a rack assignment
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { rack_code, material_name, capacity } = body;

    if (!rack_code) {
      return Response.json({ error: 'Rack code is required' }, { status: 400 });
    }

    // Parse user details from session cookie
    let username = 'System';
    let user_role = 'admin';
    try {
      const cookieHeader = request.headers.get('cookie') || '';
      const sessionCookie = cookieHeader.split('; ').find(row => row.startsWith('legendin_session='));
      if (sessionCookie) {
        const val = sessionCookie.split('=')[1];
        const decoded = Buffer.from(val, 'base64').toString('utf-8');
        const data = JSON.parse(decoded);
        username = data.username || 'System';
        user_role = data.role || 'admin';
      }
    } catch (e) {}

    // Find and update rack
    const rack = await WarehouseRack.findOneAndUpdate(
      { rack_code },
      { material_name: material_name || '', capacity: Number(capacity) || 100 },
      { new: true, upsert: true }
    );

    // Log action activity
    await logActivity({
      username,
      user_role,
      action_type: 'update',
      module: 'purchase',
      description: `Updated Warehouse Rack ${rack_code}: Assigned to "${material_name || 'Unassigned'}" (Capacity: ${capacity})`,
      ref_id: rack._id.toString(),
      ref_name: rack_code
    });

    return Response.json({ success: true, rack });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
