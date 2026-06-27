import mongoose from 'mongoose';
import { getMockModel } from './dbMock';

function createModelProxy(modelName, rawModel) {
  return new Proxy(rawModel, {
    construct(target, args) {
      if (global.isDemoMode) {
        const doc = args[0] || {};
        return {
          ...doc,
          save: async function() {
            return getMockModel(modelName).create(this);
          }
        };
      }
      return Reflect.construct(target, args);
    },
    get(target, prop, receiver) {
      if (global.isDemoMode) {
        const mockModel = getMockModel(modelName);
        if (prop in mockModel) {
          return mockModel[prop];
        }
      }
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return val.bind(target);
      }
      return val;
    }
  });
}


// 1. Client Schema
const ClientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  company: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  source: { type: String, required: true }, // referral, website, social, outreach
  stage: { 
    type: String, 
    enum: ['lead', 'prospect', 'quotation_sent', 'won', 'lost'], 
    default: 'lead' 
  },
  lost_reason: String,
  approx_value: { type: Number, default: 0 }
}, { timestamps: true });

// 2. Quotation Schema
const QuotationSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  quotation_number: { type: String },
  quoted_value: { type: Number, required: true },
  scope_description: String,
  sent_date: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  items: [{
    product_name: { type: String, required: true },
    description: String,
    quantity: { type: Number, default: 1 },
    unit_value: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    final_value: { type: Number, default: 0 }
  }],
  total_actual_value: { type: Number, default: 0 },
  total_discount: { type: Number, default: 0 },
  gst_rate: { type: Number, default: 18 },
  has_gst: { type: Boolean, default: true },
  discount: { type: Number, default: 0 }
}, { timestamps: true });

// 3. Project Schema
const ProjectSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' }, // Nullable
  name: { type: String, required: true },
  type: { type: String, enum: ['new', 'rework'], default: 'new' },
  status: { 
    type: String, 
    enum: ['not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'], 
    default: 'not_started' 
  },
  value: { type: Number, required: true },
  start_date: Date,
  end_date: Date,
  product_link: String,
  
  // Tech Credentials & Links additions
  github_link: String,
  username: String,
  password: String,
  private_key: String,
  seed_phrase: String,
  token_contract_address: String,
  file_source_link: String,

  team: [{
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    allocation: { type: Number, min: 0, max: 100 }
  }],
  status_notes: { type: String, default: '' },
  status_history: [{
    status: { type: String },
    description: { type: String },
    changed_at: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// 4. Document Schema
const DocumentSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  type: { 
    type: String, 
    enum: ['agreement', 'nda', 'invoice', 'deliverable'], 
    required: true 
  },
  file_name: String,
  file_url: { type: String, required: true },
  uploaded_at: { type: Date, default: Date.now }
});

// 5. Invoice Schema
const InvoiceSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  invoice_number: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['advance', 'milestone', 'final'], required: true },
  issue_date: { type: Date, required: true },
  due_date: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['unpaid', 'partial', 'paid'], 
    default: 'unpaid' 
  },
  gst_rate: { type: Number, default: 18 },
  has_gst: { type: Boolean, default: true },
  discount: { type: Number, default: 0 }
}, { timestamps: true });

// 6. Payment Schema
const PaymentSchema = new mongoose.Schema({
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  amount: { type: Number, required: true },
  payment_date: { type: Date, required: true },
  method: { type: String, required: true },
  
  // Advanced tracking additions
  bank_account_received: String, // Bank details or wallet address
  transaction_number: String, // Transaction ID/reference number
  crypto_platform: String, // Platform like Binance, Trust, Phantom
  category: { 
    type: String, 
    enum: ['advance', 'partial', 'final', 'full'], 
    default: 'partial' 
  }
}, { timestamps: true });

// 7. Vendor / Payable Schema
const VendorPayableSchema = new mongoose.Schema({
  vendor_name: { type: String, required: true },
  description: String,
  amount: { type: Number, required: true },
  bill_date: { type: Date, required: true },
  due_date: { type: Date, required: true },
  status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' }
}, { timestamps: true });

// 8. Expense Schema
const ExpenseSchema = new mongoose.Schema({
  category: { 
    type: String, 
    enum: ['salary', 'rent', 'software', 'marketing', 'vendor_settlement', 'project_cost', 'other'], 
    required: true 
  },
  amount: { type: Number, required: true },
  expense_date: { type: Date, required: true },
  description: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Linked Project reference
  linked_payable: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorPayable' },
  linked_asset: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyAsset' }
}, { timestamps: true });

