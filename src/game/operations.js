import { $, C, MH, MW, OUTPOSTS, SAFE_BOXES, isWall, safeCrack, set_SAFE_BOXES, set_nearSafe, set_safeCrack } from './core.js';
import { ALARMS, BEACON, canStandProp, isInsideMask, rebuildPropGrid, solidProps } from './outposts.js';
import { sAlarmWreck, sCache, sFlag, sSafe } from './sprites.js';
import { updateDailyProgress } from './data.js';
import { P, corpses, decos, enemies, meta, noises, objectives, outpostsTaken, revealedOutposts, saveMeta, selectedMap, set_fireHeld, set_nearC, set_objectives, set_outpostsTaken, showAchievementPopup, state } from './state.js';
import { makeOutpostReward } from './worldgen.js';
import { SFX, playOutpostRadio, outpostRadioResult, alarmSoundStart, alarmSoundStop } from './audio.js';
import { conquestCampTaken, conquestOn, set_pathAvoidOwn } from './conquest.js';
import { findPath } from './pathfinding.js';
import { setState } from './ai.js';
import { renderLoot } from './inventory.js';
import { msg } from './hud.js';
import { moveE, puff } from './combat.js';

/* ===== ALARMAS FÍSICAS ===== */
function wallClear(x0,y0,x1,y1){const dx=x1-x0,dy=y1-y0,n=Math.ceil(Math.hypot(dx,dy)/.25);for(let i=1;i<n;i++)if(isWall(x0+dx*i/n,y0+dy*i/n))return false;return true}

function destroyAlarm(al){
  if(!al.alive)return;
  al.alive=false;alarmSoundStop(al);
  const i=solidProps.indexOf(al.prop);if(i>=0)solidProps.splice(i,1);
  al.deco.spr=sAlarmWreck;al.deco.wh=.3;al.deco.ww=.7;
  rebuildPropGrid();
  puff(al.x,al.y,18,C(255,170,50));puff(al.x,al.y,10,C(70,70,70));SFX.boom();
  if(navigator.vibrate)navigator.vibrate(40);
  if(al.activated&&!al.spent){al.spent=true;outpostRadioResult(al.op.name,'cancelled');msg('¡ALARMA DESTRUIDA! SEÑAL CANCELADA','#7dff8f')}
  else msg('¡ALARMA DESTRUIDA!','#7dff8f');
}

export function damageAlarm(al,d){
  if(!al.alive)return;
  al.hp-=d;
  puff(al.x,al.y,4,C(255,210,90));SFX.hitmark();
  if(al.hp<=0)destroyAlarm(al);
}

export function damageAlarmsAt(x,y,R,max){
  for(const al of ALARMS){
    if(!al.alive)continue;
    const d=Math.hypot(al.x-x,al.y-y);
    if(d<R&&wallClear(x,y,al.x,al.y))damageAlarm(al,max*(1-0.6*d/R));
  }
}

function activateAlarm(al){
  const op=al.op;
  al.activated=true;al.callT=10;
  alarmSoundStart(al);if(navigator.vibrate)navigator.vibrate([30,50,30]);
  msg('¡ALARMA ACTIVADA EN '+op.name+'!','#ff3a3a');
  // Radio: el puesto pide refuerzos y Foxtrot responde unos segundos después
  try{ playOutpostRadio(op.name); }catch(e){}
  noises.push({x:al.x,y:al.y,radius:30,life:3,intensity:1});
  for(const other of OUTPOSTS){
    if(other===op||other.taken)continue;
    if(Math.hypot(other.x-op.x,other.y-op.y)<40&&(other.alertState||'CALM')==='CALM')other.alertState='ALERT';
  }
}

export function assignAlarmRunner(op){
  const al=op.alarm;let best=null,bd=1e9;
  for(const x of op.enemies){
    if(!x.alive||x.type==='dog'||x.boss||(x.reinf&&!x.arrived))continue;
    const d=Math.hypot(x.x-al.x,x.y-al.y);
    if(d<bd){bd=d;best=x}
  }
  if(best){best.alarmTask=al;best.apath=null;best.apT=0}
}

