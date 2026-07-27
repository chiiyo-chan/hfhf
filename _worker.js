// Advanced Mode Cloudflare Pages Worker
// This bypasses the buggy functions/ compiler by doing all routing manually.

const USERS = {
  admin: 'admin123',
  user: 'user123'
};

const tokens = new Map();

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      // 1. Auth API
      if (url.pathname === '/api/auth' && request.method === 'POST') {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
          return jsonResponse({ success: false, error: 'Username and password required' }, 400);
        }

        const envUsers = env.USERS ? JSON.parse(env.USERS) : USERS;

        if (envUsers[username] && envUsers[username] === password) {
          const token = generateToken();
          tokens.set(token, { username, created: Date.now() });

          return new Response(JSON.stringify({ success: true, token, username }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return jsonResponse({ success: false, error: 'Invalid credentials' }, 401);
      }

      // 2. List API
      if (url.pathname === '/api/list' && request.method === 'GET') {
        const repo = url.searchParams.get('repo') || 'Lalapo1/chiyo';
        const type = url.searchParams.get('type') || 'bucket';
        const revision = url.searchParams.get('revision') || 'main';
        const path = url.searchParams.get('path') || '';

        const repoType = type === 'bucket' ? 'buckets' : type === 'dataset' ? 'datasets' : 'models';
        const apiUrl = path 
          ? `https://huggingface.co/api/${repoType}/${repo}/tree/${revision}/${path}`
          : `https://huggingface.co/api/${repoType}/${repo}/tree/${revision}`;

        const headers = { 'User-Agent': 'HF-Drive-Index/1.0' };
        if (env.HF_TOKEN) headers['Authorization'] = `Bearer ${env.HF_TOKEN}`;

        const response = await fetch(apiUrl, { headers });

        if (!response.ok) {
          if (response.status === 404) return jsonResponse([]);
          return jsonResponse({ error: `HuggingFace API error: ${response.status}` }, response.status);
        }

        const data = await response.json();
        const files = Array.isArray(data) ? data.map(item => {
          let fileObj = {
            path: item.path || '',
            type: item.type || 'file',
            size: item.size || 0,
            oid: item.oid || '',
            lfs: item.lfs || null,
            lastCommit: item.lastCommit || null,
            lastModified: item.lastCommit && item.lastCommit.date ? item.lastCommit.date : null
          };
          if (item.lfs && item.lfs.size) fileObj.size = item.lfs.size;
          return fileObj;
        }) : [];

        return jsonResponse(files);
      }

      // 3. Download API
      if (url.pathname === '/api/download' && request.method === 'GET') {
        const repo = url.searchParams.get('repo') || 'Lalapo1/chiyo';
        const type = url.searchParams.get('type') || 'bucket';
        const file = url.searchParams.get('file');
        const revision = url.searchParams.get('revision') || 'main';

        if (!file) return new Response('Missing file parameter', { status: 400 });

        let resolveUrl;
        if (type === 'bucket') resolveUrl = `https://huggingface.co/buckets/${repo}/resolve/${revision}/${file}`;
        else if (type === 'dataset') resolveUrl = `https://huggingface.co/datasets/${repo}/resolve/${revision}/${file}`;
        else resolveUrl = `https://huggingface.co/${repo}/resolve/${revision}/${file}`;

        const headers = { 'User-Agent': 'HF-Drive-Index/1.0' };
        if (env.HF_TOKEN) headers['Authorization'] = `Bearer ${env.HF_TOKEN}`;

        const response = await fetch(resolveUrl, { headers, redirect: 'follow' });
        if (!response.ok) return new Response(`File not found: ${response.status}`, { status: response.status });

        const fileName = file.split('/').pop();
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const contentLength = response.headers.get('content-length');
        const inline = url.searchParams.get('inline') === 'true';
        const disposition = inline ? `inline; filename="${fileName}"` : `attachment; filename="${fileName}"`;

        const responseHeaders = new Headers({
          'Content-Type': contentType,
          'Content-Disposition': disposition,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600'
        });

        if (contentLength) responseHeaders.set('Content-Length', contentLength);

        const rangeHeader = request.headers.get('Range');
        if (rangeHeader && response.headers.get('accept-ranges') === 'bytes') {
          responseHeaders.set('Accept-Ranges', 'bytes');
          const contentRange = response.headers.get('content-range');
          if (contentRange) responseHeaders.set('Content-Range', contentRange);
        }

        return new Response(response.body, {
          status: response.status,
          headers: responseHeaders
        });
      }

      // 4. Serve Static Assets for everything else
      return env.ASSETS.fetch(request);

    } catch (e) {
      return new Response(`Global Error: ${e.message}`, { status: 500 });
    }
  }
};
