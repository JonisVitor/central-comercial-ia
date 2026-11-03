import test from 'node:test';
import assert from 'node:assert/strict';
import { handleWhatsAppLocal } from '../agents-runtime/whatsapp-local.mjs';
async function request(method,url,headers={},body={}) {
  let response;
  const handled=await handleWhatsAppLocal({method,url,headers},{},async()=>body,(_res,status,data)=>{response={status,data};});
  return {handled,...response};
}
test('QR is never started by reading status',async()=>{
  const r=await request('GET','/api/whatsapp/status');assert.equal(r.status,200);assert.equal(r.data.connected,false);assert.equal(r.data.state,'disconnected');assert.equal(r.data.qrDataUrl,'');
});
test('cross-site form style mutations are rejected without the custom header',async()=>{
  for(const route of ['connect','disconnect','contacts','send'])assert.equal((await request('POST',`/api/whatsapp/${route}`)).status,403);
});
test('no sends without an active paired session, even when confirmed',async()=>{
  const r=await request('POST','/api/whatsapp/send',{'x-central-action':'whatsapp'},{leadId:'a',phone:'5516999990000',text:'test',confirmed:true});
  assert.equal(r.status,400);assert.match(r.data.error,/Conecte o WhatsApp/);
});
test('unknown routes do not invoke a client',async()=>{
  assert.equal((await request('GET','/api/whatsapp/unknown')).status,404);
  assert.equal((await request('GET','/other')).handled,false);
});