// 9. Company Asset Schema
const CompanyAssetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['hardware', 'software license', 'furniture', 'office equipment'], 
    required: true 
  },
  purchase_value: { type: Number, required: true },
  purchase_date: { type: Date, required: true },
  depreciation_rate: { type: Number, default: 0 }, // annual %
  linked_expense: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }
}, { timestamps: true });

// 10. Team / Resource Schema
const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  monthly_cost: { type: Number, required: true }
}, { timestamps: true });

// 11. User / Access Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'viewer'], default: 'viewer' },
  allowedPages: [{ type: String }]
}, { timestamps: true });

export const Client = createModelProxy('Client', mongoose.models.Client || mongoose.model('Client', ClientSchema));
export const Quotation = createModelProxy('Quotation', mongoose.models.Quotation || mongoose.model('Quotation', QuotationSchema));
export const Project = createModelProxy('Project', mongoose.models.Project || mongoose.model('Project', ProjectSchema));
export const Document = createModelProxy('Document', mongoose.models.Document || mongoose.model('Document', DocumentSchema));
export const Invoice = createModelProxy('Invoice', mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema));
export const Payment = createModelProxy('Payment', mongoose.models.Payment || mongoose.model('Payment', PaymentSchema));
export const VendorPayable = createModelProxy('VendorPayable', mongoose.models.VendorPayable || mongoose.model('VendorPayable', VendorPayableSchema));
export const Expense = createModelProxy('Expense', mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema));
export const CompanyAsset = createModelProxy('CompanyAsset', mongoose.models.CompanyAsset || mongoose.model('CompanyAsset', CompanyAssetSchema));
export const Team = createModelProxy('Team', mongoose.models.Team || mongoose.model('Team', TeamSchema));
export const User = createModelProxy('User', mongoose.models.User || mongoose.model('User', UserSchema));


// ─── HR MODULE SCHEMAS ────────────────────────────────────────────────────────

// 12. Employee / Freelancer Schema
const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  designation: { type: String, required: true },
  department: { type: String, default: '' },
  type: { type: String, enum: ['employee', 'freelancer', 'consultant'], default: 'employee' },
  employment_type: { type: String, enum: ['full_time', 'part_time', 'contract'], default: 'full_time' },
  join_date: { type: Date },
  basic_salary: { type: Number, required: true }, // monthly (employee) or hourly/project rate (freelancer)
  rate_type: { type: String, enum: ['monthly', 'hourly', 'project'], default: 'monthly' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  bank_name: { type: String, default: '' },
  bank_account: { type: String, default: '' },
  ifsc: { type: String, default: '' },
  pan_number: { type: String, default: '' },
  uan_number: { type: String, default: '' }, // PF/UAN
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  address: { type: String, default: '' },
  emergency_contact: { type: String, default: '' },
  // Allowances (% of basic or fixed amount)
  hra_percent: { type: Number, default: 40 },       // % of basic
  transport_allowance: { type: Number, default: 0 }, // fixed
  other_allowance: { type: Number, default: 0 },    // fixed
  // Deduction flags
  pf_applicable: { type: Boolean, default: false },
  esi_applicable: { type: Boolean, default: false },
  tds_percent: { type: Number, default: 0 },
  approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approval_notes: { type: String, default: '' }
}, { timestamps: true });

// 13. Leave Request Schema
const LeaveRequestSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  leave_type: { type: String, enum: ['casual', 'sick', 'annual', 'maternity', 'unpaid'], required: true },
  from_date: { type: Date, required: true },
  to_date: { type: Date, required: true },
  days: { type: Number, required: true },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  remarks: { type: String, default: '' },
}, { timestamps: true });

// 14. Attendance Schema (one record per employee per month)
const AttendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  total_working_days: { type: Number, default: 26 },
  present_days: { type: Number, default: 0 },
  absent_days: { type: Number, default: 0 },
  half_days: { type: Number, default: 0 },
  late_days: { type: Number, default: 0 },
  overtime_hours: { type: Number, default: 0 },
  notes: { type: String, default: '' },
}, { timestamps: true });

