import dbConnect from '@/lib/dbConnect';
import { User } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const users = await User.find({}).populate('employeeId').sort({ username: 1 });
    return Response.json(users);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    if (!body.username || !body.password || !body.role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await User.findOne({ username: body.username.toLowerCase() });
    if (existing) {
      return Response.json({ error: 'Username already in use' }, { status: 400 });
    }

    const user = await User.create({
      username: body.username,
      password: body.password,
      role: body.role,
      employeeId: body.employeeId || null,
      allowedPages: body.allowedPages || []
    });

    return Response.json(user, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
