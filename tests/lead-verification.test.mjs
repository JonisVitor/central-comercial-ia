import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createLocalStateStore} from '../agents-runtime/local-state.mjs';
import {normalizeVerification,createLeadVerifier,directMapsUrl,isSuccessfulSearchEvent} from '../agents-runtime/lead-verification.mjs';
import {rebasePresenceEdits} from '../lead-presence.js';
import {verificationNotice} from '../lead-verification-view.js';
const stamp='2026-11-03T14:00:00.000Z';
const check=(status,url,evidence='Fonte conferida')=>({status,url,evidence,sources:['https://example.com/empresa']});
const valid=()=>({id:'a',identityConfirmed:true,website:{...check('not_found',''),searchedOwnSite:true},maps:check('found','https://www.google.com/maps/place/Teste/data=!4m2!3m1!1sabc'),instagram:check('found','https://www.instagram.com/empresa/'),activity:{...check('active',''),postUrl:'https://www.instagram.com/p/teste/',latestPostAt:'2026-10-30T12:00:00Z'}});
test('recognizes real native and authenticated Desktop search events, never a model assertion or failed tool',()=>{
  assert.equal(isSuccessfulSearchEvent({type:'item.completed',item:{type:'web_search'}}),true);
  const event={type:'item.completed',item:{type:'mcp_tool_call',server:'codex_apps',tool:'search_service.web_run',status:'completed',error:null,result:{content:[{type:'text',text:'Real search results'}]}}};
  assert.equal(isSuccessfulSearchEvent(event),true);
  assert.equal(isSuccessfulSearchEvent({...event,item:{...event.item,error:{message:'failed'}}}),false);
  assert.equal(isSuccessfulSearchEvent({...event,item:{...event.item,result:{isError:true,content:[{type:'text',text:'error'}]}}}),false);
  assert.equal(isSuccessfulSearchEvent({type:'item.completed',item:{type:'agent_message',text:'Pesquisei tudo'}}),false);
});
test('activity requires observed recent dated post, identity, sources and actual web search',()=>{
  const raw=valid();assert.equal(normalizeVerification(raw,{searched:true,now:stamp}).state,'complete');
  assert.deepEqual(normalizeVerification(raw,{searched:false,now:stamp}).patch,{});
  for(const mutation of [row=>row.identityConfirmed=false,row=>row.activity.latestPostAt='',row=>row.activity.latestPostAt='2026-11-04',row=>row.activity.postUrl='https://www.instagram.com/empresa/',row=>row.activity.sources=[]]) {
    const row=valid();mutation(row);const result=normalizeVerification(row,{searched:true,now:stamp});
    assert.equal(result.checks.activity.status,'inconclusive');assert.notEqual(result.patch.instagramActivity,'Ativo · publicou nos últimos 90 dias');
  }
});
test('Maps search is not a verified place; social profile is not an own website',()=>{
  assert.equal(directMapsUrl('https://www.google.com/maps/search/?api=1&query=Empresa'),'');
  const raw=valid();raw.maps.url='https://www.google.com/maps/search/Empresa';raw.website=check('found','https://instagram.com/empresa/');
  const result=normalizeVerification(raw,{searched:true,now:stamp});assert.equal(result.checks.maps.status,'inconclusive');assert.equal(result.checks.website.status,'inconclusive');
});
test('blocked Instagram stays inconclusive with the real check date and reason',()=>{
  const raw=valid();raw.activity={status:'inconclusive',evidence:'Instagram exige login; não consegui ler datas.',sources:[]};
  const result=normalizeVerification(raw,{searched:true,now:stamp});assert.equal(result.patch.instagramActivity,'Não foi possível confirmar');assert.equal(result.patch.instagramCheckedAt,stamp);assert.match(result.checks.activity.evidence,/exige login/);
});
test('absence needs explicit search; inactivity needs actual profile review',()=>{
  const raw=valid();raw.website.searchedOwnSite=false;raw.activity.status='inactive';raw.activity.latestPostAt='2025-01-01';
  const result=normalizeVerification(raw,{searched:true,now:stamp});assert.equal(result.checks.website.status,'inconclusive');assert.equal(result.checks.activity.status,'inconclusive');
});
test('presence-only rebase preserves manual edits, conversations and deleted leads',()=>{
  const base={leads:[{id:'a',website:'Não verificado',websiteUrl:'',instagramStatus:'Não verificado'}],messages:[],projects:[]};
  const remote=structuredClone(base);Object.assign(remote.leads[0],{website:'Encontrado',websiteUrl:'https://example.com',instagramStatus:'Encontrado',instagramUrl:'https://instagram.com/empresa/',verification:{state:'complete'}});
  const local=structuredClone(base);Object.assign(local.leads[0],{website:'Não encontrado',notes:'Nota manual'});local.messages.push({id:'m',text:'Texto preservado'});
  const merged=rebasePresenceEdits(base,local,remote);assert.equal(merged.leads[0].website,'Não encontrado');assert.equal(merged.leads[0].instagramStatus,'Encontrado');assert.equal(merged.leads[0].notes,'Nota manual');assert.equal(merged.messages[0].text,'Texto preservado');
  assert.equal(rebasePresenceEdits(base,{...local,leads:[]},remote).leads.length,0);
  remote.messages.push({id:'other'});assert.equal(rebasePresenceEdits(base,local,remote),null);
});
async function withWorker(fn,research) {
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'central-verifier-test-'));
  const store=createLocalStateStore(directory),worker=createLeadVerifier({store,research,now:()=>stamp});
  try {await store.commit({leads:[{id:'a',name:'Empresa',city:'São Carlos',stage:'novo',website:'Não verificado',instagramStatus:'Não verificado'}],messages:[],projects:[]},0);await fn(store,worker);}
  finally{worker.stop();assert.ok(directory.startsWith(path.join(os.tmpdir(),'central-verifier-test-')));await fs.rm(directory,{recursive:true,force:true});}
}
test('queued registration survives worker restart and applies researched results without touching sales data',async()=>{
  await withWorker(async(store,worker)=>{
    await worker.schedule();const rev=(await store.read()).revision;await worker.schedule();assert.equal((await store.read()).revision,rev);
    await worker.tick();const lead=(await store.read()).state.leads[0];assert.equal(lead.verification.state,'complete');assert.equal(lead.instagramStatus,'Encontrado');assert.equal(lead.stage,'novo');
    await worker.schedule();assert.equal((await store.read()).state.leads[0].verification.state,'complete');
    await worker.schedule({retryIds:['a']});assert.equal((await store.read()).state.leads[0].verification.state,'queued');
  },async()=>({searched:true,text:`<CENTRAL_PRESENCE_JSON>${JSON.stringify({leads:[valid()]})}</CENTRAL_PRESENCE_JSON>`}));
});
test('manual edits made while the research is running win; deleted records stay deleted',async()=>{
  let during;
  await withWorker(async(store,worker)=>{
    during=()=>store.update(state=>{Object.assign(state.leads[0],{website:'Encontrado',websiteUrl:'https://manual.example',notes:'Não apagar'});state.messages.push({id:'m'});return true;});
    await worker.schedule();await worker.tick();const state=(await store.read()).state;assert.equal(state.leads[0].websiteUrl,'https://manual.example');assert.equal(state.leads[0].notes,'Não apagar');assert.equal(state.leads[0].verification.checks.website.status,'manual');assert.equal(state.messages.length,1);
    during=()=>store.update(state=>{state.leads=[];return true;});await worker.schedule({retryIds:['a']});await worker.tick();assert.equal((await store.read()).state.leads.length,0);
  },async()=>{await during();return {searched:true,text:`<CENTRAL_PRESENCE_JSON>${JSON.stringify({leads:[valid()]})}</CENTRAL_PRESENCE_JSON>`};});
});
test('failure or missing search cannot turn a lead into verified or cause automatic endless retries',async()=>{
  await withWorker(async(store,worker)=>{
    await worker.schedule();await worker.tick();const lead=(await store.read()).state.leads[0];assert.equal(lead.verification.state,'error');assert.equal(lead.website,'Não verificado');await worker.schedule();assert.equal((await store.read()).state.leads[0].verification.state,'error');
  },async()=>({searched:false,text:'invented data'}));
});
test('inconclusive UI explains the attempted check instead of claiming completion',()=>{
  const html=verificationNotice({verification:{state:'inconclusive',completedAt:stamp}},v=>v,true);assert.match(html,/não confirmados/);assert.match(html,/Pesquisar novamente/);assert.doesNotMatch(html,/Presença digital verificada/);
});
