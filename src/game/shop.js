import { $, INSURANCE_RECOVER, REPAIR_RATE, RESALE_RATE } from './core.js';
import { ACHIEVEMENTS, ITEMS, WEAPONS, claimDailyMission, marketPrice, refreshMarket, rollDailyMissions } from './data.js';
import { meta, saveMeta, shopTab, state, xpNeeded } from './state.js';
import { SFX } from './audio.js';
import { onHold, onTap } from './input.js';
import { msg } from './hud.js';
import { insuranceCost, stashValue } from './combat.js';


const SHOP_ITEMS={weapons:['shotgun','rifle','ak47','mg42','m24','rocketl'],armor:['helm1','helm2','helm3','vest1','vest2','vest3'],consumables:['ammo9','shells','bullets','ammo76239','ammo792','ammo76251','rockets','medkit','bandage','frag','smoke','molotov']};

export function refreshMenuStats(){
 const el=$('menuStats');if(!el)return;
 const st=meta.stats,totalAch=Object.keys(meta.achievements).length;
 el.innerHTML='💵 <b>$'+meta.money+'</b> · NIVEL <b>'+meta.level+'</b> · XP <b>'+meta.xp+'/'+xpNeeded()+'</b><br>'+
  'PARTIDAS: <b>'+st.runs+'</b> · EXITOSAS: <b>'+st.wins+'</b>'+(st.runs>0?' ('+Math.round(st.wins*100/st.runs)+'%)':'')+'<br>'+
  'BAJAS: <b>'+st.kills+'</b> · PUESTOS: <b>'+(st.outpostsTaken||0)+'</b> · ALIADOS: <b>'+st.alliesRescued+'</b><br>'+
  'LOGROS: <b>'+totalAch+'/'+ACHIEVEMENTS.length+'</b><br>'+
  'IMPUESTOS: <b>$'+(st.totalTaxPaid||0)+'</b> · PERDIDO: <b>$'+(st.totalLostOnDeath||0)+'</b><br>'+
  (st.bestTime?'MEJOR TIEMPO: <b>'+st.bestTime.toFixed(1)+'s</b>':'')+
  (st.bestLoot?' · MEJOR: <b>$'+st.bestLoot+'</b>':'');
 const nb=$('nightmareBtn');
 if(meta.nightmareUnlocked){nb.style.display='';
  if(meta.nightmareActive){nb.classList.add('on');nb.textContent='💀 PESADILLA ON'}
  else{nb.classList.remove('on');nb.textContent='💀 PESADILLA'}
 } else nb.style.display='none'
}

export function openShop(){refreshMarket();renderShop(shopTab);$('shopScreen').classList.add('on');$('menuScreen').classList.remove('on');SFX.ui()}

export function closeShop(){$('shopScreen').classList.remove('on');$('menuScreen').classList.add('on');refreshMenuStats();SFX.ui()}

export function openDaily(){rollDailyMissions();renderDaily();$('dailyScreen').classList.add('on');$('menuScreen').classList.remove('on');$('operationSelectScreen').classList.remove('on');SFX.ui()}

export function closeDaily(){$('dailyScreen').classList.remove('on');if(state==='menu'){$('menuScreen').classList.add('on');$('operationSelectScreen').classList.remove('on')}refreshMenuStats();SFX.ui()}

export function openAch(){renderAch();$('achScreen').classList.add('on');$('menuScreen').classList.remove('on');$('operationSelectScreen').classList.remove('on');SFX.ui()}

export function closeAch(){$('achScreen').classList.remove('on');if(state==='menu'){$('menuScreen').classList.add('on');$('operationSelectScreen').classList.remove('on')}refreshMenuStats();SFX.ui()}

function renderAch(){
 const unlocked=Object.keys(meta.achievements).length;
 $('achCount').textContent=unlocked+'/'+ACHIEVEMENTS.length;
 const grid=$('achGrid');grid.innerHTML='';
 for(const a of ACHIEVEMENTS){
  const card=document.createElement('div');
  card.className='achCard'+(meta.achievements[a.id]?' unlocked':'');
  card.innerHTML='<div class="ic">'+a.icon+'</div><div class="info"><div class="nm">'+a.name+'</div><div class="ds">'+a.desc+'</div></div>';
  grid.appendChild(card)
 }
}

