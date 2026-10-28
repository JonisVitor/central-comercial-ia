import './styles.css';

const STORAGE_KEY = 'central-comercial-ia:v1';

const LEAD_STAGES = [
  ['novo', 'Novo lead'], ['verificar', 'Precisa verificar'], ['qualificado', 'Qualificado'],
  ['mensagem', 'Mensagem preparada'], ['aprovacao', 'Aguardando aprovação'], ['contatado', 'Contatado'],
  ['respondeu', 'Respondeu'], ['interessado', 'Interessado'], ['proposta', 'Proposta enviada'],
  ['negociacao', 'Negociação'], ['ganho', 'Ganho'], ['perdido', 'Perdido'], ['nao-contatar', 'Não contatar']
];
const PROJECT_STAGES = [
  ['confirmado', 'Venda confirmada'], ['materiais', 'Aguardando materiais'], ['producao', 'Em produção'],
  ['revisao', 'Revisão do cliente'], ['ajustes', 'Ajustes adicionais'], ['hospedagem', 'Hospedagem configurada'],
  ['entregue', 'Projeto entregue'], ['ativo', 'Hospedagem ativa']
];
const DEMO_MARKER = 'demo';

const el = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const today = () => new Date();
const isoDate = (date) => new Date(date).toISOString();
const daysFromNow = (days, hours = 0) => isoDate(Date.now() + (days * 86400000) + (hours * 3600000));
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const formatDate = (value) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value)).replace('.', '') : '—';
const formatLongDate = (value) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value)) : '—';
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
let leadFilter = 'todos';
let leadSearch = '';
let remoteHydrated = false;
let syncTimer;

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.leads && saved?.projects && saved?.messages) {
      saved.settings = { demo: true, theme: 'dark', ...(saved.settings || {}) };
      return saved;
    }
  } catch (error) { console.warn('Não foi possível ler o armazenamento local.', error); }
  return seedState();
}
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
    <div id="modal-root"></div><div class="toast" id="toast" role="status"></div>`;
  bindShellEvents();
}

function navItem(page, icon, label) { return `<button class="nav-item ${currentPage === page ? 'active' : ''}" data-page="${page}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`; }
function pageHeader(kicker, title, lede, action = '') { return `<div class="page-heading"><div><p class="page-kicker">${kicker}</p><h1>${title}</h1><p class="lede">${lede}</p></div>${action}</div>`; }

function renderPages() {
  el('#pages').innerHTML = `
    <section class="page ${currentPage === 'overview' ? 'active' : ''}" data-page-view="overview">${renderOverview()}</section>
    <section class="page ${currentPage === 'leads' ? 'active' : ''}" data-page-view="leads">${renderLeads()}</section>
    <section class="page ${currentPage === 'projects' ? 'active' : ''}" data-page-view="projects">${renderProjects()}</section>
    <section class="page ${currentPage === 'messages' ? 'active' : ''}" data-page-view="messages">${renderMessages()}</section>
    <section class="page ${currentPage === 'services' ? 'active' : ''}" data-page-view="services">${renderServices()}</section>
    <section class="page ${currentPage === 'settings' ? 'active' : ''}" data-page-view="settings">${renderSettings()}</section>`;
  el('#breadcrumb-current').textContent = { overview: 'Visão geral', leads: 'Prospecção', projects: 'Projetos', messages: 'Conversas', services: 'Serviços', settings: 'Configurações' }[currentPage];
  bindPageEvents();
}

