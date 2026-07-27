export async function onRequestPost(context) {
  return new Response(JSON.stringify({ success: true, token: "debug", username: "admin" }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}


