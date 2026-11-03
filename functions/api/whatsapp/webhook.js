import { constantTimeEqual, extractMessageText, json, matchLeadByPhone, normalizePhone, verifyWebhookSignature, workspaceState } from './_lib.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode !== 'subscribe' || !token || !env.WHATSAPP_VERIFY_TOKEN || !constantTimeEqual(token, env.WHATSAPP_VERIFY_TOKEN) || !challenge) {
    return new Response('Webhook não verificado.', { status: 403 });
  }
  return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

export async function onRequestPost({ request, env }) {
  if (!env.META_APP_SECRET || !env.DB || !env.WHATSAPP_VERIFY_TOKEN) return json({ error: 'Webhook ainda não configurado.' }, 503);
  const declaredSize = Number(request.headers.get('content-length') || 0);
  if (declaredSize > 1_000_000) return json({ error: 'Webhook maior que o limite permitido.' }, 413);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Corpo da solicitação vazio.' }, 400);
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > 1_000_000) {
      await reader.cancel();
      return json({ error: 'Webhook maior que o limite permitido.' }, 413);
    }
    chunks.push(value);
  }
  const rawBody = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) { rawBody.set(chunk, offset); offset += chunk.byteLength; }
  const signature = request.headers.get('x-hub-signature-256');
  if (!await verifyWebhookSignature(rawBody, signature, env.META_APP_SECRET)) return json({ error: 'Assinatura do webhook inválida.' }, 401);
  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(rawBody)); } catch { return json({ error: 'JSON inválido.' }, 400); }
  if (payload.object !== 'whatsapp_business_account') return json({ received: true });

  const state = await workspaceState(env);
  const statements = [];
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const contactNames = new Map((value.contacts || []).map((contact) => [normalizePhone(contact.wa_id), String(contact.profile?.name || '').slice(0, 160)]));
      for (const message of value.messages || []) {
        const phone = normalizePhone(message.from);
        if (!phone || !message.id) continue;
        const lead = matchLeadByPhone(state, phone);
        const occurredAt = new Date((Number(message.timestamp) || Date.now() / 1000) * 1000).toISOString();
        statements.push(env.DB.prepare(`
          INSERT OR IGNORE INTO whatsapp_messages
            (id, whatsapp_message_id, lead_id, contact_phone, contact_name, direction, message_type, body, status, occurred_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'inbound', ?, ?, 'received', ?, ?)
        `).bind(crypto.randomUUID(), message.id, lead?.id || null, phone, contactNames.get(phone) || '', String(message.type || 'unknown').slice(0, 40), extractMessageText(message).slice(0, 4096), occurredAt, new Date().toISOString()));
      }
      for (const status of value.statuses || []) {
        if (!status.id || !status.status) continue;
        statements.push(env.DB.prepare('UPDATE whatsapp_messages SET status = ?, updated_at = ? WHERE whatsapp_message_id = ?').bind(String(status.status).slice(0, 40), new Date().toISOString(), status.id));
      }
    }
  }
  if (statements.length) await env.DB.batch(statements);
  return json({ received: true });
}
