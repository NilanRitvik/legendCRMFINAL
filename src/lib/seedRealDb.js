import dbConnect from './dbConnect';
import {
  Client, Project, Invoice, Payment, Employee, MaterialStock,
  Manufacturing, QC, Logistics, ActivityLog, User
} from './models';

export async function seedRealDb() {
  console.log('Connecting to MongoDB Atlas...');
  await dbConnect();
  console.log('Connected! Clearing existing collections for fresh mock seed...');

  // Clear collections
  await Promise.all([
    Client.deleteMany({}),
    Project.deleteMany({}),
    Invoice.deleteMany({}),
    Payment.deleteMany({}),
    Employee.deleteMany({}),
    MaterialStock.deleteMany({}),
    Manufacturing.deleteMany({}),
    QC.deleteMany({}),
    Logistics.deleteMany({}),
    ActivityLog.deleteMany({})
  ]);

  console.log('Collections cleared. Seeding rich mock dataset...');

  // 1. Seed Employees
  const employees = await Employee.create([
    { name: 'Rahul Sen', designation: 'Senior Designer', department: 'Design', type: 'employee', basic_salary: 45000, status: 'active' },
    { name: 'Priya Nair', designation: 'Sales Representative', department: 'Sales', type: 'employee', basic_salary: 32000, status: 'active' },
    { name: 'Arjun Das', designation: 'Operations Manager', department: 'Operations', type: 'employee', basic_salary: 50000, status: 'active' },
    { name: 'Raja Raman', designation: 'Site Supervisor', department: 'Operations', type: 'employee', basic_salary: 35000, status: 'active' },
    { name: 'Sanjay Dutt', designation: 'Electrician Technician', department: 'Installation', type: 'freelancer', basic_salary: 25000, status: 'active' },
    { name: 'Karthik Pillai', designation: 'Lead Carpenter', department: 'Production', type: 'freelancer', basic_salary: 28000, status: 'active' }
  ]);
  console.log('✓ Seeded Employees:', employees.length);

  // 2. Seed Clients
  const clients = await Client.create([
    { name: 'Venkatesh Iyer', company: 'Iyer Penthouse', email: 'venkat@iyer.com', phone: '9876543210', source: 'website', stage: 'won', approx_value: 1200000 },
    { name: 'Ananya Roy', company: 'Roy Luxury Villa', email: 'ananya@roy.com', phone: '9876543211', source: 'referral', stage: 'quotation_sent', approx_value: 850000 },
    { name: 'Deepak Gupta', company: 'Gupta Office space', email: 'deepak@gupta.com', phone: '9876543212', source: 'outreach', stage: 'lead', approx_value: 1800000 },
    { name: 'Meera Krishnan', company: 'Krishnan Residency', email: 'meera@krishnan.com', phone: '9876543213', source: 'social', stage: 'prospect', approx_value: 450000 },
    { name: 'Rajesh Varma', company: 'Varma Duplex', email: 'rajesh@varma.com', phone: '9876543214', source: 'website', stage: 'lost', approx_value: 600000 }
  ]);
  console.log('✓ Seeded Clients:', clients.length);

  // 3. Seed Projects
  const projects = await Project.create([
    {
      client: clients[0]._id,
      name: 'Iyer Penthouse Turnkey Design',
      type: 'new',
      status: 'in_progress',
      value: 1200000,
      start_date: new Date('2026-06-01'),
      end_date: new Date('2026-07-15'),
      status_notes: 'Plastering completed, woodwork frames underway',
      team: [
        { member: employees[0]._id, allocation: 80 },
        { member: employees[3]._id, allocation: 100 }
      ]
    },
    {
      client: clients[1]._id,
      name: 'Roy Villa Design & Fabrication',
      type: 'new',
      status: 'not_started',
      value: 850000,
      start_date: new Date('2026-07-01'),
      end_date: new Date('2026-08-20'),
      status_notes: 'Awaiting quotation signoff'
    }
  ]);
  console.log('✓ Seeded Projects:', projects.length);

  // 4. Seed Invoices
  const invoices = await Invoice.create([
    { project: projects[0]._id, invoice_number: 'INV-2026-001', amount: 400000, type: 'advance', issue_date: new Date('2026-06-02'), due_date: new Date('2026-06-12'), status: 'paid' },
    { project: projects[0]._id, invoice_number: 'INV-2026-002', amount: 400000, type: 'milestone', issue_date: new Date('2026-06-25'), due_date: new Date('2026-07-05'), status: 'unpaid' }
  ]);
  console.log('✓ Seeded Invoices:', invoices.length);

  // 5. Seed Payments
  const payments = await Payment.create([
    { invoice: invoices[0]._id, project: projects[0]._id, amount: 400000, payment_date: new Date('2026-06-05'), method: 'Bank Transfer', bank_account_received: 'HDFC Current Account', transaction_number: 'TXN88972109' }
  ]);
  console.log('✓ Seeded Payments:', payments.length);

  // 6. Seed Material Stocks
  const stocks = await MaterialStock.create([
    { name: '19mm Waterproof Plywood', current_stock: 4, unit: 'sheets', last_rate: 1800 }, // critically low
    { name: 'Fevicol SH Adhesive 50kg', current_stock: 35, unit: 'buckets', last_rate: 4500 },
    { name: 'Drywall Screws 2 inches', current_stock: 8, unit: 'box', last_rate: 250 }, // critically low
    { name: 'Teak Wood Veneer 4mm', current_stock: 120, unit: 'sheets', last_rate: 950 }
  ]);
  console.log('✓ Seeded Material Stocks:', stocks.length);

  // 7. Seed Manufacturing Jobs
  const mfgs = await Manufacturing.create([
    { project: projects[0]._id, material_issue: null, scheduled_start_date: new Date('2026-06-10'), scheduled_start_time: '10:00', finished_date: new Date('2026-06-18'), finished_time: '18:00', status: 'finished', notes: 'Kitchen cabinet carcass fabrication' },
    { project: projects[0]._id, material_issue: null, scheduled_start_date: new Date('2026-06-28'), scheduled_start_time: '09:00', status: 'in_progress', notes: 'Wardrobe sliding panels assembly' }
  ]);
  console.log('✓ Seeded Manufacturing Jobs:', mfgs.length);

  // 8. Seed QC Audits
  const qcs = await QC.create([
    { manufacturing: mfgs[0]._id, project: projects[0]._id, checked_items: [{ item_name: 'Edge finishing', checked: true }, { item_name: 'Core density check', checked: true }], status: 'approved', description: 'Kitchen carcass dimension match, edge banding verified' },
    { manufacturing: mfgs[1]._id, project: projects[0]._id, checked_items: [{ item_name: 'Sliding guide alignment', checked: false }], status: 'pending', description: 'Slider alignment checks pending installation of hardware' }
  ]);
  console.log('✓ Seeded QC Audits:', qcs.length);

  // 9. Seed Activity Logs
  const activityLogs = await ActivityLog.create([
    { username: 'Rahul Sen', user_role: 'designer', action_type: 'create', module: 'designing', description: 'Created 3D layout rendering for Iyer Penthouse' },
    { username: 'Rahul Sen', user_role: 'designer', action_type: 'download', module: 'designing', description: 'Downloaded project specifications PDF' },
    { username: 'Priya Nair', user_role: 'sales', action_type: 'create', module: 'clients', description: 'Created new lead Deepak Gupta (Gupta Office space)' },
    { username: 'Priya Nair', user_role: 'sales', action_type: 'update', module: 'clients', description: 'Updated stage for Roy Luxury Villa to quotation_sent' },
    { username: 'Arjun Das', user_role: 'admin', action_type: 'error', module: 'purchase', description: 'Attempted to approve PO without stock clearance (Validation Failed)' }
  ]);
  console.log('✓ Seeded Activity Logs:', activityLogs.length);

  console.log('Database seeded successfully!');
}
