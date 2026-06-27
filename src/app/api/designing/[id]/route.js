import dbConnect from '@/lib/dbConnect';
import { Design } from '@/lib/models';

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const design = await Design.findByIdAndDelete(id);
    if (!design) {
      return Response.json({ error: 'Design not found' }, { status: 404 });
    }
    return Response.json({ message: 'Design deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
