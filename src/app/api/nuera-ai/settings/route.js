import dbConnect from '@/lib/dbConnect';
import { Settings } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const settings = await Settings.find({}).lean();
    
    // Reduce array to a key-value object map
    const config = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    
    return Response.json(config);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const { key, value } = await request.json();
    
    if (!key || !value) {
      return Response.json({ error: 'Key and Value are required' }, { status: 400 });
    }
    
    const updated = await Settings.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true }
    );
    
    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