export function handleAlarmRun(e,dt){
  const al=e.alarmTask;
  if(!al||!al.alive||al.activated||al.op.taken){e.alarmTask=null;return false}
  if(Math.hypot(al.x-e.x,al.y-e.y)<1.2){e.alarmTask=null;activateAlarm(al);return true}
  e.apT=(e.apT||0)-dt;
  e.apStk=(e.apStk||0)+dt;
  if(e.apStk>=1){
    if(e.apx!==undefined&&Math.hypot(e.x-e.apx,e.y-e.apy)<0.3){e.apath=null;unstickE(e,al.x,al.y)}
    e.apx=e.x;e.apy=e.y;e.apStk=0}
  if(!e.apath||e.apT<=0){
    e.apT=2.5;e.apath=null;
    const nb=[[1,0],[-1,0],[0,1],[0,-1]].map(d=>[(al.x|0)+d[0]+.5,(al.y|0)+d[1]+.5]).sort((a,b)=>Math.hypot(a[0]-e.x,a[1]-e.y)-Math.hypot(b[0]-e.x,b[1]-e.y));
    for(const t of nb){const pth=findPath(e.x,e.y,t[0],t[1]);if(pth&&pth.length>0){e.apath=pth;e.apI=1;break}}
  }
  let tx=al.x,ty=al.y;
  if(e.apath){let wp=e.apath[e.apI];while(wp&&Math.hypot(wp[0]+.5-e.x,wp[1]+.5-e.y)<.5){e.apI++;wp=e.apath[e.apI]}if(wp){tx=wp[0]+.5;ty=wp[1]+.5}}
  const dx=tx-e.x,dy=ty-e.y,d=Math.hypot(dx,dy)||1,sp=e.speed*1.35;
  moveE(e,dx/d*sp*dt,dy/d*sp*dt);e.face=Math.atan2(dy,dx);
  return true;
}

/* ===== REFUERZOS REALES: salen de la base madre (nivel 3) y caminan hasta el puesto que los pidió ===== */
function getMotherBase(){for(const o of OUTPOSTS)if(o.tier===3)return o;return null}

function motherCanSend(op){
  if(selectedMap==='front')return null;
  const m=getMotherBase();
  if(!m||m.taken||op.tier>=3||op.reinfSent||op.taken)return null;
  if((m.reinfSquadsSent||0)>=3)return null;
  if(m.alertState==='ALARM')return null;
  if(m.enemies.some(x=>x.alive&&x.state==='COMBAT'))return null;
  const squad=m.enemies.filter(x=>x.alive&&x.reserve&&!x.reinf).slice(0,3);
  return squad.length?{m,squad}:null;
}

export function dispatchReinforcements(op){
  const r=motherCanSend(op);if(!r)return false;
  const m=r.m;
  op.reinfSent=true;m.reinfSquadsSent=(m.reinfSquadsSent||0)+1;
  for(const u of r.squad){
    const i=m.enemies.indexOf(u);if(i>=0)m.enemies.splice(i,1);
    op.enemies.push(u);
    u.outpost=op;u.reinf=true;u.arrived=false;u.reinfTarget=op;u.leash=op.leash;
    u.rpath=null;u.rpathI=0;u.repathT=0;u.stuckT=0;u.sx=u.x;u.sy=u.y;u.detect=1;
    setState(u,'REINFORCE');
  }
  m.totalCount-=r.squad.length;op.totalCount+=r.squad.length;
  SFX.shout();msg('¡REFUERZOS SALEN DE '+m.name+'!','#ff6a5a');
  return true;
}

function computeReinfPath(e){
  const op=e.reinfTarget;e.repathT=3;
  const cands=op.waypoints.slice();cands.push({x:op.x,y:op.y});
  cands.sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y));
  for(const t of cands.slice(0,4)){
    set_pathAvoidOwn(true);const path=findPath(e.x,e.y,t.x,t.y);set_pathAvoidOwn(false);
    if(path&&path.length>1){e.rpath=path;e.rpathI=1;return true}
  }
  e.rpath=null;return false;
}

