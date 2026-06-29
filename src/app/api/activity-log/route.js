import dbConnect from '@/lib/dbConnect';
import { ActivityLog } from '@/lib/models';

// GET: fetch activity logs (optionally filtered by username, date range, module)
export async function GET(request) {
  try {
    await dbConnect();
    const url = new URL(request.url);
    const username  = url.searchParams.get('username');
    const role      = url.searchParams.get('role');
    const days      = parseInt(url.searchParams.get('days') || '7');
    const module_   = url.searchParams.get('module');
    const limit     = parseInt(url.searchParams.get('limit') || '200');

    const since = new Date();
    since.setDate(since.getDate() - days);

    const query = { createdAt: { $gte: since } };

    // CEO / admin can see all; others see only their own logs
    if (username && role !== 'ceo' && role !== 'admin') {
      query.username = username;
    } else if (username && role === 'ceo') {
      // CEO can optionally filter by a specific user
      const filterUser = url.searchParams.get('filter_user');
      if (filterUser) query.username = filterUser;
    }

    if (module_) query.module = module_;

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Build a summary for Nuera
    const summary = {
      totalActions: logs.length,
      byModule: {},
      byActionType: {},
      byDay: {},
      logs,
    };

    for (const log of logs) {
      summary.byModule[log.module] = (summary.byModule[log.module] || 0) + 1;
      summary.byActionType[log.action_type] = (summary.byActionType[log.action_type] || 0) + 1;
      const day = new Date(log.createdAt).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
      summary.byDay[day] = (summary.byDay[day] || 0) + 1;
    }

    return Response.json(summary);
  } catch (error) {
    console.error('Activity log GET error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: record a new activity log entry
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { username, user_role, action_type, module, description, ref_id, ref_name, metadata } = body;

    if (!username || !action_type || !module || !description) {
      return Response.json({ error: 'username, action_type, module, description are required' }, { status: 400 });
    }

    const log = await ActivityLog.create({
      username,
      user_role: user_role || 'viewer',
      action_type,
      module,
      description,
      ref_id: ref_id || '',
      ref_name: ref_name || '',
      metadata: metadata || {}
    });

    return Response.json({ success: true, id: log._id }, { status: 201 });
  } catch (error) {
    console.error('Activity log POST error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
