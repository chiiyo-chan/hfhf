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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { username, password } = body;

    if (!username || !password) {
      return jsonResponse({ success: false, error: 'Username and password required' }, 400);
    }

    // Check env vars first, then fallback to defaults
    const envUsers = context.env.USERS ? JSON.parse(context.env.USERS) : USERS;

    if (envUsers[username] && envUsers[username] === password) {
      const token = generateToken();
      tokens.set(token, { username, created: Date.now() });

      return jsonResponse({
        success: true,
        token,
        username
      });
    }

    return jsonResponse({ success: false, error: 'Invalid credentials' }, 401);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Server error' }, 500);
  }
}


