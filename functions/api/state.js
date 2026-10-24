function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function isAuthorized(request) {
  const hostname = new URL(request.url).hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  return Boolean(request.headers.get('Cf-Access-Authenticated-User-Email'));
}

export async function onRequestGet(context) {
  if (!isAuthorized(context.request)) return json({ error: 'Acesso não autorizado.' }, 401);
  const row = await context.env.DB.prepare('SELECT payload, updated_at FROM workspace_state WHERE id = 1').first();
  if (!row) return json({ state: null, updatedAt: null });
  try {
    return json({ state: JSON.parse(row.payload), updatedAt: row.updated_at });
  } catch {
    return json({ error: 'O estado salvo no banco está inválido.' }, 500);
  }
}

export async function onRequestPut(context) {
  if (!isAuthorized(context.request)) return json({ error: 'Acesso não autorizado.' }, 401);
  const body = await context.request.json().catch(() => null);
  if (!body || typeof body !== 'object' || !Array.isArray(body.leads) || !Array.isArray(body.projects) || !Array.isArray(body.messages)) {
    return json({ error: 'Estado inválido.' }, 400);
  }
  const payload = JSON.stringify(body);
  if (payload.length > 1_500_000) return json({ error: 'Estado maior que o limite do MVP.' }, 413);
  const updatedAt = new Date().toISOString();
  await context.env.DB.prepare(`
    INSERT INTO workspace_state (id, payload, updated_at)
    VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
  `).bind(payload, updatedAt).run();
  return json({ ok: true, updatedAt });
}
