import { $, C, MH, MW, OUTPOSTS, frontZoneAt, hash, isWall } from './core.js';
import { proc } from './sprites.js';
import { P, decos, enemies, selectedMap, state } from './state.js';
import { spawnOutpostEnemies } from './worldgen.js';
import { checkOutpostCleared } from './operations.js';
import { SFX, radioCall } from './audio.js';
import { D4 } from './backdrop.js';
import { setState } from './ai.js';
import { msg } from './hud.js';
import { hurt } from './combat.js';


/* ===== MODO CONQUISTA (Frente de Ceniza) · Fase 1: territorios, contornos y zona prohibida =====
   terrOwner: -1 = tu territorio inicial (zona verde); k = sector del campamento k (OUTPOSTS[k]).
   Cada campamento tiene op.terr: 'enemy' (rojo), 'disputed' (amarillo) o 'player' (verde). */
export const terrOwner=new Int8Array(MW*MH).fill(-1);

export const terrCanvas=document.createElement('canvas');
terrCanvas.width=MW;
terrCanvas.height=MH;

export let conquestOn=false,conqTarget=-1,conqLocked=false,redT=10,redActive=false,terrDirty=true,terrKey='';

const RED_LIMIT=10;

export function buildTerritory(){
 conquestOn=selectedMap==='front';conqTarget=-1;conqLocked=false;redT=RED_LIMIT;redActive=false;terrDirty=true;
 if(!conquestOn){terrOwner.fill(-1);return}
 for(const op of OUTPOSTS){op.terr='enemy';op.contested=false;op.wave=null;op.waveT=0;op.waveFrom=null;op.rewardGiven=false}
 defT=DEF_LIMIT;defActive=false;retreatT=0;
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
  const z=frontZoneAt(x,y);if(z===2){terrOwner[y*MW+x]=-1;continue}
  // Sectores: la zona media se reparte solo entre sus campamentos y la devastada entre los suyos,
  // así nunca se puede saltar de la zona verde a la devastada.
  let best=-1,bd=1e9;
  for(let pass=0;pass<2&&best<0;pass++)OUTPOSTS.forEach((op,k)=>{if(pass===0&&op.zone!==z)return;const d=(x+.5-op.x)**2+(y+.5-op.y)**2;if(d<bd){bd=d;best=k}});
  terrOwner[y*MW+x]=best;
 }
 // Sectores vecinos (para saber cuáles se pueden atacar).
 for(const op of OUTPOSTS)op.adj=new Set();
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const a=terrOwner[y*MW+x];
  for(const[dx,dy]of [[1,0],[0,1]]){const nx=x+dx,ny=y+dy;if(nx>=MW||ny>=MH)continue;const b=terrOwner[ny*MW+nx];if(a===b)continue;
   if(a>=0)OUTPOSTS[a].adj.add(b);if(b>=0)OUTPOSTS[b].adj.add(a);}}
}

export function sectorOwned(k){return k<0||(OUTPOSTS[k]&&OUTPOSTS[k].terr==='player')}

function campAttackable(k){const op=OUTPOSTS[k];if(!op||op.terr!=='enemy')return false;
 // La zona devastada solo se abre cuando toda la zona media es tuya.
 if(op.zone===6&&OUTPOSTS.some(o=>o.zone===3&&o.terr!=='player'))return false;for(const n of op.adj)if(sectorOwned(n))return true;return false}

function terrStatusAt(x,y){
 const ix=x|0,iy=y|0;if(ix<0||iy<0||ix>=MW||iy>=MH)return 'enemy';
 const k=terrOwner[iy*MW+ix];if(sectorOwned(k))return 'own';
 if(k===conqTarget)return 'target';
 return OUTPOSTS[k].terr==='disputed'?'disputed':'enemy';
}

