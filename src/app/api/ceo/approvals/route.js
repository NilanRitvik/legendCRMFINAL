import dbConnect from '@/lib/dbConnect';
import { MaterialTransaction, MaterialStock, Employee, Design, Installation, Manufacturing, QC, Logistics, WorkLog, Expense } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();

    // Query pending records
    const transactions = await MaterialTransaction.find({ approval_status: 'pending' }).populate('project').sort({ date: -1 });
    const employees = await Employee.find({ approval_status: 'pending' }).sort({ createdAt: -1 });
    const designs = await Design.find({ approval_status: 'pending' }).populate('client').sort({ uploaded_at: -1 });
    const installations = await Installation.find({ approval_status: 'pending' }).populate('project').sort({ createdAt: -1 });
    
    // New pending records for Manufacturing, QC, and Logistics
    const manufacturing = await Manufacturing.find({ approval_status: 'pending' })
      .populate('project')
      .populate({
        path: 'material_issue',
        populate: { path: 'project' }
      })
      .sort({ createdAt: -1 });

    const qc = await QC.find({ approval_status: 'pending' })
      .populate('project')
      .populate({
        path: 'manufacturing',
        populate: { path: 'material_issue' }
      })
      .sort({ createdAt: -1 });

    const logistics = await Logistics.find({ approval_status: 'pending' })
      .populate('project')
      .populate({
        path: 'qc',
        populate: { path: 'manufacturing' }
      })
      .sort({ createdAt: -1 });

    const worklogs = await WorkLog.find({ approval_status: 'pending' })
      .populate('employee')
      .populate('project')
      .sort({ date: -1 });

    // Separate purchases and stock logs
    const purchases = transactions.filter(t => t.transaction_type === 'purchase');
    const stock = transactions.filter(t => t.transaction_type !== 'purchase');

    return Response.json({
      purchases,
      stock,
      hr: employees,
      design: designs,
      installation: installations,
      manufacturing,
      qc,
      logistics,
      worklogs
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { module, id, status, notes } = body;

    if (!module || !id || !status) {
      return Response.json({ error: 'Module, id, and status parameters are required' }, { status: 400 });
    }

    if (module === 'purchase' || module === 'stock') {
      const transaction = await MaterialTransaction.findById(id);
      if (!transaction) return Response.json({ error: 'Transaction record not found' }, { status: 404 });

      if (transaction.approval_status !== 'pending') {
        return Response.json({ error: 'This transaction has already been processed' }, { status: 400 });
      }

      transaction.approval_status = status;
      transaction.approval_notes = notes || '';
      await transaction.save();

      // If approved, update MaterialStock (except for returns, which require stock verification)
      if (status === 'approved' && transaction.transaction_type !== 'return') {
        const cleanName = transaction.material_name.trim();
        let stockRecord = await MaterialStock.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
        
        if (!stockRecord) {
          stockRecord = await MaterialStock.create({
            name: cleanName,
            current_stock: 0,
            unit: transaction.unit || 'pcs'
          });
        } else if (transaction.unit) {
          stockRecord.unit = transaction.unit;
        }

        const qty = Number(transaction.quantity) || 0;
        if (transaction.transaction_type === 'purchase') {
          const damaged = Number(transaction.damaged_quantity) || 0;
          stockRecord.current_stock = (stockRecord.current_stock || 0) + (qty - damaged);
        } else if (transaction.transaction_type === 'issue' || transaction.transaction_type === 'waste') {
          stockRecord.current_stock = Math.max(0, (stockRecord.current_stock || 0) - qty);
        }
        await stockRecord.save();
      }

      return Response.json({ success: true, record: transaction });
    }

    if (module === 'hr') {
      const employee = await Employee.findById(id);
      if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });

      if (status === 'approved') {
        if (employee.pending_basic_salary !== null && employee.pending_basic_salary !== undefined) {
          employee.basic_salary = employee.pending_basic_salary;
        }
        employee.approval_status = 'approved';
        employee.approval_notes = notes || 'Approved';
      } else if (status === 'rejected') {
        // If the employee was already approved previously (i.e. this is just a salary change rejection)
        if (employee.basic_salary && employee.pending_basic_salary !== employee.basic_salary) {
          employee.pending_basic_salary = employee.basic_salary; // Revert pending change
          employee.approval_status = 'approved'; // Re-approve under old salary
          employee.approval_notes = notes || 'Salary change rejected, old salary kept';
        } else {
          // This is a brand new employee rejection
          employee.approval_status = 'rejected';
          employee.approval_notes = notes || 'Rejected';
          employee.status = 'inactive';
        }
      }
      await employee.save();
      return Response.json({ success: true, record: employee });
    }

    if (module === 'design') {
      const design = await Design.findById(id);
      if (!design) return Response.json({ error: 'Design not found' }, { status: 404 });

      design.approval_status = status;
      design.approval_notes = notes || '';
      await design.save();
      return Response.json({ success: true, record: design });
    }

    if (module === 'installation') {
      const installation = await Installation.findById(id);
      if (!installation) return Response.json({ error: 'Installation not found' }, { status: 404 });

      installation.approval_status = status;
      installation.approval_notes = notes || '';
      await installation.save();
      return Response.json({ success: true, record: installation });
    }

    if (module === 'manufacturing') {
      const mfg = await Manufacturing.findById(id);
      if (!mfg) return Response.json({ error: 'Manufacturing record not found' }, { status: 404 });

      mfg.approval_status = status;
      mfg.approval_notes = notes || '';
      if (status === 'approved') {
        mfg.status = 'finished'; // confirm finished status
      } else {
        mfg.status = 'in_progress'; // revert to in_progress if rejected
      }
      await mfg.save();
      return Response.json({ success: true, record: mfg });
    }

    if (module === 'qc') {
      const qc = await QC.findById(id);
      if (!qc) return Response.json({ error: 'QC record not found' }, { status: 404 });

      qc.approval_status = status;
      qc.approval_notes = notes || '';
      if (status === 'approved') {
        qc.status = 'approved'; // Clear inspection
      } else {
        qc.status = 'rejected';
      }
      await qc.save();
      return Response.json({ success: true, record: qc });
    }

    if (module === 'logistics') {
      const logistics = await Logistics.findById(id);
      if (!logistics) return Response.json({ error: 'Logistics record not found' }, { status: 404 });

      logistics.approval_status = status;
      logistics.approval_notes = notes || '';
      if (status === 'approved') {
        logistics.status = 'dispatched'; // Released for delivery
      } else {
        logistics.status = 'scheduled';
      }
      await logistics.save();
      return Response.json({ success: true, record: logistics });
    }

    if (module === 'worklog') {
      const log = await WorkLog.findById(id).populate('employee');
      if (!log) return Response.json({ error: 'Work log not found' }, { status: 404 });

      log.approval_status = status;
      log.approval_notes = notes || '';
      await log.save();

      // If approved and linked to a project, create an Expense!
      if (status === 'approved' && log.project) {
        const rateType = log.employee?.rate_type || 'hourly';
        let hourlyRate = log.employee?.basic_salary || 0;
        if (rateType === 'monthly') {
          hourlyRate = Math.round(hourlyRate / 160);
        }
        const costAmount = Math.round(log.hours_worked * hourlyRate);

        if (costAmount > 0) {
          await Expense.create({
            category: 'project_cost',
            amount: costAmount,
            expense_date: log.date,
            project: log.project,
            description: `Freelancer Cost: ${log.employee?.name || 'Freelancer'} (${log.hours_worked} hrs @ ₹${hourlyRate}/hr)`
          });
        }
      }
      return Response.json({ success: true, record: log });
    }

    return Response.json({ error: 'Invalid module specified' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
