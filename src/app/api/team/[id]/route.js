import dbConnect from '@/lib/dbConnect';
import { Team } from '@/lib/models';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const member = await Team.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!member) {
      return Response.json({ error: 'Team member not found' }, { status: 404 });
    }
    return Response.json(member);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const member = await Team.findByIdAndDelete(id);
    if (!member) {
      return Response.json({ error: 'Team member not found' }, { status: 404 });
    }
    return Response.json({ message: 'Team member deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
