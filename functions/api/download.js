// /api/download — Download proxy for HuggingFace files
// Cloudflare Pages Function

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const repo = url.searchParams.get('repo') || 'Lalapo1/chiyo';
  const type = url.searchParams.get('type') || 'bucket';
  const file = url.searchParams.get('file');
  const revision = url.searchParams.get('revision') || 'main';

  if (!file) {
    return new Response('Missing file parameter', { status: 400 });
  }

  // Build HuggingFace resolve URL
  let resolveUrl;
  if (type === 'bucket') {
    resolveUrl = `https://huggingface.co/buckets/${repo}/resolve/${revision}/${file}`;
  } else if (type === 'dataset') {
    resolveUrl = `https://huggingface.co/datasets/${repo}/resolve/${revision}/${file}`;
  } else {
    resolveUrl = `https://huggingface.co/${repo}/resolve/${revision}/${file}`;
  }

  try {
    const headers = {
      'User-Agent': 'HF-Drive-Index/1.0'
    };

    const hfToken = context.env.HF_TOKEN;
    if (hfToken) {
      headers['Authorization'] = `Bearer ${hfToken}`;
    }

    const response = await fetch(resolveUrl, {
      headers,
      redirect: 'follow'
    });

    if (!response.ok) {
      return new Response(`File not found: ${response.status}`, { status: response.status });
    }

    // Get content type and filename
    const fileName = file.split('/').pop();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');

    // Determine if inline (for preview) or attachment (for download)
    const inline = url.searchParams.get('inline') === 'true';
    const disposition = inline
      ? `inline; filename="${fileName}"`
      : `attachment; filename="${fileName}"`;

    // Stream the response
    const responseHeaders = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': disposition,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    });

    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    // Support range requests for video/audio streaming
    const rangeHeader = context.request.headers.get('Range');
    if (rangeHeader && response.headers.get('accept-ranges') === 'bytes') {
      responseHeaders.set('Accept-Ranges', 'bytes');
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        responseHeaders.set('Content-Range', contentRange);
      }
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (e) {
    return new Response(`Download error: ${e.message}`, { status: 500 });
  }
}
