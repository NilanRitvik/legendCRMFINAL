import dbConnect from '@/lib/dbConnect';
import { SupervisorNotification } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const supervisorId = searchParams.get('supervisor');

    if (!supervisorId) {
      return Response.json({ error: 'Supervisor ID is required' }, { status: 400 });
    }

    const notifications = await SupervisorNotification.find({ supervisor: supervisorId })
      .sort({ createdAt: -1 })
      .limit(20);

    return Response.json(notifications);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return Response.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const notification = await SupervisorNotification.findByIdAndUpdate(id, { read: true }, { new: true });
    return Response.json({ success: true, notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
