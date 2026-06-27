import dbConnect from '@/lib/dbConnect';
import { Design, Client } from '@/lib/models';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    await dbConnect();
    const designs = await Design.find({}).populate('client').sort({ uploaded_at: -1 });
    return Response.json(designs);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const contentType = request.headers.get('content-type') || '';

    let client = '';
    let designType = '';
    let fileName = '';
    let fileUrl = '';
    let notes = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      client = formData.get('client');
      designType = formData.get('design_type'); // '2d' or '3d'
      notes = formData.get('notes') || '';

      if (!client || !designType) {
        return Response.json({ error: 'Client and Design Type are required' }, { status: 400 });
      }

      if (!file || typeof file === 'string') {
        return Response.json({ error: 'No design file uploaded' }, { status: 400 });
      }

      // Read file buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Ensure uploads/designs folder exists
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'designs');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Safe filename
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${Date.now()}-${cleanFileName}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      // Write file
      fs.writeFileSync(filePath, buffer);

      fileName = file.name;
      fileUrl = `/uploads/designs/${uniqueFileName}`;
    } else {
      // JSON body fallback
      const body = await request.json();
      client = body.client;
      designType = body.design_type;
      fileName = body.file_name || 'Design Layout';
      fileUrl = body.file_url;
      notes = body.notes || '';

      if (!client || !designType || !fileUrl) {
        return Response.json({ error: 'Client, Design Type and File URL are required' }, { status: 400 });
      }
    }

    // Verify client exists
    const clientExists = await Client.findById(client);
    if (!clientExists) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const design = await Design.create({
      client,
      design_type: designType,
      file_name: fileName,
      file_url: fileUrl,
      notes,
      approval_status: 'pending'
    });

    const populated = await Design.findById(design._id).populate('client');
    return Response.json(populated, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
