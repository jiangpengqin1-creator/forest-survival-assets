const key=value=>String(value||'').normalize('NFKC').replace(/\s+/g,'').replace(/萤/g,'莹');
// No game variable writes. Hypnotized state must be explicitly supplied by the caller.
export function selectAppearance(manifest,{role:requested,outfit:requestedOutfit,scene='',hypnotized=false}={}){
  const role=manifest.roles.find(r=>r.id===requested||[r.name,...r.aliases].some(n=>key(n)===key(requested)));
  if(!role)return null;
  let outfit=requestedOutfit?role.outfits.find(o=>o.id===requestedOutfit):null;
  if(!outfit){
    const kind=/卧室|睡前|起床/.test(scene)?'home':/职业|校务|医疗|律师|编辑|排练|专项/.test(scene)?'activity':/商店街|公园|书店|休闲/.test(scene)?'weekend':/街道|通勤|咖啡馆|白天居家/.test(scene)?'daily':'original';
    outfit=role.outfits.find(o=>o.id===kind)||role.outfits.find(o=>o.id==='original');
  }
  if(!outfit)return null;
  const state=hypnotized===true&&outfit.hypnotized&&manifest.assets[outfit.hypnotized]?'hypnotized':'normal';
  const asset=manifest.assets[outfit[state]];
  return asset?{role:role.name,roleId:role.id,outfit:outfit.id,requestedState:hypnotized===true?'hypnotized':'normal',state,...asset}:null;
}
