import { isAuthorized, json } from './_lib.js';

export async function onRequestGet({ request, env }) {
  if (!isAuthorized(request)) return json({ error: 'Acesso não autorizado.' }, 401);
  const url = new URL(request.url);
  const since = url.searchParams.get('since') || '';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 250, 1), 500);
  const result = await env.DB.prepare(`
    SELECT id, whatsapp_message_id AS whatsappMessageId, lead_id AS leadId,
      contact_phone AS contactPhone, contact_name AS contactName,
      direction, message_type AS messageType, body, status, occurred_at AS occurredAt
    FROM whatsapp_messages
    WHERE (? = '' OR occurred_at > ?)
    ORDER BY occurred_at DESC LIMIT ?
  `).bind(since, since, limit).all();
  return json({ messages: (result.results || []).reverse() });
}
