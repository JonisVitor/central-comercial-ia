import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';

const allowedRoutes = new Set(['/api/local-state','/api/agent-runtime/health','/api/agent-runtime/chat','/api/agent-runtime/run','/api/agent-runtime/customer-reply','/api/agent-runtime/operations','/api/whatsapp/status','/api/whatsapp/inbox','/api/whatsapp/chats','/api/whatsapp/contacts','/api/whatsapp/sync','/api/whatsapp/connect','/api/whatsapp/disconnect','/api/whatsapp/send']);
export function createGatewayHandler({root,originHost,publicOrigin=()=>'',backendPort=4174}) {
  const dist=path.resolve(root,'dist');
  return async (req,res)=>{
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
    const reply=(status,text)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8',...headers});res.end(text);};
    if(req.headers.host!==originHost)return reply(403,'Origem privada. Use o link protegido mostrado no PC.');
    if(req.headers.origin && req.headers.origin!==publicOrigin())return reply(403,'Origem não autorizada.');
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/')){
      if(!allowedRoutes.has(url.pathname))return reply(403,'Esta operação só está disponível no computador.');
      const upstream=http.request({host:'127.0.0.1',port:backendPort,path:url.pathname+url.search,method:req.method,headers:{'host':`127.0.0.1:${backendPort}`,'origin':'http://127.0.0.1:4175','content-type':'application/json','x-central-action':String(req.headers['x-central-action']||''),'x-central-gateway':'true'}},response=>{res.writeHead(response.statusCode,{'Content-Type':'application/json; charset=utf-8',...headers});response.pipe(res);});
      upstream.setTimeout(300000,()=>upstream.destroy());upstream.on('error',()=>{if(!res.headersSent)reply(503,'O executor do PC está indisponível.');else res.end();});
      let size=0;req.on('data',chunk=>{size+=chunk.length;if(size>1000000){upstream.destroy();if(!res.headersSent)reply(413,'Pedido muito grande.');}});req.pipe(upstream);return;
    }
    if(!['GET','HEAD'].includes(req.method))return reply(405,'Método não permitido.');
    try {
      const decoded=decodeURIComponent(url.pathname),file=path.resolve(dist,'.'+decoded);
      if(file!==dist&&!file.startsWith(dist+path.sep))return reply(403,'Caminho não permitido.');
      const extension=path.extname(file).toLowerCase();
      const staticFile=decoded==='/'||!extension?path.join(dist,'index.html'):file;
      let body=await fs.readFile(staticFile);
      const nonce=crypto.randomBytes(18).toString('base64');
      if(staticFile.endsWith('index.html'))body=Buffer.from(body.toString().replace('<head>',`<head><script nonce="${nonce}">window.__CENTRAL_LOCAL_GATEWAY__=true;</script>`));
      const contentType={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'}[path.extname(staticFile)]||'application/octet-stream';
      res.writeHead(200,{...headers,'Content-Type':contentType,'Content-Security-Policy':`default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'`});res.end(req.method==='HEAD'?undefined:body);
    }catch{return reply(404,'Arquivo indisponível. Gere a build no computador.');}
  };
}
export function createRemoteAccess(root) {
  const directory=path.join(process.env.LOCALAPPDATA||os.homedir(),'CentralComercialIA','remote-access');
  const configFile=path.join(directory,'config.json');
  let child,gateway,url='',email='',phase='stopped',error='',qrDataUrl='';
  const status=()=>({enabled:!!child,url,email,phase,error,qrDataUrl,temporary:true,authentication:'Cloudflare · código enviado ao e-mail autorizado'});
  async function stop({persist=true}={}){
    if(child){child.kill();child=undefined;}if(gateway){await new Promise(resolve=>gateway.close(resolve));gateway=undefined;}
    url='';qrDataUrl='';phase='stopped';error='';
    if(persist){await fs.mkdir(directory,{recursive:true});await fs.writeFile(configFile,JSON.stringify({enabled:false,email}));}
    return status();
  }
  async function start(targetEmail) {
    if(child)return status();
    if(!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(String(targetEmail))||String(targetEmail).length>254)throw new Error('Informe um e-mail individual válido para proteger o acesso.');
    email=targetEmail;
    const executable=path.join(root,'.local-tools','cloudflared.exe');
    await fs.access(executable).catch(()=>{throw new Error('cloudflared não instalado neste computador. Execute INSTALAR-TUNEL.ps1.');});
    await fs.access(path.join(root,'dist','index.html')).catch(()=>{throw new Error('Gere a versão do painel com npm run build antes de abrir o acesso.');});
    phase='starting';error='';
    const originHost=crypto.randomBytes(32).toString('hex')+'.central.internal';
    gateway=http.createServer(createGatewayHandler({root,originHost,publicOrigin:()=>url}));
    await new Promise((resolve,reject)=>{gateway.once('error',reject);gateway.listen(4177,'127.0.0.1',resolve);});
    child=spawn(executable,['tunnel','--no-autoupdate','--url','http://127.0.0.1:4177','--http-host-header',originHost,'--allowed-mail',email,'--protocol','http2'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
    const process=child;let tail='';
    const inspect=buffer=>{tail=(tail+buffer.toString()).slice(-8000);const found=tail.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g)?.filter(value=>!value.includes('//api.')).at(-1);if(found&&child===process){url=found;phase='active';void import('qrcode').then(q=>q.toDataURL(url,{width:220,margin:2})).then(q=>{qrDataUrl=q;}).catch(()=>{});void fs.mkdir(directory,{recursive:true}).then(()=>fs.writeFile(path.join(directory,'link.json'),JSON.stringify(status())));}};
    process.stderr.on('data',inspect);process.stdout.on('data',inspect);
    process.on('error',()=>{if(child===process){phase='error';error='Não foi possível iniciar o túnel protegido.';child=undefined;}});
    process.on('exit',()=>{if(child===process){child=undefined;url='';phase='error';error='O túnel foi interrompido. Inicie novamente no computador.';}if(child===undefined && phase==='error' && gateway){gateway.close();gateway=undefined;}});
    await fs.mkdir(directory,{recursive:true});await fs.writeFile(configFile,JSON.stringify({enabled:true,email}));
    return status();
  }
  async function handle(req,res,readBody,send){
    if(!req.url.startsWith('/api/remote-access'))return false;
    try{
      if(req.method==='GET'&&req.url==='/api/remote-access/status'){send(res,200,status());return true;}
      if(req.method!=='POST'||req.headers['x-central-action']!=='remote'){send(res,403,{error:'Ação local não autorizada.'});return true;}
      if(req.url==='/api/remote-access/start'){send(res,202,await start((await readBody(req)).email));return true;}
      if(req.url==='/api/remote-access/stop'){send(res,200,await stop());return true;}
      send(res,404,{error:'Rota indisponível.'});return true;
    }catch(failure){phase='error';error=failure.message;send(res,400,{error});return true;}
  }
  async function restore(){try{const c=JSON.parse(await fs.readFile(configFile,'utf8'));if(c.enabled)await start(c.email);}catch{}}
  return {handle,restore,start,stop,status};
}
