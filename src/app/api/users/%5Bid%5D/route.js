import dbConnect from '@/lib/dbConnect';
import { User } from '@/lib/models';

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return Response.json({ error: 'User account not found' }, { status: 404 });
    }
    
    return Response.json({ message: 'User account deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    
    if (!body.password) {
      return Response.json({ error: 'Password is required' }, { status: 400 });
    }
    
    const user = await User.findByIdAndUpdate(id, { password: body.password }, { new: true });
    if (!user) {
      return Response.json({ error: 'User account not found' }, { status: 404 });
    }
    
    return Response.json({ message: 'Password updated successfully', user });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
