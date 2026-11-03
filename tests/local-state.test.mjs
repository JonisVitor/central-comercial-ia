import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createLocalStateStore} from '../agents-runtime/local-state.mjs';
test('phone cannot seed an empty PC; stale writes cannot overwrite newer CRM',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'central-state-test-'));
  try{
    const store=createLocalStateStore(directory),state={leads:[{id:'a'}],projects:[],messages:[]};
    assert.equal((await store.read()).state,null);
    assert.equal((await store.commit(state,0,{remote:true})).status,409);
    assert.equal((await store.commit(state,0)).revision,1);
    const next={...state,leads:[{id:'b'}]};
    const outcomes=await Promise.all([store.commit(next,1),store.commit({...state,leads:[]},1)]);
    assert.deepEqual(outcomes.map(r=>r.status),[200,409]);
    assert.deepEqual((await store.read()).state.leads,[{id:'b'}]);
    assert.equal((await store.commit({},2)).status,422);
  }finally{assert.ok(path.resolve(directory).startsWith(path.join(os.tmpdir(),'central-state-test-')));await fs.rm(directory,{recursive:true,force:true});}
});