// 15. Payroll Schema
const PayrollSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  // Earnings
  basic_salary: { type: Number, default: 0 },
  hra: { type: Number, default: 0 },
  transport_allowance: { type: Number, default: 0 },
  other_allowance: { type: Number, default: 0 },
  overtime_pay: { type: Number, default: 0 },
  gross_salary: { type: Number, default: 0 },
  // Deductions
  pf_deduction: { type: Number, default: 0 },
  esi_deduction: { type: Number, default: 0 },
  tds_deduction: { type: Number, default: 0 },
  pt_deduction: { type: Number, default: 0 },
  leave_deduction: { type: Number, default: 0 },
  advance_deduction: { type: Number, default: 0 },
  other_deduction: { type: Number, default: 0 },
  total_deductions: { type: Number, default: 0 },
  net_salary: { type: Number, default: 0 },
  // Freelancer fields
  hours_worked: { type: Number, default: 0 },
  project_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  project_description: { type: String, default: '' },
  // Payment
  payment_date: { type: Date },
  payment_mode: { type: String, enum: ['bank_transfer', 'cash', 'upi', 'cheque'], default: 'bank_transfer' },
  status: { type: String, enum: ['draft', 'processed', 'paid'], default: 'draft' },
  notes: { type: String, default: '' },
}, { timestamps: true });

export const Employee = createModelProxy('Employee', mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema));
export const LeaveRequest = createModelProxy('LeaveRequest', mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', LeaveRequestSchema));
export const Attendance = createModelProxy('Attendance', mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema));
export const Payroll = createModelProxy('Payroll', mongoose.models.Payroll || mongoose.model('Payroll', PayrollSchema));

// AMC Payment Schema
const AMCPaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  payment_date: { type: Date, required: true },
  method: { type: String, required: true }, // Bank Transfer, Crypto, Google Pay, PhonePe, Cash
  category: { type: String, enum: ['advance', 'partial', 'full'], required: true },
  transaction_number: String,
  crypto_platform: String,
  bank_account_received: String
}, { timestamps: true });

// AMC Schema
const AMCSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  product: { type: String, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['active', 'expired', 'renewed'], default: 'active' },
  payments: [AMCPaymentSchema]
}, { timestamps: true });

export const AMC = createModelProxy('AMC', mongoose.models.AMC || mongoose.model('AMC', AMCSchema));

// ─── LEGENDIN INTERIOR DESIGN MODULE SCHEMAS ───────────────────────────────────

// 16. Design Schema (2D & 3D Drawings)
const DesignSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  design_type: { type: String, enum: ['2d', '3d', 'production_board', 'quality_control', 'site_logistics'], required: true },
  file_name: { type: String, required: true },
  file_url: { type: String, required: true },
  notes: String,
  uploaded_at: { type: Date, default: Date.now },
  approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approval_notes: { type: String, default: '' }
}, { timestamps: true });

// 17. Material Stock Schema
const MaterialStockSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  current_stock: { type: Number, default: 0 },
  unit: { type: String, default: 'pcs' },
  last_rate: { type: Number, default: 0 }
}, { timestamps: true });

// 18. Material Transaction Schema (Purchases, Issues, Returns, Waste)
const MaterialTransactionSchema = new mongoose.Schema({
  transaction_type: { type: String, enum: ['purchase', 'old_stock', 'issue', 'return', 'waste'], required: true },
  material_name: { type: String, required: true },
  material_brand: String,
  quantity: { type: Number, required: true },
  rate: { type: Number }, // Purchase rate
  invoice_number: { type: String }, // Purchase invoice
  supplier: { type: String }, // Purchase vendor
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Linked Project (issue/return)
  date: { type: Date, default: Date.now },
  notes: String,
  approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approval_notes: { type: String, default: '' },
  // Stock team verification (used for returns after CEO approval)
  stock_verified: { type: Boolean, default: null }, // null=awaiting, true=accepted, false=denied
  stock_verify_notes: { type: String, default: '' },
  stock_verify_date: { type: Date, default: null },
  batch_id: { type: String, default: null }, // Groups batch_issue / batch_return items
  damaged_quantity: { type: Number, default: 0 },
  replacement_status: { type: String, enum: ['none', 'pending', 'replaced'], default: 'none' },
  replacement_received_quantity: { type: Number, default: 0 },
  unit: { type: String, default: 'pcs' },
  gst_percentage: { type: Number, default: 0 },
  transport_charges: { type: Number, default: 0 }
}, { timestamps: true });

// 19. Tool Asset Schema
const ToolAssetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  make_brand: String,
  asset_id: String,
  status: { type: String, enum: ['available', 'issued', 'damaged'], default: 'available' },
  handler_name: String,
  handler_contact: String,
  handler_supervisor: String,
  issue_date: Date,
  damage_date: Date,
  damage_cost: { type: Number, default: 0 },
  tool_worth: { type: Number, default: 0 },
  acknowledgement_copy: String,
  photo_url: String,
  previous_handler: String,
  notes: String
}, { timestamps: true });

