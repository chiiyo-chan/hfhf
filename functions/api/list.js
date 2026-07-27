// /api/list — List files from HuggingFace bucket/repo
// Cloudflare Pages Function

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

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const repo = url.searchParams.get('repo') || 'Lalapo1/chiyo';
  const type = url.searchParams.get('type') || 'bucket';
  const revision = url.searchParams.get('revision') || 'main';
  const path = url.searchParams.get('path') || '';

  // Build HuggingFace API URL
  let apiUrl;
  const repoType = type === 'bucket' ? 'buckets' : type === 'dataset' ? 'datasets' : 'models';

  if (path) {
    apiUrl = `https://huggingface.co/api/${repoType}/${repo}/tree/${revision}/${path}`;
  } else {
    apiUrl = `https://huggingface.co/api/${repoType}/${repo}/tree/${revision}`;
  }

  try {
    const headers = {
      'User-Agent': 'HF-Drive-Index/1.0'
    };

    // Add HF token if configured
    const hfToken = context.env.HF_TOKEN;
    if (hfToken) {
      headers['Authorization'] = `Bearer ${hfToken}`;
    }

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      // If 404, return empty array (empty folder)
      if (response.status === 404) {
        return jsonResponse([]);
      }
      return jsonResponse({ error: `HuggingFace API error: ${response.status}` }, response.status);
    }

    const data = await response.json();

    // Normalize the response
    const files = Array.isArray(data) ? data.map(item => {
      let fileObj = {
        path: item.path || '',
        type: item.type || 'file', // 'directory' or 'file'
        size: item.size || 0,
        oid: item.oid || '',
        lfs: item.lfs || null,
        lastCommit: item.lastCommit || null,
        lastModified: item.lastCommit && item.lastCommit.date ? item.lastCommit.date : null
      };
      // Use LFS size if available
      if (item.lfs && item.lfs.size) {
        fileObj.size = item.lfs.size;
      }
      return fileObj;
    }) : [];

    return jsonResponse(files);
  } catch (e) {
    return jsonResponse({ error: 'Failed to fetch from HuggingFace', details: e.message }, 500);
  }
}