export function renderDaily(){
 const grid=$('dailyGrid');grid.innerHTML='';
 const done=meta.dailyMissions.filter(m=>m.done).length;
 $('dailyCount').textContent=done+'/'+meta.dailyMissions.length;
 for(let i=0;i<meta.dailyMissions.length;i++){
  const m=meta.dailyMissions[i];
  const card=document.createElement('div');
  card.className='missionCard'+(m.claimed?' claimed':m.done?' done':'');
  const barPct=Math.min(100,(m.progress/m.target)*100);
  card.innerHTML='<div class="mt">'+m.desc+'</div>'+
   '<div class="md">Recompensa: <span style="color:#ffd24a">$'+m.reward+'</span></div>'+
   '<div class="mp">['+Math.min(m.progress,m.target)+'/'+m.target+'] '+barPct.toFixed(0)+'%'+(m.claimed?' · ✓ COBRADO':'')+'</div>'+
   (m.done&&!m.claimed?'<button class="mb">COBRAR RECOMPENSA</button>':'');
  if(m.done&&!m.claimed){const btn=card.querySelector('button');onTap(btn,()=>claimDailyMission(i))}
  grid.appendChild(card)
 }
}

function renderInsuranceBox(){
 const el=$('insuranceBox');
 const cost=insuranceCost(),totalVal=stashValue(meta.stash);
 if(meta.insuranceActive){
  el.className='insuranceBox active';
  el.innerHTML='<div class="it">🛡️ SEGURO ACTIVO</div>'+
   '<div class="id">Cubrirá el 50% ($'+Math.round(totalVal*INSURANCE_RECOVER)+') del stash si mueres.</div>'+
   '<button id="insBtn" style="background:#ff5a5a;color:#fff;border-bottom-color:#8a1a1a">CANCELAR SEGURO</button>';
 } else {
  el.className='insuranceBox';
  el.innerHTML='<div class="it">🛡️ SEGURO DE EQUIPO</div>'+
   '<div class="id">Coste: $'+cost+' · Recupera 50% ($'+Math.round(totalVal*INSURANCE_RECOVER)+') al morir.</div>'+
   '<button id="insBtn" style="background:#9fd8ff;color:#001a2a;border-bottom-color:#3a6a8a">CONTRATAR POR $'+cost+'</button>';
 }
 onTap($('insBtn'),()=>{
  if(meta.insuranceActive){meta.insuranceActive=false;meta.money+=insuranceCost();msg('SEGURO CANCELADO +$'+insuranceCost(),'#7dff8f')}
  else{const c=insuranceCost();
   if(meta.money<c){SFX.error();msg('SIN DINERO','#ff6a5a');return}
   if(stashValue(meta.stash)<=0){SFX.error();msg('NADA QUE ASEGURAR','#ff6a5a');return}
   meta.money-=c;meta.insuranceActive=true;msg('SEGURO ACTIVADO -$'+c,'#9fd8ff')}
  SFX.buy();saveMeta();renderShop(shopTab);refreshMenuStats()
 })
}