// 20. Machine Schema
const MachineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  make_brand: String,
  purchase_year: Number,
  status: { type: String, enum: ['available', 'in_service', 'out_of_order'], default: 'available' },
  last_service_date: Date,
  next_service_due: Date,
  service_expenses_total: { type: Number, default: 0 },
  service_contact: String,
  service_history: [{
    service_date: { type: Date, default: Date.now },
    expenses: { type: Number, default: 0 },
    description: String
  }],
  notes: String
}, { timestamps: true });

// 21. Transport & Logistics Schema
const TransportLogisticsSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  transport_service: { type: String, required: true },
  amount: { type: Number, required: true },
  payment_status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  payment_date: Date,
  delivery_date: Date,
  notes: String
}, { timestamps: true });

export const Design = createModelProxy('Design', mongoose.models.Design || mongoose.model('Design', DesignSchema));
export const MaterialStock = createModelProxy('MaterialStock', mongoose.models.MaterialStock || mongoose.model('MaterialStock', MaterialStockSchema));
export const MaterialTransaction = createModelProxy('MaterialTransaction', mongoose.models.MaterialTransaction || mongoose.model('MaterialTransaction', MaterialTransactionSchema));
export const ToolAsset = createModelProxy('ToolAsset', mongoose.models.ToolAsset || mongoose.model('ToolAsset', ToolAssetSchema));
export const Machine = createModelProxy('Machine', mongoose.models.Machine || mongoose.model('Machine', MachineSchema));
export const TransportLogistics = createModelProxy('TransportLogistics', mongoose.models.TransportLogistics || mongoose.model('TransportLogistics', TransportLogisticsSchema));

// 22. Installation Schema
const InstallationSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  installation_team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  location: { type: String, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  manpower_used: { type: Number, default: 0 },
  hours_worked: { type: Number, default: 0 },
  supervisor: { type: String, required: true },
  status: { type: String, enum: ['scheduled', 'in_progress', 'completed'], default: 'scheduled' },
  notes: String,
  approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approval_notes: { type: String, default: '' }
}, { timestamps: true });

export const Installation = createModelProxy('Installation', mongoose.models.Installation || mongoose.model('Installation', InstallationSchema));

// 23. Manufacturing Schema
const ManufacturingSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  material_issue: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialTransaction', required: true },
  scheduled_start_date: Date,
  scheduled_start_time: String,
  finished_date: Date,
  finished_time: String,
  status: { type: String, enum: ['scheduled', 'in_progress', 'finished'], default: 'scheduled' },
  notes: String,
  approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approval_notes: { type: String, default: '' }
}, { timestamps: true });

export const Manufacturing = createModelProxy('Manufacturing', mongoose.models.Manufacturing || mongoose.model('Manufacturing', ManufacturingSchema));

// 24. QC Schema
const QCSchema = new mongoose.Schema({
  manufacturing: { type: mongoose.Schema.Types.ObjectId, ref: 'Manufacturing', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  checked_items: [{
    item_name: { type: String, required: true },
    checked: { type: Boolean, default: false }
  }],
  description: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approval_notes: { type: String, default: '' }
}, { timestamps: true });

export const QC = createModelProxy('QC', mongoose.models.QC || mongoose.model('QC', QCSchema));

// 25. Logistics Schema
const LogisticsSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  qc: { type: mongoose.Schema.Types.ObjectId, ref: 'QC', required: true },
  item: { type: String, required: true },
  site: { type: String, required: true },
  transport: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  distance: { type: Number, required: true },
  driver: { type: String, required: true },
  status: { type: String, enum: ['scheduled', 'dispatched', 'delivered'], default: 'scheduled' },
  approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approval_notes: { type: String, default: '' }
}, { timestamps: true });

export const Logistics = createModelProxy('Logistics', mongoose.models.Logistics || mongoose.model('Logistics', LogisticsSchema));

// 26. Daily Attendance Schema
const DailyAttendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'half_day', 'late', 'holiday'], default: 'present' },
  overtime_hours: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { timestamps: true });

DailyAttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export const DailyAttendance = createModelProxy('DailyAttendance', mongoose.models.DailyAttendance || mongoose.model('DailyAttendance', DailyAttendanceSchema));

// 27. Work Log Schema (Freelancers hourly tracking)
const WorkLogSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  hours_worked: { type: Number, required: true, default: 0 },
  description: { type: String, default: '' }
}, { timestamps: true });

WorkLogSchema.index({ employee: 1, date: 1 }, { unique: true });

export const WorkLog = createModelProxy('WorkLog', mongoose.models.WorkLog || mongoose.model('WorkLog', WorkLogSchema));





