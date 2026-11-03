import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createGatewayHandler} from '../agents-runtime/remote-access.mjs';
test('private gateway rejects wrong origin/host/admin paths and serves only the built app',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'central-gateway-test-'));
  await fs.mkdir(path.join(root,'dist'));await fs.writeFile(path.join(root,'dist','index.html'),'<html><head></head><body>test</body></html>');
  const handler=createGatewayHandler({root,originHost:'test-secret.central.internal',publicOrigin:()=> 'https://example.trycloudflare.com'});
  const server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const request=(route,headers={})=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path:route,headers},response=>{const chunks=[];response.on('data',c=>chunks.push(c));response.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:response.statusCode,headers:response.headers})));});req.on('error',reject);req.end();});
  try{
    assert.equal((await request('/')).status,403);
    const trusted={host:'test-secret.central.internal'};
    assert.equal((await request('/api/remote-access/start',trusted)).status,403);
    assert.equal((await request('/',{...trusted,Origin:'https://untrusted.invalid'})).status,403);
    assert.equal((await request('/%2e%2e%2fpackage.json',trusted)).status,403);
    const response=await request('/',trusted);assert.equal(response.status,200);
    assert.match(await response.text(),/__CENTRAL_LOCAL_GATEWAY__=true/);
    assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);
    assert.equal(response.headers.get('cache-control'),'no-store');
  }finally{await new Promise(resolve=>server.close(resolve));assert.ok(path.resolve(root).startsWith(path.join(os.tmpdir(),'central-gateway-test-')));await fs.rm(root,{recursive:true,force:true});}
});