export function rebuildTerritoryCanvas(){
 const c=terrCanvas.getContext('2d'),im=c.createImageData(MW,MH),b=new Uint32Array(im.data.buffer);
 const col=k=>{if(sectorOwned(k))return[61,255,106];const op=OUTPOSTS[k];if(op.terr==='disputed')return[255,214,58];if(k===conqTarget)return[255,128,40];return[255,48,48]};
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const i=y*MW+x,k=terrOwner[i],own=sectorOwned(k);
  let edge=x===0||y===0||x===MW-1||y===MH-1;
  // El contorno se dibuja donde cambia el dueño (dos territorios verdes vecinos se funden en uno).
  if(!edge)for(const[dx,dy]of D4){const n=terrOwner[(y+dy)*MW+x+dx];if(n!==k&&!(own&&sectorOwned(n))){edge=true;break}}
  const[r,g,bl]=col(k),a=edge?235:(own?0:34);
  b[i]=(a<<24)|(bl<<16)|(g<<8)|r;}
 c.putImageData(im,0,0);terrDirty=false;
}

export function conquestCampTaken(op){
 // Fase 1: al tomar el campamento objetivo, su sector pasa a ser tuyo (las oleadas llegan en la fase 2).
 const k=OUTPOSTS.indexOf(op);if(k<0||op.terr==='player')return;
 if(k!==conqTarget&&!campAttackable(k))return;
 // Fase 2: el campamento queda en disputa; en unos segundos llega una oleada del puesto enemigo más cercano.
 op.terr='disputed';op.contested=true;op.wave=null;op.waveT=WAVE_DELAY;conqTarget=-1;conqLocked=false;terrDirty=true;
 defT=DEF_LIMIT;defActive=false;placeDefRing(op);
 msg('🟨 '+op.name+' EN DISPUTA · DEFIENDE EL PERÍMETRO','#ffd23a');
 radioCall(op);
}

export function conquestTick(dt){
 const warn=$('conqWarn'),info=$('conqInfo');
 if(!conquestOn||state!=='play'){if(warn)warn.style.display='none';if(info)info.style.display='none';const dw=$('defWarn');if(dw)dw.style.display='none';return}
 const disputing=conquestPhase2Tick(dt);
 if(state!=='play')return;
 // Objetivo: el campamento atacable más cercano. Al entrar en su sector queda fijado hasta conquistarlo.
 if(conqTarget>=0&&OUTPOSTS[conqTarget].terr!=='enemy'){conqTarget=-1;conqLocked=false}
 if(disputing){if(conqTarget!==-1){conqTarget=-1;terrDirty=true}conqLocked=false}
 else if(!conqLocked){let best=-1,bd=1e9;OUTPOSTS.forEach((op,k)=>{if(!campAttackable(k))return;const d=(op.x-P.x)**2+(op.y-P.y)**2;if(d<bd){bd=d;best=k}});
  if(best!==conqTarget){conqTarget=best;terrDirty=true}}
 const ix=P.x|0,iy=P.y|0,here=terrOwner[iy*MW+ix];
 if(!conqLocked&&conqTarget>=0&&here===conqTarget){conqLocked=true;msg('🎯 ATACANDO '+OUTPOSTS[conqTarget].name,'#ff9a4a')}
 // Campamento objetivo que quedó vacío (mandó su tropa): al entrar se toma directamente.
 if(conqLocked&&conqTarget>=0){const t=OUTPOSTS[conqTarget];if(!t.taken&&!campAlive(t).length)checkOutpostCleared({outpost:t})}
 const key=conqTarget+'|'+OUTPOSTS.map(o=>o.terr).join(',');if(key!==terrKey){terrKey=key;terrDirty=true}
 // Zona prohibida: territorio enemigo que no es el objetivo actual.
 const st=terrStatusAt(P.x,P.y);
 if(st==='enemy'){
  if(!redActive){redActive=true;redT=RED_LIMIT;SFX.ui&&SFX.ui()}
  redT-=dt;
  warn.style.display='block';warn.innerHTML='⚠ TERRITORIO ENEMIGO ⚠<br><span>VUELVE A TU TERRITORIO</span><b>'+Math.max(0,Math.ceil(redT))+'</b>';
  if(redT<=0){redActive=false;warn.style.display='none';hurt(99999,P.x,P.y);return}
 } else {redActive=false;redT=RED_LIMIT;warn.style.display='none'}
 const owned=OUTPOSTS.filter(o=>o.terr==='player').length;
 info.style.display='block';
 const dsp=OUTPOSTS.find(o=>o.terr==='disputed');
 if(dsp){info.textContent=!dsp.wave?('🟨 DEFIENDE '+dsp.name+' · OLEADA EN '+Math.max(0,Math.ceil(dsp.waveT))+'s'):('🟨 DEFIENDE '+dsp.name+' · OLEADA: '+dsp.wave.filter(e=>e.alive).length+'/'+dsp.wave.length);return}
 info.textContent=conqTarget>=0?('🎯 OBJETIVO: '+OUTPOSTS[conqTarget].name+(conqLocked?' · EN ASALTO':'')+' · '+owned+'/'+OUTPOSTS.length):(owned===OUTPOSTS.length?'🟩 FRENTE CONQUISTADO':'· '+owned+'/'+OUTPOSTS.length);
}

