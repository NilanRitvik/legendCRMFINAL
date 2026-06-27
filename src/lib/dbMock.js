import mongoose from 'mongoose';

// In-memory database store
const store = {};
const mockModels = {};

// Helper to seed rich mock data for all modules
export function seedInitialData(modelName) {
  if (!store[modelName]) {
    store[modelName] = [];
  }

  if (store[modelName].length > 0) return;

  const ALL_PAGES = [
    'ceo',
    'dashboard', 'clients', 'projects', 'payments', 'monthly-statements',
    'analytics', 'assets', 'team', 'amc', 'designing', 'purchase',
    'hr', 'hr-employees', 'hr-leaves', 'hr-attendance', 'hr-payroll',
    'installation', 'manufacturing'
  ];

  // 1. Users
  if (modelName === 'User') {
    store[modelName].push(
      { _id: 'usr_1', username: 'legend', password: 'legend123', role: 'admin', allowedPages: ALL_PAGES },
      { _id: 'usr_2', username: 'lgened', password: 'legend123', role: 'admin', allowedPages: ALL_PAGES },
      { _id: 'usr_3', username: 'purusoth', password: 'Nilan@101088', role: 'admin', allowedPages: ALL_PAGES }
    );
  }

  // 2. Clients (Sales Pipeline)
  if (modelName === 'Client') {
    store[modelName].push(
      { _id: 'cli_1', name: 'purusothman', company: 'LegendIn HQ', email: 'client1@legendin.com', phone: '9876543210', source: 'website', stage: 'won', approx_value: 850000 },
      { _id: 'cli_2', name: 'Karthik Raja', company: 'Raja Luxury Villa', email: 'karthik@villa.com', phone: '9876543211', source: 'referral', stage: 'quotation_sent', approx_value: 450000 },
      { _id: 'cli_3', name: 'Priya Sharma', company: 'Sharma Penthouse', email: 'priya@penthouse.com', phone: '9876543212', source: 'social', stage: 'lead', approx_value: 300000 },
      { _id: 'cli_4', name: 'Venkatesh Iyer', company: 'Iyer Residency', email: 'venkat@iyer.com', phone: '9876543213', source: 'outreach', stage: 'prospect', approx_value: 620000 }
    );
  }

  // 3. Team
  if (modelName === 'Team') {
    store[modelName].push(
      { _id: 'team_1', name: 'Nilan P', role: 'Senior Architect', monthly_cost: 65000 },
      { _id: 'team_2', name: 'Vasuki S', role: '3D Modeler', monthly_cost: 45000 }
    );
  }

  // 4. Employees (HR)
  if (modelName === 'Employee') {
    store[modelName].push(
      { _id: 'emp_1', name: 'Ganesh Kumar', designation: 'Interior Supervisor', department: 'Operations', type: 'employee', employment_type: 'full_time', basic_salary: 35000, status: 'active', approval_status: 'approved' },
      { _id: 'emp_2', name: 'Ramesh Babu', designation: 'Senior Carpenter', department: 'Production', type: 'employee', employment_type: 'full_time', basic_salary: 28000, status: 'active', approval_status: 'approved' },
      { _id: 'emp_3', name: 'Sanjay Dutt', designation: 'Electrician', department: 'Installation', type: 'freelancer', employment_type: 'contract', basic_salary: 22000, status: 'active', approval_status: 'approved' }
    );
  }

  // 5. Projects
  if (modelName === 'Project') {
    store[modelName].push(
      {
        _id: 'prj_1',
        client: 'cli_1',
        name: 'LegendIn Head Office Design',
        type: 'new',
        status: 'in_progress',
        value: 850000,
        start_date: new Date('2026-05-10'),
        end_date: new Date('2026-07-20'),
        github_link: 'https://github.com/legendin/hq-design',
        username: 'legendin_user',
        password: 'hqpassword123',
        status_notes: 'Design finalized, partition walls completed. Starting ceiling work.',
        team: [{ member: 'team_1', allocation: 80 }, { member: 'team_2', allocation: 50 }]
      }
    );
  }

  // 6. Quotation
  if (modelName === 'Quotation') {
    store[modelName].push(
      {
        _id: 'qto_1',
        client: 'cli_1',
        quotation_number: 'QN-LEG-2026-000001',
        quoted_value: 850000,
        scope_description: 'Full corporate office turnkey interior design and execution',
        sent_date: new Date('2026-05-01'),
        status: 'accepted',
        items: [
          { product_name: 'Glass Partition Walls', description: 'Double glazed acoustic partition', quantity: 15, unit_value: 20000, discount: 0, final_value: 300000 },
          { product_name: 'Designer Ergonomic Workstations', description: 'Solid wood table with wire manager', quantity: 20, unit_value: 15000, discount: 5000, final_value: 250000 },
          { product_name: 'False Ceiling & Lighting', description: 'Gypsum board with LED spot fixtures', quantity: 1, unit_value: 300000, discount: 0, final_value: 300000 }
        ],
        total_actual_value: 850000,
        total_discount: 5000,
        gst_rate: 18,
        has_gst: true,
        discount: 5000
      }
    );
  }

  // 7. Invoices
  if (modelName === 'Invoice') {
    store[modelName].push(
      { _id: 'inv_1', project: 'prj_1', invoice_number: 'Inv-LEG-2026-000001', amount: 300000, type: 'advance', issue_date: new Date('2026-05-12'), due_date: new Date('2026-05-22'), status: 'paid', gst_rate: 18, has_gst: true, discount: 0 }
    );
  }

  // 8. Payments
  if (modelName === 'Payment') {
    store[modelName].push(
      { _id: 'pay_1', invoice: 'inv_1', project: 'prj_1', amount: 354000, payment_date: new Date('2026-05-15'), method: 'bank_transfer', bank_account_received: 'HDFC Current A/C *8990', transaction_number: 'TXN88972109', category: 'advance' }
    );
  }

  // 9. Vendor / Payable
  if (modelName === 'VendorPayable') {
    store[modelName].push(
      { _id: 'vp_1', vendor_name: 'Supreme Glass Ltd', description: 'Toughened glass partition panels', amount: 120000, bill_date: new Date('2026-05-25'), due_date: new Date('2026-06-25'), status: 'paid' },
      { _id: 'vp_2', vendor_name: 'Plywood Junction', description: 'Commercial ply 19mm sheets', amount: 45000, bill_date: new Date('2026-06-01'), due_date: new Date('2026-07-01'), status: 'unpaid' }
    );
  }

  // 10. Expenses
  if (modelName === 'Expense') {
    store[modelName].push(
      { _id: 'exp_1', category: 'project_cost', amount: 120000, expense_date: new Date('2026-05-28'), description: 'Glass partition raw materials payment', project: 'prj_1', linked_payable: 'vp_1' },
      { _id: 'exp_2', category: 'salary', amount: 65000, expense_date: new Date('2026-06-01'), description: 'Nilan P monthly payout' }
    );
  }

  // 11. ToolAsset (Tools Asset Management)
  if (modelName === 'ToolAsset') {
    store[modelName].push(
      { _id: 'tl_1', name: 'Bosch Professional Hammer Drill', make_brand: 'Bosch', asset_id: 'TL-BOS-001', status: 'available', tool_worth: 12500, notes: 'Perfect working condition' },
      { _id: 'tl_2', name: 'Makita Circular Saw', make_brand: 'Makita', asset_id: 'TL-MAK-002', status: 'issued', handler_name: 'Ganesh Kumar', handler_contact: '+919876543210', handler_supervisor: 'Nilan P', issue_date: new Date('2026-06-10'), tool_worth: 8500, notes: 'Issued for HQ project site' },
      { _id: 'tl_3', name: 'Laser Distance Meter', make_brand: 'Leica', asset_id: 'TL-LEI-003', status: 'damaged', damage_date: new Date('2026-06-05'), damage_cost: 4500, tool_worth: 15000, notes: 'Lens cracked, unusable' }
    );
  }

  // 12. MaterialStock
  if (modelName === 'MaterialStock') {
    store[modelName].push(
      { _id: 'ms_1', name: '19mm Waterproof Plywood', current_stock: 45, unit: 'sheets' },
      { _id: 'ms_2', name: 'Fevicol SH Adhesive 50kg', current_stock: 12, unit: 'buckets' },
      { _id: 'ms_3', name: 'Drywall Screws 2 inches', current_stock: 1500, unit: 'pcs' }
    );
  }

  // 13. MaterialTransaction
  if (modelName === 'MaterialTransaction') {
    store[modelName].push(
      { _id: 'mtr_1', transaction_type: 'purchase', material_name: '19mm Waterproof Plywood', material_brand: 'CenturyPly', quantity: 60, rate: 1800, invoice_number: 'PLY-9988', supplier: 'Plywood Junction', date: new Date('2026-06-01'), notes: 'Initial stock load', approval_status: 'approved' },
      { _id: 'mtr_2', transaction_type: 'issue', material_name: '19mm Waterproof Plywood', quantity: 15, project: 'prj_1', date: new Date('2026-06-05'), notes: 'Issued to HQ site', approval_status: 'approved' }
    );
  }

  // 14. Installation
  if (modelName === 'Installation') {
    store[modelName].push(
      {
        _id: 'inst_1',
        project: 'prj_1',
        installation_team: ['emp_2', 'emp_3'],
        location: 'LegendIn HQ, 3rd Floor, Golden Avenue',
        start_date: new Date('2026-06-15'),
        end_date: new Date('2026-06-25'),
        manpower_used: 5,
        hours_worked: 72,
        supervisor: 'Ganesh Kumar',
        status: 'in_progress',
        notes: 'Carpenter partitions completed, starting glass fixture installations.',
        approval_status: 'approved'
      }
    );
  }

  // 15. Manufacturing
  if (modelName === 'Manufacturing') {
    store[modelName].push(
      {
        _id: 'mfg_1',
        project: 'prj_1',
        material_issue: 'mtr_2', // Plywood issue
        scheduled_start_date: new Date('2026-06-08'),
        scheduled_start_time: '09:00',
        finished_date: new Date('2026-06-12'),
        finished_time: '18:00',
        status: 'finished',
        notes: 'Plywood partition frames cut and assembled.',
        approval_status: 'approved',
        approval_notes: 'Production quality verified'
      }
    );
  }

  // 16. QC
  if (modelName === 'QC') {
    store[modelName].push(
      {
        _id: 'qc_1',
        manufacturing: 'mfg_1',
        project: 'prj_1',
        checked_items: [
          { item_name: 'Dimensions Verification', checked: true },
          { item_name: 'Finish & Polish', checked: true },
          { item_name: 'Structural Sturdiness', checked: true },
          { item_name: 'Material Defect Inspection', checked: true }
        ],
        description: 'All partition frames passed design checks. Edge banding is smooth.',
        status: 'approved',
        approval_status: 'approved',
        approval_notes: 'Clearance granted for logistics scheduling'
      }
    );
  }

  // 17. Logistics
  if (modelName === 'Logistics') {
    store[modelName].push(
      {
        _id: 'log_1',
        project: 'prj_1',
        qc: 'qc_1',
        item: 'Assembled Plywood Partition Panels',
        site: 'LegendIn HQ, 3rd Floor, Golden Avenue',
        transport: 'Tata Ace (TN-37-BY-1234)',
        date: new Date('2026-06-14'),
        time: '10:00',
        distance: 25,
        driver: 'K. Kathirvel (+919842312345)',
        status: 'delivered',
        approval_status: 'approved',
        approval_notes: 'Delivery completed successfully'
      }
    );
  }
}

