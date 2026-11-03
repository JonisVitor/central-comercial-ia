export function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function isAuthorized(request) {
  const hostname = new URL(request.url).hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  return Boolean(request.headers.get('Cf-Access-Authenticated-User-Email'));
}

export function normalizePhone(value = '') {
  let digits = String(value).replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits.length >= 12 && digits.length <= 15 ? digits : '';
}

export function constantTimeEqual(left, right) {
  const a = new TextEncoder().encode(String(left));
  const b = new TextEncoder().encode(String(right));
  let mismatch = a.length ^ b.length;
  const max = Math.max(a.length, b.length);
  for (let index = 0; index < max; index += 1) mismatch |= (a[index] || 0) ^ (b[index] || 0);
  return mismatch === 0;
}

export function configured(env) {
  return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_API_VERSION && env.WHATSAPP_VERIFY_TOKEN && env.META_APP_SECRET && env.DB);
}

export async function workspaceState(env) {
  const row = await env.DB.prepare('SELECT payload FROM workspace_state WHERE id = 1').first();
  if (!row?.payload) return null;
  try { return JSON.parse(row.payload); } catch { return null; }
}

export function matchLeadByPhone(state, phone) {
  if (!state || !phone) return null;
  return (state.leads || []).find((lead) => normalizePhone(lead.phone) === phone) || null;
}

export async function verifyWebhookSignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader?.startsWith('sha256=') || !appSecret) return false;
  const supplied = signatureHeader.slice(7);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  let bytes;
  try { bytes = Uint8Array.from(atob(supplied), (char) => char.charCodeAt(0)); } catch { return false; }
  return crypto.subtle.verify('HMAC', key, bytes, rawBody);
}

export function extractMessageText(message) {
  if (message.type === 'text') return message.text?.body || '';
  if (message.type === 'button') return message.button?.text || '';
  if (message.type === 'interactive') return message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '';
  if (message.type === 'image') return message.image?.caption || '[Imagem recebida]';
  if (message.type === 'video') return message.video?.caption || '[Vídeo recebido]';
  if (message.type === 'document') return message.document?.caption || `[Documento recebido${message.document?.filename ? `: ${message.document.filename}` : ''}]`;
  if (message.type === 'audio' || message.type === 'voice') return '[Áudio recebido]';
  if (message.type === 'location') return '[Localização recebida]';
  return `[Mensagem do tipo ${String(message.type || 'desconhecido')}]`;
}