/* ===== MODO CONQUISTA · Fase 2: disputa, oleada, reposición en escalera y perímetro de defensa ===== */
export const DEF_R=9,DEF_LIMIT=10,WAVE_DELAY=8,WAVE_SIZE=5,REFILL_SIZE=4;

export let defT=DEF_LIMIT,defActive=false,pathAvoidOwn=false,retreatT=0;

// ESTACA DE PERÍMETRO: poste a franjas negras y amarillas con banderín, marca el área a defender.
const sDefStake=proc(10,24,(x,y)=>{
 if(y===23&&x>=2&&x<=6)return C(26,24,19);
 if(Math.abs(x-3)<1&&y>=2&&y<=22)return (((y>>1)&1)?C(30,28,24):C(240,200,40));
 if(x>=4&&x<=9&&y>=2&&y<=8){const t=(x-4)/5;if(Math.abs(y-5)<=3*(1-t)+.3){const n=hash(x,y,2261);return C(255,(214+n*20)|0,50)}}
 return 0;
});

export function ownedCell(x,y){const ix=x|0,iy=y|0;if(ix<0||iy<0||ix>=MW||iy>=MH)return false;return sectorOwned(terrOwner[iy*MW+ix])}

function campAlive(op){return op.enemies?op.enemies.filter(e=>e.alive):[]}

function campGarrison(op){return campAlive(op).filter(e=>e.state!=='REINFORCE'||e.reinfTarget===op)}

function spawnCampSoldiers(op,n){
 // Genera n soldados nuevos dentro del campamento sin borrar a los que ya tiene.
 const old=op.enemies||[],mn=op.min,mx=op.max,tk=op.taken;
 op.min=op.max=n;spawnOutpostEnemies(op);const fresh=op.enemies||[];
 op.min=mn;op.max=mx;op.taken=tk;op.enemies=old.concat(fresh);op.totalCount=op.enemies.length;
 return fresh;
}

function sendUnits(units,from,to){
 for(const u of units){
  const i=from.enemies.indexOf(u);if(i>=0)from.enemies.splice(i,1);
  to.enemies.push(u);
  u.outpost=to;u.reinf=true;u.arrived=false;u.reinfTarget=to;u.leash=to.leash;u.homeX=to.x;u.homeY=to.y;
  u.rpath=null;u.rpathI=0;u.repathT=0;u.stuckT=0;u.sx=u.x;u.sy=u.y;u.detect=1;
  setState(u,'REINFORCE');
 }
 from.totalCount=from.enemies.length;to.totalCount=to.enemies.length;
}

function nearestEnemyCamp(op,skip){
 let best=null,bd=1e9;
 for(const o of OUTPOSTS){if(o===op||o.terr!=='enemy'||(skip&&skip.has(o)))continue;const d=Math.hypot(o.x-op.x,o.y-op.y);if(d<bd){bd=d;best=o}}
 return best;
}

function refillCascade(empty,visited){
 // Escalera: el campamento enemigo más cercano con tropa manda 4 soldados al que quedó vacío, y así sucesivamente.
 let src=null,bd=1e9;
 for(const o of OUTPOSTS){if(o.terr!=='enemy'||visited.has(o))continue;if(!campGarrison(o).length)continue;const d=Math.hypot(o.x-empty.x,o.y-empty.y);if(d<bd){bd=d;src=o}}
 if(!src)return;
 visited.add(src);
 const units=campGarrison(src).slice(0,REFILL_SIZE);
 sendUnits(units,src,empty);
 msg('↻ '+src.name+' ENVÍA '+units.length+' SOLDADOS A '+empty.name,'#ff9a5a');
 if(!campGarrison(src).length)refillCascade(src,visited);
}

