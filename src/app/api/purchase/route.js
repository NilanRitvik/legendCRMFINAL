import dbConnect from '@/lib/dbConnect';
import { MaterialStock, MaterialTransaction, ToolAsset, Machine, Project } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';

export async function GET(request) {
  try {
    await dbConnect();
    
    // Fetch all datasets
    const materials = await MaterialStock.find({}).sort({ name: 1 });
    const transactions = await MaterialTransaction.find({}).populate('project').sort({ date: -1 });
    const tools = await ToolAsset.find({}).sort({ createdAt: -1 });
    const machines = await Machine.find({}).sort({ createdAt: -1 });
    
    // Fetch projects won to link material allocations/returns
    const projects = await Project.find({ status: { $ne: 'cancelled' } }).populate('client').sort({ createdAt: -1 });
    
    return Response.json({
      materials,
      transactions,
      tools,
      machines,
      projects
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return Response.json({ error: 'Action parameter is required' }, { status: 400 });
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

    if (action === 'add_purchase') {
      const { material_name, material_brand, rate, quantity, supplier, invoice_number, unit, date, notes, damaged_quantity, gst_percentage, transport_charges } = body;
      if (!material_name || !quantity || !rate) {
        return Response.json({ error: 'Material name, quantity, and rate are required' }, { status: 400 });
      }

      const damagedQty = Number(damaged_quantity) || 0;
      if (damagedQty < 0 || damagedQty > Number(quantity)) {
        return Response.json({ error: 'Damaged quantity cannot be negative or exceed total quantity' }, { status: 400 });
      }

      const transaction = await MaterialTransaction.create({
        transaction_type: 'purchase',
        material_name: material_name.trim(),
        material_brand: material_brand || '',
        quantity: Number(quantity),
        rate: Number(rate),
        unit: unit || 'pcs',
        supplier,
        invoice_number,
        date: date || new Date(),
        notes,
        approval_status: 'pending',
        damaged_quantity: damagedQty,
        replacement_status: damagedQty > 0 ? 'pending' : 'none',
        gst_percentage: Number(gst_percentage) || 0,
        transport_charges: Number(transport_charges) || 0
      });

      return Response.json({ transaction }, { status: 201 });
    }

    if (action === 'add_batch_purchase') {
      const { invoice_number, supplier, date, notes, items, transport_charges } = body;
      if (!invoice_number || !supplier || !items || !Array.isArray(items) || items.length === 0) {
        return Response.json({ error: 'Invoice number, supplier, and items array are required' }, { status: 400 });
      }

      const batch_id = 'batch-purchase-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const createdTxns = [];
      const totalTransport = Number(transport_charges) || 0;
      const splitTransport = totalTransport / items.length;

      for (const item of items) {
        const { material_name, material_brand, rate, quantity, unit, damaged_quantity, notes: itemNotes, gst_percentage, rack_code } = item;
        if (!material_name || !quantity || !rate) {
          return Response.json({ error: `Material name, quantity, and rate are required for item: ${material_name || 'unknown'}` }, { status: 400 });
        }

        const damagedQty = Number(damaged_quantity) || 0;
        if (damagedQty < 0 || damagedQty > Number(quantity)) {
          return Response.json({ error: `Damaged quantity for "${material_name}" cannot be negative or exceed total quantity` }, { status: 400 });
        }

        const transaction = await MaterialTransaction.create({
          transaction_type: 'purchase',
          material_name: material_name.trim(),
          material_brand: material_brand || '',
          quantity: Number(quantity),
          rate: Number(rate),
          unit: unit || 'pcs',
          supplier: supplier.trim(),
          invoice_number: invoice_number.trim(),
          date: date || new Date(),
          notes: itemNotes || notes || '',
          approval_status: 'pending',
          damaged_quantity: damagedQty,
          replacement_status: damagedQty > 0 ? 'pending' : 'none',
          batch_id,
          gst_percentage: Number(gst_percentage) || 0,
          transport_charges: splitTransport,
          rack_code: rack_code || ''
        });

        createdTxns.push(transaction);
      }

      return Response.json({ transactions: createdTxns }, { status: 201 });
    }

    if (action === 'add_old_stock') {
      const { material_name, material_brand, rate, quantity, unit, purchase_date, notes, supplier, invoice_number, rack_code } = body;
      if (!material_name || !quantity) {
        return Response.json({ error: 'Material name and quantity are required' }, { status: 400 });
      }

      const cleanName = material_name.trim();
      const transaction = await MaterialTransaction.create({
        transaction_type: 'old_stock',
        material_name: cleanName,
        material_brand: material_brand || '',
        quantity: Number(quantity),
        rate: Number(rate) || 0,
        supplier: supplier || 'Pre-existing Stock',
        invoice_number: invoice_number || 'OLD-STOCK',
        date: purchase_date ? new Date(purchase_date) : new Date(),
        notes: notes || 'Added as pre-existing/old stock',
        approval_status: 'approved',
        rack_code: rack_code || ''
      });

      // Immediately update MaterialStock (auto-approved for old stock)
      await MaterialStock.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${cleanName}$`, 'i') } },
        {
          $inc: { current_stock: Number(quantity) },
          $set: { unit: unit || 'pcs', last_rate: Number(rate) || 0 },
          $setOnInsert: { name: cleanName }
        },
        { upsert: true, new: true }
      );

      return Response.json({ transaction }, { status: 201 });
    }


    if (action === 'add_issue') {
      const { material_name, quantity, project, date, notes } = body;
      if (!material_name || !quantity || !project) {
        return Response.json({ error: 'Material name, quantity, and project are required' }, { status: 400 });
      }

      const cleanName = material_name.trim();
      let stock = await MaterialStock.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
      if (!stock || stock.current_stock < Number(quantity)) {
        return Response.json({ error: `Insufficient stock. Available: ${stock ? stock.current_stock : 0}` }, { status: 400 });
      }

      const transaction = await MaterialTransaction.create({
        transaction_type: 'issue',
        material_name: cleanName,
        quantity: Number(quantity),
        project,
        date: date || new Date(),
        notes,
        approval_status: 'pending'
      });

      return Response.json({ transaction }, { status: 201 });
    }

    if (action === 'add_return') {
      const { material_name, quantity, project, date, notes } = body;
      if (!material_name || !quantity || !project) {
        return Response.json({ error: 'Material name, quantity, and project are required' }, { status: 400 });
      }

      const transaction = await MaterialTransaction.create({
        transaction_type: 'return',
        material_name: material_name.trim(),
        quantity: Number(quantity),
        project,
        date: date || new Date(),
        notes,
        approval_status: 'pending',
        stock_verified: null
      });

      return Response.json({ transaction }, { status: 201 });
    }

    if (action === 'receive_replacement') {
      const { transaction_id, received_quantity, notes } = body;
      if (!transaction_id || !received_quantity) {
        return Response.json({ error: 'Transaction ID and received quantity are required' }, { status: 400 });
      }

      const qty = Number(received_quantity);
      if (isNaN(qty) || qty <= 0) {
        return Response.json({ error: 'Received quantity must be a positive number' }, { status: 400 });
      }

      const origTx = await MaterialTransaction.findById(transaction_id);
      if (!origTx) {
        return Response.json({ error: 'Original purchase transaction not found' }, { status: 404 });
      }

      if (origTx.replacement_status !== 'pending') {
        return Response.json({ error: 'This transaction does not have a pending replacement' }, { status: 400 });
      }

      const remaining = origTx.damaged_quantity - (origTx.replacement_received_quantity || 0);
      if (qty > remaining) {
        return Response.json({ error: `Received quantity (${qty}) exceeds remaining pending replacement (${remaining})` }, { status: 400 });
      }

      // Create a replacement record (pending CEO approval)
      const cleanName = origTx.material_name.trim();
      const replacementTx = await MaterialTransaction.create({
        transaction_type: 'purchase',
        material_name: cleanName,
        material_brand: origTx.material_brand || '',
        quantity: qty,
        rate: 0, // Replacement is free
        supplier: origTx.supplier,
        invoice_number: `${origTx.invoice_number}-REPLACEMENT`,
        date: new Date(),
        notes: notes || `Replacement for damaged goods (Ref: ${origTx.invoice_number})`,
        approval_status: 'pending',
        parent_transaction: origTx._id
      });

      // Log activity
      await logActivity({
        username,
        user_role,
        action_type: 'create',
        module: 'purchase',
        description: `Logged replacement claim for: ${qty} units of ${cleanName} (Ref: ${origTx.invoice_number}) - Awaiting CEO approval`,
        ref_id: replacementTx._id.toString(),
        ref_name: cleanName
      });

      return Response.json({ transaction: replacementTx }, { status: 201 });
    }

    if (action === 'batch_issue') {
      const { items, project, date, notes } = body;
      if (!items || !Array.isArray(items) || items.length === 0 || !project) {
        return Response.json({ error: 'Items array and project are required' }, { status: 400 });
      }

      const batch_id = 'batch-issue-' + Math.random().toString(36).substr(2, 9).toUpperCase();

      for (const item of items) {
        const cleanName = item.material_name.trim();
        const qty = Number(item.quantity);
        if (!cleanName || isNaN(qty) || qty <= 0) {
          return Response.json({ error: `Invalid item details: ${JSON.stringify(item)}` }, { status: 400 });
        }
        let stock = await MaterialStock.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
        if (!stock || stock.current_stock < qty) {
          return Response.json({ error: `Insufficient stock for ${cleanName}. Available: ${stock ? stock.current_stock : 0}, requested: ${qty}` }, { status: 400 });
        }
      }

      const transactions = [];
      for (const item of items) {
        const cleanName = item.material_name.trim();
        const qty = Number(item.quantity);
        const transaction = await MaterialTransaction.create({
          transaction_type: 'issue',
          material_name: cleanName,
          quantity: qty,
          project,
          date: date || new Date(),
          notes: notes || '',
          approval_status: 'pending',
          batch_id
        });
        transactions.push(transaction);
      }

      return Response.json({ success: true, batch_id, transactions }, { status: 201 });
    }

    if (action === 'batch_return') {
      const { items, project, date, notes } = body;
      if (!items || !Array.isArray(items) || items.length === 0 || !project) {
        return Response.json({ error: 'Items array and project are required' }, { status: 400 });
      }

      const batch_id = 'batch-return-' + Math.random().toString(36).substr(2, 9).toUpperCase();

      const transactions = [];
      for (const item of items) {
        const cleanName = item.material_name.trim();
        const qty = Number(item.quantity);
        const rCode = item.rack_code || '';
        if (!cleanName || isNaN(qty) || qty <= 0) {
          return Response.json({ error: `Invalid item details: ${JSON.stringify(item)}` }, { status: 400 });
        }
        const transaction = await MaterialTransaction.create({
          transaction_type: 'return',
          material_name: cleanName,
          quantity: qty,
          project,
          date: date || new Date(),
          notes: notes || '',
          approval_status: 'pending',
          stock_verified: null,
          batch_id,
          rack_code: rCode
        });
        transactions.push(transaction);
      }

      return Response.json({ success: true, batch_id, transactions }, { status: 201 });
    }


    if (action === 'add_waste') {
      const { material_name, quantity, project, date, notes } = body;
      if (!material_name || !quantity) {
        return Response.json({ error: 'Material name and quantity are required' }, { status: 400 });
      }

      const cleanName = material_name.trim();
      let stock = await MaterialStock.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
      if (!stock || stock.current_stock < Number(quantity)) {
        return Response.json({ error: `Insufficient stock. Available: ${stock ? stock.current_stock : 0}` }, { status: 400 });
      }

      const unitRate = stock.last_rate || 0;
      const targetProject = project && project !== 'general' ? project : null;

      const transaction = await MaterialTransaction.create({
        transaction_type: 'waste',
        material_name: cleanName,
        quantity: Number(quantity),
        rate: unitRate,
        unit: stock.unit || 'pcs',
        project: targetProject,
        date: date || new Date(),
        notes,
        approval_status: 'pending'
      });

      // Log action activity
      await logActivity({
        username,
        user_role,
        action_type: 'create',
        module: 'purchase',
        description: `Logged waste write-off: ${quantity} ${stock.unit || 'pcs'} of ${cleanName} (Est. value: ₹${(unitRate * Number(quantity)).toLocaleString()})`,
        ref_id: transaction._id.toString(),
        ref_name: cleanName
      });

      return Response.json({ transaction }, { status: 201 });
    }

    if (action === 'batch_waste') {
      const { items, project, date, notes } = body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return Response.json({ error: 'Items array is required' }, { status: 400 });
      }

      const batch_id = 'batch-waste-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const targetProject = project && project !== 'general' ? project : null;

      const transactions = [];
      for (const item of items) {
        const cleanName = item.material_name.trim();
        const qty = Number(item.quantity);
        const binCode = item.waste_bin_code || '';
        if (!cleanName || isNaN(qty) || qty <= 0) {
          return Response.json({ error: `Invalid item details: ${JSON.stringify(item)}` }, { status: 400 });
        }

        let stock = await MaterialStock.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
        if (!stock || stock.current_stock < qty) {
          return Response.json({ error: `Insufficient stock for ${cleanName}. Available: ${stock ? stock.current_stock : 0}, requested: ${qty}` }, { status: 400 });
        }

        const unitRate = stock.last_rate || 0;

        const transaction = await MaterialTransaction.create({
          transaction_type: 'waste',
          material_name: cleanName,
          quantity: qty,
          rate: unitRate,
          unit: stock.unit || 'pcs',
          project: targetProject,
          date: date || new Date(),
          notes: notes || '',
          approval_status: 'pending',
          batch_id,
          waste_bin_code: binCode
        });
        transactions.push(transaction);
      }

      // Log action activity
      await logActivity({
        username,
        user_role,
        action_type: 'create',
        module: 'purchase',
        description: `Logged batch waste write-off of ${items.length} items (Batch ID: ${batch_id})`,
        ref_id: batch_id,
        ref_name: batch_id
      });

      return Response.json({ success: true, batch_id, transactions }, { status: 201 });
    }

    // ─── TOOLS ACTIONS ───
    if (action === 'add_tool') {
      const { name, make_brand, asset_id, status, handler_name, handler_contact, handler_supervisor, issue_date, tool_worth, acknowledgement_copy, photo_url, notes } = body;
      if (!name) return Response.json({ error: 'Tool name is required' }, { status: 400 });

      const tool = await ToolAsset.create({
        name,
        make_brand,
        asset_id,
        status: status || 'available',
        handler_name,
        handler_contact,
        handler_supervisor,
        issue_date: issue_date ? new Date(issue_date) : null,
        tool_worth: Number(tool_worth) || 0,
        acknowledgement_copy,
        photo_url,
        notes
      });
      return Response.json(tool, { status: 201 });
    }

    if (action === 'update_tool') {
      const { id, name, make_brand, asset_id, status, handler_name, handler_contact, handler_supervisor, issue_date, damage_date, damage_cost, tool_worth, acknowledgement_copy, photo_url, notes } = body;
      if (!id) return Response.json({ error: 'Tool ID is required' }, { status: 400 });

      const oldTool = await ToolAsset.findById(id);
      if (!oldTool) return Response.json({ error: 'Tool not found' }, { status: 404 });

      let previous_handler = oldTool.previous_handler || '';
      if (oldTool.handler_name && oldTool.handler_name !== handler_name) {
        previous_handler = oldTool.handler_name;
      }

      const updateData = {
        name: name || oldTool.name,
        make_brand,
        asset_id,
        status,
        handler_name,
        handler_contact,
        handler_supervisor,
        tool_worth: Number(tool_worth) || 0,
        acknowledgement_copy,
        photo_url,
        previous_handler,
        notes
      };

      if (status === 'issued') {
        updateData.issue_date = issue_date || oldTool.issue_date || new Date();
        updateData.damage_date = null;
        updateData.damage_cost = 0;
      } else if (status === 'damaged') {
        updateData.damage_date = damage_date || oldTool.damage_date || new Date();
        updateData.damage_cost = Number(damage_cost) || 0;
      } else {
        // available
        updateData.handler_name = '';
        updateData.handler_contact = '';
        updateData.handler_supervisor = '';
        updateData.issue_date = null;
        updateData.damage_date = null;
        updateData.damage_cost = 0;
      }

      const tool = await ToolAsset.findByIdAndUpdate(id, updateData, { new: true });
      return Response.json(tool);
    }

    // ─── MACHINE ACTIONS ───
    if (action === 'add_machine') {
      const { name, make_brand, purchase_year, last_service_date, next_service_due, service_contact, notes } = body;
      if (!name) return Response.json({ error: 'Machine name is required' }, { status: 400 });

      const machine = await Machine.create({
        name,
        make_brand,
        purchase_year: Number(purchase_year) || null,
        last_service_date,
        next_service_due,
        service_contact,
        notes,
        status: 'available'
      });
      return Response.json(machine, { status: 201 });
    }

    if (action === 'add_machine_service') {
      const { id, service_date, expenses, description, next_service_due, status } = body;
      if (!id || !expenses) return Response.json({ error: 'Machine ID and expenses are required' }, { status: 400 });

      const machine = await Machine.findById(id);
      if (!machine) return Response.json({ error: 'Machine not found' }, { status: 404 });

      // Add service record
      const serviceRecord = {
        service_date: service_date || new Date(),
        expenses: Number(expenses),
        description: description || 'Regular machine service'
      };

      machine.service_history.push(serviceRecord);
      machine.service_expenses_total = (machine.service_expenses_total || 0) + Number(expenses);
      machine.last_service_date = service_date || new Date();
      if (next_service_due) {
        machine.next_service_due = next_service_due;
      }
      if (status) {
        machine.status = status;
      }

      await machine.save();
      return Response.json(machine);
    }

    if (action === 'update_machine') {
      const { id, name, make_brand, purchase_year, status, next_service_due, service_contact, notes } = body;
      if (!id) return Response.json({ error: 'Machine ID is required' }, { status: 400 });

      const machine = await Machine.findByIdAndUpdate(id, {
        name,
        make_brand,
        purchase_year: Number(purchase_year) || null,
        status,
        next_service_due,
        service_contact,
        notes
      }, { new: true });
      return Response.json(machine);
    }

    if (action === 'delete_tool') {
      const { id } = body;
      if (!id) return Response.json({ error: 'Tool ID is required' }, { status: 400 });
      const tool = await ToolAsset.findByIdAndDelete(id);
      if (!tool) return Response.json({ error: 'Tool not found' }, { status: 404 });
      return Response.json({ success: true, message: 'Tool deleted successfully' });
    }

    if (action === 'delete_machine') {
      const { id } = body;
      if (!id) return Response.json({ error: 'Machine ID is required' }, { status: 400 });
      const machine = await Machine.findByIdAndDelete(id);
      if (!machine) return Response.json({ error: 'Machine not found' }, { status: 404 });
      return Response.json({ success: true, message: 'Machine deleted successfully' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, action, quantity, rate, gst_percentage, transport_charges, accounts_approved } = body;

    if (!id) {
      return Response.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const txn = await MaterialTransaction.findById(id);
    if (!txn) {
      return Response.json({ error: 'Material transaction not found' }, { status: 404 });
    }

    if (action === 'update_project_material') {
      if (quantity !== undefined) txn.quantity = Number(quantity);
      if (rate !== undefined) txn.rate = Number(rate);
      if (gst_percentage !== undefined) txn.gst_percentage = Number(gst_percentage);
      if (transport_charges !== undefined) txn.transport_charges = Number(transport_charges);
      if (accounts_approved !== undefined) {
        txn.accounts_approved = Boolean(accounts_approved);
        txn.accounts_approved_date = Boolean(accounts_approved) ? new Date() : null;
      }
      
      await txn.save();
      return Response.json({ success: true, transaction: txn });
    }

    return Response.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
