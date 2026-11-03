const escape = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const dateKey = value => { const d = new Date(value); return Number.isNaN(+d) ? '' : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const id = prefix => `${prefix}-${crypto.randomUUID()}`;
export function createOperations(api) {
  let tab = 'queue', busy = false, notice = '', queueFilter = 'all', baseline;
  const data = () => {
    const s = api.getState();
    s.operations ||= {};
    s.operations.campaigns ||= []; s.operations.audit ||= []; s.operations.flowVersions ||= [];
    s.operations.followUp ||= { days:3, messageA:'', messageB:'' };
    s.operations.flowDraft ||= Object.fromEntries(api.stages.map(([stage,label]) => [stage, `Confira a etapa “${label}” e registre o próximo passo confirmado.`]));
    return s.operations;
  };
  const audit = (action, details, actor = 'Operador') => { const d=data(); d.audit.unshift({ id:id('audit'), at:new Date().toISOString(), action, details, actor }); d.audit = d.audit.slice(0, 1000); };
  function track() {
    const s=api.getState();
    const snapshot = new Map(s.leads.map(lead => [lead.id, {name:lead.name,stage:lead.stage}]));
    if (baseline) {
      for(const [key,lead] of snapshot) { const old=baseline.get(key); if(!old) audit('Lead cadastrado',lead.name,'Painel'); else if(old.stage!==lead.stage) audit('Etapa alterada',`${lead.name}: ${old.stage} → ${lead.stage}`,'Painel'); }
      for(const [key,lead] of baseline) if(!snapshot.has(key)) audit('Lead excluído',lead.name,'Operador / painel');
    }
    baseline=snapshot;
  }
  function instruction(lead) { return data().flowPublished?.[lead.stage] || ''; }
  function canSend(leadId) {
    const s=api.getState(), campaign=data().campaigns.find(c=>c.leadIds.includes(leadId) && c.status==='active');
    if(!campaign) return '';
    const day=dateKey(Date.now()), hour=new Date().toTimeString().slice(0,5);
    if(hour<campaign.start || hour>=campaign.end) return `Campanha fora do horário: ${campaign.start}–${campaign.end}.`;
    const sent=data().audit.filter(a=>a.action==='Envio confirmado' && a.campaignId===campaign.id && dateKey(a.at)===day).length;
    return sent>=campaign.limit ? `Limite da campanha atingido hoje (${campaign.limit}).` : '';
  }
  function sent(leadId) {
    const c=data().campaigns.find(c=>c.leadIds.includes(leadId) && c.status==='active');
    audit('Envio confirmado',api.getState().leads.find(l=>l.id===leadId)?.name || leadId,'Operador / WhatsApp');
    if(c) data().audit[0].campaignId=c.id;
  }
  async function advice(action,context,apply) {
    if(busy) return;
    if(!api.aiAvailable()) { notice='Abra o painel local e inicie o executor Codex pelo START-LOCAL.cmd para usar esta função de IA.';api.refresh();return; }
    busy=true; notice='Codex analisando os dados…'; api.refresh();
    try {
      const response=await fetch('/api/agent-runtime/operations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,context})});
      const result=await response.json(); if(!response.ok) throw new Error(result.error || 'Não consegui consultar o Codex local.');
      apply(result); notice=result.summary; audit('Sugestão da IA',result.summary,'Codex local'); api.save();
    } catch(error) { notice=error.message; api.toast(error.message); }
    finally { busy=false; api.refresh(); }
  }
  const btn = (action,label,extra='') => `<button type="button" class="ghost-btn" data-ops-action="${action}" ${extra}>${label}</button>`;
  function queueRows() {
    const s=api.getState();
    return s.messages.map(m=>({m,l:s.leads.find(l=>l.id===m.leadId)})).filter(x=>x.l && !['ganho','perdido','nao-contatar'].includes(x.l.stage)).map(x=>{
      const last=x.m.conversation?.at(-1);
      const kind=last?.role==='cliente'?'received':last?.role==='sugestao'&&last.status!=='enviada'?'draft':x.m.sentAt?'waiting':'new';
      return {...x,kind};
    }).sort((a,b)=>['received','draft','new','waiting'].indexOf(a.kind)-['received','draft','new','waiting'].indexOf(b.kind));
  }
  function brief() {
    const s=api.getState(), day=dateKey(Date.now());
    const events=(s.calendarItems||[]).filter(i=>i.status==='pending'&&i.date<=day);
    const projects=s.projects.filter(p=>p.dueDate && dateKey(p.dueDate)<=day && !['entregue','ativo'].includes(p.stage));
    const rows=queueRows(), needs=rows.filter(r=>['received','draft'].includes(r.kind));
    return `<section class="work-brief"><div><h2>Seu trabalho de hoje</h2><p>${events.length} tarefa${events.length===1?'':'s'} para hoje ou atrasada${events.length===1?'':'s'} · ${needs.length} conversa${needs.length===1?'':'s'} aguardando você.</p></div><div class="message-actions"><button type="button" class="ghost-btn" data-page="operations">Abrir fila de trabalho</button><button type="button" class="primary-btn" data-assistant-plan>Fechar o dia com a IA</button><button type="button" class="ghost-btn" data-enable-agenda-notifications>Ativar avisos de agenda</button></div>${projects.slice(0,4).map(p=>`<button type="button" class="work-row" data-project-id="${escape(p.id)}"><strong>Entregar: ${escape(p.name)}</strong><span>${escape(dateKey(p.dueDate))} · ${escape(p.aiSummary||p.notes||'Abrir resumo do projeto')}</span></button>`).join('')}${events.slice(0,5).map(item=>`<button type="button" class="work-row" data-agenda-id="${escape(item.id)}"><strong>${escape(item.title)}</strong><span>${escape(item.date)} ${escape(item.time||'')} · Ver detalhes</span></button>`).join('')}${s.dailyPlans?.find(p=>p.date===day)?.summary?`<p>${escape(s.dailyPlans.find(p=>p.date===day).summary)}</p>`:''}</section>`;
  }
  function render() {
    const s=api.getState(), d=data();
    const tabs=[['queue','Fila de trabalho'],['campaigns','Campanhas'],['flow','Funil'],['followups','Retomadas'],['recovery','Recuperação'],['metrics','Resultados'],['audit','Histórico'],['integrations','Integrações de IA']];
    let body='';
    if(tab==='queue') {
      const labels={received:'Cliente respondeu',draft:'Rascunho para revisar',waiting:'Aguardando retorno',new:'Preparar contato'};
      const rows=queueRows().filter(r=>queueFilter==='all'||r.kind===queueFilter);
      body=`<div class="work-toolbar"><label class="field"><span>Mostrar</span><select class="field-input" id="work-queue-filter"><option value="all">Todos os ativos</option>${Object.entries(labels).map(([key,value])=>`<option value="${key}" ${queueFilter===key?'selected':''}>${value}</option>`).join('')}</select></label><p>Respostas recebidas e rascunhos aparecem primeiro.</p></div><div class="work-list">${rows.map(({m,l,kind})=>`<article class="work-row"><div><strong>${escape(l.name)}</strong><p>${escape(labels[kind])} · ${escape(api.stageLabel(l.stage))}</p><small>${escape((l.aiNextStepStage===l.stage?l.aiNextStep:'')||instruction(l)||l.nextAction||'Abra a conversa para definir o próximo passo.')}</small></div><div class="message-actions">${btn('conversation','Abrir conversa',`data-id="${escape(l.id)}"`)}${btn('next-step','Analisar próximo passo com IA',`data-id="${escape(l.id)}" ${busy||!api.aiAvailable()?'disabled':''}`)}</div></article>`).join('')||'<p>Nenhuma conversa nesta fila.</p>'}</div>`;
    }
    if(tab==='campaigns') body=`<div class="work-columns"><section><h2>Organizar uma campanha</h2><form id="campaign-form" class="work-form"><label class="field"><span>Nome</span><input class="field-input" name="name" required maxlength="100" placeholder="Pet shops de São Carlos"></label><div class="form-grid"><label class="field"><span>Nicho</span><input class="field-input" name="niche" required maxlength="100"></label><label class="field"><span>Cidade</span><input class="field-input" name="city" required maxlength="100"></label><label class="field"><span>Limite diário de envios</span><input class="field-input" type="number" name="limit" min="1" max="100" value="20" required></label><label class="field"><span>Começar às</span><input class="field-input" type="time" name="start" value="09:00" required></label><label class="field"><span>Terminar às</span><input class="field-input" type="time" name="end" value="18:00" required></label></div><label class="field"><span>Leads participantes (Ctrl para selecionar vários)</span><select class="field-input work-multiselect" name="leadIds" multiple>${s.leads.filter(l=>!['ganho','perdido','nao-contatar'].includes(l.stage)).map(l=>`<option value="${escape(l.id)}">${escape(l.name)}</option>`).join('')}</select></label><button class="primary-btn">Criar campanha</button><p class="field-help">A campanha organiza pesquisas e rascunhos. Os envios continuam individuais e confirmados por você.</p></form></section><section><h2>Suas campanhas</h2>${d.campaigns.map(c=>`<article class="work-entry"><h3>${escape(c.name)}</h3><p>${escape(c.niche)} · ${escape(c.city)} · ${c.leadIds.length} leads</p><p>${c.limit}/dia · ${escape(c.start)}–${escape(c.end)} · ${c.status==='active'?'Ativa':'Pausada'}</p><div class="message-actions">${btn('campaign-toggle',c.status==='active'?'Pausar':'Ativar',`data-id="${c.id}"`)}${btn('campaign-research','Pesquisar leads com Codex',`data-id="${c.id}"`)}${btn('campaign-ai','Criar variantes com IA',`data-id="${c.id}" ${busy||!api.aiAvailable()?'disabled':''}`)}${btn('campaign-members','Editar participantes',`data-id="${c.id}"`)}</div>${c.messageA||c.messageB?`<label class="field"><span>Variante A</span><textarea class="field-textarea" data-campaign-a="${c.id}">${escape(c.messageA)}</textarea></label><label class="field"><span>Variante B</span><textarea class="field-textarea" data-campaign-b="${c.id}">${escape(c.messageB)}</textarea></label>${btn('campaign-apply','Salvar e distribuir nos rascunhos não enviados',`data-id="${c.id}"`)}`:''}</article>`).join('')||'<p>Crie a primeira campanha para organizar um grupo de contatos.</p>'}</section></div>`;
    if(tab==='flow') body=`<p>Edite os próximos passos, simule uma etapa e publique quando estiver pronto. A IA propõe instruções; você aprova a versão.</p><form id="flow-form" class="work-form">${api.stages.map(([stage,label])=>`<label class="field"><span>${escape(label)}</span><input class="field-input" name="${stage}" value="${escape(d.flowDraft[stage]||'')}" maxlength="700" required></label>`).join('')}<div class="message-actions"><button class="primary-btn">Salvar rascunho</button>${btn('flow-ai','Revisar com Codex',busy?'disabled':'')}${btn('flow-publish','Publicar versão')}</div></form><div class="work-entry"><label class="field"><span>Simular uma etapa</span><select class="field-input" id="flow-simulation">${api.stages.map(([stage,label])=>`<option value="${stage}">${escape(label)}</option>`).join('')}</select></label><p id="flow-preview">${escape(d.flowDraft[api.stages[0][0]])}</p><p class="field-help">Prévia do rascunho; não altera leads.</p></div><h2>Versões publicadas</h2>${d.flowVersions.map(v=>`<div class="work-row"><span>Versão ${v.version} · ${escape(new Date(v.at).toLocaleString('pt-BR'))}</span>${btn('flow-restore','Copiar para rascunho',`data-id="${v.id}"`)}</div>`).join('')||'<p>Nenhuma versão publicada ainda. O fluxo original continua ativo.</p>'}`;
    if(tab==='followups') {
      const pending=(s.calendarItems||[]).filter(i=>i.source==='follow-up'&&i.status==='pending');
      const sent=s.messages.filter(m=>m.followUpSentAt);
      const answered=sent.filter(m=>m.conversation?.some(p=>p.role==='cliente'&&Date.parse(p.createdAt)>Date.parse(m.followUpSentAt)));
      body=`<h2>Retomadas sem esquecer ninguém</h2><p>${pending.length} lembretes pendentes · ${sent.length} retomadas registradas · ${answered.length} respostas após uma retomada. As contagens não comprovam que a mensagem causou a resposta.</p><form id="followups-form" class="work-form"><label class="field"><span>Quantos dias corridos esperar após o primeiro envio?</span><input class="field-input" name="days" type="number" min="1" max="6" value="${d.followUp.days}" required></label><p class="field-help">Aplica aos próximos lembretes. Os já agendados mantêm a data; o encerramento por silêncio continua após 7 dias do último envio.</p>${['A','B'].map(v=>`<label class="field"><span>Variante ${v} da retomada</span><textarea class="field-textarea" name="message${v}" maxlength="2000" placeholder="Deixe vazio para usar o texto padrão">${escape(d.followUp['message'+v])}</textarea></label>`).join('')}<div class="message-actions"><button class="primary-btn">Salvar regra e mensagens</button>${btn('followups-ai','Sugerir variantes com Codex',busy?'disabled':'')}</div></form><h2>Pendências</h2>${pending.map(i=>`<div class="work-row"><div><strong>${escape(i.leadName)}</strong><p>${escape(i.date)}</p></div>${btn('conversation','Abrir conversa',`data-id="${escape(i.leadId)}"`)}</div>`).join('')||'<p>Nenhuma retomada pendente.</p>'}`;
    }
    if(tab==='recovery') body=`<p>Somente contatos encerrados automaticamente por silêncio aparecem aqui. Recusas e pedidos para não contatar ficam fora desta fila.</p>${s.leads.filter(l=>l.stage==='perdido'&&l.autoClosedAt).map(l=>`<article class="work-entry"><h2>${escape(l.name)}</h2><p>${escape(l.autoCloseReason||'Sem resposta no prazo.')}</p><div class="message-actions">${btn('recovery-ai','Preparar retomada com IA',`data-id="${escape(l.id)}" ${busy||!api.aiAvailable()?'disabled':''}`)}${btn('recovery-open','Reabrir para revisão',`data-id="${escape(l.id)}"`)}</div>${l.recoveryDraft?`<p class="work-draft">${escape(l.recoveryDraft)}</p>${btn('recovery-copy','Copiar rascunho',`data-id="${escape(l.id)}"`)}`:''}</article>`).join('')||'<p>Não há contatos elegíveis para recuperação.</p>'}`;
    if(tab==='metrics') {
      const active=s.leads.filter(l=>!['ganho','perdido','nao-contatar'].includes(l.stage));
      const contacted=s.messages.filter(m=>m.sentAt).length, replied=s.messages.filter(m=>m.conversation?.some(p=>p.role==='cliente')).length;
      body=`<p>Totais atuais do CRM. Respostas e envios contam apenas registros confirmados; não representam taxa de conversão histórica.</p><dl class="work-metrics"><div><dt>Em prospecção</dt><dd>${active.length}</dd></div><div><dt>Contatos enviados</dt><dd>${contacted}</dd></div><div><dt>Conversas com resposta</dt><dd>${replied}</dd></div><div><dt>Vendas fechadas</dt><dd>${s.leads.filter(l=>l.stage==='ganho').length}</dd></div></dl><h2>Distribuição por etapa</h2>${api.stages.map(([stage,label])=>`<div class="work-row"><span>${escape(label)}</span><strong>${s.leads.filter(l=>l.stage===stage).length}</strong></div>`).join('')}<h2>Variantes das campanhas</h2><p>Compare as contagens; diferenças pequenas não comprovam que uma abordagem é melhor.</p>${d.campaigns.map(c=>`<article class="work-entry"><h3>${escape(c.name)}</h3>${['A','B'].map(v=>{const ms=s.messages.filter(m=>m.campaignId===c.id&&m.variant===v);return `<p>Variante ${v}: ${ms.filter(m=>m.sentAt).length} enviados · ${ms.filter(m=>m.conversation?.some(p=>p.role==='cliente')).length} com resposta</p>`;}).join('')}</article>`).join('')}`;
    }
    if(tab==='audit') body=`<p>Registro local das etapas, sugestões de IA e ações executadas. Não guarda credenciais nem QR Codes.</p><div class="work-list">${d.audit.slice(0,200).map(a=>`<article class="work-row"><div><strong>${escape(a.action)}</strong><p>${escape(a.details)}</p><small>${escape(a.actor)} · ${escape(new Date(a.at).toLocaleString('pt-BR'))}</small></div></article>`).join('')||'<p>As próximas ações realizadas no painel serão registradas aqui.</p>'}</div>`;
    if(tab==='integrations') body=`<h2>Onde a IA trabalha</h2><div class="work-list">${[['Pesquisa e sete agentes','Codex local','Busca, triagem, verificação, qualificação, mensagens, acompanhamento, projetos e análise. Dependem do executor ligado.'],['Respostas e próximos passos','Codex local','Analisa o histórico fornecido e prepara rascunhos. O envio depende de você.'],['Campanhas, funil e recuperação','Codex local','Botões de sugestão chamam o modelo; publicar, reabrir e aplicar rascunhos exigem sua ação.'],['Agenda e fechamento do dia','Codex local + regras','O chat extrai compromissos e o plano de amanhã. Lembretes e contagem de prazos são regras do painel.'],['Indicadores, limites e histórico','Sem IA — automação','Usam registros do CRM. Não consomem o limite do Codex.'],['WhatsApp por QR','Conexão local, sem IA própria','Recebe e envia mensagens. A análise é chamada pelo botão de IA; não há resposta automática ao cliente.'],['Áudios, imagens e respostas automáticas','Ainda não integrado','Mídias são sinalizadas para leitura no WhatsApp. Sugestões de texto exigem a ação de analisar; não há transcrição nem envio automático.'],['Produção de LPs e publicações nas redes','Ainda não integrado','Os agentes podem ajudar com instruções e textos; criar, aprovar e publicar materiais continua fora deste fluxo.']].map(([name,mode,description])=>`<article class="work-row"><div><strong>${escape(name)}</strong><p>${escape(description)}</p><small>${escape(mode)}</small></div></article>`).join('')}</div>`;
    return `<div class="work-page"><div class="work-heading"><h1>Central de trabalho</h1><p>Organize contatos, revise sugestões e acompanhe cada decisão.</p></div><nav class="work-tabs" aria-label="Áreas da central de trabalho">${tabs.map(([key,label])=>`<button type="button" class="ghost-btn ${tab===key?'is-selected':''}" data-ops-tab="${key}" aria-pressed="${tab===key}">${label}</button>`).join('')}</nav>${notice?`<p class="work-notice" role="status">${escape(notice)}</p>`:''}<section class="work-content" aria-busy="${busy}">${body}</section></div>`;
  }
  function bind() {
    const root=document.querySelector('[data-page-view="operations"]'); if(!root) return;
    root.querySelectorAll('[data-ops-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.opsTab;notice='';api.refresh();});
    root.querySelector('#work-queue-filter')?.addEventListener('change',e=>{queueFilter=e.target.value;api.refresh();});
    const saveFlow=()=>{ const form=root.querySelector('#flow-form'); if(form) for(const [stage] of api.stages) data().flowDraft[stage]=String(new FormData(form).get(stage)||'').trim().slice(0,700); };
    root.querySelector('#followups-form')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);Object.assign(data().followUp,{days:Math.max(1,Math.min(6,Number(f.get('days'))||3)),messageA:String(f.get('messageA')||'').trim(),messageB:String(f.get('messageB')||'').trim()});audit('Regra de retomada atualizada',`${data().followUp.days} dias para próximos lembretes.`);api.save();api.toast('Regra salva.');});
    root.querySelector('#flow-form')?.addEventListener('submit',e=>{e.preventDefault();saveFlow();audit('Funil salvo','Rascunho do funil atualizado.');api.save();api.toast('Rascunho salvo.');});
    root.querySelector('#flow-simulation')?.addEventListener('change',e=>{saveFlow();root.querySelector('#flow-preview').textContent=data().flowDraft[e.target.value]||'';});
    root.querySelector('#campaign-form')?.addEventListener('submit',e=>{
      e.preventDefault();const f=new FormData(e.target); const start=String(f.get('start')),end=String(f.get('end'));
      if(start>=end) return api.toast('O horário final deve ser depois do inicial.');
      const campaign={id:id('campaign'),name:String(f.get('name')).trim(),niche:String(f.get('niche')).trim(),city:String(f.get('city')).trim(),limit:Math.max(1,Math.min(100,Number(f.get('limit'))||20)),start,end,status:'active',leadIds:f.getAll('leadIds'),createdAt:new Date().toISOString(),messageA:'',messageB:''};
      data().campaigns.unshift(campaign);audit('Campanha criada',campaign.name);api.save();api.refresh();
    });
    root.querySelectorAll('[data-ops-action]').forEach(b=>b.onclick=async()=>{
      const action=b.dataset.opsAction, s=api.getState(), d=data(), c=d.campaigns.find(x=>x.id===b.dataset.id), l=s.leads.find(x=>x.id===b.dataset.id), m=l&&s.messages.find(x=>x.leadId===l.id);
      if(action==='followups-ai') return advice('follow-up',{rule:d.followUp},r=>{d.followUp.messageA=r.messageA;d.followUp.messageB=r.messageB;});
      if(action==='conversation') return api.openConversation(l.id);
      if(action==='next-step') return advice('next-step',{lead:l,message:m,projects:s.projects.filter(p=>p.leadId===l.id),instruction:instruction(l)},r=>{l.aiNextStep=r.summary;l.aiNextStepStage=l.stage;if(r.draft){m.conversation||=[];m.conversation.push({role:'sugestao',status:'rascunho',text:r.draft,createdAt:new Date().toISOString()});}});
      if(action==='campaign-toggle'){c.status=c.status==='active'?'paused':'active';audit('Campanha atualizada',`${c.name}: ${c.status}`);}
      if(action==='campaign-research'){audit('Pesquisa solicitada',`${c.niche} em ${c.city}`);api.save();return api.chat(`Pesquise até ${Math.min(c.limit,30)} empresas locais pequenas de ${c.niche} em ${c.city}. Exclua grandes redes e negócios com site próprio confirmado. Verifique Maps, Instagram e atividade recente com fontes. Não envie mensagens.`);}
      if(action==='campaign-ai') return advice('campaign',{campaign:c,leads:s.leads.filter(l=>c.leadIds.includes(l.id))},r=>{c.messageA=r.messageA;c.messageB=r.messageB;});
      if(action==='campaign-members') {
        api.modal(`<div class="modal-header"><h2>Participantes de ${escape(c.name)}</h2><button class="icon-btn" data-modal-close aria-label="Fechar">×</button></div><form id="campaign-members-form"><div class="work-list">${s.leads.filter(l=>!['ganho','perdido','nao-contatar'].includes(l.stage)).map(l=>`<label><input type="checkbox" name="ids" value="${escape(l.id)}" ${c.leadIds.includes(l.id)?'checked':''}> ${escape(l.name)}</label>`).join('')}</div><div class="modal-actions"><button class="primary-btn">Salvar participantes</button></div></form>`);
        document.querySelector('#campaign-members-form').onsubmit=e=>{e.preventDefault();c.leadIds=new FormData(e.target).getAll('ids');audit('Participantes atualizados',c.name);api.save();api.closeModal();api.refresh();};return;
      }
      if(action==='campaign-apply') {
        c.messageA=root.querySelector(`[data-campaign-a="${c.id}"]`).value.trim();c.messageB=root.querySelector(`[data-campaign-b="${c.id}"]`).value.trim();let count=0;
        for(const message of s.messages.filter(m=>c.leadIds.includes(m.leadId)&&!m.sentAt)){ const variant=count%2?'B':'A';const text=variant==='A'?c.messageA:c.messageB;if(text){message.text=text;message.campaignId=c.id;message.variant=variant;count++;}}
        audit('Variantes aplicadas',`${c.name}: ${count} rascunhos não enviados.`);api.toast(`${count} rascunhos atualizados. Revise antes de enviar.`);
      }
      if(action==='flow-ai'){saveFlow();return advice('flow',{stages:api.stages,instructions:d.flowDraft},r=>{for(const step of r.steps) if(api.stages.some(([stage])=>stage===step.stage)&&step.instruction) d.flowDraft[step.stage]=step.instruction;});}
      if(action==='flow-publish'){saveFlow();if(!confirm('Publicar estas instruções como próximos passos do funil?'))return;const v={id:id('flow'),version:(d.flowVersions[0]?.version||0)+1,at:new Date().toISOString(),steps:{...d.flowDraft}};d.flowVersions.unshift(v);d.flowVersions=d.flowVersions.slice(0,30);d.flowPublished={...v.steps};audit('Funil publicado',`Versão ${v.version}`);}
      if(action==='flow-restore'){const v=d.flowVersions.find(v=>v.id===b.dataset.id);if(v){d.flowDraft={...v.steps};audit('Versão copiada para rascunho',`Versão ${v.version}`);}}
      if(action==='recovery-ai') return advice('recovery',{lead:l,message:m},r=>{l.recoveryDraft=r.draft;});
      if(action==='recovery-open'){if(!l.autoClosedAt||!confirm(`Reabrir ${l.name} para revisão? Nenhuma mensagem será enviada.`))return;l.stage='verificar';l.responseDue=null;delete l.autoClosedAt;delete l.autoCloseReason;audit('Oportunidade reaberta',l.name);}
      if(action==='recovery-copy'){try{await navigator.clipboard.writeText(l.recoveryDraft||'');api.toast('Rascunho copiado.');}catch{api.toast('Não foi possível copiar. Selecione o texto manualmente.');}}
      api.save();api.refresh();
    });
  }
  async function enableNotifications() {
    if (!('Notification' in window)) return api.toast('Este navegador não oferece notificações. Confira as tarefas na agenda.');
    const permission=await Notification.requestPermission();
    api.toast(permission==='granted'?'Avisos ativados enquanto o painel estiver aberto.':'Os avisos não foram autorizados. A agenda continua disponível.');
    if(permission==='granted') notifyDue();
  }
  function notifyDue() {
    if (!('Notification' in window) || Notification.permission!=='granted') return;
    const s=api.getState(),d=data(),now=Date.now();d.notifications ||= [];
    const reminders=[...(s.calendarItems||[]).filter(i=>i.status==='pending'&&i.time).map(i=>({id:i.id,title:i.title,date:`${i.date}T${i.time}:00`})),...s.projects.filter(p=>p.dueDate&&!['entregue','ativo'].includes(p.stage)).map(p=>({id:p.id,title:`Entrega: ${p.name}`,date:p.dueDate}))];
    let changed=false;for(const item of reminders){const timestamp=Date.parse(item.date),key=`${item.id}|${item.date}`;if(timestamp>=now-15*60000 && timestamp<=now+15*60000 && !d.notifications.includes(key)){new Notification(item.title,{body:'Compromisso próximo. Abra o calendário da Central para ver os detalhes.',tag:key});d.notifications.push(key);changed=true;}}
    if(changed){d.notifications=d.notifications.slice(-1000);api.save();}
  }
  return {enableNotifications,notifyDue,render,bind,brief,audit,track,instruction,canSend,sent,followUpDelay:()=>data().followUp.days,followUpDraft:message=>data().followUp[message.followUpVariant==='B'?'messageB':'messageA']||''};
}