function launchWave(dsp){
 const src=nearestEnemyCamp(dsp);
 if(!src){consolidateCamp(dsp);return}
 let units=campGarrison(src).slice(0,WAVE_SIZE);
 if(units.length<WAVE_SIZE)units=units.concat(spawnCampSoldiers(src,WAVE_SIZE-units.length));
 sendUnits(units,src,dsp);
 dsp.wave=units;dsp.waveFrom=src;
 SFX.shout&&SFX.shout();msg('⚠ OLEADA DE '+units.length+' SOLDADOS SALE DE '+src.name,'#ff6a5a');
 if(!campGarrison(src).length)refillCascade(src,new Set([src,dsp]));
}

function placeDefRing(op){
 removeDefRing();
 const n=Math.round(6.2832*DEF_R/2.3);
 for(let k=0;k<n;k++){const a=k/n*6.2832,x=op.x+Math.cos(a)*DEF_R,y=op.y+Math.sin(a)*DEF_R;
  if(isWall(x,y))continue;decos.push({x,y,spr:sDefStake,wh:1.05,ww:1.05*sDefStake.w/sDefStake.h,z0:0,defRing:true,name:'ESTACA DE PERÍMETRO'})}
}

function removeDefRing(){for(let i=decos.length-1;i>=0;i--)if(decos[i].defRing)decos.splice(i,1)}

function consolidateCamp(op){
 op.terr='player';op.contested=false;op.wave=null;removeDefRing();terrDirty=true;defActive=false;
 SFX.win&&SFX.win();msg('🟩 '+op.name+' ES TU TERRITORIO','#7dff8f');
}

function loseCamp(op){
 // Huiste del perímetro: el enemigo retoma el puesto con la oleada.
 op.terr='enemy';op.contested=false;op.taken=false;op.alertState='CALM';removeDefRing();terrDirty=true;defActive=false;
 if(!op.wave)launchWave(op);
 if(op.terr!=='enemy')return; // (no había campamentos enemigos que enviaran tropa)
 op.wave=null;op.killed=op.enemies.filter(e=>!e.alive).length;op.totalCount=op.enemies.length;
 msg('🟥 PERDISTE '+op.name+' · EL ENEMIGO LO RETOMA','#ff4a4a');
}

function conquestPhase2Tick(dt){
 // Devuelve true si hay un campamento en disputa (bloquea elegir otro objetivo).
 const warn=$('defWarn');
 const dsp=OUTPOSTS.find(o=>o.terr==='disputed');
 // Ninguna unidad enemiga puede quedarse en tu territorio: vuelve al campamento enemigo más cercano.
 retreatT-=dt;
 if(retreatT<=0){retreatT=1;
  for(const e of enemies){if(!e.alive||!e.outpost||e.state==='REINFORCE')continue;if(!ownedCell(e.x,e.y))continue;
   if(e.outpost.contested)continue;
   const to=nearestEnemyCamp({x:e.x,y:e.y});if(!to||to===e.outpost)continue;sendUnits([e],e.outpost,to);}
 }
 if(!dsp){warn.style.display='none';defActive=false;defT=DEF_LIMIT;return false}
 if(!dsp.wave){dsp.waveT-=dt;if(dsp.waveT<=0)launchWave(dsp)}
 else if(!dsp.wave.some(e=>e.alive)){consolidateCamp(dsp);warn.style.display='none';return false}
 if(dsp.terr!=='disputed'){warn.style.display='none';return false}
 const inside=Math.hypot(P.x-dsp.x,P.y-dsp.y)<=DEF_R;
 if(!inside){
  if(!defActive){defActive=true;defT=DEF_LIMIT}
  defT-=dt;
  warn.style.display=redActive?'none':'block';
  warn.innerHTML='⚠ ABANDONAS EL PERÍMETRO ⚠<br><span>VUELVE A DEFENDER '+dsp.name+'</span><b>'+Math.max(0,Math.ceil(defT))+'</b>';
  if(defT<=0){warn.style.display='none';loseCamp(dsp);return false}
 } else {defActive=false;defT=DEF_LIMIT;warn.style.display='none'}
 return true;
}

/* setters para variables reasignadas desde otros módulos */
export function set_pathAvoidOwn(v){return pathAvoidOwn=v}
