// Pure display logic; no variable, inventory, relationship or chat writes.
export function createUrbanAppearanceResolver(manifest) {
  const key=v=>String(v||'').normalize('NFKC').replace(/\s+/g,'').replace(/萤/g,'莹').toLowerCase(),byName=new Map();
  for(const r of manifest.roles||[])for(const n of [r.id,r.name,...(r.aliases||[])])byName.set(key(n),r);
  const find=name=>byName.get(key(name))||null;
  function minute(value){
    const m=String(value||'').match(/^(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})日?\s+(\d{1,2}):(\d{2})$/);
    if(!m)return NaN;const [y,mo,d,h,mi]=m.slice(1).map(Number),date=new Date(Date.UTC(y,mo-1,d,h,mi));
    return date.getUTCFullYear()===y&&date.getUTCMonth()===mo-1&&date.getUTCDate()===d&&h<24&&mi<60?date.getTime()/60000:NaN;
  }
  function gameMinute(system={}){const day=String(system.当前日期||system.日期||'');return minute((/^\d{4}/.test(day)?day:system.当前年份?system.当前年份+'年'+day:'')+' '+String(system.当前时间||''));}
  const cleared=s=>/未(?:被|受|处于|进入|受到)?催眠|没有(?:被|受|处于)?催眠|不(?:在|处于|是)催眠|非催眠|催眠(?:状态)?(?:已)?(?:解除|结束|失效)|(?:解除|结束|脱离|摆脱)了?催眠|恢复清醒|从催眠中(?:醒来|苏醒)/.test(s);
  const active=s=>!cleared(s)&&/催眠中|(?:正(?:在)?|处于|陷入|进入|保持|持续|已被|受到).{0,6}催眠|(?:深度|浅度|轻度|完全|深层|持续)催眠|催眠状态/.test(s);
  function isHypnotized(character={},now=NaN){
    const effects=character.效果||{},mind=String(effects.心理||'');if(cleared(mind))return false;if(active(mind))return true;
    if(Number.isFinite(now))for(const [name,e]of Object.entries(effects.临时催眠效果||{})){if(!e||typeof e!=='object'||e.enabled===false||e.active===false||e.已解除===true)continue;if(minute(e.结束时间)>now&&String(e.效果||name).trim())return true;}
    // Permanent belief/memory changes do not by themselves mean a current trance.
    for(const [name,e]of Object.entries(effects.永久催眠效果||{})){if(/常识|认知|记忆|人格|习惯/.test(name)||!/(?:持续|永久)催眠|催眠状态/.test(name)||e?.active===false||e?.enabled===false||e?.已解除===true)continue;if(active(name+' '+(typeof e==='string'?e:e?.效果||'')))return true;}
    return false;
  }
  function outfitFor(role,{outfit,scene='',character={}}={}){
    const outfits=role.outfits||[],has=id=>outfits.find(o=>o.id===id),explicit=outfit&&outfits.find(o=>key(o.id)===key(outfit)||key(o.label)===key(outfit));if(explicit)return explicit;
    const c=character.衣着,description=typeof c==='string'?c:[c?.上衣,c?.下衣].filter(Boolean).join(' ');
    // A move to a bedroom alone does not override an explicitly recorded uniform.
    const garmentRules=[['home',/睡衣|睡裙|寝衣|家居服|居家装|homewear|nightdress|pajama/i],['activity',/工作服|职业装|白大褂|医护服|警服|训练服|运动队服/],['original',/校服|学生制服|原装|原设服装/],['weekend',/周末休闲|周末装/],['daily',/日常外出|日常装|便服|便装|常服/]];
    for(const [id,test]of garmentRules)if(test.test(description)&&has(id))return has(id);
    if(/卧室|睡前|睡觉|起床|寝室|bedroom|bedtime/i.test(scene)&&has('home'))return has('home');
    const label=has('activity')?.label||'',workRules=[[/校务|授课|班主任|教师/,/学校|学园|教室|职员室|办公室|校长室/],[/校医|保健|诊所/,/医院|诊所|医务|保健室/],[/律师/,/律所|律师事务所|法院|检察/],[/采访/,/采访|新闻|报社|编辑部/],[/财团|商务/,/公司|财团|办公室|会议室/],[/便利店/,/便利店|值班/],[/服装设计/,/设计室|服装工作室/],[/园艺/,/园艺|花园作业/],[/田径|运动|体育|体操|泳队/,/训练|体育馆|操场|体操|运动场|泳池|游泳馆/],[/舞蹈|演剧|声乐|艺人/,/排练|舞蹈室|音乐室|剧场|舞台/],[/绘画/,/画室|美术室|绘画/],[/棋艺/,/棋室|棋社|棋艺|将棋/],[/模特/,/摄影棚|拍摄|时装/],[/写作|文化咨询/,/写作|文化咨询|工作室/]];
    if(has('activity')&&(workRules.some(([job,place])=>job.test(label)&&place.test(scene))||/工作中|值班中|专项活动/.test(scene)))return has('activity');
    const kind=/商店街|购物|商场|公园|书店|周末|休闲/.test(scene)?'weekend':/街道|通勤|咖啡|客厅|居家|住宅|的家/.test(scene)?'daily':'original';return has(kind)||has('original')||outfits[0]||null;
  }
  function select({role:requested,outfit,scene='',hypnotized,character={},nowMinute=NaN}={}){
    const role=find(requested);if(!role)return null;const clothes=outfitFor(role,{outfit,scene,character});if(!clothes)return null;
    const trance=typeof hypnotized==='boolean'?hypnotized:isHypnotized(character,nowMinute),state=trance&&manifest.assets[clothes.hypnotized]?'hypnotized':'normal',asset=manifest.assets[clothes[state]];
    return asset?{...asset,role:role.name,roleId:role.id,outfit:clothes.id,requestedState:trance?'hypnotized':'normal',state}:null;
  }
  function image(name,kind,options={}){const role=find(name);return kind==='sprite'?select({role:name,...options})?.url||'':manifest.assets[role?.images?.[kind]]?.url||'';}
  function background(location,placeId){const leaf=String(location||'').split(/[\\/>＞→]/).pop(),item=manifest.backgrounds?.find(b=>b.id===placeId)||manifest.backgrounds?.find(b=>key(b.name)===key(leaf));return manifest.assets[item?.image]?.url||'';}
  return {find,select,image,background,isHypnotized,gameMinute,outfitFor};
}
export function selectAppearance(manifest,options={}){return createUrbanAppearanceResolver(manifest).select(options);}
