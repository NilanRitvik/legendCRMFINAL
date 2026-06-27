import dbConnect from '@/lib/dbConnect';
import { Invoice, Project } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const invoices = await Invoice.find({})
      .populate({
        path: 'project',
        populate: { path: 'client' }
      })
      .sort({ createdAt: -1 });
    return Response.json(invoices);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function getClientPrefix(client) {
  const name = client.company || client.name || 'CLI';
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
  return cleanName.substring(0, 3).toUpperCase().padEnd(3, 'X');
}

async function getNextInvoiceNumber(client) {
  const prefix = getClientPrefix(client);
  const year = new Date().getFullYear();
  const invoices = await Invoice.find({});
  let maxSeq = 0;
  for (const inv of invoices) {
    if (inv.invoice_number) {
      const parts = inv.invoice_number.split('-');
      const lastPart = parts[parts.length - 1];
      const seq = parseInt(lastPart, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }
  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(6, '0');
  return `Inv-${prefix}-${year}-${seqStr}`;
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.project || !body.amount || !body.type || !body.issue_date || !body.due_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Load Project and Client to determine client name
    const proj = await Project.findById(body.project).populate('client');
    if (!proj || !proj.client) {
      return Response.json({ error: 'Project or Client not found' }, { status: 404 });
    }

    body.invoice_number = await getNextInvoiceNumber(proj.client);

    const invoice = await Invoice.create(body);
    const populated = await Invoice.findById(invoice._id).populate('project');
    return Response.json(populated, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
