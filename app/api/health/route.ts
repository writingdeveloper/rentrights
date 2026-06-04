export const runtime = 'nodejs';

// Dependency-free liveness probe (instant 200). Liveness != upstream health —
// it does not check the LA County / Census APIs, only that the server is up.
export function GET() {
  return Response.json({ status: 'ok' });
}
