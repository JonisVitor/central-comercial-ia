import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
export function createLocalStateStore(directory = path.join(process.env.LOCALAPPDATA || os.homedir(), 'CentralComercialIA', 'crm')) {
  const file=path.join(directory,'workspace.json');
  let queue=Promise.resolve();
  const read=async()=>{try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return {revision:0,state:null};throw error;}};
  async function commit(state,expectedRevision,{remote=false}={}) {
    if(!state || !Array.isArray(state.leads)||!Array.isArray(state.messages)||!Array.isArray(state.projects))return {status:422,error:'CRM inválido.'};
    const operation=queue.catch(()=>{}).then(async()=>{
      const old=await read();
      if(remote && !old.state)return {status:409,error:'Abra primeiro o painel no PC para carregar seus dados.'};
      if(!Number.isInteger(expectedRevision)||expectedRevision!==old.revision)return {status:409,error:'O CRM foi atualizado em outro aparelho.',revision:old.revision,state:old.state};
      await fs.mkdir(directory,{recursive:true});
      if(old.state)await fs.writeFile(path.join(directory,`backup-${old.revision%5}.json`),JSON.stringify(old),'utf8');
      const next={revision:old.revision+1,updatedAt:new Date().toISOString(),state};
      await fs.writeFile(file+'.tmp',JSON.stringify(next),'utf8');await fs.rename(file+'.tmp',file);
      return {status:200,revision:next.revision,updatedAt:next.updatedAt};
    });queue=operation;return operation;
  }
  return {read,commit};
}
