import dbConnect from '@/lib/dbConnect';
import { Project, Payment, Expense, VendorPayable, Invoice, AMC, MaterialStock, MaterialTransaction } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || '3months';
    const startParam = searchParams.get('startDate');
    const endParam = searchParams.get('endDate');

    const now = new Date();
    let startDate = null;
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (filter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filter === '3months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (filter === '6months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (filter === '12months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    } else if (filter === 'custom' && startParam && endParam) {
      startDate = new Date(startParam);
      endDate = new Date(endParam);
      endDate.setHours(23, 59, 59, 999);
    }

    // Build query filters
    const dateQuery = {};
    if (startDate) {
      dateQuery.$gte = startDate;
      dateQuery.$lte = endDate;
    }

    // 1. Setup Filters
    const projectFilter = {};
    if (startDate) {
      projectFilter.start_date = dateQuery;
    }

    const paymentFilter = {};
    if (startDate) {
      paymentFilter.payment_date = dateQuery;
    }

    const expenseFilter = {};
    if (startDate) {
      expenseFilter.expense_date = dateQuery;
    }

    const chartStartDate = startDate || new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Fetch all database metrics concurrently to avoid waterfall latency
    const [
      detailedProjects,
      detailedPayments,
      detailedExpenses,
      allProjects,
      allPayments,
      unpaidPayables,
      detailedInvoices,
      chartPayments,
      chartExpenses,
      detailedAmcs,
      allMaterials,
      allTransactions
    ] = await Promise.all([
      Project.find(projectFilter).populate('client'),
      Payment.find(paymentFilter)
        .populate({ path: 'project', populate: { path: 'client' } })
        .populate('invoice'),
      Expense.find(expenseFilter)
        .populate('project')
        .populate('linked_payable'),
      Project.find({ status: { $ne: 'cancelled' } }).populate('client'),
      Payment.find({}),
      VendorPayable.find({ status: 'unpaid' }),
      Invoice.find({ status: { $in: ['unpaid', 'partial'] } })
        .populate({ path: 'project', populate: { path: 'client' } })
        .sort({ due_date: 1 }),
      Payment.find({
        payment_date: { $gte: chartStartDate, $lte: endDate }
      }),
      Expense.find({
        expense_date: { $gte: chartStartDate, $lte: endDate }
      }),
      AMC.find({}).populate('client'),
      MaterialStock.find({}),
      MaterialTransaction.find({ transaction_type: 'purchase' })
    ]);

    const totalProjects = detailedProjects.length;
    const totalRevenue = detailedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = detailedExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Sum expenses by category
    const expensesByCategory = {
      salary: 0,
      rent: 0,
      software: 0,
      marketing: 0,
      vendor_settlement: 0,
      project_cost: 0,
      other: 0
    };
    detailedExpenses.forEach(e => {
      const cat = e.category;
      if (expensesByCategory[cat] !== undefined) {
        expensesByCategory[cat] += e.amount;
      }
    });

    // 4. Calculate Net Profit
    const netProfit = totalRevenue - totalExpenses;

    // 5. Global Accounts Receivable (Balance Sheet - NOT date filtered)
    let globalAccountsReceivable = 0;
    const detailedReceivables = [];
    
    allProjects.forEach(proj => {
      const projPayments = allPayments.filter(p => p.project.toString() === proj._id.toString());
      const totalPaid = projPayments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = Math.max(0, proj.value - totalPaid);
      globalAccountsReceivable += remaining;

      if (remaining > 0) {
        detailedReceivables.push({
          _id: proj._id,
          name: proj.name,
          clientCompany: proj.client ? proj.client.company : 'N/A',
          clientPhone: proj.client ? proj.client.phone : '',
          clientEmail: proj.client ? proj.client.email : '',
          value: proj.value,
          paid: totalPaid,
          remaining,
          dueDate: proj.end_date || ''
        });
      }
    });

    // 6. Global Accounts Payable (Balance Sheet - NOT date filtered)
    const globalAccountsPayable = unpaidPayables.reduce((sum, p) => sum + p.amount, 0);
    const detailedPayables = unpaidPayables;

    // 7. Aggregate Monthly Revenue vs Expenses Chart Data
    // Generate array of month dates
    const months = [];
    let currentCursor = new Date(chartStartDate.getFullYear(), chartStartDate.getMonth(), 1);
    while (currentCursor <= endDate) {
      months.push({
        label: currentCursor.toLocaleString('default', { month: 'short', year: '2-digit' }),
        year: currentCursor.getFullYear(),
        month: currentCursor.getMonth(),
      });
      currentCursor.setMonth(currentCursor.getMonth() + 1);
    }

    const chartData = months.map(m => {
      const rev = chartPayments
        .filter(p => {
          const pDate = new Date(p.payment_date);
          return pDate.getFullYear() === m.year && pDate.getMonth() === m.month;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const exp = chartExpenses
        .filter(e => {
          const eDate = new Date(e.expense_date);
          return eDate.getFullYear() === m.year && eDate.getMonth() === m.month;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        month: m.label,
        revenue: rev,
        expenses: exp,
        netProfit: rev - exp
      };
    });

    // 8. AMC Metrics
    const totalAmcs = detailedAmcs.length;
    let totalAmcValue = 0;
    let totalAmcPaid = 0;
    detailedAmcs.forEach(amc => {
      totalAmcValue += amc.amount;
      const amcPaidSum = amc.payments.reduce((sum, p) => sum + p.amount, 0);
      totalAmcPaid += amcPaidSum;
    });
    // Correctly define and calculate totalAmcPending
    const totalAmcPending = totalAmcValue - totalAmcPaid;

    // 9. Stock Worth Metrics
    let totalStockWorth = 0;
    const stockDetails = [];

    allMaterials.forEach(mat => {
      const matPurchases = allTransactions.filter(t => t.material_name.toLowerCase() === mat.name.toLowerCase());
      let avgRate = 0;
      if (matPurchases.length > 0) {
        const totalQty = matPurchases.reduce((sum, p) => sum + p.quantity, 0);
        const totalVal = matPurchases.reduce((sum, p) => sum + (p.quantity * (p.rate || 0)), 0);
        if (totalQty > 0) {
          avgRate = totalVal / totalQty;
        }
      }
      const worth = mat.current_stock * (avgRate || 0);
      totalStockWorth += worth;
      stockDetails.push({
        name: mat.name,
        current_stock: mat.current_stock,
        unit: mat.unit,
        avgRate,
        worth
      });
    });

    return Response.json({
      totalProjects,
      totalRevenue,
      totalExpenses,
      netProfit,
      globalAccountsReceivable,
      globalAccountsPayable,
      chartData,
      expensesByCategory,
      detailedProjects,
      detailedPayments,
      detailedExpenses,
      detailedReceivables,
      detailedPayables,
      detailedInvoices,
      totalAmcs,
      totalAmcValue,
      totalAmcPaid,
      totalAmcPending,
      detailedAmcs,
      totalStockWorth,
      stockDetails
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
