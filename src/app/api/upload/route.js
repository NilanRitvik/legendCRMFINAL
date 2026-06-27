import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Ensure uploads/docs folder exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'docs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Safe filename
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${Date.now()}-${cleanFileName}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    // Write file
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/docs/${uniqueFileName}`;
    return NextResponse.json({ url: fileUrl }, { status: 201 });
  } catch (err) {
    console.error('File upload error:', err);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