function reinfArrive(e,op){
  e.arrived=true;e.rpath=null;e.homeX=op.x;e.homeY=op.y;e.leash=op.leash;
  e.waypointIdx=Math.floor(Math.random()*(op.waypoints.length||1));
  if(op.contested||(!op.taken&&op.alertState==='ALARM')){setState(e,'COMBAT');e.lastKnownPos={x:P.x,y:P.y};e.lostT=0}
  else setState(e,'PATROL');
}

export function unstickE(e,tx,ty){
  const cur=Math.hypot(tx-e.x,ty-e.y);
  let best=null,bs=1e9;
  for(const r of [.35,.6,.9,1.2,1.6]){
    for(let k=0;k<16;k++){
      const a=k/16*6.2832,nx=e.x+Math.cos(a)*r,ny=e.y+Math.sin(a)*r;
      if(isWall(nx,ny)||!canStandProp(nx,ny,.3))continue;
      const sc=Math.hypot(tx-nx,ty-ny)+r*.35;
      if(sc<bs){bs=sc;best={x:nx,y:ny}}
    }
    if(best&&bs<cur+.2)break;
  }
  if(best){e.x=best.x;e.y=best.y;return true}
  return false;
}

export function handleReinforceState(e,dt,per){
  const op=e.reinfTarget;
  if(!op||(op.taken&&!op.contested)){e.arrived=true;setState(e,'PATROL');return}
  if(per.clearLOS&&per.dist<16){setState(e,'COMBAT');e.lastKnownPos={x:per.tgtX,y:per.tgtY};return}
  if(isInsideMask(op,e.x,e.y)){reinfArrive(e,op);return}
  e.repathT=(e.repathT||0)-dt;
  if(!e.rpath||e.repathT<=0)computeReinfPath(e);
  e.stuckT=(e.stuckT||0)+dt;
  if(e.stuckT>=1){
    if(Math.hypot(e.x-e.sx,e.y-e.sy)<0.3){
      computeReinfPath(e);
      const w=e.rpath&&e.rpath[e.rpathI];
      unstickE(e,w?w[0]+.5:op.x,w?w[1]+.5:op.y);
    }
    e.sx=e.x;e.sy=e.y;e.stuckT=0}
  const sp=e.speed*1.25;
  if(!e.rpath){
    const dx=op.x-e.x,dy=op.y-e.y,d=Math.hypot(dx,dy)||1;
    moveE(e,dx/d*sp*dt,dy/d*sp*dt);e.face=Math.atan2(dy,dx);return;
  }
  let wp=e.rpath[e.rpathI];
  while(wp&&Math.hypot(wp[0]+.5-e.x,wp[1]+.5-e.y)<.5){e.rpathI++;wp=e.rpath[e.rpathI]}
  if(!wp){reinfArrive(e,op);return}
  const dx=wp[0]+.5-e.x,dy=wp[1]+.5-e.y,d=Math.hypot(dx,dy)||1;
  moveE(e,dx/d*sp*dt,dy/d*sp*dt);e.face=Math.atan2(dy,dx);
}

