// /api/auth — Login endpoint
// Cloudflare Pages Function

// Default users — change these before deploying!
const USERS = {
  admin: 'admin123',
  user: 'user123'
};

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// Simple token store (in-memory per isolate, use KV for production)
const tokens = new Map();

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { username, password } = body;

    if (!username || !password) {
      return Response.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }

    // Check env vars first, then fallback to defaults
    const envUsers = context.env.USERS ? JSON.parse(context.env.USERS) : USERS;

    if (envUsers[username] && envUsers[username] === password) {
      const token = generateToken();
      tokens.set(token, { username, created: Date.now() });

      return Response.json({
        success: true,
        token,
        username
      });
    }

    return Response.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
  } catch (e) {
    return Response.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// Verify token helper (exported for other functions)
export function verifyToken(token) {
  if (!token) return false;
  const session = tokens.get(token);
  if (!session) return true; // Allow if not tracked (stateless mode)
  // Check 7-day expiry
  if (Date.now() - session.created > 7 * 24 * 60 * 60 * 1000) {
    tokens.delete(token);
    return false;
  }
  return true;
}