export function renderShop(tab){
 $('shopMoney').textContent=meta.money;
 const mb=$('marketBanner');
 const mult=meta.marketMult;
 const color=mult<1?'#7dff8f':mult>1.2?'#ff6a5a':'#ffd24a';
 const label=mult<1?'OFERTA':mult>1.2?'CARO':'NORMAL';
 mb.innerHTML='📈 MERCADO: <b style="color:'+color+'">×'+mult.toFixed(2)+'</b> ('+label+') · Cambia cada día';
 renderInsuranceBox();
 document.querySelectorAll('.shopTabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 const grid=$('shopGrid');grid.innerHTML='';
 const ids=SHOP_ITEMS[tab]||[];
 for(const id of ids){
  const d=ITEMS[id];
  const has=stashHasItem(id);
  const levelOK=!d.minLevel||meta.level>=d.minLevel;
  const price=marketPrice(d.v);
  const cant=has||!stashHasSpace()||meta.money<price||!levelOK;
  const card=document.createElement('div');
  card.className='shopCard'+(cant?' cant':'');
  const wInfo=d.weapon!==undefined?'ARMA · '+WEAPONS[d.weapon].name:(d.slot?('ARMADURA · TIER '+d.lvl):(d.ammo?('+'+d.amount+' por unidad'):(d.heal?('+'+d.heal+' PS'):(d.throwable?'ARROJADIZO':''))));
  const lvlTag='';
  const priceColor=meta.marketMult<1?'#7dff8f':meta.marketMult>1.2?'#ff8a8a':'#ffd24a';
  card.innerHTML=lvlTag+'<div class="ic" style="background:'+d.color+'">'+d.sym+'</div>'+
   '<div class="info"><div class="nm">'+d.name+'</div><div class="ds">'+wInfo+'</div></div>'+
   '<div class="pr" style="color:'+priceColor+'">$'+price+'</div>';
  if(!cant)onTap(card,()=>buyItem(id));
  else if(has)card.querySelector('.pr').innerHTML='<span style="color:#888">YA LO TIENES</span>';
  else if(!levelOK)card.querySelector('.pr').innerHTML='<span style="color:#a55">NIVEL '+d.minLevel+'</span>';
  else if(meta.money<price)card.querySelector('.pr').innerHTML='<span style="color:#a55">SIN DINERO</span>';
  else if(!stashHasSpace())card.querySelector('.pr').innerHTML='<span style="color:#a55">LLENO</span>';
  grid.appendChild(card)
 }
 renderStash()
}

function stashHasItem(id){for(const it of meta.stash)if(it&&it.id===id)return true;return false}

function stashHasSpace(){for(const it of meta.stash)if(!it)return true;return false}

function buyItem(id){
 const d=ITEMS[id];
 if(d.minLevel&&meta.level<d.minLevel){SFX.error();msg('NECESITAS NIVEL '+d.minLevel,'#ff6a5a');return}
 const price=marketPrice(d.v);
 if(meta.money<price){SFX.error();msg('SIN DINERO','#ff6a5a');return}
 if(!stashHasSpace()){SFX.error();msg('INVENTARIO LLENO','#ff6a5a');return}
 if(stashHasItem(id)&&(d.slot||d.weapon!==undefined)){SFX.error();msg('YA LO TIENES','#ff6a5a');return}
 for(const it of meta.stash){if(it&&it.id===id){it.count++;meta.money-=price;SFX.buy();saveMeta();renderShop(shopTab);msg('COMPRADO: '+d.name+' -$'+price,'#7dff8f');return}}
 for(let i=0;i<12;i++){if(!meta.stash[i]){meta.stash[i]={id,count:1,dur:d.slot?d.dur:undefined};meta.money-=price;SFX.buy();saveMeta();renderShop(shopTab);msg('COMPRADO: '+d.name+' -$'+price,'#7dff8f');return}}
}

function sellStashItem(idx){
 const it=meta.stash[idx];if(!it)return;
 const d=ITEMS[it.id];
 const price=Math.round(d.v*(d.misc?1:RESALE_RATE));
 if(it.count>1)it.count--;else meta.stash[idx]=null;
 meta.money+=price;SFX.sell();saveMeta();renderShop(shopTab);
 msg('VENDIDO: +$'+price+(d.misc?' (VALOR COMPLETO)':' (75%)'),'#ffd24a')
}

function repairArmor(idx){
 const it=meta.stash[idx];if(!it)return;
 const d=ITEMS[it.id];
 if(!d.slot||!d.dur){SFX.error();msg('NO SE PUEDE REPARAR','#ff6a5a');return}
 const cost=Math.round(d.v*REPAIR_RATE);
 if(meta.money<cost){SFX.error();msg('SIN DINERO ($'+cost+')','#ff6a5a');return}
 if(it.dur===undefined)it.dur=d.dur;
 if(it.dur>=d.dur){msg('YA ESTÁ AL MÁXIMO','#ffb040');return}
 meta.money-=cost;it.dur=d.dur;
 SFX.buy();saveMeta();renderShop(shopTab);
 msg('REPARADO: -$'+cost,'#7dff8f')
}

function renderStash(){
 const el=$('shopStash');el.innerHTML='';
 for(let i=0;i<12;i++){
  const it=meta.stash[i];
  const s=document.createElement('div');s.className='slot';
  if(it){
   const d=ITEMS[it.id];if(!d){s.className+=' emptySlot';s.textContent='OBJETO DESCONOCIDO';el.appendChild(s);continue;}s.style.background=d.color||'#343840';
   const sellPrice=Math.round((d.v||0)*RESALE_RATE);
   const isArmor=d.slot&&d.dur;
   const dur=it.dur!==undefined?it.dur:d.dur;
   s.innerHTML='<span class="nm">'+d.name+'</span><span class="sym">'+d.sym+'</span>'+
    (it.count>1?'<span class="cnt">'+it.count+'</span>':'<span class="pr">$'+sellPrice+'</span>')+
    (isArmor?'<span style="position:absolute;bottom:12px;left:3px;font-size:7px;color:#ff9a5a">'+Math.ceil(dur)+'/'+d.dur+'</span>':'');
   if(isArmor&&dur<d.dur){onHold(s,()=>repairArmor(i),()=>sellStashItem(i))}
   else{onTap(s,()=>sellStashItem(i))}
  } else s.className+=' emptySlot';
  el.appendChild(s)
 }
}
