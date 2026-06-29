import dbConnect from '@/lib/dbConnect';
import {
  MaterialStock, Project, Payroll, Invoice, Payment, Employee, Client, Expense
} from '@/lib/models';

export async function POST(request) {
  try {
    await dbConnect();
    const { module, format, username, userRole } = await request.json();

    const isCEO = userRole === 'ceo' || userRole === 'admin';
    if (!isCEO) {
      return Response.json({ error: 'Access denied: Only CEO/Admin can download reports.' }, { status: 403 });
    }

    let csvContent = '';
    let filename = `${module || 'report'}_export.csv`;

    // Helpers to escape CSV cells
    const esc = (val) => {
      if (val === null || val === undefined) return '';
      let str = String(val).replace(/"/g, '""'); // Escape quotes
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str}"`;
      }
      return str;
    };

    // Helper for currency format in CSV (plain numbers or formatted)
    const cur = (n) => n ? Number(n).toFixed(2) : '0.00';

    if (module === 'stock') {
      const stocks = await MaterialStock.find({}).lean();
      csvContent += 'Material Name,Current Stock,Unit,Min Stock Limit,Rate,Total Value,Alert Status\n';
      stocks.forEach(s => {
        const value = (s.current_stock || 0) * (s.rate || 0);
        const alert = (s.current_stock || 0) <= (s.min_stock || 10) ? 'LOW STOCK' : 'OK';
        csvContent += `${esc(s.material_name)},${s.current_stock || 0},${esc(s.unit)},${s.min_stock || 10},${cur(s.rate)},${cur(value)},${alert}\n`;
      });
      filename = `Stock_Report_${new Date().toISOString().split('T')[0]}.csv`;

    } else if (module === 'projects') {
      const projects = await Project.find({}).populate('client').lean();
      csvContent += 'Project Name,Client Name,Start Date,End Date,Value,Status,Team Size\n';
      projects.forEach(p => {
        const teamSize = p.team ? p.team.length : 0;
        const sDate = p.start_date ? new Date(p.start_date).toLocaleDateString('en-IN') : '-';
        const eDate = p.end_date ? new Date(p.end_date).toLocaleDateString('en-IN') : '-';
        csvContent += `${esc(p.name)},${esc(p.client?.name || 'N/A')},${esc(sDate)},${esc(eDate)},${cur(p.value)},${esc(p.status)},${teamSize}\n`;
      });
      filename = `Projects_Report_${new Date().toISOString().split('T')[0]}.csv`;

    } else if (module === 'payroll') {
      const payrolls = await Payroll.find({}).lean();
      csvContent += 'Employee Code,Employee Name,Month,Year,Basic Salary,Allowances,Deductions,Net Salary,Payment Status\n';
      payrolls.forEach(p => {
        csvContent += `${esc(p.employee_code)},${esc(p.employee_name)},${p.month},${p.year},${cur(p.basic_salary)},${cur(p.allowances)},${cur(p.deductions)},${cur(p.net_salary)},${esc(p.status)}\n`;
      });
      filename = `Payroll_Report_${new Date().toISOString().split('T')[0]}.csv`;

    } else if (module === 'payments' || module === 'finance') {
      const invoices = await Invoice.find({}).populate('client project').lean();
      csvContent += 'Invoice Number,Client Name,Project Name,Amount Billed,Paid Amount,Outstanding Balance,Due Date,Status\n';
      invoices.forEach(i => {
        const paid = (i.amount || 0) - (i.outstanding_amount || 0);
        const dueDate = i.due_date ? new Date(i.due_date).toLocaleDateString('en-IN') : '-';
        csvContent += `${esc(i.invoice_number)},${esc(i.client?.name || 'N/A')},${esc(i.project?.name || 'N/A')},${cur(i.amount)},${cur(paid)},${cur(i.outstanding_amount)},${esc(dueDate)},${esc(i.status)}\n`;
      });
      filename = `Financial_Report_${new Date().toISOString().split('T')[0]}.csv`;

    } else if (module === 'employees') {
      const employees = await Employee.find({}).lean();
      csvContent += 'Employee Code,Employee Name,Designation,Department,Type,Basic Salary,Status\n';
      employees.forEach(e => {
        csvContent += `${esc(e.employee_code)},${esc(e.name)},${esc(e.designation)},${esc(e.department)},${esc(e.type)},${cur(e.basic_salary)},${esc(e.status)}\n`;
      });
      filename = `Employee_Report_${new Date().toISOString().split('T')[0]}.csv`;

    } else if (module === 'clients') {
      const clients = await Client.find({}).lean();
      csvContent += 'Client Name,Company Name,Email,Phone,Lead Source,Stage,Approx Value\n';
      clients.forEach(c => {
        csvContent += `${esc(c.name)},${esc(c.company)},${esc(c.email)},${esc(c.phone)},${esc(c.source)},${esc(c.stage)},${cur(c.approx_value)}\n`;
      });
      filename = `CRM_Client_Report_${new Date().toISOString().split('T')[0]}.csv`;

    } else {
      // Default fallback: export activity log
      const logs = await ActivityLog.find({}).sort({ createdAt: -1 }).limit(200).lean();
      csvContent += 'Timestamp,User,Role,Action,Module,Description\n';
      logs.forEach(l => {
        const time = new Date(l.createdAt).toLocaleString('en-IN');
        csvContent += `${esc(time)},${esc(l.username)},${esc(l.user_role)},${esc(l.action_type)},${esc(l.module)},${esc(l.description)}\n`;
      });
      filename = `Activity_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`;
    }

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0'
      }
    });

  } catch (error) {
    console.error('Download route error:', error);
    return Response.json({ error: `Failed to compile download: ${error.message}` }, { status: 500 });
  }
}
