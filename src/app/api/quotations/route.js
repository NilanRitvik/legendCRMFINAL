import dbConnect from '@/lib/dbConnect';
import { Quotation, Client } from '@/lib/models';

function getClientPrefix(client) {
  const name = client.company || client.name || 'CLI';
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
  return cleanName.substring(0, 3).toUpperCase().padEnd(3, 'X');
}

async function getNextQuotationNumber(client) {
  const prefix = getClientPrefix(client);
  const year = new Date().getFullYear();
  const quotations = await Quotation.find({});
  let maxSeq = 0;
  for (const q of quotations) {
    if (q.quotation_number) {
      const parts = q.quotation_number.split('-');
      const lastPart = parts[parts.length - 1];
      const seq = parseInt(lastPart, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }
  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(6, '0');
  return `QN-${prefix}-${year}-${seqStr}`;
}

export async function GET(request) {
  try {
    await dbConnect();
    const quotations = await Quotation.find({}).populate('client').sort({ createdAt: -1 });
    return Response.json(quotations);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.client || !body.quoted_value) {
      return Response.json({ error: 'Client and Quoted Value are required' }, { status: 400 });
    }

    const client = await Client.findById(body.client);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    body.quotation_number = await getNextQuotationNumber(client);

    const quotation = await Quotation.create(body);
    const populated = await Quotation.findById(quotation._id).populate('client');
    return Response.json(populated, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
