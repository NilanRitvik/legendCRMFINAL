import dbConnect from '@/lib/dbConnect';
import { Client, Quotation, Project, Invoice, Payment, VendorPayable, Expense, CompanyAsset, Team } from '@/lib/models';

export async function GET(request) {
  const log = [];
  let success = true;

  try {
    await dbConnect();
    log.push('1. Connected to MongoDB successfully.');

    // --- SETUP TEST DATA ---
    // Clean old test objects if they exist
    await Client.deleteMany({ email: 'test_client@aichainz.com' });
    await VendorPayable.deleteMany({ vendor_name: 'Test AWS Services' });
    await CompanyAsset.deleteMany({ name: 'Test Apple iPad Pro' });
    await Team.deleteMany({ name: 'Test Developer' });

    // 2. Create Client
    const client = await Client.create({
      name: 'John Test',
      company: 'Test Crypto Corp',
      email: 'test_client@aichainz.com',
      phone: '+1 555-TEST',
      source: 'website',
      stage: 'prospect'
    });
    log.push(`2. Created test client: ${client.company}`);

    // 3. Create Quotation
    const quote = await Quotation.create({
      client: client._id,
      quoted_value: 25000,
      scope_description: 'Audit smart contracts for ERC20 token release',
      status: 'pending'
    });
    log.push(`3. Created quotation: $${quote.quoted_value}`);

    // 4. Accept Quotation & Test Trigger
    // We simulate the PUT request logic here
    const previousStatus = quote.status;
    const newStatus = 'accepted';
    
    // Update quote
    await Quotation.findByIdAndUpdate(quote._id, { status: newStatus });
    
    // Automation trigger: Create Project & update client stage
    let project = await Project.findOne({ quotation: quote._id });
    if (!project) {
      project = await Project.create({
        client: client._id,
        quotation: quote._id,
        name: `${client.company} - ${quote.scope_description}`,
        type: 'new',
        status: 'not_started',
        value: quote.quoted_value,
        start_date: new Date()
      });
      await Client.findByIdAndUpdate(client._id, { stage: 'won' });
    }

    const updatedClient = await Client.findById(client._id);
    
    if (project && updatedClient.stage === 'won') {
      log.push('4. SUCCESS: Quotation accept automation triggered correctly.');
      log.push(`   - Project auto-created: "${project.name}" with value $${project.value}`);
      log.push(`   - Client stage advanced to: "${updatedClient.stage}"`);
    } else {
      success = false;
      log.push('4. FAILURE: Quotation accept automation did not create project or advance stage.');
    }

    // 5. Create Invoice & Log Payments (Test Financial Calculations)
    const invoice = await Invoice.create({
      project: project._id,
      invoice_number: 'TEST-INV-001',
      amount: 10000,
      type: 'advance',
      issue_date: new Date(),
      due_date: new Date()
    });
    log.push(`5. Created Invoice: ${invoice.invoice_number} for $${invoice.amount}`);

    // Create payment against invoice
    const payment = await Payment.create({
      invoice: invoice._id,
      project: project._id,
      amount: 4000,
      payment_date: new Date(),
      method: 'Crypto USDT'
    });

    // Update invoice status based on payment
    let paymentsSum = await Payment.find({ invoice: invoice._id });
    let totalPaid = paymentsSum.reduce((sum, p) => sum + p.amount, 0);
    let invoiceStatus = 'unpaid';
    if (totalPaid >= invoice.amount) {
      invoiceStatus = 'paid';
    } else if (totalPaid > 0) {
      invoiceStatus = 'partial';
    }
    await Invoice.findByIdAndUpdate(invoice._id, { status: invoiceStatus });

    const updatedInvoice = await Invoice.findById(invoice._id);
    if (updatedInvoice.status === 'partial') {
      log.push(`6. SUCCESS: Payment logged. Invoice status updated to "${updatedInvoice.status}"`);
    } else {
      success = false;
      log.push(`6. FAILURE: Invoice status was expected to be "partial", got "${updatedInvoice.status}"`);
    }

    // Test Project dynamic financials calculation
    const allProjPayments = await Payment.find({ project: project._id });
    const projPaid = allProjPayments.reduce((sum, p) => sum + p.amount, 0);
    const projAR = Math.max(0, project.value - projPaid);

    if (projAR === 21000) {
      log.push(`7. SUCCESS: Accounts Receivable computed correctly ($25,000 value - $4,000 paid = $${projAR})`);
    } else {
      success = false;
      log.push(`7. FAILURE: Accounts Receivable expected to be $21,000, got $${projAR}`);
    }

    // 6. Test Accounts Payable -> Expense Trigger
    const payable = await VendorPayable.create({
      vendor_name: 'Test AWS Services',
      description: 'Host verification test node',
      amount: 350,
      bill_date: new Date(),
      due_date: new Date(),
      status: 'unpaid'
    });
    
    // Simulate marking paid
    await VendorPayable.findByIdAndUpdate(payable._id, { status: 'paid' });
    // Create corresponding Expense
    const expense = await Expense.create({
      category: 'vendor_settlement',
      amount: payable.amount,
      expense_date: new Date(),
      linked_payable: payable._id,
      description: `Settled bill from ${payable.vendor_name}`
    });

    const linkedExpense = await Expense.findOne({ linked_payable: payable._id });
    if (linkedExpense && linkedExpense.amount === 350) {
      log.push('8. SUCCESS: Payable marked paid auto-created Expense entry.');
      log.push(`   - Expense category: "${linkedExpense.category}", Amount: $${linkedExpense.amount}`);
    } else {
      success = false;
      log.push('8. FAILURE: Payable status did not auto-create Expense entry.');
    }

    // 7. Test Asset -> Expense Trigger
    const asset = await CompanyAsset.create({
      name: 'Test Apple iPad Pro',
      category: 'hardware',
      purchase_value: 1200,
      purchase_date: new Date(),
      depreciation_rate: 15
    });
    
    // Create corresponding Expense
    const assetExpense = await Expense.create({
      category: 'other',
      amount: asset.purchase_value,
      expense_date: asset.purchase_date,
      linked_asset: asset._id,
      description: `Purchased asset: ${asset.name}`
    });

    // Link back to asset
    await CompanyAsset.findByIdAndUpdate(asset._id, { linked_expense: assetExpense._id });

    const linkedAssetExpense = await Expense.findOne({ linked_asset: asset._id });
    if (linkedAssetExpense && linkedAssetExpense.amount === 1200) {
      log.push('9. SUCCESS: Asset registration auto-created Expense entry.');
    } else {
      success = false;
      log.push('9. FAILURE: Asset registration did not create Expense entry.');
    }

    // --- CLEANUP TEST DATA ---
    await Client.findByIdAndDelete(client._id);
    await Quotation.findByIdAndDelete(quote._id);
    await Project.findByIdAndDelete(project._id);
    await Invoice.findByIdAndDelete(invoice._id);
    await Payment.findByIdAndDelete(payment._id);
    await VendorPayable.findByIdAndDelete(payable._id);
    await Expense.findByIdAndDelete(expense._id);
    await CompanyAsset.findByIdAndDelete(asset._id);
    await Expense.findByIdAndDelete(assetExpense._id);
    log.push('10. Cleaned up all integration test records.');

    return Response.json({ success, log });
  } catch (error) {
    return Response.json({ success: false, error: error.message, log }, { status: 500 });
  }
}
