export async function GET() {
  return new Response(
    JSON.stringify({ status: 'warm', timestamp: new Date().toISOString() }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
