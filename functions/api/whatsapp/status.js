import { configured, isAuthorized, json } from './_lib.js';

export async function onRequestGet({ request, env }) {
  if (!isAuthorized(request)) return json({ error: 'Acesso não autorizado.' }, 401);
  const fields = {
    accessToken: Boolean(env.WHATSAPP_ACCESS_TOKEN),
    phoneNumberId: Boolean(env.WHATSAPP_PHONE_NUMBER_ID),
    apiVersion: Boolean(env.WHATSAPP_API_VERSION),
    verifyToken: Boolean(env.WHATSAPP_VERIFY_TOKEN),
    appSecret: Boolean(env.META_APP_SECRET),
    database: Boolean(env.DB),
  };
  const origin = new URL(request.url).origin;
  return json({ connected: configured(env), fields, webhookUrl: `${origin}/api/whatsapp/webhook`, channel: 'WhatsApp Business Platform · Cloud API' });
}
