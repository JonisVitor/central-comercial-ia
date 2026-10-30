import './styles.css';

const STORAGE_KEY = 'central-comercial-ia:v1';
const ASSISTANT_CHAT_STORAGE = 'central-comercial-ia:assistant-chat:v1';

const LEAD_STAGES = [
  ['novo', 'Novo lead'], ['verificar', 'Precisa verificar'], ['qualificado', 'Qualificado'],
  ['mensagem', 'Mensagem preparada'], ['aprovacao', 'Aguardando aprovação'], ['contatado', 'Contatado'],
  ['respondeu', 'Respondeu'], ['interessado', 'Interessado'], ['proposta', 'Proposta enviada'],
  ['negociacao', 'Negociação'], ['ganho', 'Venda fechada'], ['perdido', 'Encerrado sem venda'], ['nao-contatar', 'Não contatar']
];
const CLOSED_LEAD_STAGES = ['ganho', 'perdido', 'nao-contatar'];
const PROJECT_STAGES = [
  ['confirmado', 'Venda confirmada'], ['materiais', 'Aguardando materiais'], ['producao', 'Em produção'],
  ['revisao', 'Revisão do cliente'], ['ajustes', 'Ajustes adicionais'], ['hospedagem', 'Hospedagem configurada'],
  ['entregue', 'Projeto entregue'], ['ativo', 'Hospedagem ativa']
];
const COMMERCIAL_PROGRESS_STAGES = [
  ['lead-confirmado', 'Confirmar dados do lead'], ['lead-qualificado', 'Qualificar oportunidade'],
  ['mensagem-preparada', 'Preparar mensagem'], ['primeiro-contato', 'Enviar primeira mensagem'],
  ['conversa', 'Conversar e registrar resposta'], ['material-proposta', 'Enviar material ou proposta']
];
const FULL_PROJECT_PROGRESS_STAGES = [...COMMERCIAL_PROGRESS_STAGES, ...PROJECT_STAGES];
const DEMO_MARKER = 'demo';
const el = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const today = () => new Date();
const isoDate = (date) => new Date(date).toISOString();
const daysFromNow = (days, hours = 0) => isoDate(Date.now() + (days * 86400000) + (hours * 3600000));
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const removeEmojis = (value = '') => String(value).replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/[ \t]{2,}/g, ' ').trim();
const formatDate = (value) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value)).replace('.', '') : '—';
const formatLongDate = (value) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value)) : '—';
const toLocalDateTimeInput = (value) => { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const safeUrl = (value = '') => { const raw = String(value).trim(); if (!raw) return ''; try { const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
const formatAgentResult = (value = '') => esc(value)
  .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  .replace(/https:\/\/[^\s<>()]+/g, (raw) => `<a href="${raw}" target="_blank" rel="noopener noreferrer">${raw}</a>`);
const mapsSearchUrl = (lead) => safeUrl(lead.mapsUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([lead.name, lead.city].filter(Boolean).join(' '))}`;
const instagramSearchUrl = (lead) => `https://www.google.com/search?q=${encodeURIComponent(`${lead.name} ${lead.city} Instagram`)}`;
const initials = (name = '') => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();

function seedState() {
  const leadA = { id: uid('lead'), name: 'Studio Aquarela', category: 'Manicure e salão', city: 'São Carlos, SP', phone: '', website: 'Não encontrado', maps: 'Cadastro incompleto', heat: 91, stage: 'qualificado', evidence: 'Não foi encontrado site próprio; perfil do Maps sem link e com poucas informações.', source: 'Google Maps · consulta manual', notes: 'Confirmar se atende por agendamento.', nextAction: 'Preparar mensagem individual', responseDue: daysFromNow(3, 8), createdAt: daysFromNow(-2), demo: DEMO_MARKER };
  const leadB = { id: uid('lead'), name: 'Fisio Movimento', category: 'Fisioterapia', city: 'Araraquara, SP', phone: '', website: 'Não encontrado', maps: 'Cadastro regular', heat: 82, stage: 'mensagem', evidence: 'Não foi encontrado site próprio; Maps tem telefone, mas não apresenta serviços com clareza.', source: 'Google Maps · consulta manual', notes: 'Mensagem já revisada para envio.', nextAction: 'Revisar e abrir WhatsApp', responseDue: daysFromNow(1, 3), createdAt: daysFromNow(-5), demo: DEMO_MARKER };
  const leadC = { id: uid('lead'), name: 'Box 44 Estética', category: 'Estética automotiva', city: 'Maceió, AL', phone: '', website: 'Encontrado', maps: 'Cadastro forte', heat: 44, stage: 'respondeu', evidence: 'Site antigo identificado; oportunidade depende de confirmar a necessidade.', source: 'Google Maps · consulta manual', notes: 'Respondeu pedindo exemplos.', nextAction: 'Enviar proposta de referência', responseDue: daysFromNow(0, 19), createdAt: daysFromNow(-8), demo: DEMO_MARKER };
  const leadD = { id: uid('lead'), name: 'Casa do Café Central', category: 'Comércio local', city: 'São Carlos, SP', phone: '', website: 'Não encontrado', maps: 'Cadastro incompleto', heat: 76, stage: 'contatado', evidence: 'Sem site próprio e ficha do Maps sem catálogo ou link de atendimento.', source: 'Google Maps · consulta manual', notes: 'Aguardando retorno.', nextAction: 'Acompanhar resposta', responseDue: daysFromNow(-1, 12), createdAt: daysFromNow(-4), demo: DEMO_MARKER };
  return {
    leads: [leadA, leadB, leadC, leadD],
    projects: [
      { id: uid('project'), leadId: leadC.id, name: leadC.name, service: 'Landing page + hospedagem anual', stage: 'producao', startDate: daysFromNow(-3), dueDate: daysFromNow(4), notes: 'Produção iniciada após recebimento das referências.', demo: DEMO_MARKER },
      { id: uid('project'), leadId: 'external-demo', name: 'VIP Estética Automotiva', service: 'Landing page + hospedagem anual', stage: 'revisao', startDate: daysFromNow(-8), dueDate: daysFromNow(-1), notes: 'Aguardando retorno sobre conteúdo demonstrativo.', demo: DEMO_MARKER }
    ],
    messages: [
      { id: uid('message'), leadId: leadA.id, text: 'Olá, Studio Aquarela! Encontrei o perfil de vocês no Google e percebi que ainda não encontrei um site próprio para apresentar os serviços. Eu crio landing pages objetivas para negócios locais, com hospedagem por 1 ano. Posso te mostrar uma ideia sem compromisso?', sentAt: null },
      { id: uid('message'), leadId: leadB.id, text: 'Olá! Vi o perfil da Fisio Movimento no Google e preparei uma sugestão de como uma página simples poderia deixar os serviços e o contato mais claros para novos pacientes. Posso te enviar para você dar uma olhada?', sentAt: null },
      { id: uid('message'), leadId: leadC.id, text: 'Perfeito. Vou separar uma referência visual e uma proposta objetiva para você avaliar com calma.', sentAt: daysFromNow(-1) }
    ],
    settings: { demo: true, theme: 'dark' }
  };
}

let state = loadState();
let currentPage = 'overview';
let currentLeadId = state.leads[0]?.id;
let currentMessageId = state.messages[0]?.id;
let leadFilter = 'ativos';
let leadSearch = '';
let remoteHydrated = false;
let syncTimer;
let selectedAgentId = 'triagem';
let agentRuntime = { connected: false, running: false, history: [], roles: [] };
let selectedRunId = '';
let assistantOpen = false;
let assistantBusy = false;
let customerReplyBusy = false;
let assistantMessages = loadAssistantMessages();
const researchSelection = new Set();
const AGENT_ROLES = [
  ['triagem', 'Triagem de leads', 'Organiza os registros reais e aponta dados faltantes.', ['18%', '28%']],
  ['verificacao', 'Verificação', 'Confere consistência apenas com evidências salvas.', ['44%', '21%']],
  ['qualificacao', 'Qualificação', 'Sugere prioridade sem alterar o fogo ou a etapa.', ['76%', '30%']],
  ['mensagens', 'Rascunhos de mensagem', 'Prepara texto para revisão; nunca envia.', ['31%', '67%']],
  ['acompanhamento', 'Acompanhamento comercial', 'Organiza próximos passos a partir do histórico.', ['55%', '50%']],
  ['projetos', 'Gestão de projetos', 'Revisa prazos e etapas dos projetos cadastrados.', ['68%', '65%']],
  ['analise', 'Analista de funil', 'Resume o fluxo e destaca pendências com base nos registros.', ['47%', '83%']],
  ['pesquisa', 'Pesquisador web', 'Pesquisa fontes públicas com o Codex e apresenta os links para revisão.', ['86%', '49%']]
];

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.leads && saved?.projects && saved?.messages) {
      const realLeads = saved.leads.filter((lead) => lead.demo !== true && lead.demo !== DEMO_MARKER);
      const realLeadIds = new Set(realLeads.map((lead) => lead.id));
      saved.leads = realLeads;
      saved.projects = saved.projects.filter((project) => project.demo !== true && project.demo !== DEMO_MARKER);
      saved.messages = saved.messages.filter((message) => realLeadIds.has(message.leadId));
      saved.settings = { demo: false, theme: 'dark', ...(saved.settings || {}), demo: false };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      return saved;
    }
  } catch (error) { console.warn('Não foi possível ler o armazenamento local.', error); }
  return { leads: [], projects: [], messages: [], settings: { demo: false, theme: 'dark' } };
}
function loadAssistantMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(ASSISTANT_CHAT_STORAGE));
    return Array.isArray(saved) ? saved.filter((item) => ['user', 'assistant'].includes(item.role) && typeof item.text === 'string').slice(-30) : [];
  } catch { return []; }
}
function saveAssistantMessages() { localStorage.setItem(ASSISTANT_CHAT_STORAGE, JSON.stringify(assistantMessages.slice(-30))); }
function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!isLocalHost && remoteHydrated) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncRemoteState, 250);
  }
}
async function hydrateRemoteState() {
  if (isLocalHost) return;
  try {
    const response = await fetch('/api/state', { credentials: 'include' });
    if (!response.ok) throw new Error(`state_${response.status}`);
    const payload = await response.json();
    const hasRemoteState = Boolean(payload.state);
    if (hasRemoteState) {
      state = payload.state;
      state.settings = { demo: false, theme: 'dark', ...(state.settings || {}) };
      currentLeadId = state.leads[0]?.id;
      currentMessageId = state.messages[0]?.id;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      applyTheme();
      renderShell();
      renderPages();
    }
    remoteHydrated = true;
    if (!hasRemoteState) await syncRemoteState();
    toast('Dados sincronizados com o Cloudflare.');
  } catch (error) {
    console.warn('Sincronização remota indisponível.', error);
    toast('Banco online ainda não disponível; usando dados locais.');
  }
}
async function syncRemoteState() {
  if (isLocalHost || !remoteHydrated) return;
  try {
    const response = await fetch('/api/state', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    if (!response.ok) throw new Error(`sync_${response.status}`);
  } catch (error) {
    console.warn('Não foi possível sincronizar as alterações.', error);
  }
}
function applyTheme() { document.documentElement.dataset.theme = state.settings?.theme || 'dark'; }
function stageLabel(key, stages = LEAD_STAGES) { return stages.find(([id]) => id === key)?.[1] || key; }
function leadById(id) { return state.leads.find((lead) => lead.id === id); }
function projectById(id) { return state.projects.find((project) => project.id === id); }
function messageByLead(id) { return state.messages.find((message) => message.leadId === id); }
function statusTone(stage) {
  if (['ganho', 'entregue', 'ativo'].includes(stage)) return 'green';
  if (['aprovacao', 'respondeu', 'interessado', 'proposta', 'negociacao', 'revisao', 'ajustes'].includes(stage)) return 'yellow';
  if (['perdido', 'nao-contatar'].includes(stage)) return 'red';
  return 'blue';
}

function countdown(date) {
  if (!date) return { text: 'sem data definida', overdue: false, urgent: false };
  const diff = new Date(date).getTime() - Date.now();
  const overdue = diff < 0;
  const absolute = Math.abs(diff);
  const days = Math.floor(absolute / 86400000);
  const hours = Math.floor((absolute % 86400000) / 3600000);
  const minutes = Math.floor((absolute % 3600000) / 60000);
  let text;
  if (absolute < 86400000) text = `${hours}h ${minutes}m`;
  else text = `${days}d ${hours}h`;
  return { text: overdue ? `atrasado há ${text}` : `faltam ${text}`, overdue, urgent: !overdue && absolute < 86400000 };
}
function refreshLiveCountdowns() {
  all('[data-countdown-date]').forEach((node) => {
    const count = countdown(node.dataset.countdownDate);
    node.textContent = count.text;
    const tone = node.dataset.countdownTone;
    if (tone === 'status') {
      node.classList.toggle('red', count.overdue);
      node.classList.toggle('yellow', !count.overdue && count.urgent);
      node.classList.toggle('green', !count.overdue && !count.urgent);
    }
    if (tone === 'deadline') {
      node.classList.toggle('overdue', count.overdue);
      node.classList.toggle('warning', !count.overdue && count.urgent);
    }
  });
}

function renderShell() {
  document.querySelector('#app').innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#visao-geral" data-page="overview"><span class="brand-mark">⌁</span><span><span class="brand-title">Central</span><span class="brand-subtitle">Comercial IA</span></span></a>
        <div><div class="nav-label">Operação</div><nav class="nav-list" aria-label="Navegação principal">
          ${navItem('overview', '⌂', 'Visão geral')}
          ${navItem('leads', '◎', 'Prospecção')}
          ${navItem('projects', '▱', 'Projetos')}
          ${navItem('messages', '◌', 'Conversas')}
          ${navItem('agents', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.2"/><path d="M3.8 19v-1.1a5.2 5.2 0 0 1 10.4 0V19zM15.2 14.3a4.1 4.1 0 0 1 5 4V19h-3.2"/></svg>', 'Agentes')}
        </nav></div>
        <div><div class="nav-label">Base</div><nav class="nav-list" aria-label="Configurações">
          ${navItem('services', '◇', 'Serviços')}
          ${navItem('settings', '⚙', 'Configurações')}
        </nav></div>
        <div class="sidebar-footer"><div class="mini-status"><span class="status-dot"></span>${isLocalHost ? 'Dados neste dispositivo' : remoteHydrated ? 'Dados sincronizados online' : 'Conectando ao banco'}</div><p>${isLocalHost ? 'Modo local de desenvolvimento. O endereço público usa o banco online.' : remoteHydrated ? 'Cloudflare D1 ativo. As alterações ficam disponíveis no computador e no celular.' : 'Validando sua sessão e carregando os dados do Cloudflare.'}</p></div>
      </aside>
      <main class="main">
        <header class="topbar"><div class="breadcrumb">Central <span>/</span> <strong id="breadcrumb-current">Visão geral</strong></div><div class="top-actions"><button class="ghost-btn theme-toggle" data-action="toggle-theme"><span class="theme-icon">☼</span><span class="theme-label">Modo claro</span></button><button class="ghost-btn" data-action="export">↓ Exportar dados</button><button class="primary-btn" data-action="new-lead">+ Novo lead</button></div></header>
        <div id="pages"></div>
      </main>
    </div>
    <div id="assistant-root"></div><div id="modal-root"></div><div class="toast" id="toast" role="status"></div>`;
  bindShellEvents();
  renderAssistant();
}

function renderAssistant() {
  const root = el('#assistant-root');
  if (!root) return;
  const messages = assistantMessages.length ? assistantMessages.map((item) => `<div class="assistant-message ${item.role}"><span>${item.role === 'user' ? 'Você' : 'Assistente'}</span><p>${esc(item.text).replace(/\n/g, '<br>')}</p></div>`).join('') : `<div class="assistant-welcome"><h3>O que vamos fazer?</h3><p>Converse com o Codex, analise os registros importados ou peça uma pesquisa com fontes públicas.</p><button type="button" class="assistant-suggestion" data-assistant-suggestion="Analise meus leads e projetos com os agentes.">Analisar leads e projetos <span>↗</span></button><button type="button" class="assistant-suggestion" data-assistant-suggestion="Pesquise pet shops em São Carlos e traga fontes públicas para eu conferir.">Pesquisar na web com fontes <span>↗</span></button></div>`;
  root.innerHTML = `<div class="assistant-widget ${assistantOpen ? 'is-open' : ''}">
    ${assistantOpen ? `<section class="assistant-panel" aria-label="Chat com os agentes">
      <header class="assistant-header"><span class="assistant-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3.5a8.5 8.5 0 0 0-7.2 13l-.8 4 4-1A8.5 8.5 0 1 0 12 3.5Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/></svg></span><div><h2>Assistente da Central</h2><p>${agentRuntime.connected ? 'Codex local conectado' : 'Executor local desconectado'}</p></div><button class="assistant-close" type="button" data-assistant-close aria-label="Fechar conversa"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
      <div class="assistant-scope-notice"><strong>Codex local ${agentRuntime.connected ? 'conectado' : 'desconectado'}.</strong><span>Pedidos de pesquisa usam a busca web do Codex e aparecem na estação Pesquisador web. Análises e pesquisas não alteram o CRM nem enviam mensagens.</span>${agentRuntime.connected ? '' : '<span>Para conectar, inicie <code>npm run agents-runtime</code> no terminal deste computador.</span>'}</div>
      <div class="assistant-messages" role="log" aria-live="polite" aria-relevant="additions text">${messages}${assistantBusy ? '<div class="assistant-typing" role="status"><i></i><i></i><i></i><span>Preparando resposta…</span></div>' : ''}</div>
      <form class="assistant-composer" data-assistant-form><label class="sr-only" for="assistant-input">Escreva uma instrução para os agentes</label><textarea id="assistant-input" name="message" rows="1" maxlength="2000" placeholder="Escreva uma mensagem ou /clear para limpar…" ${assistantBusy ? 'disabled' : ''} required></textarea><button type="submit" aria-label="Enviar mensagem" ${assistantBusy ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M4 12 20 4l-5 16-3-7-8-1Z"/><path d="m12 13 8-9"/></svg></button></form>
      <p class="assistant-foot">Pesquisas usam seu plano Codex. Leads só entram após sua confirmação; o painel não envia mensagens.</p>
    </section>` : ''}
    <button class="assistant-fab" type="button" data-assistant-toggle aria-label="${assistantOpen ? 'Fechar assistente' : 'Abrir chat com agentes'}" aria-expanded="${assistantOpen}">${assistantOpen ? '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M12 3.5a8.5 8.5 0 0 0-7.2 13l-.8 4 4-1A8.5 8.5 0 1 0 12 3.5Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/></svg>'}</button>
  </div>`;
  root.querySelector('[data-assistant-toggle]')?.addEventListener('click', () => { assistantOpen = !assistantOpen; renderAssistant(); if (assistantOpen) el('#assistant-input')?.focus(); });
  root.querySelector('[data-assistant-close]')?.addEventListener('click', () => { assistantOpen = false; renderAssistant(); });
  root.querySelector('[data-assistant-suggestion]')?.addEventListener('click', (event) => sendAssistantMessage(event.currentTarget.dataset.assistantSuggestion));
  root.querySelector('[data-assistant-form]')?.addEventListener('submit', (event) => { event.preventDefault(); sendAssistantMessage(el('#assistant-input')?.value || ''); });
  const log = root.querySelector('.assistant-messages');
  if (log) log.scrollTop = log.scrollHeight;
}

async function sendAssistantMessage(rawText) {
  const text = String(rawText || '').trim();
  if (text.toLocaleLowerCase('pt-BR') === '/clear') {
    assistantMessages = [];
    localStorage.removeItem(ASSISTANT_CHAT_STORAGE);
    assistantBusy = false;
    toast('Conversa da IA limpa. Leads e conversas com clientes foram mantidos.');
    renderAssistant();
    el('#assistant-input')?.focus();
    return;
  }
  if (!text || assistantBusy) return;
  if (!agentRuntime.connected) { toast('Conecte o executor local do Codex para conversar com a IA.'); return; }
  assistantMessages.push({ role: 'user', text });
  assistantBusy = true;
  saveAssistantMessages();
  renderAssistant();
  const leads = state.leads.filter((lead) => lead.demo !== true && lead.demo !== 'demo');
  const projects = state.projects.filter((project) => project.demo !== true && project.demo !== 'demo');
  const messages = state.messages.filter((message) => leads.some((lead) => lead.id === message.leadId));
  try {
    const response = await fetch('/api/agent-runtime/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: assistantMessages.slice(-12), leads, projects, messages })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Não foi possível responder agora.');
    assistantMessages.push({ role: 'assistant', text: payload.reply });
    if (payload.run?.currentRun) {
      agentRuntime = payload.run;
      selectedRunId = payload.run.currentRun.id;
      selectedAgentId = payload.run.currentRun.tasks?.[0]?.id || selectedAgentId;
      currentPage = 'agents';
      renderShell();
      renderPages();
    }
  } catch (error) { assistantMessages.push({ role: 'assistant', text: error.message }); }
  assistantBusy = false;
  saveAssistantMessages();
  renderAssistant();
}

function navItem(page, icon, label) { return `<button class="nav-item ${currentPage === page ? 'active' : ''}" data-page="${page}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`; }
function pageHeader(kicker, title, lede, action = '') { return `<div class="page-heading"><div><p class="page-kicker">${kicker}</p><h1>${title}</h1><p class="lede">${lede}</p></div>${action}</div>`; }

function renderPages() {
  el('#pages').innerHTML = `
    <section class="page ${currentPage === 'overview' ? 'active' : ''}" data-page-view="overview">${renderOverview()}</section>
    <section class="page ${currentPage === 'leads' ? 'active' : ''}" data-page-view="leads">${renderLeads()}</section>
    <section class="page ${currentPage === 'projects' ? 'active' : ''}" data-page-view="projects">${renderProjects()}</section>
    <section class="page ${currentPage === 'messages' ? 'active' : ''}" data-page-view="messages">${renderMessages()}</section>
    <section class="page ${currentPage === 'agents' ? 'active' : ''}" data-page-view="agents">${renderAgents()}</section>
    <section class="page ${currentPage === 'services' ? 'active' : ''}" data-page-view="services">${renderServices()}</section>
    <section class="page ${currentPage === 'settings' ? 'active' : ''}" data-page-view="settings">${renderSettings()}</section>`;
  el('#breadcrumb-current').textContent = { overview: 'Visão geral', leads: 'Prospecção', projects: 'Projetos', messages: 'Conversas', agents: 'Agentes', services: 'Serviços', settings: 'Configurações' }[currentPage];
  bindPageEvents();
}

function renderOverview() {
  const activeLeads = state.leads.filter((lead) => !CLOSED_LEAD_STAGES.includes(lead.stage));
  const hot = activeLeads.filter((lead) => lead.heat >= 70).length;
  const waiting = activeLeads.filter((lead) => ['contatado', 'aprovacao'].includes(lead.stage)).length;
  const activeProjects = state.projects.filter((project) => !['entregue', 'ativo'].includes(project.stage)).length;
  const priorityLeads = [...activeLeads].sort((a, b) => b.heat - a.heat).slice(0, 4);
  const deadlines = [...state.projects].filter((project) => !['entregue', 'ativo'].includes(project.stage)).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 4);
  const counts = LEAD_STAGES.slice(0, 8).map(([id, label]) => ({ id, label, count: state.leads.filter((lead) => lead.stage === id).length }));
  return `${pageHeader('Painel de operação', 'O próximo contato está aqui.', 'Priorize os leads mais quentes, acompanhe respostas e não deixe um prazo passar despercebido.', '<button class="primary-btn" data-action="new-lead">+ Cadastrar lead</button>')}
    <div class="metric-grid">
      ${metricCard('Leads no radar', activeLeads.length, 'em prospecção ativa', '◎')}
      ${metricCard('Leads quentes', hot, 'calor acima de 70', '♨')}
      ${metricCard('Aguardando ação', waiting, 'resposta ou aprovação', '◷')}
      ${metricCard('Projetos ativos', activeProjects, 'com prazo em andamento', '▱')}
    </div>
    <div class="dashboard-grid">
      <section class="panel"><div class="panel-header"><div><h2>Fila de prioridade</h2><p>Leads com maior potencial observável</p></div><button class="text-btn" data-page="leads">Ver todos →</button></div><div class="lead-list">${priorityLeads.length ? priorityLeads.map(renderLeadRow).join('') : emptyState('Nenhum lead cadastrado', 'Cadastre sua primeira empresa para começar.')}</div></section>
      <section class="panel"><div class="panel-header"><div><h2>Prazos próximos</h2><p>Projetos em dias corridos</p></div><button class="text-btn" data-page="projects">Abrir projetos →</button></div><div class="deadline-list">${deadlines.length ? deadlines.map(renderDeadlineRow).join('') : emptyState('Tudo em dia', 'Nenhum projeto ativo com prazo aberto.')}</div></section>
    </div>
    <section class="panel pipeline-panel"><div class="panel-header"><div><h2>Pulso do funil</h2><p>Distribuição atual por etapa comercial</p></div></div><div class="pipeline">${counts.map((item) => `<div class="pipeline-step ${item.count ? 'hot' : ''}"><span class="pipeline-count mono">${item.count}</span><span class="pipeline-name">${item.label}</span></div>`).join('')}</div></section>`;
}
function metricCard(label, value, note, symbol) { return `<div class="metric-card"><div class="metric-label"><span>${label}</span><span class="metric-symbol">${symbol}</span></div><strong class="metric-value mono">${value}</strong><span class="metric-note">${note}</span></div>`; }
function renderLeadRow(lead) { return `<button class="lead-row" data-lead-id="${lead.id}"><span class="lead-avatar">${initials(lead.name)}</span><span class="row-main"><span class="row-title">${esc(lead.name)}</span><span class="row-meta">${esc(lead.category)} · ${esc(lead.city)}</span></span><span class="heat-mini"><span>♨</span><span class="heat-track"><span class="heat-fill" style="width:${lead.heat}%"></span></span><span>${lead.heat}</span></span></button>`; }
function renderDeadlineRow(project) { const count = countdown(project.dueDate); return `<button class="deadline-row" data-project-id="${project.id}"><span class="lead-avatar">◷</span><span class="row-main"><span class="row-title">${esc(project.name)}</span><span class="row-meta">${stageLabel(project.stage, PROJECT_STAGES)}</span></span><span class="deadline-time"><span class="deadline-count ${count.overdue ? 'overdue' : count.urgent ? 'warning' : ''}" data-countdown-date="${esc(project.dueDate || '')}" data-countdown-tone="deadline">${count.text}</span><span class="deadline-kind">até ${formatDate(project.dueDate)}</span></span></button>`; }
function emptyState(title, body) { return `<div class="empty-state"><strong>${title}</strong>${body}</div>`; }

function renderLeads() {
  const filtered = state.leads.filter((lead) => {
    const matchesSearch = `${lead.name} ${lead.category} ${lead.city}`.toLowerCase().includes(leadSearch.toLowerCase());
    const matchesFilter = leadFilter === 'ativos' ? !CLOSED_LEAD_STAGES.includes(lead.stage)
      : leadFilter === 'encerrados' ? CLOSED_LEAD_STAGES.includes(lead.stage)
        : leadFilter === 'todos' ? true
          : leadFilter === 'quentes' ? Number(lead.heat) >= 70
            : lead.stage === leadFilter;
    return matchesSearch && matchesFilter;
  });
  const filters = [['ativos', 'Ativos'], ['todos', 'Todos'], ['quentes', '♨ Quentes'], ['novo', 'Novos'], ['contatado', 'Aguardando resposta'], ['respondeu', 'Respondeu'], ['encerrados', 'Encerrados']];
  return `${pageHeader('Prospecção manual assistida', 'Leads com uma razão para conversar.', 'Cadastre empresas encontradas no Google Maps e deixe a evidência visível antes de priorizar o próximo contato.', '<button class="primary-btn" data-action="new-lead">+ Novo lead</button>')}
    <div class="toolbar"><input class="search-input" id="lead-search" type="search" placeholder="Buscar empresa, nicho ou cidade" value="${esc(leadSearch)}" />${filters.map(([id, label]) => `<button class="filter-btn ${leadFilter === id ? 'active' : ''}" data-lead-filter="${id}">${label}</button>`).join('')}<span class="filter-spacer"></span><input id="lead-json-file" type="file" accept=".json,application/json" hidden /><button class="ghost-btn" data-action="import-leads-json">↑ Importar JSON</button><button class="ghost-btn" data-action="maps-task">⊕ Nova pesquisa Maps</button></div><p class="import-hint">Os dois importadores atualizam o mesmo CRM local. Recusas vão para Encerrados sem apagar o histórico; interesse claro atualiza a etapa ao analisar a resposta do cliente.</p>
    <div class="lead-grid">${filtered.length ? filtered.map(renderLeadCard).join('') : emptyState('Nenhum lead encontrado', 'Ajuste a busca ou cadastre uma nova empresa.')}</div>`;
}
function renderLeadCard(lead) {
  const message = messageByLead(lead.id); const count = lead.responseDue ? countdown(lead.responseDue) : null;
  const websiteTag = lead.website === 'Não encontrado' ? ['red', 'Site não encontrado'] : lead.website === 'Não verificado' ? ['yellow', 'Site a verificar'] : ['green', 'Site identificado'];
  const mapsLabel = lead.maps === 'Não verificado' ? 'a verificar' : lead.maps === 'Não encontrado' ? 'não encontrado' : lead.maps.replace('Cadastro ', '');
  const mapsTone = lead.maps === 'Não encontrado' ? 'red' : lead.maps === 'Não verificado' ? 'blue' : lead.maps === 'Cadastro incompleto' ? 'yellow' : 'green';
  return `<article class="lead-card"><div class="card-top"><div><div class="card-name">${esc(lead.name)}</div><div class="card-location">${esc(lead.category)} · ${esc(lead.city)}</div></div><span class="heat-badge">♨ ${lead.heat}/100</span></div><div class="card-tags"><span class="tag ${websiteTag[0]}">${websiteTag[1]}</span><span class="tag ${mapsTone}">Maps: ${esc(mapsLabel)}</span><span class="status-badge ${statusTone(lead.stage)}">${stageLabel(lead.stage)}</span></div><p class="card-evidence">${esc(lead.evidence)}</p><div class="card-footer"><select class="status-select" data-lead-stage="${lead.id}" aria-label="Etapa de ${esc(lead.name)}">${LEAD_STAGES.map(([id, label]) => `<option value="${id}" ${id === lead.stage ? 'selected' : ''}>${label}</option>`).join('')}</select>${count ? `<span class="lead-response-deadline"><small>Prazo para resposta</small><strong data-countdown-date="${esc(lead.responseDue || '')}" data-countdown-tone="plain">${count.text}</strong></span>` : '<span class="lead-response-deadline empty">Sem prazo de resposta</span>'}<a class="maps-link" href="${esc(mapsSearchUrl(lead))}" target="_blank" rel="noopener noreferrer" aria-label="Pesquisar ${esc(lead.name)} no Google Maps">Ver no Maps ↗</a><button class="detail-link" data-lead-id="${lead.id}">Abrir →</button></div>${message ? `<div class="row-meta" style="margin-top:12px">${message.sentAt ? 'Contato confirmado manualmente' : 'Mensagem pronta para revisão'}</div>` : ''}</article>`;
}

function renderProjects() {
  return `${pageHeader('Entrega e acompanhamento', 'Cada projeto tem um próximo passo.', 'Mova a etapa com um clique e veja quanto tempo falta em dias corridos — ou em horas quando o prazo apertar.', '<button class="primary-btn" data-action="new-project">+ Novo projeto</button>')}
    <div class="notice">Os prazos são contados em dias corridos. O relógio atualiza automaticamente e sinaliza quando entra nas últimas 24 horas.</div>
    <div class="project-grid">${state.projects.length ? state.projects.map(renderProjectCard).join('') : emptyState('Nenhum projeto criado', 'Quando a venda for fechada, crie um projeto para acompanhar a entrega.')}</div>`;
}

function renderAgents() {
  const activeRun = agentRuntime.currentRun;
  const run = activeRun || agentRuntime.history?.find((item) => item.id === selectedRunId) || agentRuntime.history?.[0];
  if (activeRun) selectedRunId = activeRun.id;
  const history = agentRuntime.history || [];
  const selectedRun = activeRun || history.find((item) => item.id === selectedRunId) || run;
  const selected = AGENT_ROLES.find(([id]) => id === selectedAgentId) || AGENT_ROLES[0];
  const tasks = run?.tasks || [];
  const counts = { working: tasks.filter((task) => task.state === 'working').length, approval: tasks.filter((task) => task.state === 'complete').length, error: tasks.filter((task) => task.state === 'error').length };
  const realLeadCount = state.leads.filter((lead) => lead.demo !== true && lead.demo !== 'demo').length;
  const realProjectCount = state.projects.filter((project) => project.demo !== true && project.demo !== 'demo').length;
  const taskForSelected = tasks.find((task) => task.id === selectedAgentId);
  const statusLabel = taskForSelected?.state === 'working' ? 'Executando' : taskForSelected?.state === 'complete' ? 'Concluído' : taskForSelected?.state === 'error' ? 'Erro' : taskForSelected?.state === 'queued' ? 'Na fila' : 'Aguardando execução';
  const statusClass = taskForSelected?.state === 'working' ? 'working' : taskForSelected?.state === 'complete' ? 'approval' : taskForSelected?.state === 'error' ? 'error' : 'idle';
  const completedCount = selectedRun?.tasks?.filter((task) => task.state === 'complete').length || 0;
  const errorCount = selectedRun?.tasks?.filter((task) => task.state === 'error').length || 0;
  const detailState = taskForSelected?.state === 'working' ? 'Trabalhando agora' : taskForSelected?.state === 'complete' ? 'Concluído' : taskForSelected?.state === 'error' ? 'Precisa de atenção' : taskForSelected?.state === 'queued' ? 'Aguardando sua vez' : 'Ainda sem execução';
  const runStateLabel = selectedRun?.state === 'complete' ? 'Execução concluída' : selectedRun?.state === 'partial' ? 'Execução com erros' : selectedRun?.state === 'running' ? 'Execução em andamento' : 'Nenhuma execução';
  const runSourceLabel = selectedRun?.source || 'Painel local';
  return `<div class="agents-page">
    <header class="agents-page-header">
      <div><h1>Equipe de agentes</h1><p class="lede">Execute os sete agentes internos nos seus leads e projetos. A pesquisa no Maps começa pelo chat e, ao terminar, aciona esses mesmos sete agentes.</p></div>
      <div class="agents-page-actions"><span class="simulation-badge ${agentRuntime.connected ? 'runtime-online' : ''}"><span class="simulation-dot"></span>${agentRuntime.connected ? 'Codex local conectado' : 'Executor local desconectado'}</span><button class="ghost-btn" type="button" data-agent-import>Importar JSON</button><input id="agent-data-file" type="file" accept=".json,application/json" hidden /><button class="primary-btn" type="button" data-agent-run ${!agentRuntime.connected || agentRuntime.running || (!realLeadCount && !realProjectCount) ? 'disabled' : ''}>${agentRuntime.running ? '⟳ Agentes trabalhando…' : '▶ Executar agentes'}</button></div>
    </header>
      <p class="agent-demo-notice" role="note"><strong>Dois modos de execução.</strong> Este botão roda os sete agentes internos e não faz pesquisa no Maps. Para buscar empresas, peça no chat algo como “15 lanchonetes em São Carlos”; o Pesquisador web roda primeiro e depois os sete agentes. Leads aprovados entram no painel aguardando sua revisão. Mensagens e LPs continuam sob seu controle. Cada execução consome o limite do plano Codex. Importar JSON aqui atualiza o mesmo CRM usado em Prospecção.</p>
    <div class="agent-status-strip" aria-label="Estados atuais dos agentes">
      <span class="agent-status-count"><i class="agent-state-dot working"></i><strong>${counts.working}</strong> trabalhando</span>
      <span class="agent-status-count"><i class="agent-state-dot approval"></i><strong>${counts.approval}</strong> concluídos</span>
      <span class="agent-status-count"><i class="agent-state-dot error"></i><strong>${counts.error}</strong> com erro</span>
      <span class="agent-status-count agent-total-count"><strong>${realLeadCount}</strong> leads disponíveis agora · <strong>${selectedRun?.leadCount ?? 0}</strong> analisados nesta execução · <strong>${realProjectCount}</strong> projetos disponíveis</span>
    </div>
    <div class="agents-workspace">
      <section class="agent-office-panel" aria-label="Estações dos agentes">
        <div class="agent-office-heading"><div><h2>Estações de trabalho</h2><p>Selecione uma função para ver o resultado.</p></div><span class="office-presence ${agentRuntime.connected ? '' : 'paused'}"><i></i> ${agentRuntime.connected ? 'Executor pronto' : 'Inicie o executor no computador'}</span></div>
        <div class="agent-office-stage">
          <img class="agent-office-art" src="/agent-office.png" alt="Ilustração do escritório com estações das funções de agentes" />
          ${AGENT_ROLES.map(([id, name, role, position]) => { const task = tasks.find((item) => item.id === id); const pinState = task?.state === 'working' ? 'working' : task?.state === 'error' ? 'error' : task?.state === 'complete' ? 'approval' : ''; return `<button class="office-agent-pin ${pinState} ${selectedAgentId === id ? 'selected' : ''}" type="button" data-agent-id="${id}" style="--pin-x:${position[0]};--pin-y:${position[1]}" aria-label="${name}. ${role}" aria-pressed="${selectedAgentId === id}"><i class="agent-state-dot ${pinState || 'idle'}"></i><span>${name}</span></button>`; }).join('')}
          <span class="office-scene-tag"><span class="scene-tag-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zM4.5 7.8 12 12l7.5-4.2M12 12v8.5"/></svg></span>Central Comercial IA</span>
        </div>
        <div class="agent-office-caption"><span>Sete funções independentes · Codex CLI</span><span>O escritório é uma visualização; o trabalho é executado no computador.</span></div>
      </section>
      <aside class="agent-inspector" aria-live="polite" aria-label="Detalhes do agente selecionado">
        <div class="agent-inspector-top"><div><span class="inspector-eyebrow">Função selecionada</span><h2>${esc(selected[1])}</h2><p>${esc(selected[2])}</p></div><span class="agent-state-label ${statusClass}"><i class="agent-state-dot ${statusClass}"></i>${statusLabel}</span></div>
        <div class="agent-task-block"><span class="inspector-label">Atividade</span><h3>${taskForSelected?.state === 'working' ? 'Esta função está analisando os dados permitidos.' : taskForSelected?.state === 'queued' ? 'Esta função começa quando as anteriores terminarem.' : taskForSelected?.state === 'complete' ? 'A análise terminou. O resultado legível está abaixo, nos detalhes da execução.' : taskForSelected?.state === 'error' ? 'A execução encontrou um erro. Veja a mensagem nos detalhes abaixo.' : agentRuntime.connected ? 'Peça uma análise no botão acima ou converse pelo assistente no canto da tela.' : 'Inicie o executor local para habilitar as análises.'}</h3></div>
        <dl class="agent-detail-list"><div><dt>Dados desta execução</dt><dd>${selectedAgentId === 'projetos' ? `${selectedRun?.projectCount ?? realProjectCount} projetos analisados` : selectedAgentId === 'analise' ? `${selectedRun?.leadCount ?? realLeadCount} leads e ${selectedRun?.projectCount ?? realProjectCount} projetos analisados` : `${selectedRun?.leadCount ?? realLeadCount} leads analisados`}</dd></div><div><dt>Disponíveis agora</dt><dd>${realLeadCount} leads · ${realProjectCount} projetos · CRM deste navegador</dd></div><div><dt>Limites</dt><dd>Esta execução lê os dados informados e salva o resultado no histórico local. Confira a origem antes de iniciar outra análise.</dd></div></dl>
        <div class="agent-inspector-foot"><span class="agent-inspector-avatar" aria-hidden="true">AI</span><span><strong>Codex CLI · seu plano autenticado</strong><small>Uma execução por função, iniciada manualmente</small></span></div>
      </aside>
    </div>
    <section class="agent-activity-panel" aria-label="Resultados das execuções">
      <div class="agent-activity-heading"><div><h2>Execuções e resultados</h2><p>${agentRuntime.running ? 'Os agentes estão trabalhando em sequência; esta tela atualiza automaticamente.' : 'Resumo da última execução e detalhes separados por função.'}</p></div><span class="mono">${selectedRun?.startedAt ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(selectedRun.startedAt)) : 'Sem execução'}</span></div>
      ${selectedRun ? `<div class="agent-run-summary"><div class="agent-run-summary-top"><div><span class="summary-title">Resumo da execução</span><strong class="summary-state">${runStateLabel}</strong></div><span class="summary-completion ${errorCount ? 'has-errors' : ''}">${completedCount}/${selectedRun.tasks.length} funções concluídas</span></div><div class="agent-summary-metrics"><span><strong>${selectedRun.leadCount ?? 0}</strong> leads analisados</span><span><strong>${selectedRun.projectCount ?? 0}</strong> projetos analisados</span><span><strong>${errorCount}</strong> com erro</span><span>Origem: <strong>${esc(runSourceLabel)}</strong></span></div></div><div class="agent-details-heading"><div><h3>Detalhes por agente</h3><p>Escolha uma função para ler a análise completa.</p></div></div><div class="agent-results-list">${selectedRun.tasks.map((task) => `<button class="agent-result-row ${selectedAgentId === task.id ? 'selected' : ''}" data-agent-id="${task.id}" type="button" aria-pressed="${selectedAgentId === task.id}"><strong>${esc(task.name)}</strong><span>${task.state === 'working' ? 'Trabalhando…' : task.state === 'complete' ? 'Concluído' : task.state === 'error' ? 'Erro' : task.state === 'queued' ? 'Na fila' : 'Pendente'}</span></button>`).join('')}</div><article class="agent-selected-detail" aria-live="polite"><div class="agent-selected-detail-heading"><div><h4>${esc(selected[1])}</h4><span>${detailState}</span></div>${taskForSelected?.state === 'working' ? '<i class="agent-state-dot working" aria-label="Em execução"></i>' : ''}</div>${taskForSelected?.result ? `<pre class="agent-result">${formatAgentResult(taskForSelected.result)}</pre>` : taskForSelected?.error ? `<pre class="agent-result agent-result-error">${esc(taskForSelected.error)}</pre>` : `<p class="agent-detail-empty">${taskForSelected?.state === 'queued' ? 'Este agente inicia depois que os anteriores concluírem.' : taskForSelected?.state === 'working' ? 'O resultado será exibido aqui quando a análise terminar.' : 'Ainda não há resultado para esta função.'}</p>`}</article>` : `<div class="agent-run-status">${agentRuntime.connected ? 'Executor conectado. Nenhuma execução iniciada.' : 'Executor local desconectado. Inicie-o no Windows para habilitar o botão.'}</div>`}
      ${selectedRun?.candidates?.length && selectedRun.kind !== 'prospecting' ? renderResearchCandidates(selectedRun) : ''}
      <p class="agent-local-note">Este executor roda só neste PC. O site público e o celular continuam sem acesso a ele até configurarmos uma ponte autenticada.</p>
    </section>
  </div>`;
}
function renderResearchCandidates(run) {
  const rows = run.candidates.map((candidate, index) => {
    const mapsUrl = safeUrl(candidate.mapsUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([candidate.name, candidate.city].join(' '))}`;
    const sourceUrl = safeUrl(candidate.sourceUrl);
    return `<article class="research-candidate"><span class="research-candidate-main"><strong>${esc(candidate.name)}</strong><small>${esc(candidate.category)} · ${esc(candidate.city)}</small><span>${esc(candidate.evidence)}</span><span class="research-candidate-status">Adicionado automaticamente em “Precisa verificar” · Fogo 50/100</span></span><span class="research-candidate-links"><a href="${esc(mapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir Maps ↗</a>${sourceUrl ? `<a href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">Ver fonte ↗</a>` : ''}${candidate.websiteUrl ? `<a href="${esc(safeUrl(candidate.websiteUrl) || '#')}" target="_blank" rel="noopener noreferrer">Site ↗</a>` : ''}</span></article>`;
  }).join('');
  return `<section class="research-import-panel"><div><h3>Empresas adicionadas aos leads</h3><p>Os resultados desta pesquisa foram enviados automaticamente para Prospecção. Duplicados são ignorados; nada foi contatado e nenhuma mensagem foi enviada.</p></div><div class="research-candidate-list">${rows}</div></section>`;
}
function renderProjectCard(project) {
  const projectIndex = Math.max(0, PROJECT_STAGES.findIndex(([id]) => id === project.stage));
  const progressIndex = COMMERCIAL_PROGRESS_STAGES.length + projectIndex;
  const count = countdown(project.dueDate);
  const lead = leadById(project.leadId);
  const commercialSteps = `${COMMERCIAL_PROGRESS_STAGES.map(([id, label]) => `<div class="stage-item done"><span class="stage-marker">✓</span><span class="stage-label">${label}</span></div>`).join('')}<div class="stage-item ${projectIndex === 0 ? 'current' : 'done'}"><span class="stage-marker">${projectIndex === 0 ? '●' : '✓'}</span><span class="stage-label">Venda confirmada</span></div>`;
  const projectSteps = PROJECT_STAGES.slice(1).map(([id, label], index) => {
    const fullIndex = COMMERCIAL_PROGRESS_STAGES.length + 1 + index;
    const stageIndex = index + 1;
    const state = stageIndex < projectIndex ? 'done' : stageIndex === projectIndex ? 'current' : '';
    const marker = stageIndex < projectIndex ? '✓' : stageIndex === projectIndex ? '●' : fullIndex + 1;
    return `<div class="stage-item ${state}"><span class="stage-marker">${marker}</span><span class="stage-label">${label}</span></div>`;
  }).join('');
  const completion = Math.round(((progressIndex + 1) / FULL_PROJECT_PROGRESS_STAGES.length) * 100);
  return `<article class="project-card"><div class="card-top"><div><div class="card-name">${esc(project.name)}</div><div class="card-location">${esc(project.service)}</div></div><span class="status-badge ${count.overdue ? 'red' : count.urgent ? 'yellow' : 'green'}" data-countdown-date="${esc(project.dueDate || '')}" data-countdown-tone="status">${count.text}</span></div><div class="stage-heading"><span>Jornada do lead até a hospedagem</span><strong>Etapa ${progressIndex + 1} de ${FULL_PROJECT_PROGRESS_STAGES.length}</strong></div><div class="stage-group-label">Prospecção e venda</div><div class="stage-map commercial-stage-map" aria-label="Etapas comerciais">${commercialSteps}</div><div class="stage-group-label project-stage-group-label">Landing page e hospedagem</div><div class="stage-map" aria-label="Etapas da landing page e hospedagem">${projectSteps}</div><div class="project-progress" aria-label="${completion}% do fluxo concluído"><span style="width:${Math.max(8, completion)}%"></span></div><div class="project-dates"><span>Início: ${formatDate(project.startDate)}</span><span>Limite: ${formatDate(project.dueDate)}</span></div><div class="card-footer"><span class="muted">${lead ? esc(lead.name) : 'Projeto cadastrado'}</span><button class="detail-link" data-project-id="${project.id}">Editar etapas →</button></div></article>`;
}

function renderMessages() {
  const current = messageByLead(currentLeadId) || state.messages[0];
  if (current) currentMessageId = current.id;
  const lead = current ? leadById(current.leadId) : null;
  const conversation = current?.conversation || [];
  const latestSuggestion = [...conversation].reverse().find((item) => item.role === 'sugestao' && item.status !== 'enviada');
  const conversationLog = conversation.length ? `<div class="reply-history" aria-label="Histórico da conversa">${conversation.map((item) => { const suggestion = item.role === 'sugestao' && item.status !== 'enviada'; const text = suggestion ? removeEmojis(item.text) : item.text; return `<article class="reply-bubble ${item.role === 'cliente' ? 'client' : item.role === 'operador' || item.status === 'enviada' ? 'operator' : 'suggestion'}" ${suggestion ? 'role="note" aria-label="Resposta da IA, ainda não enviada"' : ''}><strong>${item.role === 'cliente' ? 'Cliente' : item.role === 'operador' || item.status === 'enviada' ? 'Você · enviada' : 'Resposta da IA · não enviada'}</strong><p>${esc(text).replace(/\n/g, '<br>')}</p></article>`; }).join('')}</div>` : '<p class="muted reply-empty">As respostas do cliente e os rascunhos sugeridos aparecerão aqui.</p>';
  const suggestedReply = latestSuggestion ? `<label class="field reply-suggestion-field"><span>Resposta sugerida — revise antes de copiar</span><textarea class="field-textarea" id="customer-reply-suggestion">${esc(removeEmojis(latestSuggestion.text))}</textarea></label><div class="message-actions"><button type="button" class="primary-btn" data-action="copy-customer-reply" data-message-id="${current.id}">Copiar resposta</button><button type="button" class="ghost-btn" data-action="mark-reply-sent" data-message-id="${current.id}">Marcar como enviada</button></div>` : '';
  const replyComposer = `<section class="reply-coach"><div class="reply-coach-heading"><div><h3>O cliente respondeu?</h3><p>Cole aqui a mensagem. A IA considera o histórico e prepara uma resposta para você revisar.</p></div><span class="status-badge ${agentRuntime.connected ? 'green' : 'yellow'}">${agentRuntime.connected ? 'Codex local conectado' : 'Codex local desconectado'}</span></div>${conversationLog}<form id="customer-reply-form"><label class="field" for="customer-reply-input"><span>Resposta recebida</span><textarea class="field-textarea" id="customer-reply-input" name="customerReply" maxlength="5000" placeholder="Cole aqui o que o cliente escreveu…" required></textarea></label><button class="primary-btn" type="submit" ${customerReplyBusy || !agentRuntime.connected ? 'disabled' : ''}>${customerReplyBusy ? 'Analisando conversa…' : 'Analisar e sugerir resposta'}</button></form>${suggestedReply}<p class="modal-note">A IA só prepara o texto. Copie, envie pelo WhatsApp e depois marque como enviada para manter o histórico certo.</p></section>`;
  return `${pageHeader('Conversas sob controle', 'Mensagem pronta não é mensagem enviada.', 'Revise, personalize e só registre o contato depois que você confirmar o envio manual no WhatsApp.', '<button class="primary-btn" data-action="new-lead">+ Preparar contato</button>')}
    <div class="messages-layout"><div class="message-list"><div class="message-list-head">${state.messages.length} conversas registradas</div>${state.messages.map((message) => { const itemLead = leadById(message.leadId); const status = messageListStatus(message, itemLead); return `<button class="message-item ${status.className} ${message.id === currentMessageId ? 'active' : ''}" data-message-id="${message.id}"><strong>${esc(itemLead?.name || 'Empresa')}</strong><span class="message-item-status ${status.className}" title="${esc(status.label)}">${status.label}</span></button>`; }).join('')}</div><div class="message-editor">${current && lead ? `<div class="panel-header"><div><p class="page-kicker">${messageStateLabel(current)}</p><h2>${esc(lead.name)}</h2><p>${esc(lead.category)} · ${esc(lead.city)}</p></div><span class="heat-badge">♨ ${lead.heat}/100</span></div><div class="message-meta"><span class="tag">Site: ${esc(lead.website)}</span><span class="tag">Maps: ${esc(lead.maps)}</span></div><label class="field"><span>Mensagem inicial — revise antes de abrir o WhatsApp</span><textarea class="field-textarea" id="message-text">${esc(current.text)}</textarea></label><div class="message-actions"><button class="primary-btn" data-action="save-message" data-message-id="${current.id}">Salvar rascunho</button><button class="ghost-btn" data-action="open-whatsapp" data-message-id="${current.id}">↗ Abrir WhatsApp</button><button class="ghost-btn" data-action="confirm-sent" data-message-id="${current.id}">${current.sentAt ? '✓ Enviado manualmente' : 'Confirmar envio manual'}</button></div><p class="modal-note" style="margin-top:18px">A Central não envia mensagens automaticamente. O envio continua sendo feito por você no WhatsApp.</p>${replyComposer}` : emptyState('Nenhuma mensagem preparada', 'Cadastre um lead e prepare o primeiro contato.')}</div></div>`;
}
function messageListStatus(message, lead) {
  const last = message.conversation?.at(-1);
  const stage = lead?.stage;
  if (stage === 'ganho') return { label: 'Venda fechada', className: 'is-won' };
  if (stage === 'perdido') return { label: 'Conversa encerrada', className: 'is-closed' };
  if (stage === 'nao-contatar') return { label: 'Não contatar', className: 'is-do-not-contact' };
  if (stage === 'interessado') return { label: 'Lead interessado', className: 'is-interested' };
  if (last?.role === 'cliente') return { label: 'Cliente respondeu · analisar', className: 'has-client-reply' };
  if (last?.role === 'sugestao' && last.status !== 'enviada') return { label: 'IA sugeriu resposta · revisar', className: 'has-ai-reply' };
  if (last?.role === 'operador' || last?.status === 'enviada') return { label: 'Você respondeu · aguardar retorno', className: 'is-follow-up-sent' };
  if (message.sentAt) return { label: 'Mensagem enviada · aguardar retorno', className: 'is-sent' };
  return { label: 'Rascunho · revisar antes de enviar', className: 'is-draft' };
}
function messageStateLabel(message) { return message.sentAt ? 'Contato confirmado' : 'Rascunho de mensagem'; }

function renderServices() { return `${pageHeader('Catálogo comercial', 'Uma oferta clara vende melhor.', 'A proposta inicial está registrada com o que entra, o que fica fora e o que pode virar uma cobrança posterior.')}
  <article class="service-card"><span class="status-badge green">Oferta ativa para teste</span><h2 style="margin-top:18px">Landing page para negócio local</h2><p class="lede">Uma presença digital objetiva para explicar o negócio e facilitar o contato.</p><div class="offer-price">R$ 297 <small>pagamento único</small></div><ul class="offer-list"><li>Criação de uma landing page responsiva</li><li>Hospedagem incluída por 1 ano</li><li>Layout para celular e computador</li><li>Botão de contato e apresentação do negócio</li></ul><div class="offer-extra"><strong style="color:var(--text-2)">Fora do escopo inicial</strong><br />Trocas, alterações de escopo e tempo adicional entram em uma nova cobrança posterior. Domínio, quantidade de revisões, textos, imagens e prazo padrão ainda precisam ser definidos.</div></article>`; }
  function renderSettings() { const online = !isLocalHost && remoteHydrated; return `${pageHeader(online ? 'Dados sincronizados' : 'Controle local', online ? 'Seu painel acompanha você.' : 'Seus dados ficam neste dispositivo.', online ? 'Cloudflare D1 está conectado. O mesmo estado pode ser aberto no computador e no celular após o login.' : 'O endereço local salva tudo no navegador. O endereço público sincroniza os registros com o banco online.')}
  <div class="settings-grid"><article class="settings-card"><h2>${online ? 'Armazenamento online' : 'Armazenamento local'}</h2><p>${online ? 'Leads, projetos e mensagens são carregados do Cloudflare D1 e atualizados após cada alteração.' : 'Os dados atuais estão salvos neste dispositivo e neste navegador. Eles serão sincronizados quando você usar o endereço público com login.'}</p><div class="settings-actions"><button class="primary-btn" data-action="export">↓ Exportar JSON</button><button class="ghost-btn" data-action="reset">Restaurar demonstração</button></div></article><article class="settings-card"><h2>Integrações</h2><p>Google Maps e WhatsApp estão em modo assistido. A Central registra o que você encontrou e abre o WhatsApp com texto preparado, mas não faz scraping nem envia automaticamente.</p><div class="settings-actions"><span class="status-badge yellow">Pesquisa manual</span><span class="status-badge yellow">Envio manual</span></div></article><article class="settings-card"><h2>Dados de demonstração</h2><p>${state.settings?.demo ? 'Os primeiros registros foram criados como exemplo e podem ser editados ou apagados pelo uso normal.' : 'Você está usando seus próprios registros.'}</p><div class="settings-actions"><span class="tag">${state.leads.length} leads</span><span class="tag">${state.projects.length} projetos</span><span class="tag">${state.messages.length} mensagens</span></div></article></div>`; }

function bindShellEvents() { all('[data-page]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.page))); all('[data-action="new-lead"]').forEach((button) => button.addEventListener('click', openLeadModal)); all('[data-action="export"]').forEach((button) => button.addEventListener('click', exportData)); all('[data-action="toggle-theme"]').forEach((button) => button.addEventListener('click', toggleTheme)); }
function bindPageEvents() {
  all('[data-page]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.page)));
  all('[data-action="new-lead"]').forEach((button) => button.addEventListener('click', openLeadModal));
  all('[data-action="new-project"]').forEach((button) => button.addEventListener('click', openProjectModal));
  all('[data-action="import-leads-json"]').forEach((button) => button.addEventListener('click', () => el('#lead-json-file')?.click()));
  el('#lead-json-file')?.addEventListener('change', importLeadsJsonFile);
  all('[data-action="maps-task"]').forEach((button) => button.addEventListener('click', () => { assistantOpen = true; renderAssistant(); const input = el('#assistant-input'); if (input) { input.value = 'Pesquise empresas no Google Maps: [nicho] em [cidade, estado]. Traga candidatos com links e evidências para eu revisar.'; input.focus(); input.setSelectionRange(input.value.indexOf('['), input.value.lastIndexOf(']') + 1); } }));
  all('[data-lead-id]').forEach((button) => button.addEventListener('click', (event) => { if (event.target.closest('select')) return; openLeadDetail(button.dataset.leadId); }));
  all('[data-project-id]').forEach((button) => button.addEventListener('click', () => openProjectDetail(button.dataset.projectId)));
  all('[data-lead-filter]').forEach((button) => button.addEventListener('click', () => { leadFilter = button.dataset.leadFilter; renderPages(); }));
  el('#lead-search')?.addEventListener('input', (event) => { leadSearch = event.target.value; renderPages(); const input = el('#lead-search'); input?.focus(); input?.setSelectionRange(leadSearch.length, leadSearch.length); });
  all('[data-lead-stage]').forEach((select) => select.addEventListener('change', () => updateLeadStage(select.dataset.leadStage, select.value)));
  all('.message-item[data-message-id]').forEach((button) => button.addEventListener('click', () => { currentMessageId = button.dataset.messageId; const message = state.messages.find((item) => item.id === currentMessageId); currentLeadId = message?.leadId; renderPages(); }));
  all('[data-action="save-message"]').forEach((button) => button.addEventListener('click', () => saveMessage(button.dataset.messageId)));
  all('[data-action="open-whatsapp"]').forEach((button) => button.addEventListener('click', () => openWhatsApp(button.dataset.messageId)));
  all('[data-action="confirm-sent"]').forEach((button) => button.addEventListener('click', () => confirmSent(button.dataset.messageId)));
  el('#customer-reply-form')?.addEventListener('submit', handleCustomerReplySubmit);
  all('[data-action="copy-customer-reply"]').forEach((button) => button.addEventListener('click', () => copyCustomerReply(button.dataset.messageId)));
  all('[data-action="mark-reply-sent"]').forEach((button) => button.addEventListener('click', () => markCustomerReplySent(button.dataset.messageId)));
  all('[data-action="export"]').forEach((button) => button.addEventListener('click', exportData));
  all('[data-action="reset"]').forEach((button) => button.addEventListener('click', resetData));
  all('[data-agent-id]').forEach((button) => button.addEventListener('click', () => { selectedAgentId = button.dataset.agentId; renderPages(); }));
  all('[data-research-candidate]').forEach((checkbox) => checkbox.addEventListener('change', () => {
    const key = `${checkbox.dataset.researchRun}:${checkbox.dataset.researchCandidate}`;
    if (checkbox.checked) researchSelection.add(key); else researchSelection.delete(key);
    const importButton = all('[data-import-research-candidates]').find((button) => button.dataset.importResearchCandidates === checkbox.dataset.researchRun);
    const count = all('[data-research-candidate]:checked').filter((item) => item.dataset.researchRun === checkbox.dataset.researchRun).length;
    if (importButton) { importButton.disabled = count === 0; importButton.textContent = count ? `Importar selecionadas (${count})` : 'Importar selecionadas'; }
  }));
  all('[data-import-research-candidates]').forEach((button) => button.addEventListener('click', () => importResearchCandidates(button.dataset.importResearchCandidates)));
  el('[data-agent-run]')?.addEventListener('click', runAgents);
  el('[data-agent-import]')?.addEventListener('click', () => el('#agent-data-file')?.click());
  el('#agent-data-file')?.addEventListener('change', importAgentDataset);
}
async function refreshAgentRuntime(shouldRender = true) {
  const wasConnected = agentRuntime.connected;
  try {
    const response = await fetch('/api/agent-runtime/health', { cache: 'no-store' });
    if (!response.ok) throw new Error('Executor local indisponível.');
    agentRuntime = await response.json();
    autoImportProspectingRuns();
    if (assistantOpen && wasConnected !== agentRuntime.connected) renderAssistant();
    if (shouldRender && currentPage === 'agents') renderPages();
  } catch {
    agentRuntime = { ...agentRuntime, connected: false };
    if (assistantOpen && wasConnected) renderAssistant();
    if (shouldRender && currentPage === 'agents') renderPages();
  }
}

function autoImportProspectingRuns() {
  if (!isLocalHost) return;
  const processed = new Set(JSON.parse(localStorage.getItem('central-prospecting-imported-v1') || '[]'));
  const reviewProcessed = new Set(JSON.parse(localStorage.getItem('central-prospecting-review-imported-v1') || '[]'));
  const savedResearchImports = localStorage.getItem('central-research-auto-imported-v1');
  const initializeResearchImports = savedResearchImports === null;
  const researchProcessed = new Set(JSON.parse(savedResearchImports || '[]'));
  let changed = false;
  for (const run of agentRuntime.history || []) {
    if (run.kind === 'research' && run.state === 'complete' && !initializeResearchImports && !researchProcessed.has(run.id)) {
      const candidates = Array.isArray(run.candidates) ? run.candidates : [];
      const known = new Set(state.leads.map(lead => `${importKey(lead.name)}|${importKey(lead.city)}`));
      let added = 0;
      for (const item of candidates) {
        const key = `${importKey(item.name)}|${importKey(item.city)}`;
        if (!item.name || !item.category || !item.city || item.website !== 'Não encontrado' || item.maps !== 'Encontrado' || item.smallLocalBusiness !== true || !(Number(item.mapsRating) > 0) || !(Number(item.mapsReviewCount) > 0) || !safeUrl(item.mapsUrl) || /\/maps\/search\//i.test(item.mapsUrl) || known.has(key)) continue;
        const mapsUrl = safeUrl(item.mapsUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name} ${item.city}`)}`;
        state.leads.unshift({
          id:uid('lead'), name:item.name, category:item.category, city:item.city, phone:item.phone || '',
          website:'Não encontrado', websiteUrl:'',
          maps:'Encontrado', mapsUrl, mapsRating:Number(item.mapsRating), mapsReviewCount:Number(item.mapsReviewCount), instagramUrl:safeUrl(item.instagramUrl), instagramStatus:'Não verificado',
          heat:50, heatRationale:'Calor neutro; pesquisa ainda precisa de revisão.', stage:'verificar', evidence:item.evidence || 'Pesquisa pública inicial; conferir a ficha e os canais antes de qualificar.',
          source:item.source || 'Pesquisa pública assistida pelo Codex', sourceUrl:safeUrl(item.sourceUrl) || mapsUrl,
          nextAction:'Conferir ficha direta do Maps, site e Instagram antes de qualificar.',
          notes:'Adicionado automaticamente após pesquisa concluída. Confirme identidade e dados antes de qualquer contato.',
          responseDue:null, createdAt:isoDate(Date.now()), demo:false
        });
        known.add(key);
        added += 1;
      }
      researchProcessed.add(run.id);
      if (added) { changed = true; toast(`${added} resultado${added === 1 ? '' : 's'} da pesquisa adicionado${added === 1 ? '' : 's'} automaticamente aos leads para revisão. Nenhuma mensagem foi enviada.`); }
    }
    if (run.kind !== 'prospecting' || run.state !== 'complete') continue;
    const existing = new Set(state.leads.map(lead => `${importKey(lead.name)}|${importKey(lead.city)}`));
    const ready = (run.candidates || []).filter(item => item.name && item.city && item.message && item.salesScript && item.website === 'Não encontrado' && item.smallLocalBusiness === true && item.maps === 'Encontrado' && Number(item.mapsRating) > 0 && Number(item.mapsReviewCount) > 0 && !/\/maps\/search\//i.test(item.mapsUrl || '') && !existing.has(`${importKey(item.name)}|${importKey(item.city)}`));
    for (const item of ready) {
      const mapsUrl = safeUrl(item.mapsUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name} ${item.city}`)}`;
      const lead = { id:uid('lead'),name:item.name,category:item.category,city:item.city,phone:item.phone||'',website:item.website||'Não verificado',websiteUrl:safeUrl(item.websiteUrl),maps:item.maps==='Não encontrado'?'Não encontrado':'Não verificado',mapsUrl,instagramUrl:safeUrl(item.instagramUrl),instagramStatus:item.instagramStatus||'Não verificado',heat:Number(item.heat)||30,heatRationale:item.heatRationale||'',stage:'aprovacao',evidence:item.evidence||'',source:'Pesquisa pública assistida pelo Codex',sourceUrl:safeUrl(item.sourceUrl)||mapsUrl,nextAction:'Revisar a mensagem e o roteiro antes de enviar',salesScript:item.salesScript,notes:'Importado automaticamente pelo fluxo local do Codex; confira os dados e links.',responseDue:null,createdAt:isoDate(Date.now()),demo:false };
      state.leads.unshift(lead);
      state.messages.unshift({id:uid('message'),leadId:lead.id,text:item.message,sentAt:null});
      existing.add(`${importKey(lead.name)}|${importKey(lead.city)}`); changed=true;
    }
    if (ready.length) toast(`${ready.length} lead${ready.length===1?'':'s'} verificado${ready.length===1?'':'s'} adicionado${ready.length===1?'':'s'} com mensagem em aprovação. Nada foi enviado.`);
    if (!processed.has(run.id)) processed.add(run.id);

    // Leads confirmados na pesquisa/verificação também entram no CRM para revisão,
    // mesmo quando a qualificação corretamente não autoriza preparar uma mensagem.
    if (!reviewProcessed.has(run.id)) {
      const researchTask = (run.tasks || []).find(task => /pesquisador web/i.test(task.name || '') && task.state === 'complete');
      const verificationTask = (run.tasks || []).find(task => /verifica[cç][aã]o/i.test(task.name || '') && task.state === 'complete');
      const parseTagged = (result, tag) => {
        const match = String(result || '').match(new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`, 'i'));
        if (!match) return null;
        try { return JSON.parse(match[1]); } catch { return null; }
      };
      const researched = parseTagged(researchTask?.result, 'CENTRAL_LEADS_JSON')?.leads || [];
      const verified = parseTagged(verificationTask?.result, 'CENTRAL_VERIFICATION_JSON')?.leads || [];
      const verificationByKey = new Map(verified.map(item => [`${importKey(item.name)}|${importKey(item.city)}`, item]));
      const reviewLeads = researched.map(item => ({ ...item, ...(verificationByKey.get(`${importKey(item.name)}|${importKey(item.city)}`) || {}) }))
        .filter(item => item.identityConfirmed === true && Number(item.confidence) >= 0.65 && item.name && item.city && item.category && item.smallLocalBusiness === true && item.website === 'Não encontrado' && item.maps === 'Encontrado' && Number(item.mapsRating) > 0 && Number(item.mapsReviewCount) > 0 && !/\/maps\/search\//i.test(item.mapsUrl || ''));
      for (const item of reviewLeads) {
        const key = `${importKey(item.name)}|${importKey(item.city)}`;
        if (existing.has(key)) continue;
        const mapsUrl = safeUrl(item.mapsUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name} ${item.city}`)}`;
        const website = 'Não encontrado';
        const maps = 'Encontrado';
        const instagramStatus = ['Encontrado', 'Não encontrado'].includes(item.instagramStatus) ? item.instagramStatus : 'Não verificado';
        const researchEvidence = researched.find(source => `${importKey(source.name)}|${importKey(source.city)}` === key)?.evidence;
        const evidence = [researchEvidence, item.evidence].filter(Boolean).join(' ');
        state.leads.unshift({
          id:uid('lead'), name:item.name, category:item.category || 'Não informado', city:item.city,
          phone:item.phone || '', website, websiteUrl:'', maps, mapsUrl, mapsRating:Number(item.mapsRating), mapsReviewCount:Number(item.mapsReviewCount),
          instagramUrl:safeUrl(item.instagramUrl), instagramStatus, heat:50, heatRationale:'Calor neutro; ainda não qualificado para contato.',
          stage:'verificar', evidence, source:'Pesquisa pública assistida pelo Codex', sourceUrl:safeUrl(item.sourceUrl) || mapsUrl,
          nextAction:'Conferir a ficha direta do Maps, site e Instagram antes de qualificar.',
          salesScript:'', notes:'Identidade confirmada em fontes públicas. Link do Maps pode ser apenas uma busca; revise ficha, canais e dados antes de qualquer contato.',
          responseDue:null, createdAt:isoDate(Date.now()), demo:false
        });
        existing.add(key);
        changed = true;
      }
      reviewProcessed.add(run.id);
      if (reviewLeads.length) toast(`${reviewLeads.length} empresas verificadas adicionadas como leads para revisão; sem mensagens e sem contato enviado.`);
    }
  }
  localStorage.setItem('central-prospecting-imported-v1',JSON.stringify([...processed].slice(-100)));
  localStorage.setItem('central-prospecting-review-imported-v1',JSON.stringify([...reviewProcessed].slice(-100)));
  if (initializeResearchImports) for (const run of agentRuntime.history || []) if (run.kind === 'research' && run.state === 'complete') researchProcessed.add(run.id);
  localStorage.setItem('central-research-auto-imported-v1',JSON.stringify([...researchProcessed].slice(-100)));
  if (changed) { state.settings.demo=false; persist(); if(currentPage==='agents'){renderPages();} }
}
async function runAgents() {
  const button = el('[data-agent-run]');
  if (!button || agentRuntime.running) return;
  const leads = state.leads.filter((lead) => lead.demo !== true && lead.demo !== 'demo');
  const projects = state.projects.filter((project) => project.demo !== true && project.demo !== 'demo');
  const messages = state.messages.filter((message) => leads.some((lead) => lead.id === message.leadId));
  if (!leads.length && !projects.length) { toast('Não há leads ou projetos reais. Importe/cadastre dados reais antes de executar.'); return; }
  button.disabled = true;
  button.textContent = '⟳ Iniciando…';
  try {
    const response = await fetch('/api/agent-runtime/run', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'CRM local', leads, projects, messages })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Não foi possível iniciar os agentes.');
    agentRuntime = payload;
    selectedRunId = payload.currentRun?.id || '';
    toast('Sete processos do Codex CLI foram iniciados. Acompanhe os resultados nesta tela.');
  } catch (error) { toast(error.message); }
  await refreshAgentRuntime();
}
async function importAgentDataset(event) {
  return importCRMJsonFile(event);
}
function navigate(page) { currentPage = page; renderShell(); renderPages(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function toggleTheme() { state.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light'; persist(); applyTheme(); renderShell(); renderPages(); toast(state.settings.theme === 'light' ? 'Modo claro ativado.' : 'Modo escuro ativado.'); }

function initialWhatsAppMessage(lead) {
  const category = String(lead.category || '').toLocaleLowerCase('pt-BR');
  const productWord = /loja|comércio|mercado|caf[eé]|padaria|restaurante|lanch|pet\s?shop|varejo|produto|boutique/i.test(category) ? 'produtos' : 'serviços';
  return `Oi, tudo bem? Estou procurando os ${productWord} de vocês. Vocês têm algum site onde eu possa ver mais informações?`;
}

function modal(content, className = '') { el('#modal-root').innerHTML = `<div class="modal-backdrop open" data-close-modal><div class="modal ${className}" role="dialog" aria-modal="true">${content}</div></div>`; el('[data-close-modal]')?.addEventListener('click', (event) => { if (event.target === event.currentTarget) closeModal(); }); el('[data-modal-close]')?.addEventListener('click', closeModal); }
function closeModal() { el('#modal-root').innerHTML = ''; }
function openLeadModal() { modal(`<div class="modal-header"><div><p class="page-kicker">Novo registro</p><h2>Cadastrar lead</h2><p>A empresa pode ter vindo de uma consulta manual no Google Maps.</p></div><button class="icon-btn" data-modal-close aria-label="Fechar">×</button></div><form id="lead-form"><div class="form-grid"><label class="field"><span>Nome da empresa *</span><input class="field-input" name="name" required placeholder="Ex.: Studio Aquarela" /></label><label class="field"><span>Nicho *</span><input class="field-input" name="category" required placeholder="Ex.: manicure e salão" /></label><label class="field"><span>Cidade / região *</span><input class="field-input" name="city" required placeholder="Ex.: São Carlos, SP" /></label><label class="field"><span>Telefone / WhatsApp com DDD</span><input class="field-input" name="phone" inputmode="tel" autocomplete="tel" placeholder="Ex.: (16) 99999-9999" /></label><label class="field"><span>Site identificado</span><select class="field-select" name="website"><option>Não verificado</option><option>Não encontrado</option><option>Encontrado</option></select></label><label class="field"><span>Cadastro no Maps</span><select class="field-select" name="maps"><option>Não verificado</option><option>Não encontrado</option><option>Cadastro incompleto</option><option>Cadastro regular</option><option>Cadastro forte</option></select></label><label class="field full"><span>Calor inicial do lead</span><span class="range-wrap"><input class="heat-range" type="range" name="heat" min="0" max="100" value="50" /><strong class="range-value" id="modal-heat-value">50/100</strong></span></label><label class="field full"><span>Evidência observável</span><textarea class="field-textarea" name="evidence" required placeholder="O que foi observado no site, Maps ou presença digital?"></textarea></label><label class="field full"><span>Próxima ação / notas</span><textarea class="field-textarea" name="notes" placeholder="Ex.: confirmar se atende por agendamento."></textarea></label></div><div class="modal-actions"><button type="button" class="ghost-btn" data-modal-close>Cancelar</button><button class="primary-btn" type="submit">Salvar lead</button></div></form>`); el('#lead-form').addEventListener('submit', saveLead); el('.heat-range').addEventListener('input', (event) => { el('#modal-heat-value').textContent = `${event.target.value}/100`; }); }
function saveLead(event) { event.preventDefault(); const form = new FormData(event.target); const lead = { id: uid('lead'), name: form.get('name'), category: form.get('category'), city: form.get('city'), phone: form.get('phone'), website: form.get('website'), websiteUrl: '', maps: form.get('maps'), mapsUrl: '', instagramUrl: '', instagramStatus: 'Não verificado', heat: Number(form.get('heat')), stage: 'novo', evidence: form.get('evidence'), source: 'Google Maps · consulta manual', notes: form.get('notes'), nextAction: 'Verificar e qualificar', responseDue: null, createdAt: isoDate(Date.now()), demo: false }; state.leads.unshift(lead); state.messages.unshift({ id: uid('message'), leadId: lead.id, text: initialWhatsAppMessage(lead), sentAt: null }); state.settings.demo = false; persist(); currentLeadId = lead.id; closeModal(); toast('Lead cadastrado e mensagem inicial preparada.'); renderPages(); }
function importKey(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
async function importLeadsJsonFile(event) {
  return importCRMJsonFile(event);
}
async function importCRMJsonFile(event) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file) return;
  input.value = '';
  if (file.size > 2_000_000) { toast('O JSON ultrapassa o limite de 2 MB.'); return; }
  try {
    const payload = JSON.parse(await file.text());
    const rows = Array.isArray(payload) ? payload : payload?.leads;
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 250) throw new Error('O arquivo precisa conter de 1 a 250 empresas em uma lista chamada "leads" ou ser uma lista JSON.');
    const sourceProjects = Array.isArray(payload?.projects) ? payload.projects.filter((project) => project && project.demo !== true && project.demo !== 'demo') : [];
    if (sourceProjects.length > 15) throw new Error('O arquivo pode ter no máximo 15 projetos.');
    const known = new Map(state.leads.map((lead) => [`${importKey(lead.name)}|${importKey(lead.city)}`, lead]));
    const added = [];
    const sourceForAdded = new Map();
    const importedLeadIds = new Map();
    let duplicates = 0;
    let invalid = 0;
    for (const item of rows.filter((lead) => lead && lead.demo !== true && lead.demo !== 'demo')) {
      if (!item || typeof item !== 'object' || !String(item.name || '').trim() || !String(item.category || '').trim() || !String(item.city || '').trim()) { invalid += 1; continue; }
      const key = `${importKey(item.name)}|${importKey(item.city)}`;
      if (known.has(key)) {
        duplicates += 1;
        if (item.id) importedLeadIds.set(item.id, known.get(key).id);
        continue;
      }
      const websiteOptions = ['Não verificado', 'Não encontrado', 'Encontrado'];
      const mapsOptions = ['Não verificado', 'Não encontrado', 'Cadastro incompleto', 'Cadastro regular', 'Cadastro forte'];
      const heat = Number(item.heat);
      const stage = LEAD_STAGES.some(([id]) => id === item.stage) ? item.stage : 'novo';
      const lead = {
        id: uid('lead'), name: String(item.name).trim(), category: String(item.category).trim(), city: String(item.city).trim(),
        phone: String(item.phone || '').trim(), website: websiteOptions.includes(item.website) ? item.website : 'Não verificado',
        websiteUrl: safeUrl(item.websiteUrl || item.websiteLink || ''), mapsUrl: safeUrl(item.mapsUrl || item.googleMapsUrl || ''), instagramUrl: safeUrl(item.instagramUrl || ''),
        instagramStatus: ['Não verificado', 'Encontrado', 'Não encontrado'].includes(item.instagramStatus) ? item.instagramStatus : (item.instagramUrl ? 'Encontrado' : 'Não verificado'),
        maps: mapsOptions.includes(item.maps) ? item.maps : 'Não verificado', heat: Number.isFinite(heat) ? Math.max(0, Math.min(100, Math.round(heat))) : 50,
        stage, evidence: String(item.evidence || 'Importado de um arquivo JSON; confirmar as informações antes do contato.').trim(),
        source: String(item.source || 'Importação JSON').trim(), sourceUrl: String(item.sourceUrl || '').trim(), notes: String(item.notes || '').trim(),
        nextAction: String(item.nextAction || 'Confirmar dados públicos e presença digital').trim(), heatRationale: String(item.heatRationale || ''),
        salesScript: String(item.salesScript || ''), responseDue: Number.isNaN(Date.parse(item.responseDue)) ? null : item.responseDue,
        createdAt: Number.isNaN(Date.parse(item.createdAt)) ? isoDate(Date.now()) : item.createdAt, demo: false
      };
      added.push(lead);
      sourceForAdded.set(lead.id, item);
      known.set(key, lead);
      if (item.id) importedLeadIds.set(item.id, lead.id);
    }
    if (added.length) {
      state.leads.unshift(...added);
      const importedMessages = [];
      for (const lead of added) {
        const sourceLead = sourceForAdded.get(lead.id);
        const saved = (Array.isArray(payload?.messages) ? payload.messages : []).filter((message) => message?.leadId === sourceLead?.id && typeof message.text === 'string' && message.text.trim());
        if (saved.length) {
          saved.forEach((message) => importedMessages.push({ id: uid('message'), leadId: lead.id, text: message.text.trim(), sentAt: message.sentAt || null }));
        } else {
          importedMessages.push({ id: uid('message'), leadId: lead.id, text: initialWhatsAppMessage(lead), sentAt: null });
        }
      }
      state.messages.unshift(...importedMessages);
    }
    const knownProjects = new Set(state.projects.map((project) => importKey(project.name)));
    let addedProjects = 0;
    for (const item of sourceProjects) {
      const name = String(item.name || '').trim();
      if (!name || knownProjects.has(importKey(name))) { if (name) duplicates += 1; else invalid += 1; continue; }
      const stage = PROJECT_STAGES.some(([id]) => id === item.stage) ? item.stage : 'confirmado';
      const originalLeadId = String(item.leadId || '');
      const mappedLeadId = importedLeadIds.get(originalLeadId) || '';
      state.projects.push({
        id: uid('project'), leadId: mappedLeadId, name, service: String(item.service || 'Landing page + hospedagem anual'), stage,
        startDate: Number.isNaN(Date.parse(item.startDate)) ? null : item.startDate,
        dueDate: Number.isNaN(Date.parse(item.dueDate)) ? null : item.dueDate,
        notes: String(item.notes || ''), demo: false
      });
      knownProjects.add(importKey(name));
      addedProjects += 1;
    }
    if (added.length || addedProjects) {
      state.settings.demo = false;
      currentLeadId = added[0]?.id || currentLeadId;
      persist();
      renderPages();
    }
    const summary = [`${added.length} lead${added.length === 1 ? '' : 's'} adicionado${added.length === 1 ? '' : 's'}`, `${addedProjects} projeto${addedProjects === 1 ? '' : 's'} adicionado${addedProjects === 1 ? '' : 's'}`, `${duplicates} duplicado${duplicates === 1 ? '' : 's'} ignorado${duplicates === 1 ? '' : 's'}`, invalid ? `${invalid} inválido${invalid === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
    toast(summary);
  } catch (error) {
    toast(error instanceof SyntaxError ? 'Não consegui ler o JSON. Confira a sintaxe e tente novamente.' : error.message || 'Não foi possível importar este arquivo.');
  }
}
function openLeadDetail(id) {
  const lead = leadById(id);
  if (!lead) return;
  const message = messageByLead(id);
  const instagramStatus = lead.instagramStatus || (lead.instagramUrl ? 'Encontrado' : 'Não verificado');
  const project = state.projects.find((item) => item.leadId === lead.id || String(item.name || '').trim().toLocaleLowerCase('pt-BR') === lead.name.trim().toLocaleLowerCase('pt-BR'));
  const links = [
    ['Google Maps', mapsSearchUrl(lead)],
    ...(safeUrl(lead.websiteUrl) ? [['Site', safeUrl(lead.websiteUrl)]] : []),
    ...(safeUrl(lead.instagramUrl) ? [['Instagram', safeUrl(lead.instagramUrl)]] : [])
  ];
  const dueValue = toLocalDateTimeInput(lead.responseDue);
  modal(`<div class="modal-header"><div><p class="page-kicker">Ficha da empresa</p><h2>${esc(lead.name)}</h2><p>${esc(lead.category)} · ${esc(lead.city)}</p></div><button class="icon-btn" data-modal-close aria-label="Fechar">×</button></div>
    <form id="edit-lead-form" data-lead-id="${esc(lead.id)}"><nav class="lead-link-list" aria-label="Atalhos da empresa">${links.map(([label, url]) => `<a class="lead-link-button" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Abrir ${label} ↗</a>`).join('')}${!safeUrl(lead.websiteUrl) ? `<span class="lead-link-missing">${lead.website === 'Não encontrado' ? 'Site próprio não encontrado' : 'Site ainda não cadastrado'}</span>` : ''}${!safeUrl(lead.instagramUrl) ? `<span class="lead-link-missing">${instagramStatus === 'Não encontrado' ? 'Instagram não localizado' : 'Instagram ainda não cadastrado'}</span>` : ''}</nav><div class="lead-detail-layout"><section class="lead-detail-main">
    <h3 class="detail-section-title">Dados da empresa</h3><div class="form-grid">
      <label class="field"><span>Nome da empresa</span><input class="field-input" name="name" required value="${esc(lead.name)}" /></label>
      <label class="field"><span>Nicho / categoria</span><input class="field-input" name="category" value="${esc(lead.category)}" /></label>
      <label class="field"><span>Cidade / região</span><input class="field-input" name="city" value="${esc(lead.city)}" /></label>
      <label class="field"><span>Telefone / WhatsApp com DDD</span><input class="field-input" name="phone" inputmode="tel" autocomplete="tel" placeholder="(16) 99999-9999" value="${esc(lead.phone)}" /><small class="field-help">Necessário para abrir a conversa direta no WhatsApp.</small></label>
      <label class="field"><span>Etapa comercial</span><select class="field-select" name="stage">${LEAD_STAGES.map(([stage, label]) => `<option value="${stage}" ${stage === lead.stage ? 'selected' : ''}>${label}</option>`).join('')}</select><small class="field-help">“Venda fechada” significa que contratou. “Encerrado sem venda” significa que a oportunidade terminou sem contratação.</small></label>
      <label class="field"><span>Prazo para aguardar resposta</span><input class="field-input" name="responseDue" type="datetime-local" value="${esc(dueValue)}" /><small class="field-help">Começa quando você registra o envio manual. Quando o cliente responde, o contador é encerrado; ao enviar sua próxima mensagem, começa um novo prazo de 7 dias corridos.</small></label>
      <label class="field full"><span>Calor do lead · ${lead.heat}/100</span><span class="range-wrap"><input class="heat-range" type="range" name="heat" min="0" max="100" value="${Number(lead.heat) || 0}" /><strong class="range-value" id="edit-heat-value">${Number(lead.heat) || 0}/100</strong></span></label>
    </div>
    <h3 class="detail-section-title">Presença digital</h3><div class="form-grid">
      <label class="field"><span>Site: o que você verificou?</span><select class="field-select" name="website"><option ${lead.website === 'Não verificado' ? 'selected' : ''}>Não verificado</option><option ${lead.website === 'Não encontrado' ? 'selected' : ''}>Não encontrado</option><option ${lead.website === 'Encontrado' ? 'selected' : ''}>Encontrado</option></select></label>
      <label class="field"><span>Endereço do site</span><input class="field-input" name="websiteUrl" inputmode="url" placeholder="https://..." value="${esc(lead.websiteUrl || '')}" /></label>
      <label class="field"><span>Cadastro no Google Maps</span><select class="field-select" name="maps"><option ${lead.maps === 'Não verificado' ? 'selected' : ''}>Não verificado</option><option ${lead.maps === 'Não encontrado' ? 'selected' : ''}>Não encontrado</option><option ${lead.maps === 'Cadastro incompleto' ? 'selected' : ''}>Cadastro incompleto</option><option ${lead.maps === 'Cadastro regular' ? 'selected' : ''}>Cadastro regular</option><option ${lead.maps === 'Cadastro forte' ? 'selected' : ''}>Cadastro forte</option></select></label>
      <label class="field"><span>Link da ficha do Maps</span><input class="field-input" name="mapsUrl" inputmode="url" placeholder="https://maps.google.com/..." value="${esc(lead.mapsUrl || '')}" /></label>
      <label class="field"><span>Instagram: o que você encontrou?</span><select class="field-select" name="instagramStatus"><option ${instagramStatus === 'Não verificado' ? 'selected' : ''}>Não verificado</option><option ${instagramStatus === 'Encontrado' ? 'selected' : ''}>Encontrado</option><option ${instagramStatus === 'Não encontrado' ? 'selected' : ''}>Não encontrado</option></select></label>
      <label class="field"><span>Link do Instagram</span><input class="field-input" name="instagramUrl" inputmode="url" placeholder="https://instagram.com/..." value="${esc(lead.instagramUrl || '')}" /></label>
    </div>
    <h3 class="detail-section-title">Acompanhamento</h3><div class="form-grid">
      <label class="field full"><span>O que você encontrou</span><textarea class="field-textarea" name="evidence">${esc(lead.evidence || '')}</textarea></label>
      <label class="field full"><span>Próxima ação</span><input class="field-input" name="nextAction" value="${esc(lead.nextAction || '')}" placeholder="Ex.: enviar mensagem" /></label>
      <label class="field full"><span>Roteiro da conversa</span><textarea class="field-textarea" name="salesScript" placeholder="Perguntas e respostas sugeridas para a conversa">${esc(lead.salesScript || '')}</textarea><small class="field-help">Sugestão para você adaptar. O painel não conversa nem envia mensagens automaticamente.</small></label>
      <label class="field full"><span>Notas</span><textarea class="field-textarea" name="notes">${esc(lead.notes || '')}</textarea></label>
    </div></section><aside class="lead-workflow">${renderLeadWorkflow(lead, message, project, instagramStatus)}</aside></div>
    <div class="modal-actions lead-edit-actions"><button type="button" class="danger-btn" data-delete-lead="${esc(lead.id)}">Excluir cliente</button><span class="action-spacer"></span><button type="button" class="ghost-btn" data-modal-close>Fechar</button>${message ? `<button type="button" class="ghost-btn" data-go-messages="${esc(lead.id)}">Abrir conversa</button>` : ''}<button class="primary-btn" type="submit">Salvar alterações</button></div></form>`, 'modal-lead-detail');
  el('#edit-lead-form').addEventListener('submit', saveLeadDetails);
  el('#edit-lead-form [name="heat"]').addEventListener('input', (event) => { el('#edit-heat-value').textContent = `${event.target.value}/100`; });
  el('#edit-lead-form [name="websiteUrl"]').addEventListener('change', (event) => { if (event.target.value.trim()) el('#edit-lead-form [name="website"]').value = 'Encontrado'; });
  el('#edit-lead-form [name="instagramUrl"]').addEventListener('change', (event) => { if (event.target.value.trim()) el('#edit-lead-form [name="instagramStatus"]').value = 'Encontrado'; });
  el('[data-go-messages]')?.addEventListener('click', () => { currentLeadId = id; closeModal(); navigate('messages'); });
  el('[data-delete-lead]')?.addEventListener('click', () => openDeleteLeadConfirmation(id));
  all('[data-focus-field]').forEach((button) => button.addEventListener('click', () => { const field = el(`#edit-lead-form [name="${button.dataset.focusField}"]`); field?.scrollIntoView({ behavior: 'smooth', block: 'center' }); field?.focus(); }));
  all('[data-flow-stage]').forEach((button) => button.addEventListener('click', () => { lead.stage = button.dataset.flowStage; if (['respondeu', 'interessado', 'ganho', 'perdido', 'nao-contatar'].includes(lead.stage)) lead.responseDue = null; if (lead.stage === 'contatado' && !lead.responseDue) lead.responseDue = daysFromNow(7); persist(); openLeadDetail(id); toast(`Etapa atualizada: ${stageLabel(lead.stage)}.`); }));
  el('[data-flow-open-message]')?.addEventListener('click', () => { lead.stage = lead.stage === 'qualificado' ? 'mensagem' : lead.stage; currentLeadId = id; persist(); closeModal(); navigate('messages'); });
  el('[data-create-project-from-lead]')?.addEventListener('click', () => createProjectFromLead(id));
  all('[data-flow-project-stage]').forEach((button) => button.addEventListener('click', () => { if (!project) return; project.stage = button.dataset.flowProjectStage; persist(); openLeadDetail(id); toast(`Projeto avançou para: ${stageLabel(project.stage, PROJECT_STAGES)}.`); }));
}

function renderLeadWorkflow(lead, message, project, instagramStatus) {
  const checks = [
    { key: 'website', label: 'Conferir se tem site', done: lead.website !== 'Não verificado', result: lead.website === 'Encontrado' ? 'Site cadastrado' : lead.website === 'Não encontrado' ? 'Nenhum site cadastrado' : '', button: 'Registrar resultado' },
    { key: 'maps', label: 'Revisar perfil no Google Maps', done: lead.maps !== 'Não verificado', result: lead.maps === 'Não verificado' ? '' : lead.maps, button: 'Registrar resultado' },
    { key: 'instagramStatus', label: 'Conferir Instagram', done: instagramStatus !== 'Não verificado', result: instagramStatus === 'Encontrado' ? 'Perfil encontrado' : instagramStatus === 'Não encontrado' ? 'Não localizado' : '', button: 'Registrar resultado' }
  ];
  const incomplete = checks.find((item) => !item.done);
  const checkRows = checks.map((item) => `<div class="flow-check ${item.done ? 'complete' : incomplete?.key === item.key ? 'current' : ''}"><span class="flow-marker">${item.done ? '✓' : incomplete?.key === item.key ? '●' : '·'}</span><div class="flow-check-copy"><strong>${item.label}</strong><small>${item.done ? esc(item.result) : 'Ainda falta conferir'}</small></div>${item.key === 'maps' ? `<a class="flow-mini-link" href="${esc(mapsSearchUrl(lead))}" target="_blank" rel="noopener noreferrer">Abrir Maps</a>` : item.key === 'instagramStatus' ? `<a class="flow-mini-link" href="${esc(safeUrl(lead.instagramUrl) || instagramSearchUrl(lead))}" target="_blank" rel="noopener noreferrer">${lead.instagramUrl ? 'Abrir perfil' : 'Pesquisar'}</a>` : ''}${!item.done ? `<button type="button" class="flow-edit-link" data-focus-field="${item.key}">${item.button}</button>` : ''}</div>`).join('');
  let nextTitle = '';
  let nextText = '';
  let nextAction = '';
  if (incomplete) {
    nextTitle = incomplete.label;
    nextText = 'Confira este ponto e registre o resultado na ficha para avançar.';
    nextAction = `<button type="button" class="flow-primary" data-focus-field="${incomplete.key}">Atualizar ${incomplete.key === 'website' ? 'site' : incomplete.key === 'maps' ? 'Maps' : 'Instagram'}</button>`;
  } else if (['novo', 'verificar'].includes(lead.stage)) {
    nextTitle = 'Qualificar a empresa'; nextText = 'Revise as informações e confirme se vale iniciar o contato.'; nextAction = '<button type="button" class="flow-primary" data-flow-stage="qualificado">Marcar como qualificada</button>';
  } else if (lead.stage === 'qualificado') {
    nextTitle = 'Preparar a primeira mensagem'; nextText = 'Revise o texto antes de abrir o WhatsApp e enviar manualmente.'; nextAction = '<button type="button" class="flow-primary" data-flow-open-message>Preparar mensagem</button>';
  } else if (['mensagem', 'aprovacao'].includes(lead.stage)) {
    nextTitle = 'Revisar e enviar a mensagem'; nextText = 'A mensagem não é enviada pelo painel. Confira o texto e envie no WhatsApp.'; nextAction = '<button type="button" class="flow-primary" data-flow-open-message>Abrir mensagem</button>';
  } else if (lead.stage === 'contatado') {
    nextTitle = 'Aguardar resposta'; nextText = lead.responseDue ? `Prazo para retorno: ${countdown(lead.responseDue).text}. Quando responder, registre aqui.` : 'A mensagem foi enviada. Registre a resposta quando ela chegar.'; nextAction = '<button type="button" class="flow-primary" data-flow-stage="respondeu">Registrar resposta recebida</button>';
  } else if (lead.stage === 'respondeu') {
    nextTitle = 'Confirmar se há interesse'; nextText = 'Se a empresa quiser conhecer a proposta, avance para preparar uma oferta.'; nextAction = '<button type="button" class="flow-primary" data-flow-stage="interessado">Marcar interesse</button>';
  } else if (lead.stage === 'interessado') {
    nextTitle = 'Enviar a proposta'; nextText = 'Depois de apresentar valores e escopo, registre o envio.'; nextAction = '<button type="button" class="flow-primary" data-flow-stage="proposta">Marcar proposta enviada</button>';
  } else if (lead.stage === 'proposta') {
    nextTitle = 'Acompanhar a proposta'; nextText = 'Registre negociação se estiverem ajustando escopo ou condições.'; nextAction = '<button type="button" class="flow-primary" data-flow-stage="negociacao">Marcar em negociação</button>';
  } else if (lead.stage === 'negociacao') {
    nextTitle = 'Registrar o resultado'; nextText = 'Marque como venda fechada quando contratar ou encerre sem venda se não avançar.'; nextAction = '<div class="flow-outcome-actions"><button type="button" class="flow-primary" data-flow-stage="ganho">Venda fechada</button><button type="button" class="flow-secondary" data-flow-stage="perdido">Encerrar sem venda</button></div>';
  } else if (lead.stage === 'ganho' && !project) {
    nextTitle = 'Criar o projeto'; nextText = 'A venda foi fechada. Crie o acompanhamento da landing page e da entrega.'; nextAction = '<button type="button" class="flow-primary" data-create-project-from-lead>Criar projeto · prazo padrão de 7 dias</button>';
  } else if (project) {
    const current = PROJECT_STAGES.findIndex(([stage]) => stage === project.stage);
    const next = PROJECT_STAGES[current + 1];
    nextTitle = next ? next[1] : 'Site entregue e hospedagem ativa';
    nextText = next ? `Projeto em “${stageLabel(project.stage, PROJECT_STAGES)}”. Avance quando concluir esta etapa.` : 'Todas as etapas do projeto foram concluídas.';
    nextAction = next ? `<button type="button" class="flow-primary" data-flow-project-stage="${next[0]}">Avançar para: ${next[1]}</button>` : '';
  } else if (['perdido', 'nao-contatar'].includes(lead.stage)) {
    nextTitle = lead.stage === 'perdido' ? 'Oportunidade encerrada sem venda' : 'Contato encerrado';
    nextText = lead.stage === 'perdido' ? 'Se a empresa voltar a demonstrar interesse, você pode reabrir a oportunidade.' : 'Este lead foi marcado para não receber novos contatos.';
    nextAction = lead.stage === 'perdido' ? '<button type="button" class="flow-secondary" data-flow-stage="qualificado">Reabrir oportunidade</button>' : '';
  }
  const salesStages = [...COMMERCIAL_PROGRESS_STAGES, ['venda-confirmada', 'Venda confirmada']];
  const currentSalesStep = project || lead.stage === 'ganho' ? salesStages.length : ({ novo: 0, verificar: 0, qualificado: 1, mensagem: 2, aprovacao: 2, contatado: 4, respondeu: 4, interessado: 5, proposta: 6, negociacao: 6 }[lead.stage] ?? 0);
  const salesProgress = ['perdido', 'nao-contatar'].includes(lead.stage) && !project ? '' : `<div class="flow-project-progress"><strong>Prospecção e venda · etapa ${Math.min(currentSalesStep + 1, salesStages.length)} de ${salesStages.length}${currentSalesStep === salesStages.length ? ' · concluída' : ''}</strong>${salesStages.map(([stage, label], index) => { const done = index < currentSalesStep; const current = index === currentSalesStep; return `<div class="flow-project-step ${done ? 'complete' : current ? 'current' : ''}"><span class="flow-marker">${done ? '✓' : current ? '●' : index + 1}</span><span>${label}</span></div>`; }).join('')}</div>`;
  const projectProgress = project ? `<div class="flow-project-progress"><strong>Landing page e hospedagem · etapa ${COMMERCIAL_PROGRESS_STAGES.length + PROJECT_STAGES.findIndex(([id]) => id === project.stage) + 1} de ${FULL_PROJECT_PROGRESS_STAGES.length}</strong>${PROJECT_STAGES.slice(1).map(([stage, label], index) => { const stageIndex = index + 1; const current = PROJECT_STAGES.findIndex(([id]) => id === project.stage); const fullIndex = COMMERCIAL_PROGRESS_STAGES.length + stageIndex; const done = stageIndex < current; const active = stageIndex === current; return `<div class="flow-project-step ${done ? 'complete' : active ? 'current' : ''}"><span class="flow-marker">${done ? '✓' : active ? '●' : fullIndex + 1}</span><span>${label}</span></div>`; }).join('')}</div>` : '';
  return `<div class="workflow-heading"><h3>Próximos passos</h3><p>O painel destaca a próxima tarefa conforme o que já foi conferido e a etapa da venda.</p></div><div class="flow-section"><h4>Presença digital</h4>${checkRows}</div><div class="flow-next"><span class="flow-eyebrow">Próxima ação</span><strong>${esc(nextTitle)}</strong><p>${esc(nextText)}</p>${nextAction}</div>${salesProgress}${projectProgress}`;
}

function createProjectFromLead(id) {
  const lead = leadById(id);
  if (!lead || lead.stage !== 'ganho') return;
  const existing = state.projects.find((item) => item.leadId === id || String(item.name || '').trim().toLocaleLowerCase('pt-BR') === lead.name.trim().toLocaleLowerCase('pt-BR'));
  if (existing) { existing.leadId = id; persist(); openLeadDetail(id); return; }
  const start = new Date();
  state.projects.unshift({ id: uid('project'), leadId: id, name: lead.name, service: 'Landing page + hospedagem anual', stage: 'confirmado', startDate: isoDate(start), dueDate: isoDate(start.getTime() + 7 * 86400000), notes: '', demo: false });
  state.settings.demo = false;
  persist();
  openLeadDetail(id);
  toast('Projeto criado. Agora acompanhe materiais, produção, revisão e entrega nesta ficha.');
}
function saveLeadDetails(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const lead = leadById(event.currentTarget.dataset.leadId);
  if (!lead) return;
  const websiteUrl = String(form.get('websiteUrl') || '').trim();
  const mapsUrl = String(form.get('mapsUrl') || '').trim();
  const instagramUrl = String(form.get('instagramUrl') || '').trim();
  if ((websiteUrl && !safeUrl(websiteUrl)) || (mapsUrl && !safeUrl(mapsUrl)) || (instagramUrl && !safeUrl(instagramUrl))) { toast('Confira os links. Use um endereço válido, como https://exemplo.com.'); return; }
  for (const field of ['name', 'category', 'city', 'phone', 'evidence', 'nextAction', 'notes', 'salesScript']) lead[field] = String(form.get(field) || '').trim();
  lead.website = String(form.get('website'));
  lead.websiteUrl = safeUrl(websiteUrl);
  lead.maps = String(form.get('maps'));
  lead.mapsUrl = safeUrl(mapsUrl);
  lead.instagramUrl = safeUrl(instagramUrl);
  lead.instagramStatus = lead.instagramUrl ? 'Encontrado' : String(form.get('instagramStatus'));
  lead.heat = Math.max(0, Math.min(100, Number(form.get('heat')) || 0));
  const previousStage = lead.stage;
  const nextStage = String(form.get('stage'));
  if (LEAD_STAGES.some(([stage]) => stage === nextStage)) lead.stage = nextStage;
  const due = String(form.get('responseDue') || '');
  lead.responseDue = due ? new Date(due).toISOString() : null;
  if (previousStage !== lead.stage && ['respondeu', 'interessado', 'ganho', 'perdido', 'nao-contatar'].includes(lead.stage)) lead.responseDue = null;
  if (lead.stage === 'contatado' && !lead.responseDue) lead.responseDue = daysFromNow(7);
  state.settings.demo = false;
  persist();
  closeModal();
  renderPages();
  toast(isLocalHost ? 'Ficha atualizada neste dispositivo.' : 'Ficha atualizada e enviada para sincronização.');
}
function openDeleteLeadConfirmation(id) { const lead = leadById(id); if (!lead) return; modal(`<div class="modal-header"><div><p class="page-kicker">Confirmação necessária</p><h2>Excluir ${esc(lead.name)}?</h2><p>Esta ação remove o cliente e os registros relacionados.</p></div><button class="icon-btn" data-modal-close aria-label="Fechar">×</button></div><div class="delete-warning"><strong>Serão removidos:</strong><span>este lead, seus projetos e rascunhos de mensagem.</span></div><div class="modal-actions"><button class="ghost-btn" data-modal-close>Cancelar</button><button class="danger-btn" data-confirm-delete-lead="${esc(lead.id)}">Confirmar exclusão</button></div>`); el('[data-confirm-delete-lead]')?.addEventListener('click', () => deleteLead(id)); }
function deleteLead(id) { const lead = leadById(id); if (!lead) return; const name = lead.name.trim().toLocaleLowerCase('pt-BR'); state.leads = state.leads.filter((item) => item.id !== id); state.projects = state.projects.filter((item) => item.leadId !== id && String(item.name || '').trim().toLocaleLowerCase('pt-BR') !== name); state.messages = state.messages.filter((item) => item.leadId !== id); if (currentLeadId === id) currentLeadId = null; if (currentMessageId && !state.messages.some((item) => item.id === currentMessageId)) currentMessageId = null; persist(); closeModal(); renderPages(); toast(`${lead.name} e os registros relacionados foram excluídos.`); }
function updateLeadStage(id, stage) { const lead = leadById(id); if (!lead) return; lead.stage = stage; if (['respondeu', 'interessado', 'ganho', 'perdido', 'nao-contatar'].includes(stage)) lead.responseDue = null; if (stage === 'contatado' && !lead.responseDue) lead.responseDue = daysFromNow(7); persist(); renderPages(); toast(`Etapa atualizada: ${stageLabel(stage)}.`); }

function importResearchCandidates(runId) {
  const run = agentRuntime.currentRun?.id === runId ? agentRuntime.currentRun : agentRuntime.history?.find((item) => item.id === runId);
  if (!run?.candidates?.length) { toast('Esta pesquisa não contém empresas importáveis.'); return; }
  const selected = [...researchSelection].filter((key) => key.startsWith(`${runId}:`)).map((key) => Number(key.slice(runId.length + 1))).filter((index) => Number.isInteger(index) && run.candidates[index]);
  if (!selected.length) { toast('Marque pelo menos uma empresa para importar.'); return; }
  const known = new Set(state.leads.map((lead) => `${importKey(lead.name)}|${importKey(lead.city)}`));
  const proposed = [];
  let duplicates = 0;
  for (const index of selected) {
    const candidate = run.candidates[index];
    const key = `${importKey(candidate.name)}|${importKey(candidate.city)}`;
    if (!candidate.name || !candidate.category || !candidate.city || known.has(key)) { duplicates += 1; continue; }
    known.add(key);
    proposed.push(candidate);
  }
  if (!proposed.length) { toast(`${duplicates} duplicada${duplicates === 1 ? '' : 's'} ignorada${duplicates === 1 ? '' : 's'}.`); return; }
  const names = proposed.slice(0, 5).map((candidate) => candidate.name).join(', ');
  const more = proposed.length > 5 ? ` e mais ${proposed.length - 5}` : '';
  if (!confirm(`Adicionar ${proposed.length} empresa${proposed.length === 1 ? '' : 's'} ao painel?\n\n${names}${more}\n\nEntram como “Precisa verificar”, com fogo neutro 50/100, sem mensagem pronta e sem contato enviado. Confira cada link e dado depois da importação.`)) return;
  const added = proposed.map((candidate) => {
    const mapsUrl = safeUrl(candidate.mapsUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([candidate.name, candidate.city].join(' '))}`;
    return {
      id: uid('lead'), name: candidate.name, category: candidate.category, city: candidate.city, phone: candidate.phone || '',
      website: 'Não verificado', websiteUrl: safeUrl(candidate.websiteUrl), maps: 'Não verificado', mapsUrl,
      instagramUrl: safeUrl(candidate.instagramUrl), instagramStatus: 'Não verificado', heat: 50, stage: 'verificar',
      evidence: `Pesquisa pública preliminar pelo Codex. Conferir identidade, site, Maps e Instagram antes do contato. ${candidate.evidence || ''}`.trim(),
      source: candidate.source || 'Pesquisa pública assistida pelo Codex', sourceUrl: safeUrl(candidate.sourceUrl) || mapsUrl,
      notes: '', nextAction: 'Conferir ficha do Maps e presença digital', responseDue: null, createdAt: isoDate(Date.now()), demo: false
    };
  });
  state.leads.unshift(...added);
  state.settings.demo = false;
  currentLeadId = added[0]?.id || currentLeadId;
  researchSelection.clear();
  persist();
  currentPage = 'leads';
  renderShell();
  renderPages();
  toast(`${added.length} lead${added.length === 1 ? '' : 's'} adicionado${added.length === 1 ? '' : 's'}; ${duplicates} duplicada${duplicates === 1 ? '' : 's'} ignorada${duplicates === 1 ? '' : 's'}.`);
}

function openProjectModal() { modal(`<div class="modal-header"><div><p class="page-kicker">Novo acompanhamento</p><h2>Criar projeto</h2><p>Use dias corridos para acompanhar a produção.</p></div><button class="icon-btn" data-modal-close aria-label="Fechar">×</button></div><form id="project-form"><div class="form-grid"><label class="field"><span>Nome do projeto *</span><input class="field-input" name="name" required placeholder="Ex.: Studio Aquarela" /></label><label class="field"><span>Serviço</span><input class="field-input" name="service" value="Landing page + hospedagem anual" /></label><label class="field"><span>Data de início *</span><input class="field-input" type="date" name="startDate" value="${new Date().toISOString().slice(0, 10)}" required /></label><label class="field"><span>Prazo em dias corridos *</span><input class="field-input" type="number" name="days" value="7" min="1" max="365" required /></label><label class="field full"><span>Observações</span><textarea class="field-textarea" name="notes" placeholder="Materiais recebidos, escopo, próxima ação..."></textarea></label></div><div class="modal-actions"><button type="button" class="ghost-btn" data-modal-close>Cancelar</button><button class="primary-btn" type="submit">Criar projeto</button></div></form>`); el('#project-form').addEventListener('submit', saveProject); }
function saveProject(event) { event.preventDefault(); const form = new FormData(event.target); const start = new Date(`${form.get('startDate')}T09:00:00`); const project = { id: uid('project'), leadId: '', name: form.get('name'), service: form.get('service'), stage: 'confirmado', startDate: isoDate(start), dueDate: isoDate(start.getTime() + Number(form.get('days')) * 86400000), notes: form.get('notes'), demo: false }; state.projects.unshift(project); state.settings.demo = false; persist(); closeModal(); toast('Projeto criado com prazo em dias corridos.'); renderPages(); }
function openProjectDetail(id) {
  const project = projectById(id);
  if (!project) return;
  const current = Math.max(0, PROJECT_STAGES.findIndex(([stage]) => stage === project.stage));
  const completedSales = COMMERCIAL_PROGRESS_STAGES.map(([stage, label], index) => `<div class="stage-choice done stage-choice-locked"><span class="stage-marker">✓</span><span>${index + 1}. ${label}</span></div>`).join('');
  const saleStage = `<button type="button" class="stage-choice ${current === 0 ? 'current' : 'done'}" data-project-stage="confirmado"><span class="stage-marker">${current === 0 ? '●' : '✓'}</span><span>${COMMERCIAL_PROGRESS_STAGES.length + 1}. Venda confirmada</span></button>`;
  const deliveryStages = PROJECT_STAGES.slice(1).map(([stage, label], index) => {
    const stageIndex = index + 1;
    const number = COMMERCIAL_PROGRESS_STAGES.length + stageIndex + 1;
    const done = stageIndex < current;
    const active = stageIndex === current;
    return `<button type="button" class="stage-choice ${done ? 'done' : active ? 'current' : ''}" data-project-stage="${stage}"><span class="stage-marker">${done ? '✓' : active ? '●' : number}</span><span>${number}. ${label}</span></button>`;
  }).join('');
  modal(`<div class="modal-header"><div><p class="page-kicker">Acompanhamento do projeto</p><h2>${esc(project.name)}</h2><p>${esc(project.service)}</p></div><button class="icon-btn" data-modal-close aria-label="Fechar">×</button></div><div class="detail-grid"><div class="detail-item"><small>Prazo</small><strong class="${countdown(project.dueDate).overdue ? 'muted' : ''}" data-countdown-date="${esc(project.dueDate || '')}" data-countdown-tone="plain">${countdown(project.dueDate).text}</strong></div><div class="detail-item"><small>Limite</small><strong>${formatLongDate(project.dueDate)}</strong></div></div><div class="field"><label>Etapas da jornada</label><p class="field-help">A prospecção é registrada na ficha do lead. Este projeto começa após a venda; escolha a etapa atual da entrega.</p><div class="stage-choice-list">${completedSales}${saleStage}${deliveryStages}</div><p class="muted" id="project-stage-label">Atual: etapa ${COMMERCIAL_PROGRESS_STAGES.length + current + 1} de ${FULL_PROJECT_PROGRESS_STAGES.length} · ${stageLabel(project.stage, PROJECT_STAGES)}</p></div><p class="modal-note">${esc(project.notes || 'Sem observações registradas.')}</p><div class="modal-actions"><button class="ghost-btn" data-modal-close>Fechar</button></div>`);
  all('[data-project-stage]').forEach((button) => button.addEventListener('click', () => {
    project.stage = button.dataset.projectStage;
    persist(); closeModal(); renderPages();
    toast(`Projeto movido para: ${stageLabel(project.stage, PROJECT_STAGES)}.`);
  }));
}

  function saveMessage(id) { const message = state.messages.find((item) => item.id === id); const text = el('#message-text')?.value.trim(); if (!message || !text) return; message.text = text; persist(); toast(isLocalHost ? 'Rascunho salvo no dispositivo.' : 'Rascunho salvo e enviado para sincronização.'); }
function normalizeBrazilianWhatsApp(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (/^55\d{10,11}$/.test(digits)) return digits;
  if (/^\d{10,11}$/.test(digits)) return `55${digits}`;
  return '';
}
function openWhatsApp(id) {
  const message = state.messages.find((item) => item.id === id);
  const lead = message && leadById(message.leadId);
  if (!message || !lead) return;
  const phone = normalizeBrazilianWhatsApp(lead.phone);
  if (!phone) {
    openLeadDetail(lead.id);
    requestAnimationFrame(() => {
      const phoneField = el('#edit-lead-form [name="phone"]');
      phoneField?.focus();
      phoneField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    toast(lead.phone ? 'Confira o telefone: informe um número brasileiro com DDD.' : 'Cadastre o telefone/WhatsApp com DDD para abrir a conversa direta.');
    return;
  }
  saveMessage(id);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message.text)}`;
  window.open(url, '_blank', 'noopener');
  toast('Conversa do cliente aberta no WhatsApp. Confira o contato e envie manualmente.');
}
async function handleCustomerReplySubmit(event) {
  event.preventDefault();
  if (customerReplyBusy) return;
  const message = state.messages.find((item) => item.id === currentMessageId);
  const lead = message && leadById(message.leadId);
  const customerText = el('#customer-reply-input')?.value.trim();
  if (!message || !lead || !customerText) return;
  if (!agentRuntime.connected) { toast('Ligue o executor local do Codex para analisar a resposta.'); return; }
  customerReplyBusy = true;
  renderPages();
  try {
    const response = await fetch('/api/agent-runtime/customer-reply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead: { name: lead.name, category: lead.category, city: lead.city, website: lead.website, websiteUrl: lead.websiteUrl, salesScript: lead.salesScript, evidence: lead.evidence, stage: lead.stage },
        initialMessage: message.text, initialWasSent: Boolean(message.sentAt), conversation: message.conversation || [], customerReply: customerText
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Não consegui analisar a resposta. Confira se o executor local continua ligado.');
    message.conversation ||= [];
    message.conversation.push({ role: 'cliente', text: customerText, createdAt: isoDate(Date.now()) });
    message.conversation.push({ role: 'sugestao', status: 'rascunho', text: removeEmojis(payload.reply || ''), createdAt: isoDate(Date.now()) });
    const previousStage = lead.stage;
    const nextStage = ['interessado', 'respondeu', 'perdido', 'nao-contatar'].includes(payload.nextStage) ? payload.nextStage : 'respondeu';
    if (lead.stage !== 'ganho') {
      if (nextStage === 'nao-contatar') { lead.stage = 'nao-contatar'; lead.nextAction = 'Não realizar novo contato'; }
      else if (nextStage === 'perdido' && lead.stage !== 'nao-contatar') { lead.stage = 'perdido'; lead.nextAction = 'Oportunidade encerrada sem venda'; }
      else if (nextStage === 'interessado' && !['perdido', 'nao-contatar'].includes(lead.stage)) { lead.stage = 'interessado'; lead.nextAction = 'Apresentar uma ideia e alinhar os próximos passos'; }
      else if (nextStage === 'respondeu' && lead.stage === 'contatado') { lead.stage = 'respondeu'; lead.nextAction = 'Responder ao cliente e registrar o próximo passo'; }
    }
    lead.responseDue = null;
    persist();
    toast(lead.stage !== previousStage ? `Resposta registrada. Etapa atualizada para ${stageLabel(lead.stage)}.` : 'Resposta registrada. O prazo de espera foi encerrado. Revise a sugestão da IA.');
  } catch (error) {
    toast(error.message || 'Não consegui analisar a resposta.');
  } finally {
    customerReplyBusy = false;
    renderPages();
    const history = el('.reply-history');
    if (history) history.scrollTop = history.scrollHeight;
  }
}
async function copyCustomerReply(id) {
  const message = state.messages.find((item) => item.id === id);
  const suggestion = [...(message?.conversation || [])].reverse().find((item) => item.role === 'sugestao' && item.status !== 'enviada');
  const text = el('#customer-reply-suggestion')?.value.trim();
  if (!suggestion || !text) return;
  suggestion.text = text;
  try { await navigator.clipboard.writeText(text); persist(); toast('Resposta copiada. Cole no WhatsApp e envie quando estiver pronto.'); }
  catch { persist(); el('#customer-reply-suggestion')?.select(); toast('Não consegui copiar automaticamente. O texto ficou selecionado para você copiar.'); }
}
function markCustomerReplySent(id) {
  const message = state.messages.find((item) => item.id === id);
  const suggestion = [...(message?.conversation || [])].reverse().find((item) => item.role === 'sugestao' && item.status !== 'enviada');
  const text = el('#customer-reply-suggestion')?.value.trim();
  if (!message || !suggestion || !text) return;
  suggestion.text = text;
  suggestion.role = 'operador';
  suggestion.status = 'enviada';
  suggestion.sentAt = isoDate(Date.now());
  const lead = leadById(message.leadId);
  if (lead && ['contatado', 'respondeu'].includes(lead.stage)) lead.stage = 'respondeu';
  if (lead && !['ganho', 'perdido', 'nao-contatar'].includes(lead.stage)) lead.responseDue = daysFromNow(7);
  persist();
  renderPages();
  toast(lead && !['ganho', 'perdido', 'nao-contatar'].includes(lead.stage) ? 'Resposta enviada manualmente. Novo prazo de retorno: 7 dias corridos.' : 'Resposta registrada como enviada por você.');
}
function confirmSent(id) { const message = state.messages.find((item) => item.id === id); if (!message) return; const firstConfirmation = !message.sentAt; message.sentAt = message.sentAt || isoDate(Date.now()); const lead = leadById(message.leadId); if (lead) { if (['novo', 'verificar', 'qualificado', 'mensagem', 'aprovacao'].includes(lead.stage)) lead.stage = 'contatado'; if (firstConfirmation && !['ganho', 'perdido', 'nao-contatar'].includes(lead.stage)) lead.responseDue = daysFromNow(7); } persist(); renderPages(); toast(firstConfirmation ? 'Envio registrado. O prazo para aguardar resposta é de 7 dias corridos.' : 'O envio manual já estava registrado.'); }
function exportData() { const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `central-comercial-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); toast('Backup JSON exportado.'); }
function resetData() { if (!confirm('Restaurar os dados de demonstração? Seus registros locais atuais serão substituídos.')) return; state = seedState(); currentLeadId = state.leads[0]?.id; currentMessageId = state.messages[0]?.id; persist(); renderPages(); toast('Dados de demonstração restaurados.'); }
function toast(message) { const node = el('#toast'); if (!node) return; node.textContent = message; node.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => node.classList.remove('show'), 3400); }

applyTheme();
renderShell();
renderPages();
hydrateRemoteState();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
setInterval(refreshLiveCountdowns, 1000);
setInterval(() => { if (document.visibilityState === 'visible') { if (currentPage === 'overview' || currentPage === 'projects' || currentPage === 'leads') renderPages(); } }, 60000);
setInterval(() => { if (currentPage === 'agents' && document.visibilityState === 'visible') refreshAgentRuntime(); }, 2500);
refreshAgentRuntime(false);
