import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperations } from '../operations.js';
function fixture() {
  const state={leads:[{id:'a',name:'Empresa A',stage:'novo'}],messages:[],calendarItems:[],projects:[]};
  const ops=createOperations({getState:()=>state,stages:[['novo','Novo'],['contatado','Contatado']],aiAvailable:()=>false});
  ops.track(); ops.instruction(state.leads[0]);
  return {state,ops};
}
test('audits actual stage changes once, without fabricating initial activity',()=>{
  const {state,ops}=fixture();assert.equal(state.operations.audit.length,0);
  state.leads[0].stage='contatado';ops.track();ops.track();
  assert.equal(state.operations.audit.length,1);assert.match(state.operations.audit[0].details,/novo → contatado/);
});
test('campaign quota counts confirmed sends for that campaign and leaves other leads free',()=>{
  const {state,ops}=fixture();state.operations.campaigns.push({id:'c',name:'Campaign',leadIds:['a'],status:'active',start:'00:00',end:'23:59',limit:1});
  assert.equal(ops.canSend('a'),'');ops.sent('a');assert.match(ops.canSend('a'),/Limite/);assert.equal(ops.canSend('other'),'');
  state.operations.campaigns[0].status='paused';assert.equal(ops.canSend('a'),'');
});
test('only published instructions affect lead guidance; drafts preserve the existing workflow',()=>{
  const {state,ops}=fixture();state.operations.flowDraft.novo='Draft';assert.equal(ops.instruction(state.leads[0]),'');
  state.operations.flowPublished={novo:'Published'};assert.equal(ops.instruction(state.leads[0]),'Published');
});
test('bounded audit and default reminder interval',()=>{
  const {state,ops}=fixture();assert.equal(ops.followUpDelay(),3);
  for(let i=0;i<1100;i++)ops.audit('Action',String(i));assert.equal(state.operations.audit.length,1000);assert.equal(state.operations.audit[0].details,'1099');
});
