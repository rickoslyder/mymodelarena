import { runControlMatch } from '../src/orchestrator.mjs';

export const config = { maxDuration: 30 };

function seedFrom(request) {
  const url = new URL(request.url, 'https://arenalab.local');
  const seed = String(url.searchParams.get('seed') ?? 'arena-demo-001').trim();
  if (seed.length < 1 || seed.length > 120) throw new TypeError('Seed must contain 1–120 characters.');
  return seed;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' } });
  }
  try {
    const result = await runControlMatch(seedFrom(request));
    return response.status(200).json(result.publicArtifact);
  } catch (error) {
    return response.status(error instanceof TypeError ? 400 : 500).json({
      error: {
        code: error instanceof TypeError ? 'INVALID_SEED' : 'RUN_FAILED',
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
