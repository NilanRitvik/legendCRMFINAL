import dbConnect from '@/lib/dbConnect';
import { User } from '@/lib/models';

export async function POST(request) {
  try {
    await dbConnect();
    const { employeeId, password } = await request.json();

    if (!employeeId || !password) {
      return Response.json({ error: 'Employee ID and password are required.' }, { status: 400 });
    }

    // Find user linked to employeeId and matching password
    const user = await User.findOne({ employeeId, password });
    if (!user) {
      return Response.json({ error: 'Incorrect password or no user account linked to this supervisor.' }, { status: 401 });
    }

    return Response.json({ success: true, username: user.username });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
