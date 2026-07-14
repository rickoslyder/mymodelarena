export const config = { maxDuration: 5 };

export default function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' } });
  }
  response.setHeader('Cache-Control', 'no-store');
  return response.status(200).json({
    status: 'ok',
    service: 'arenalab',
    version: '1.0.0',
    publicProviderMode: 'scripted-control-only',
    timestamp: new Date().toISOString(),
  });
}
