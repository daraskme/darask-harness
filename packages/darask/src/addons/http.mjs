const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });

export function createAddonRoutes(addons) {
  return [
    { path: '/api/darask/addons', methods: ['GET'], requestBody: 'buffered', async fetch() { try { return json(await addons.status()); } catch { return json({ error: 'DARASK addons are unavailable.' }, 503); } } },
    { path: '/api/darask/addons/action', methods: ['POST'], requestBody: 'buffered', async fetch(request) {
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json({ error: 'JSON required.' }, 415);
      const body = await request.text();
      if (new TextEncoder().encode(body).length > 32768) return json({ error: 'Request too large.' }, 413);
      try { return json(await addons.action(JSON.parse(body))); }
      catch (error) { return json({ error: safeAddonError(error) }, 400); }
    } },
  ];
}

export function safeAddonError(error) {
  const message = error instanceof Error ? error.message : '';
  return /^(Invalid|Unknown|Addon)/.test(message) ? message.slice(0, 200) : 'The addons action failed.';
}
