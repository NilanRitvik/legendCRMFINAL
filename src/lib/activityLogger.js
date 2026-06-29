// Client & Server friendly Activity Logger
export async function logActivity({
  username,
  user_role,
  action_type,
  module,
  description,
  ref_id = '',
  ref_name = '',
  metadata = {}
}) {
  try {
    let finalUser = username;
    let finalRole = user_role;

    // Retrieve username and role from cookies if not provided (browser environment only)
    if (typeof window !== 'undefined' && !finalUser) {
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
      };
      const session = getCookie('legendin_session');
      if (session) {
        try {
          const decoded = atob(session);
          const sessionData = JSON.parse(decoded);
          if (sessionData) {
            finalUser = sessionData.username;
            finalRole = sessionData.role;
          }
        } catch {}
      }
    }

    if (!finalUser) {
      finalUser = 'System';
      finalRole = 'admin';
    }

    // Determine target URL for logging
    let url = '/api/activity-log';
    if (typeof window === 'undefined') {
      const port = process.env.PORT || 3000;
      url = `http://localhost:${port}/api/activity-log`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: finalUser,
        user_role: finalRole,
        action_type,
        module,
        description,
        ref_id,
        ref_name,
        metadata
      })
    });

    if (!res.ok) {
      throw new Error(`Logger returned status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Error logging activity:', err.message);
    return { success: false, error: err.message };
  }
}
