export function verificationLabel(lead) {
  return ({queued:'Na fila de verificação automática',working:'IA pesquisando os canais da empresa',complete:'Presença digital verificada',inconclusive:'Pesquisa concluída · há pontos não confirmados',error:'A pesquisa precisa ser repetida'})[lead.verification?.state] || 'Verificação automática após salvar';
}

export function verificationNotice(lead, esc, local) {
  const verification=lead.verification;
  const pending=['queued','working'].includes(verification?.state);
  const copy=!local ? 'A pesquisa automática funciona no painel local ou no acesso protegido deste PC.' : verification?.state==='working' ? 'O Codex está consultando fontes públicas. Os resultados serão salvos nesta ficha automaticamente.' : verification?.state==='queued' ? 'A IA vai conferir site, Maps, Instagram e publicações recentes. Pode continuar usando o painel.' : verification?.state==='error' ? verification.error : verification?.state==='inconclusive' ? 'A IA pesquisou os quatro pontos. Os itens não confirmados mostram abaixo o motivo e as fontes disponíveis.' : verification?.state==='complete' ? 'Resultados da pesquisa e seus ajustes estão salvos nesta ficha.' : 'Ao salvar, este lead entra na fila que confere os quatro canais.';
  return `<section class="presence-verification ${pending?'is-pending':''}" aria-live="polite"><strong>${esc(verificationLabel(lead))}</strong><p>${esc(copy)}</p>${verification?.completedAt ? `<small>Consultado em ${esc(new Date(verification.completedAt).toLocaleString('pt-BR'))}</small>` : ''}${local&&!pending ? '<button type="button" class="ghost-btn" data-reverify-lead>Pesquisar novamente</button>' : ''}</section>`;
}

export function verificationCheck(lead, key) {
  return lead.verification?.checks?.[({instagramStatus:'instagram',instagramActivity:'activity'})[key] || key];
}

export function verificationSources(check, esc) {
  if(!check?.sources?.length && !check?.evidence)return '';
  // URLs are validated server-side; validate again before inserting an href.
  const links=(check.sources||[]).flatMap(value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?[url]:[];}catch{return [];}});
  return `<details class="presence-sources"><summary>Ver evidência${links.length?' e fontes':''}</summary><p>${esc(check.evidence||'')}</p>${links.map((url,index)=>`<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">Fonte ${index+1} · ${esc(url.hostname)}</a>`).join('')}</details>`;
}
