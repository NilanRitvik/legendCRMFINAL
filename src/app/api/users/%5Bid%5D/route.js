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
