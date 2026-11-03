import { configured, isAuthorized, json, matchLeadByPhone, normalizePhone, workspaceState } from './_lib.js';

export async function onRequestPost({ request, env }) {
  if (!isAuthorized(request)) return json({ error: 'Acesso não autorizado.' }, 401);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return json({ error: 'Origem da solicitação inválida.' }, 403);
  if (!configured(env)) return json({ error: 'A integração oficial ainda não está configurada na Cloudflare.' }, 503);
  const input = await request.json().catch(() => null);
  const leadId = String(input?.leadId || '').slice(0, 160);
  const body = String(input?.text || '').trim();
  if (!leadId || !body || body.length > 4096) return json({ error: 'Informe um lead e uma mensagem de até 4.096 caracteres.' }, 400);

  const state = await workspaceState(env);
  const lead = state?.leads?.find((item) => item.id === leadId);
  const phone = normalizePhone(lead?.phone);
  if (!lead || !phone) return json({ error: 'O lead não tem um telefone válido para WhatsApp.' }, 422);
  const lastInbound = await env.DB.prepare(`
    SELECT occurred_at FROM whatsapp_messages
    WHERE contact_phone = ? AND direction = 'inbound'
    ORDER BY occurred_at DESC LIMIT 1
  `).bind(phone).first();
  const lastInboundAt = lastInbound?.occurred_at ? Date.parse(lastInbound.occurred_at) : 0;
  if (!lastInboundAt || Date.now() - lastInboundAt >= 24 * 60 * 60 * 1000) {
    return json({ error: 'A janela de resposta livre está fechada. Para iniciar ou retomar contato, configure um modelo aprovado pela Meta e registre a autorização do contato antes do envio.' , code: 'template_or_opt_in_required' }, 409);
  }

  const apiVersion = String(env.WHATSAPP_API_VERSION).replace(/^\/?|\/$/g, '');
  if (!/^v\d+\.\d+$/.test(apiVersion)) return json({ error: 'A versão da API do WhatsApp configurada está inválida.' }, 503);
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'text', text: { preview_url: false, body } }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const safeMessage = String(payload?.error?.message || 'A Meta recusou o envio. Confira a configuração da conta e o status do número.').slice(0, 500);
    return json({ error: safeMessage }, response.status === 429 ? 429 : 502);
  }

  const sent = payload.messages?.[0];
  if (!sent?.id) return json({ error: 'A Meta não confirmou o identificador da mensagem; confira o status antes de tentar novamente.' }, 502);
  const occurredAt = new Date().toISOString();
  await env.DB.prepare(`
    INSERT OR IGNORE INTO whatsapp_messages
      (id, whatsapp_message_id, lead_id, contact_phone, contact_name, direction, message_type, body, status, occurred_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'outbound', 'text', ?, 'sent', ?, ?)
  `).bind(crypto.randomUUID(), sent.id, lead.id, phone, lead.name || '', body, occurredAt, occurredAt).run();
  return json({ ok: true, whatsappMessageId: sent.id, occurredAt });
}
