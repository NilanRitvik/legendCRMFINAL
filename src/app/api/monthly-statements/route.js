import dbConnect from '@/lib/dbConnect';
import { Project, Payment, Expense } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const startYearStr = searchParams.get('year') || '2026';
    const startYear = parseInt(startYearStr, 10);

    // April 1st of startYear
    const startDate = new Date(startYear, 3, 1, 0, 0, 0, 0);
    // March 31st of startYear + 1
    const endDate = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);

    // Fetch all relevant data for the Financial Year range
    const projects = await Project.find({
      start_date: { $gte: startDate, $lte: endDate }
    }).populate('client');

    const expenses = await Expense.find({
      expense_date: { $gte: startDate, $lte: endDate }
    }).populate('project');

    const payments = await Payment.find({
      payment_date: { $gte: startDate, $lte: endDate }
    }).populate('project').populate('invoice');

    // Months of the Financial Year (April to March)
    const fyMonths = [
      { label: 'April', month: 3, offsetYear: 0 },
      { label: 'May', month: 4, offsetYear: 0 },
      { label: 'June', month: 5, offsetYear: 0 },
      { label: 'July', month: 6, offsetYear: 0 },
      { label: 'August', month: 7, offsetYear: 0 },
      { label: 'September', month: 8, offsetYear: 0 },
      { label: 'October', month: 9, offsetYear: 0 },
      { label: 'November', month: 10, offsetYear: 0 },
      { label: 'December', month: 11, offsetYear: 0 },
      { label: 'January', month: 0, offsetYear: 1 },
      { label: 'February', month: 1, offsetYear: 1 },
      { label: 'March', month: 2, offsetYear: 1 }
    ];

    const monthlyReport = fyMonths.map(item => {
      const yearVal = startYear + item.offsetYear;
      
      // Filter projects started in this month
      const monthProjects = projects.filter(p => {
        const d = new Date(p.start_date);
        return d.getFullYear() === yearVal && d.getMonth() === item.month;
      });

      // Filter expenses paid in this month
      const monthExpenses = expenses.filter(e => {
        const d = new Date(e.expense_date);
        return d.getFullYear() === yearVal && d.getMonth() === item.month;
      });

      // Filter payments received in this month
      const monthPayments = payments.filter(p => {
        const d = new Date(p.payment_date);
        return d.getFullYear() === yearVal && d.getMonth() === item.month;
      });

      const projectValueSum = monthProjects.reduce((sum, p) => sum + p.value, 0);
      const expensesSum = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const paymentsSum = monthPayments.reduce((sum, p) => sum + p.amount, 0);

      return {
        monthName: item.label,
        year: yearVal,
        monthIndex: item.month,
        projectsCount: monthProjects.length,
        projectValueSum,
        expensesSum,
        paymentsSum,
        netProfitAccrual: projectValueSum - expensesSum,
        netProfitCash: paymentsSum - expensesSum,
        // Detailed lists for click breakout popups
        projects: monthProjects,
        expenses: monthExpenses,
        payments: monthPayments
      };
    });

    // Overall Totals
    const totalProjectValue = projects.reduce((sum, p) => sum + p.value, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const netProfitCash = totalPayments - totalExpenses;
    const netProfitAccrual = totalProjectValue - totalExpenses;

    return Response.json({
      startYear,
      endYear: startYear + 1,
      totalProjectValue,
      totalExpenses,
      totalPayments,
      netProfitCash,
      netProfitAccrual,
      monthlyReport
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
