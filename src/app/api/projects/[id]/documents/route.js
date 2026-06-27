import dbConnect from '@/lib/dbConnect';
import { Document } from '@/lib/models';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const docs = await Document.find({ project: id }).sort({ uploaded_at: -1 });
    return Response.json(docs);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const contentType = request.headers.get('content-type') || '';
    
    let docType = '';
    let fileName = '';
    let fileUrl = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      docType = formData.get('type');

      if (!file || typeof file === 'string') {
        return Response.json({ error: 'No file uploaded' }, { status: 400 });
      }

      if (!docType) {
        return Response.json({ error: 'Document type is required' }, { status: 400 });
      }

      // Read file buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Ensure uploads folder exists
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate safe filename
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${Date.now()}-${cleanFileName}`;
      const filePath = path.join(uploadDir, uniqueFileName);
      
      // Write file
      fs.writeFileSync(filePath, buffer);

      fileName = file.name;
      fileUrl = `/uploads/${uniqueFileName}`;
    } else {
      // Expect JSON for direct URL links
      const body = await request.json();
      docType = body.type;
      fileName = body.file_name || 'Link';
      fileUrl = body.file_url;

      if (!docType || !fileUrl) {
        return Response.json({ error: 'Document type and URL are required' }, { status: 400 });
      }
    }

    const doc = await Document.create({
      project: id,
      type: docType,
      file_name: fileName,
      file_url: fileUrl,
    });

    return Response.json(doc, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
