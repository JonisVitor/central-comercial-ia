import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const directory = path.join(process.env.LOCALAPPDATA || os.homedir(), 'CentralComercialIA', 'whatsapp');
const inboxFile = path.join(directory, 'inbox.json');
const enabledFile = path.join(directory, 'connection.json');
let client, starting, qrDataUrl = '', state = 'disconnected', error = '', account = '';
let blocked = new Set();
let contacts = new Map(), events = [], writeQueue = Promise.resolve();
let generation = 0, sending = false, lastSend = 0;
const phone = value => { const digits = String(value || '').replace(/\D/g, ''); return /^\d{10,11}$/.test(digits) ? `55${digits}` : digits; };
const save = () => { writeQueue = writeQueue.catch(() => {}).then(async () => { await fs.mkdir(directory, { recursive: true }); await fs.writeFile(inboxFile, JSON.stringify(events.slice(-2000)), 'utf8'); }); return writeQueue; };
const status = () => ({ connected: state === 'ready', state, qrDataUrl, error, account, channel: 'WhatsApp local · QR Code', local: true });
async function record(message, outbound = false) {
  if (!message.id || message.from?.endsWith('@g.us') || message.to?.endsWith('@g.us')) return;
  let number = (outbound ? message.to : message.from)?.split('@')[0];
  // Resolve WhatsApp LID identities through the contact object instead of treating LIDs as phone numbers.
  if ((outbound ? message.to : message.from)?.endsWith('@lid')) {
    try { number = (await message.getContact()).number; } catch { return; }
  }
  const normalized = phone(number);
  const leadId = contacts.get(normalized);
  if (!leadId) return; // Only CRM contacts are collected; personal conversations stay outside the panel.
  const id = message.id._serialized;
  if (events.some(entry => entry.whatsappMessageId === id)) return;
  events.push({ whatsappMessageId: id, leadId, contactPhone: normalized, direction: outbound ? 'outbound' : 'inbound', body: String(message.body || (message.hasMedia ? '[Mídia recebida — consulte no WhatsApp]' : '[Mensagem sem texto]')).slice(0, 10000), occurredAt: new Date((message.timestamp || Date.now() / 1000) * 1000).toISOString() });
  events = events.slice(-2000);
  await save();
}
async function connect() {
  if (client || starting) return status();
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(enabledFile, JSON.stringify({ enabled: true }), 'utf8');
  const token = ++generation;
  state = 'starting'; error = ''; qrDataUrl = '';
  starting = (async () => {
    try {
      const [{ default: library }, qr] = await Promise.all([import('whatsapp-web.js'), import('qrcode')]);
      const { Client, LocalAuth } = library;
      const choices = [process.env.CHROME_PATH, path.join(process.env.PROGRAMFILES || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'), path.join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe')].filter(Boolean);
      let executablePath;
      for (const candidate of choices) { try { await fs.access(candidate); executablePath = candidate; break; } catch {} }
      if (!executablePath) throw new Error('Chrome não encontrado. Instale o Google Chrome para conectar por QR.');
      await fs.mkdir(directory, { recursive: true });
      try { events = JSON.parse(await fs.readFile(inboxFile, 'utf8')).slice(-2000); } catch { events = []; }
      if (token !== generation) return;
      const instance = new Client({ authStrategy: new LocalAuth({ dataPath: path.join(directory, 'session') }), puppeteer: { headless: true, executablePath }, qrMaxRetries: 8, authTimeoutMs: 120000 });
      client = instance;
      instance.on('qr', async value => { const data = await qr.toDataURL(value, { width: 288, margin: 2 }); if (token === generation) { qrDataUrl = data; state = 'qr'; } });
      instance.on('authenticated', () => { if (token === generation) { state = 'authenticating'; qrDataUrl = ''; } });
      instance.on('ready', () => { if (token === generation) { state = 'ready'; qrDataUrl = ''; account = instance.info?.wid?.user || ''; } });
      instance.on('auth_failure', () => { if (token === generation) { state = 'error'; error = 'Autenticação recusada. Desconecte e gere outro QR Code.'; qrDataUrl = ''; } });
      instance.on('disconnected', () => { if (token === generation) { state = 'disconnected'; qrDataUrl = ''; client = undefined; } void instance.destroy().catch(() => {}); });
      instance.on('message', message => { void record(message).catch(() => {}); });
      instance.on('message_create', message => { if (message.fromMe) void record(message, true).catch(() => {}); });
      await instance.initialize();
    } catch (failure) {
      if (token === generation) { state = 'error'; qrDataUrl = ''; error = failure.code === 'ERR_MODULE_NOT_FOUND' ? 'Bibliotecas ausentes. Execute npm install e reinicie o painel.' : 'Não foi possível iniciar o WhatsApp. Feche a conexão, tente novamente e confira se o Chrome está instalado.'; const old = client; client = undefined; if (old) await old.destroy().catch(() => {}); }
    } finally { if (token === generation) starting = undefined; }
  })();
  return status();
}
export async function handleWhatsAppLocal(req, res, readBody, send) {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (!url.pathname.startsWith('/api/whatsapp/')) return false;
  try {
    if (req.method === 'GET' && url.pathname === '/api/whatsapp/status') { send(res, 200, status()); return true; }
    if (req.method !== 'POST' && req.method !== 'GET') { send(res, 405, { error: 'Método não permitido.' }); return true; }
    if (req.method === 'POST' && req.headers['x-central-action'] !== 'whatsapp') { send(res, 403, { error: 'Ação local não autorizada.' }); return true; }
    if (req.method === 'POST' && url.pathname === '/api/whatsapp/connect') { send(res, 202, await connect()); return true; }
    if (req.method === 'POST' && url.pathname === '/api/whatsapp/disconnect') {
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(enabledFile, JSON.stringify({ enabled: false }), 'utf8');
      ++generation; const old = client; client = undefined; starting = undefined; state = 'disconnected'; qrDataUrl = ''; account = ''; error = '';
      if (old) { await old.logout().catch(() => {}); await old.destroy().catch(() => {}); }
      send(res, 200, status()); return true;
    }
    if (req.method === 'POST' && url.pathname === '/api/whatsapp/contacts') {
      const body = await readBody(req);
      blocked = new Set((body.contacts || []).filter(item => item.canContact === false).map(item => item.id));
      contacts = new Map((Array.isArray(body.contacts) ? body.contacts : []).slice(0, 5000).filter(item => item?.id && /^\d{10,15}$/.test(phone(item.phone))).map(item => [phone(item.phone), String(item.id).slice(0, 120)]));
      send(res, 200, { ok: true }); return true;
    }
    if (req.method === 'GET' && url.pathname === '/api/whatsapp/inbox') { send(res, 200, { messages: events.filter(item => contacts.get(item.contactPhone) === item.leadId).slice(-500) }); return true; }
    if (req.method === 'POST' && url.pathname === '/api/whatsapp/send') {
      const body = await readBody(req); const contactPhone = phone(body.phone); const text = String(body.text || '').trim();
      if (state !== 'ready' || !client) throw new Error('Conecte o WhatsApp por QR Code primeiro.');
      if (blocked.has(body.leadId)) throw new Error('Este lead está encerrado ou não permite novo contato.');
      if (body.confirmed !== true || contacts.get(contactPhone) !== body.leadId || !text || text.length > 5000) throw new Error('Confirme o envio para um contato cadastrado no CRM.');
      if (sending || Date.now() - lastSend < 10000) throw new Error('Aguarde 10 segundos antes de enviar outra mensagem.');
      sending = true;
      try {
        const destination = await client.getNumberId(contactPhone);
        if (!destination) throw new Error('Este número não foi encontrado no WhatsApp.');
        const sent = await client.sendMessage(destination._serialized, text); await record(sent, true); lastSend = Date.now();
        send(res, 200, { ok: true, whatsappMessageId: sent.id._serialized, occurredAt: new Date(sent.timestamp * 1000).toISOString() });
      } finally { sending = false; }
      return true;
    }
    send(res, 404, { error: 'Rota WhatsApp não encontrada.' }); return true;
  } catch (failure) { send(res, 400, { error: failure.message }); return true; }
}
export async function restoreWhatsAppLocal() {
  try { if (JSON.parse(await fs.readFile(enabledFile, 'utf8')).enabled) await connect(); } catch {}
}