export function getMockModel(modelName) {
  if (mockModels[modelName]) {
    return mockModels[modelName];
  }

  seedInitialData(modelName);

  const mockModel = {
    find(query = {}) {
      seedInitialData(modelName);
      let data = [...(store[modelName] || [])];

      if (query && typeof query === 'object') {
        data = data.filter(item => {
          for (let k in query) {
            if (query[k] === undefined || query[k] === null) continue;
            
            if (query[k] instanceof RegExp) {
              if (!query[k].test(item[k] || '')) return false;
              continue;
            }

            if (item[k] !== query[k]) {
              if (item[k]?.toString && query[k]?.toString && item[k].toString() === query[k].toString()) {
                continue;
              }
              return false;
            }
          }
          return true;
        });
      }

      const chain = {
        sort() { return this; },
        populate() { return this; },
        select() { return this; },
        limit() { return this; },
        skip() { return this; },
        exec: async () => data,
        then(onResolve, onReject) {
          return Promise.resolve(data).then(onResolve, onReject);
        }
      };
      return chain;
    },

    findOne(query = {}) {
      seedInitialData(modelName);
      const chain = {
        populate() { return this; },
        select() { return this; },
        exec: async () => {
          let data = [...(store[modelName] || [])];
          if (query && typeof query === 'object') {
            data = data.filter(item => {
              for (let k in query) {
                if (query[k] === undefined || query[k] === null) continue;
                if (item[k] !== query[k]) {
                  if (item[k]?.toString && query[k]?.toString && item[k].toString() === query[k].toString()) {
                    continue;
                  }
                  return false;
                }
              }
              return true;
            });
          }
          return data[0] || null;
        },
        then(onResolve, onReject) {
          return this.exec().then(onResolve, onReject);
        }
      };
      return chain;
    },

    findById(id) {
      return this.findOne({ _id: id });
    },

    async countDocuments(query = {}) {
      seedInitialData(modelName);
      let data = [...(store[modelName] || [])];
      if (query && typeof query === 'object') {
        data = data.filter(item => {
          for (let k in query) {
            if (query[k] === undefined || query[k] === null) continue;
            if (item[k] !== query[k]) return false;
          }
          return true;
        });
      }
      return data.length;
    },

    async create(docOrDocs) {
      seedInitialData(modelName);
      const docs = Array.isArray(docOrDocs) ? docOrDocs : [docOrDocs];
      const created = docs.map(d => {
        const item = {
          _id: 'mock_' + modelName.toLowerCase() + '_' + Math.random().toString(36).substr(2, 9),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...d
        };
        store[modelName].push(item);
        return item;
      });
      return Array.isArray(docOrDocs) ? created : created[0];
    },

    async findByIdAndUpdate(id, update) {
      seedInitialData(modelName);
      const item = (store[modelName] || []).find(item => item._id === id);
      if (item) {
        Object.assign(item, update);
        item.updatedAt = new Date();
      }
      return item;
    },

    async findOneAndUpdate(query, update) {
      seedInitialData(modelName);
      let item = (store[modelName] || []).find(item => {
        for (let k in query) {
          if (query[k] === undefined || query[k] === null) continue;
          if (item[k] !== query[k]) return false;
        }
        return true;
      });
      if (item) {
        Object.assign(item, update);
        item.updatedAt = new Date();
      }
      return item;
    },

    async findByIdAndDelete(id) {
      seedInitialData(modelName);
      const index = (store[modelName] || []).findIndex(item => item._id === id);
      if (index !== -1) {
        const deleted = store[modelName][index];
        store[modelName].splice(index, 1);
        return deleted;
      }
      return null;
    },

    async deleteOne(query) {
      seedInitialData(modelName);
      const index = (store[modelName] || []).findIndex(item => {
        for (let k in query) {
          if (query[k] === undefined || query[k] === null) continue;
          if (item[k] !== query[k]) return false;
        }
        return true;
      });
      if (index !== -1) {
        store[modelName].splice(index, 1);
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    },

    async deleteMany(query) {
      seedInitialData(modelName);
      const initialCount = (store[modelName] || []).length;
      store[modelName] = (store[modelName] || []).filter(item => {
        for (let k in query) {
          if (query[k] === undefined || query[k] === null) continue;
          if (item[k] !== query[k]) return true;
        }
        return false;
      });
      return { deletedCount: initialCount - store[modelName].length };
    }
  };

  mockModels[modelName] = mockModel;
  return mockModel;
}

export function enableDemoMode() {
  global.isDemoMode = true;
  console.warn("⚠️ MONGODB CONNECTION FAILED: Initializing in-memory Demo/Offline Mode!");
}
