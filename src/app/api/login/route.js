import dbConnect from '@/lib/dbConnect';
import { User } from '@/lib/models';

const ALL_PAGES = [
  'ceo',
  'dashboard','clients','projects','payments','monthly-statements',
  'analytics','assets','team','amc','designing','purchase',
  'hr','hr-employees','hr-leaves','hr-attendance','hr-payroll',
  'installation', 'manufacturing'
];

export async function POST(request) {
  try {
    await dbConnect();
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({ error: 'Username and password required' }, { status: 400 });
    }

    // Auto-seed default admins if they are missing
    const adminSeeds = [
      { username: 'purusoth',  password: 'Nilan@101088',    role: 'admin', allowedPages: ALL_PAGES },
      { username: 'legend',    password: 'legend123',       role: 'admin', allowedPages: ALL_PAGES },
      { username: 'lgened',    password: 'legend123',       role: 'admin', allowedPages: ALL_PAGES },
    ];

    for (const seed of adminSeeds) {
      const exists = await User.findOne({ username: seed.username });
      if (!exists) {
        await User.create(seed);
      }
    }

    const userObj = await User.findOne({ username: username.toLowerCase() });
    if (!userObj || userObj.password !== password) {
      return Response.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Ensure admin users always have ALL pages (auto-upgrade old sessions)
    let effectivePages = userObj.allowedPages || [];
    if (userObj.role === 'admin') {
      effectivePages = ALL_PAGES;
      // Persist the upgrade if their stored list is outdated
      const missingAny = ALL_PAGES.some(p => !userObj.allowedPages.includes(p));
      if (missingAny) {
        await User.findByIdAndUpdate(userObj._id, { allowedPages: ALL_PAGES });
      }
    }

    return Response.json({
      username: userObj.username,
      role: userObj.role,
      allowedPages: effectivePages
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