export function checkOutpostCleared(e){
 if(!e.outpost||e.outpost.taken)return;
 const op=e.outpost;
 const alive=op.enemies.filter(x=>x.alive);
 if(alive.length===0){
  op.taken=true;op.killed=op.totalCount;set_outpostsTaken(outpostsTaken+1);
  if(op.camp&&conquestOn)conquestCampTaken(op);
  op.alertState='CLEARED';
  meta.stats.outpostsTaken=(meta.stats.outpostsTaken||0)+1;
  showAchievementPopup({name:op.name,desc:(op.camp?'Campamento tomado · ':'Puesto tomado · ')+op.totalCount+' bajas',icon:op.camp?'⛺':op.tier===3?'🏰':op.tier===2?'🏢':'🏠'},'outpost');
  SFX.win();if(navigator.vibrate)navigator.vibrate([40,60,40]);
  if(!op.camp||!op.rewardGiven){op.rewardGiven=true;spawnOutpostReward(op)}
  if(!op.camp)decos.push({x:op.x,y:op.y,spr:sFlag,wh:1.35,ww:1.5,z0:2.1,wave:true});
  let revealed=0;
  for(const other of OUTPOSTS){
    if(other===op||other.taken)continue;
    if(revealedOutposts.has(other.id))continue;
    if(Math.hypot(other.x-op.x,other.y-op.y)<50){
      revealedOutposts.add(other.id);
      revealed++;
    }
  }
  if(revealed>0)msg('📡 '+revealed+(op.camp?' CAMPAMENTO(S)':' PUESTO(S)')+' MARCADO(S) EN MINIMAPA','#9fd8ff');
  const o1=objectives.find(o=>o.id==='take_outpost');
  if(o1&&!o1.done){o1.done=true;meta.stats.objectivesDone++;msg('¡OBJETIVO: PUESTO TOMADO!','#7dff8f');updateDailyProgress('objectives',1)}
  const o2=objectives.find(o=>o.id==='take_2_outposts');
  if(o2&&!o2.done&&outpostsTaken>=2){o2.done=true;meta.stats.objectivesDone++;msg('¡OBJETIVO: 2 PUESTOS!','#7dff8f');updateDailyProgress('objectives',1)}
  updateDailyProgress('outposts',1);saveMeta();
 }
}

function spawnOutpostReward(op){
  const tier=op.tier,rewards=makeOutpostReward(tier),spots=[];
  const validCells=op.interiorCells.filter(c=>{
    const wx=op.maskX+c.mx+0.5,wy=op.maskY+c.my+0.5;
    return canStandProp(wx,wy,0.3);
  });
  const numCaches=tier===3?2:1;
  let tries=0;
  while(spots.length<numCaches&&tries<40&&validCells.length>0){
    tries++;
    const c=validCells[Math.floor(Math.random()*validCells.length)];
    const wx=op.maskX+c.mx+0.5,wy=op.maskY+c.my+0.5;
    if(Math.hypot(wx-op.x,wy-op.y)<1.5)continue;
    let tooClose=false;
    for(const s of spots)if(Math.hypot(s[0]-wx,s[1]-wy)<1.5){tooClose=true;break}
    if(tooClose)continue;
    spots.push([wx,wy]);
  }
  if(spots.length===0)spots.push([op.x,op.y]);
  const primaryReward=rewards;
  spots.forEach((s,i)=>{
   corpses.push({x:s[0],y:s[1],spr:sCache,wh:0.7,ww:0.7,z0:0,perm:false,
    loot:i===0?primaryReward:[{id:'shells',count:2},{id:'bullets',count:2}],cache:true,outpost:op,healAvailable:true});
  });
  rebuildPropGrid();
}

export function rollObjectives(){
 const all=[
  {id:'briefcase',label:'RECUPERA EL MALETÍN'},
  {id:'kill_officer',label:'ELIMINA AL SARGENTO'},
  {id:'no_damage',label:'60s SIN RECIBIR DAÑO'},
  {id:'loot_amount',label:'EXTRAE CON $2500+'},
  {id:'take_outpost',label:'TOMA UN PUESTO'},
  {id:'take_2_outposts',label:'TOMA 2 PUESTOS'}
 ];
 if(selectedMap==='front'){
  // En el frente solo hay soldados: no aparece el objetivo del sargento.
  for(let i=all.length-1;i>=0;i--)if(all[i].id==='kill_officer')all.splice(i,1);
  for(const o of all){if(o.id==='take_outpost')o.label='TOMA UN CAMPAMENTO';if(o.id==='take_2_outposts')o.label='TOMA 2 CAMPAMENTOS'}
 }
 all.sort(()=>Math.random()-0.5);
 const n=2+(Math.random()<.5?0:1);
 set_objectives(all.slice(0,n).map(o=>({...o,done:false})));
 if(objectives.find(o=>o.id==='briefcase')){
  const conts=corpses.filter(c=>c.perm);
  if(conts.length){const c=conts[Math.floor(Math.random()*conts.length)];c.loot.push({id:'briefcase',count:1})}
 }
 if(objectives.find(o=>o.id==='kill_officer')){
  const offs=enemies.filter(e=>e.type==='officer');
  if(offs.length){offs[Math.floor(Math.random()*offs.length)].objective=true}
 }
}

