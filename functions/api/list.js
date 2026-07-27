// /api/list — List files from HuggingFace bucket/repo
// Cloudflare Pages Function

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const repo = url.searchParams.get('repo') || 'Lalapo1/chiyo';
  const type = url.searchParams.get('type') || 'bucket';
  const revision = url.searchParams.get('revision') || 'main';
  const path = url.searchParams.get('path') || '';

  // Build HuggingFace API URL
  // For buckets: /api/buckets/{namespace}/{repo}/tree/{revision}/{path}
  // For models:  /api/models/{repo}/tree/{revision}/{path}
  // For datasets: /api/datasets/{repo}/tree/{revision}/{path}
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
        return Response.json([], {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      return Response.json(
        { error: `HuggingFace API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Normalize the response
    const files = Array.isArray(data) ? data.map(item => ({
      path: item.path || '',
      type: item.type || 'file', // 'directory' or 'file'
      size: item.size || 0,
      oid: item.oid || '',
      lfs: item.lfs || null,
      lastCommit: item.lastCommit || null,
      lastModified: item.lastCommit?.date || null,
      // Use LFS size if available
      ...(item.lfs ? { size: item.lfs.size } : {})
    })) : [];

    return Response.json(files, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return Response.json(
      { error: 'Failed to fetch from HuggingFace', details: e.message },
      { status: 500 }
    );
  }
}
