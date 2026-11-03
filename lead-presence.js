// Shared by the browser and the local worker. Only these fields may be
// rebased automatically; conversations, sales stages and deletions never are.
export const PRESENCE_GROUPS = {
  website: ['website', 'websiteUrl'],
  maps: ['maps', 'mapsUrl', 'mapsRating', 'mapsReviewCount'],
  instagram: ['instagramStatus', 'instagramUrl'],
  activity: ['instagramActivity', 'instagramActivityEvidence', 'instagramCheckedAt']
};
export const PRESENCE_FIELDS = [...Object.values(PRESENCE_GROUPS).flat(), 'verification'];
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const presenceKey = lead => JSON.stringify([lead.name || '', lead.city || '', lead.phone || '']);
export const verificationState = checks => Object.keys(PRESENCE_GROUPS).every(key=>checks?.[key] && !['inconclusive','error'].includes(checks[key].status)) ? 'complete' : 'inconclusive';

export function markManualPresence(lead, before, now=new Date().toISOString()) {
  if(!lead.verification)return;
  lead.verification.checks ||= {};
  for(const [key,fields] of Object.entries(PRESENCE_GROUPS)) {
    if(fields.every(field=>equal(lead[field],before[field])))continue;
    const value=lead[fields[0]];
    lead.verification.checks[key]={status:!value || ['Não verificado','Não foi possível confirmar'].includes(value)?'inconclusive':'manual',evidence:'Resultado atualizado por você na ficha.',sources:[],manualAt:now};
  }
  if(!['queued','working','error'].includes(lead.verification.state))lead.verification.state=verificationState(lead.verification.checks);
}

export function rebasePresenceEdits(base, local, remote) {
  if (!base || !remote) return null;
  const strip = state => ({...state, leads: state.leads.map(lead => Object.fromEntries(Object.entries(lead).filter(([key]) => !PRESENCE_FIELDS.includes(key))))});
  if (!equal(strip(base), strip(remote))) return null;
  const oldById = new Map(base.leads.map(lead => [lead.id, lead]));
  const newById = new Map(remote.leads.map(lead => [lead.id, lead]));
  const merged = structuredClone(local);
  for (const lead of merged.leads) {
    const old = oldById.get(lead.id), next = newById.get(lead.id);
    if (!old || !next) continue;
    const localChecks=structuredClone(lead.verification?.checks||{});
    for (const fields of [...Object.values(PRESENCE_GROUPS), ['verification']]) {
      // A manual edit to a group wins over research that began earlier.
      if (fields.every(key => equal(lead[key], old[key]))) {
        for (const key of fields) {
          if (key in next) lead[key] = structuredClone(next[key]); else delete lead[key];
        }
      }
    }
    if(next.verification) {
      lead.verification=structuredClone(next.verification);
      lead.verification.checks ||= {};
      let manualChanged=false;
      for(const key of Object.keys(PRESENCE_GROUPS)) {
        if(localChecks[key]?.manualAt && !equal(localChecks[key],old.verification?.checks?.[key])) {lead.verification.checks[key]=localChecks[key];manualChanged=true;}
      }
      if(manualChanged && !['queued','working','error'].includes(lead.verification.state))lead.verification.state=verificationState(lead.verification.checks);
    }
  }
  return merged;
}