export function spawnSafeBoxes(){
 set_SAFE_BOXES([]);set_safeCrack(null);set_nearSafe(null);$('safeCrackUI').style.display='none';
 const target=5;let tries=0;
 while(SAFE_BOXES.length<target&&tries<1800){tries++;
  const x=2.5+Math.floor(Math.random()*(MW-5)),y=2.5+Math.floor(Math.random()*(MH-5));
  if(isWall(x,y)||!canStandProp(x,y,.35))continue;
  if(Math.hypot(x-2.5,y-2.5)<7||Math.hypot(x-BEACON.x,y-BEACON.y)<5)continue;
  if(SAFE_BOXES.some(q=>Math.hypot(q.x-x,q.y-y)<9))continue;
  SAFE_BOXES.push({x,y,spr:sSafe,wh:.42,ww:.38,opened:false,loot:[],perm:true,isSafe:true});
 }
}

function safeLootRoll(){
 const roll=Math.random();
 if(roll<.48){
  const common=['shells','bullets','ammo9','ammo76239','bandage','medkit','water','soda','burger','fruit','can'];
  const id=common[Math.floor(Math.random()*common.length)];
  const n=(id==='shells'||id==='bullets'||id==='ammo9'||id==='ammo76239')?(1+Math.floor(Math.random()*2)):1;
  const loot=[{id,count:n}];
  if(Math.random()<.3)loot.push({id:['bandage','water','can','bullets'][Math.floor(Math.random()*4)],count:1});
  return loot;
 }
 let pool;
 if(roll<.80)pool=['bronze_lion','bronze_eagle','bronze_bust'];
 else if(roll<.96)pool=['silver_watch','silver_chalice','silver_teapot'];
 else pool=['gold_ring','gold_watch','gold_lion'];
 const id=pool[Math.floor(Math.random()*pool.length)];
 return [{id,count:1}];
}

export function beginSafeCrack(safe){
 if(!safe||safe.opened||safeCrack)return;
 set_safeCrack({safe,elapsed:0});$('safeCrackUI').style.display='block';$('safeCrackBar').style.width='0%';$('safeCrackTime').textContent='30 segundos restantes';set_fireHeld(false);SFX.ui();
}

export function cancelSafeCrack(reason){
 if(!safeCrack)return;set_safeCrack(null);$('safeCrackUI').style.display='none';$('safeCrackBar').style.width='0%';
 if(reason)msg(reason,'#ffb060');SFX.ui();
}

export function updateSafeCrack(dt){
 if(!safeCrack)return;
 if(state!=='play'){cancelSafeCrack();return}
 const safe=safeCrack.safe;
 if(Math.hypot(P.x-safe.x,P.y-safe.y)>2.2){cancelSafeCrack('FORZADO CANCELADO: TE ALEJASTE DE LA CAJA');return}
 safeCrack.elapsed=Math.min(30,safeCrack.elapsed+dt);
 const pct=safeCrack.elapsed/30*100;$('safeCrackBar').style.width=pct+'%';
 $('safeCrackTime').textContent=Math.ceil(30-safeCrack.elapsed)+' segundos restantes';
 if(safeCrack.elapsed>=30){
  safe.opened=true;safe.loot=safeLootRoll();const opened=safe;set_safeCrack(null);$('safeCrackUI').style.display='none';
  set_nearC(opened); $('lootPanel').firstElementChild.textContent='BOTÍN DE CAJA FUERTE';renderLoot(opened);$('lootPanel').classList.add('on');set_fireHeld(false);SFX.win();msg('¡CAJA FUERTE ABIERTA!','#ffd24a');
 }
}