function renderOverview() {
  const hot = state.leads.filter((lead) => lead.heat >= 70).length;
  const waiting = state.leads.filter((lead) => ['contatado', 'aprovacao'].includes(lead.stage)).length;
  const activeProjects = state.projects.filter((project) => !['entregue', 'ativo'].includes(project.stage)).length;
  const priorityLeads = [...state.leads].sort((a, b) => b.heat - a.heat).slice(0, 4);
  const deadlines = [...state.projects].filter((project) => !['entregue', 'ativo'].includes(project.stage)).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 4);
  const counts = LEAD_STAGES.slice(0, 7).map(([id, label]) => ({ id, label, count: state.leads.filter((lead) => lead.stage === id).length }));
  return `${pageHeader('Painel de operação', 'O próximo contato está aqui.', 'Priorize os leads mais quentes, acompanhe respostas e não deixe um prazo passar despercebido.', '<button class="primary-btn" data-action="new-lead">+ Cadastrar lead</button>')}
    <div class="metric-grid">
      ${metricCard('Leads no radar', state.leads.length, 'empresas cadastradas', '◎')}
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
  const filtered = state.leads.filter((lead) => `${lead.name} ${lead.category} ${lead.city}`.toLowerCase().includes(leadSearch.toLowerCase()) && (leadFilter === 'todos' || lead.stage === leadFilter));
  const filters = [['todos', 'Todos'], ['quentes', '♨ Quentes'], ['novo', 'Novos'], ['contatado', 'Aguardando'], ['respondeu', 'Respondeu']];
  return `${pageHeader('Prospecção manual assistida', 'Leads com uma razão para conversar.', 'Cadastre empresas encontradas no Google Maps e deixe a evidência visível antes de priorizar o próximo contato.', '<button class="primary-btn" data-action="new-lead">+ Novo lead</button>')}
    <div class="toolbar"><input class="search-input" id="lead-search" type="search" placeholder="Buscar empresa, nicho ou cidade" value="${esc(leadSearch)}" />${filters.map(([id, label]) => `<button class="filter-btn ${leadFilter === id ? 'active' : ''}" data-lead-filter="${id}">${label}</button>`).join('')}<span class="filter-spacer"></span><button class="ghost-btn" data-action="maps-task">⊕ Nova pesquisa Maps</button></div>
    <div class="lead-grid">${filtered.length ? filtered.map(renderLeadCard).join('') : emptyState('Nenhum lead encontrado', 'Ajuste a busca ou cadastre uma nova empresa.')}</div>`;
}
function renderLeadCard(lead) {
  const message = messageByLead(lead.id); const count = lead.responseDue ? countdown(lead.responseDue) : null;
  return `<article class="lead-card"><div class="card-top"><div><div class="card-name">${esc(lead.name)}</div><div class="card-location">${esc(lead.category)} · ${esc(lead.city)}</div></div><span class="heat-badge">♨ ${lead.heat}/100</span></div><div class="card-tags"><span class="tag ${lead.website === 'Não encontrado' ? 'red' : 'yellow'}">${lead.website === 'Não encontrado' ? 'Site não encontrado' : 'Site identificado'}</span><span class="tag ${lead.maps === 'Cadastro incompleto' ? 'yellow' : 'green'}">Maps: ${esc(lead.maps.replace('Cadastro ', ''))}</span><span class="status-badge ${statusTone(lead.stage)}">${stageLabel(lead.stage)}</span></div><p class="card-evidence">${esc(lead.evidence)}</p><div class="card-footer"><select class="status-select" data-lead-stage="${lead.id}" aria-label="Etapa de ${esc(lead.name)}">${LEAD_STAGES.map(([id, label]) => `<option value="${id}" ${id === lead.stage ? 'selected' : ''}>${label}</option>`).join('')}</select>${count ? `<span class="muted" data-countdown-date="${esc(lead.responseDue || '')}" data-countdown-tone="plain">${count.text}</span>` : '<span class="muted">sem prazo</span>'}<button class="detail-link" data-lead-id="${lead.id}">Abrir →</button></div>${message ? `<div class="row-meta" style="margin-top:12px">${message.sentAt ? 'Contato confirmado manualmente' : 'Mensagem pronta para revisão'}</div>` : ''}</article>`;
}

function renderProjects() {
  return `${pageHeader('Entrega e acompanhamento', 'Cada projeto tem um próximo passo.', 'Mova a etapa com um clique e veja quanto tempo falta em dias corridos — ou em horas quando o prazo apertar.', '<button class="primary-btn" data-action="new-project">+ Novo projeto</button>')}
    <div class="notice">Os prazos são contados em dias corridos. O relógio atualiza automaticamente e sinaliza quando entra nas últimas 24 horas.</div>
    <div class="project-grid">${state.projects.length ? state.projects.map(renderProjectCard).join('') : emptyState('Nenhum projeto criado', 'Converta uma oportunidade ganha em projeto para acompanhar a entrega.')}</div>`;
}
function renderProjectCard(project) { const index = PROJECT_STAGES.findIndex(([id]) => id === project.stage); const count = countdown(project.dueDate); const lead = leadById(project.leadId); return `<article class="project-card"><div class="card-top"><div><div class="card-name">${esc(project.name)}</div><div class="card-location">${esc(project.service)}</div></div><span class="status-badge ${count.overdue ? 'red' : count.urgent ? 'yellow' : 'green'}" data-countdown-date="${esc(project.dueDate || '')}" data-countdown-tone="status">${count.text}</span></div><div class="stage-heading"><span>Progresso do projeto</span><strong>Etapa ${index + 1} de ${PROJECT_STAGES.length}</strong></div><div class="stage-map" aria-label="Etapas do projeto">${PROJECT_STAGES.map(([id, label], i) => `<div class="stage-item ${i < index ? 'done' : i === index ? 'current' : ''}"><span class="stage-marker">${i < index ? '✓' : i === index ? '●' : i + 1}</span><span class="stage-label">${label}</span></div>`).join('')}</div><div class="project-progress" aria-label="${Math.round(((index + 1) / PROJECT_STAGES.length) * 100)}% concluído"><span style="width:${Math.max(8, ((index + 1) / PROJECT_STAGES.length) * 100)}%"></span></div><div class="project-dates"><span>Início: ${formatDate(project.startDate)}</span><span>Limite: ${formatDate(project.dueDate)}</span></div><div class="card-footer"><span class="muted">${lead ? esc(lead.name) : 'Projeto cadastrado'}</span><button class="detail-link" data-project-id="${project.id}">Editar etapas →</button></div></article>`; }

function renderMessages() {
  const current = messageByLead(currentLeadId) || state.messages[0];
  if (current) currentMessageId = current.id;
  const lead = current ? leadById(current.leadId) : null;
  return `${pageHeader('Conversas sob controle', 'Mensagem pronta não é mensagem enviada.', 'Revise, personalize e só registre o contato depois que você confirmar o envio manual no WhatsApp.', '<button class="primary-btn" data-action="new-lead">+ Preparar contato</button>')}
    <div class="messages-layout"><div class="message-list"><div class="message-list-head">${state.messages.length} rascunhos registrados</div>${state.messages.map((message) => { const itemLead = leadById(message.leadId); return `<button class="message-item ${message.id === currentMessageId ? 'active' : ''}" data-message-id="${message.id}"><strong>${esc(itemLead?.name || 'Empresa')}</strong><span>${message.sentAt ? '✓ Enviado manualmente' : 'Rascunho aguardando revisão'}</span></button>`; }).join('')}</div><div class="message-editor">${current && lead ? `<div class="panel-header"><div><p class="page-kicker">${messageStateLabel(current)}</p><h2>${esc(lead.name)}</h2><p>${esc(lead.category)} · ${esc(lead.city)}</p></div><span class="heat-badge">♨ ${lead.heat}/100</span></div><div class="message-meta"><span class="tag">Site: ${esc(lead.website)}</span><span class="tag">Maps: ${esc(lead.maps)}</span><span class="tag">Oferta: R$ 297</span></div><label class="field"><span class="muted" style="font-size:12px">Texto sugerido — edite antes de abrir o WhatsApp</span><textarea class="field-textarea" id="message-text">${esc(current.text)}</textarea></label><div class="message-actions"><button class="primary-btn" data-action="save-message" data-message-id="${current.id}">Salvar rascunho</button><button class="ghost-btn" data-action="open-whatsapp" data-message-id="${current.id}">↗ Abrir WhatsApp</button><button class="ghost-btn" data-action="confirm-sent" data-message-id="${current.id}">${current.sentAt ? '✓ Enviado manualmente' : 'Confirmar envio manual'}</button></div><p class="modal-note" style="margin-top:18px">A Central não envia mensagens automaticamente. “Confirmar envio manual” apenas registra que você apertou o botão de enviar fora daqui.</p>` : emptyState('Nenhuma mensagem preparada', 'Cadastre um lead e prepare o primeiro contato.')}</div></div>`;
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
  all('[data-action="maps-task"]').forEach((button) => button.addEventListener('click', () => toast('Pesquisa assistida: escolha nicho e região no Google Maps e cadastre os resultados aqui.')));
  all('[data-lead-id]').forEach((button) => button.addEventListener('click', (event) => { if (event.target.closest('select')) return; openLeadDetail(button.dataset.leadId); }));
  all('[data-project-id]').forEach((button) => button.addEventListener('click', () => openProjectDetail(button.dataset.projectId)));
  all('[data-lead-filter]').forEach((button) => button.addEventListener('click', () => { leadFilter = button.dataset.leadFilter; renderPages(); }));
  el('#lead-search')?.addEventListener('input', (event) => { leadSearch = event.target.value; renderPages(); const input = el('#lead-search'); input?.focus(); input?.setSelectionRange(leadSearch.length, leadSearch.length); });
  all('[data-lead-stage]').forEach((select) => select.addEventListener('change', () => updateLeadStage(select.dataset.leadStage, select.value)));
  all('[data-message-id]').forEach((button) => button.addEventListener('click', () => { currentMessageId = button.dataset.messageId; const message = state.messages.find((item) => item.id === currentMessageId); currentLeadId = message?.leadId; renderPages(); }));
  all('[data-action="save-message"]').forEach((button) => button.addEventListener('click', () => saveMessage(button.dataset.messageId)));
  all('[data-action="open-whatsapp"]').forEach((button) => button.addEventListener('click', () => openWhatsApp(button.dataset.messageId)));
  all('[data-action="confirm-sent"]').forEach((button) => button.addEventListener('click', () => confirmSent(button.dataset.messageId)));
  all('[data-action="export"]').forEach((button) => button.addEventListener('click', exportData));
  all('[data-action="reset"]').forEach((button) => button.addEventListener('click', resetData));
}
function navigate(page) { currentPage = page; renderShell(); renderPages(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function toggleTheme() { state.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light'; persist(); applyTheme(); renderShell(); renderPages(); toast(state.settings.theme === 'light' ? 'Modo claro ativado.' : 'Modo escuro ativado.'); }

function modal(content) { el('#modal-root').innerHTML = `<div class="modal-backdrop open" data-close-modal><div class="modal" role="dialog" aria-modal="true">${content}</div></div>`; el('[data-close-modal]')?.addEventListener('click', (event) => { if (event.target === event.currentTarget) closeModal(); }); el('[data-modal-close]')?.addEventListener('click', closeModal); }
function closeModal() { el('#modal-root').innerHTML = ''; }
function openLeadModal() { modal(`<div class="modal-header"><div><p class="page-kicker">Novo registro</p><h2>Cadastrar lead</h2><p>A empresa pode ter vindo de uma consulta manual no Google Maps.</p></div><button class="icon-btn" data-modal-close aria-label="Fechar">×</button></div><form id="lead-form"><div class="form-grid"><label class="field"><span>Nome da empresa *</span><input class="field-input" name="name" required placeholder="Ex.: Studio Aquarela" /></label><label class="field"><span>Nicho *</span><input class="field-input" name="category" required placeholder="Ex.: manicure e salão" /></label><label class="field"><span>Cidade / região *</span><input class="field-input" name="city" required placeholder="Ex.: São Carlos, SP" /></label><label class="field"><span>Contato comercial</span><input class="field-input" name="phone" placeholder="Telefone ou WhatsApp público" /></label><label class="field"><span>Site identificado</span><select class="field-select" name="website"><option>Não encontrado</option><option>Encontrado</option><option>Não verificado</option></select></label><label class="field"><span>Cadastro no Maps</span><select class="field-select" name="maps"><option>Cadastro incompleto</option><option>Cadastro regular</option><option>Cadastro forte</option></select></label><label class="field full"><span>Calor inicial do lead</span><span class="range-wrap"><input class="heat-range" type="range" name="heat" min="0" max="100" value="70" /><strong class="range-value" id="modal-heat-value">70/100</strong></span></label><label class="field full"><span>Evidência observável</span><textarea class="field-textarea" name="evidence" required placeholder="O que foi observado no site, Maps ou presença digital?"></textarea></label><label class="field full"><span>Próxima ação / notas</span><textarea class="field-textarea" name="notes" placeholder="Ex.: confirmar se atende por agendamento."></textarea></label></div><div class="modal-actions"><button type="button" class="ghost-btn" data-modal-close>Cancelar</button><button class="primary-btn" type="submit">Salvar lead</button></div></form>`); el('#lead-form').addEventListener('submit', saveLead); el('.heat-range').addEventListener('input', (event) => { el('#modal-heat-value').textContent = `${event.target.value}/100`; }); }
function saveLead(event) { event.preventDefault(); const form = new FormData(event.target); const lead = { id: uid('lead'), name: form.get('name'), category: form.get('category'), city: form.get('city'), phone: form.get('phone'), website: form.get('website'), maps: form.get('maps'), heat: Number(form.get('heat')), stage: 'novo', evidence: form.get('evidence'), source: 'Google Maps · consulta manual', notes: form.get('notes'), nextAction: 'Verificar e qualificar', responseDue: null, createdAt: isoDate(Date.now()), demo: false }; state.leads.unshift(lead); state.messages.unshift({ id: uid('message'), leadId: lead.id, text: `Olá, ${lead.name}! Vi o perfil de vocês no Google e queria mostrar uma ideia simples para melhorar a apresentação do negócio online. Posso te enviar para você dar uma olhada?`, sentAt: null }); state.settings.demo = false; persist(); currentLeadId = lead.id; closeModal(); toast('Lead cadastrado e mensagem inicial preparada.'); renderPages(); }
function openLeadDetail(id) { const lead = leadById(id); if (!lead) return; const message = messageByLead(id); modal(`<div class="modal-header"><div><p class="page-kicker">Detalhes do lead</p><h2>${esc(lead.name)}</h2><p>${esc(lead.category)} · ${esc(lead.city)}</p></div><button class="icon-btn" data-modal-close aria-label="Fechar">×</button></div><div class="heat-badge" style="font-size:14px">♨ ${lead.heat}/100 · ${lead.heat >= 70 ? 'lead quente' : lead.heat >= 40 ? 'lead morno' : 'lead frio'}</div><div class="detail-grid"><div class="detail-item"><small>Site</small><strong>${esc(lead.website)}</strong></div><div class="detail-item"><small>Google Maps</small><strong>${esc(lead.maps)}</strong></div><div class="detail-item"><small>Etapa atual</small><strong>${stageLabel(lead.stage)}</strong></div><div class="detail-item"><small>Prazo de resposta</small><strong>${lead.responseDue ? countdown(lead.responseDue).text : 'Ainda não definido'}</strong></div></div><p class="modal-note"><strong>Evidência:</strong> ${esc(lead.evidence)}<br /><br /><strong>Notas:</strong> ${esc(lead.notes || 'Sem notas registradas.')}</p><div class="modal-actions"><button class="ghost-btn" data-modal-close>Fechar</button>${message ? `<button class="primary-btn" data-go-messages="${lead.id}">Abrir conversa</button>` : ''}</div>`); el('[data-go-messages]')?.addEventListener('click', () => { currentLeadId = id; closeModal(); navigate('messages'); }); }
function updateLeadStage(id, stage) { const lead = leadById(id); if (!lead) return; lead.stage = stage; if (stage === 'contatado' && !lead.responseDue) lead.responseDue = daysFromNow(7); persist(); renderPages(); toast(`Etapa atualizada: ${stageLabel(stage)}.`); }

function openProjectModal() { modal(`<div class="modal-header"><div><p class="page-kicker">Novo acompanhamento</p><h2>Criar projeto</h2><p>Use dias corridos para acompanhar a produção.</p></div><button class="icon-btn" data-modal-close aria-label="Fechar">×</button></div><form id="project-form"><div class="form-grid"><label class="field"><span>Nome do projeto *</span><input class="field-input" name="name" required placeholder="Ex.: Studio Aquarela" /></label><label class="field"><span>Serviço</span><input class="field-input" name="service" value="Landing page + hospedagem anual" /></label><label class="field"><span>Data de início *</span><input class="field-input" type="date" name="startDate" value="${new Date().toISOString().slice(0, 10)}" required /></label><label class="field"><span>Prazo em dias corridos *</span><input class="field-input" type="number" name="days" value="7" min="1" max="365" required /></label><label class="field full"><span>Observações</span><textarea class="field-textarea" name="notes" placeholder="Materiais recebidos, escopo, próxima ação..."></textarea></label></div><div class="modal-actions"><button type="button" class="ghost-btn" data-modal-close>Cancelar</button><button class="primary-btn" type="submit">Criar projeto</button></div></form>`); el('#project-form').addEventListener('submit', saveProject); }
function saveProject(event) { event.preventDefault(); const form = new FormData(event.target); const start = new Date(`${form.get('startDate')}T09:00:00`); const project = { id: uid('project'), leadId: '', name: form.get('name'), service: form.get('service'), stage: 'confirmado', startDate: isoDate(start), dueDate: isoDate(start.getTime() + Number(form.get('days')) * 86400000), notes: form.get('notes'), demo: false }; state.projects.unshift(project); state.settings.demo = false; persist(); closeModal(); toast('Projeto criado com prazo em dias corridos.'); renderPages(); }
function openProjectDetail(id) { const project = projectById(id); if (!project) return; const current = PROJECT_STAGES.findIndex(([stage]) => stage === project.stage); modal(`<div class="modal-header"><div><p class="page-kicker">Acompanhamento do projeto</p><h2>${esc(project.name)}</h2><p>${esc(project.service)}</p></div><button class="icon-btn" data-modal-close aria-label="Fechar">×</button></div><div class="detail-grid"><div class="detail-item"><small>Prazo</small><strong class="${countdown(project.dueDate).overdue ? 'muted' : ''}" data-countdown-date="${esc(project.dueDate || '')}" data-countdown-tone="plain">${countdown(project.dueDate).text}</strong></div><div class="detail-item"><small>Limite</small><strong>${formatLongDate(project.dueDate)}</strong></div></div><div class="field"><label>Escolha a etapa atual</label><div class="stage-choice-list">${PROJECT_STAGES.map(([stage, label], i) => `<button type="button" class="stage-choice ${i < current ? 'done' : i === current ? 'current' : ''}" data-project-stage="${stage}"><span class="stage-marker">${i < current ? '✓' : i === current ? '●' : i + 1}</span><span>${label}</span></button>`).join('')}</div><p class="muted" id="project-stage-label">Atual: ${stageLabel(project.stage, PROJECT_STAGES)}</p></div><p class="modal-note">${esc(project.notes || 'Sem observações registradas.')}</p><div class="modal-actions"><button class="ghost-btn" data-modal-close>Fechar</button></div>`); all('[data-project-stage]').forEach((button) => button.addEventListener('click', () => { project.stage = button.dataset.projectStage; persist(); closeModal(); renderPages(); toast(`Projeto movido para: ${stageLabel(project.stage, PROJECT_STAGES)}.`); })); }

  function saveMessage(id) { const message = state.messages.find((item) => item.id === id); const text = el('#message-text')?.value.trim(); if (!message || !text) return; message.text = text; persist(); toast(isLocalHost ? 'Rascunho salvo no dispositivo.' : 'Rascunho salvo e enviado para sincronização.'); }
function openWhatsApp(id) { const message = state.messages.find((item) => item.id === id); const lead = message && leadById(message.leadId); const phone = (lead?.phone || '').replace(/\D/g, ''); if (!message || !lead) return; saveMessage(id); const url = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(message.text)}` : `https://web.whatsapp.com/send?text=${encodeURIComponent(message.text)}`; window.open(url, '_blank', 'noopener'); toast('WhatsApp aberto. Confirme o destinatário e envie manualmente.'); }
function confirmSent(id) { const message = state.messages.find((item) => item.id === id); if (!message) return; message.sentAt = message.sentAt || isoDate(Date.now()); const lead = leadById(message.leadId); if (lead && ['novo', 'verificar', 'qualificado', 'mensagem', 'aprovacao'].includes(lead.stage)) { lead.stage = 'contatado'; lead.responseDue = lead.responseDue || daysFromNow(7); } persist(); renderPages(); toast('Envio manual registrado. Prazo de resposta iniciado em 7 dias corridos.'); }
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
