import { addFlash } from './lights.js';
import { addBlast, addCasing, bloodWall, bulletMark } from './fx.js';
import { $, C, DEATH_MONEY_PENALTY, EXTRACT_TAX, INSURANCE_RATE, INSURANCE_RECOVER, MH, MW, OUTPOSTS, RESALE_RATE, isWall, map } from './core.js';
import { ALARMS, canStandProp, propBlocksAt } from './outposts.js';
import { SOLDIER, sBlood } from './sprites.js';
import { ETYPES, ITEMS, WEAPONS, WID, updateDailyProgress } from './data.js';
import { P, addXp, allies, corpses, decals, dmgDirs, dmgNumbers, eGrenades, enemies, fires, gt, hitMarkers, kills, lastEco, meta, noises, objectives, outpostsTaken, parts, rockets, runStats, saveMeta, set_fireHeld, set_kills, set_noDamageTimer, set_state, smokes, state, throwables, total, unlockAchievement } from './state.js';
import { cancelSafeCrack, checkOutpostCleared, damageAlarm, damageAlarmsAt } from './operations.js';
import { SFX, enemyScream, whoosh, stopPainLoop, stopOutpostRadio } from './audio.js';
import { PL, RH, RW, projDist } from './backdrop.js';
import { conquestOn, ownedCell } from './conquest.js';
import { paused } from './input.js';
import { broadcastToSquad, raiseAlert, setState, startReload, wallDist } from './ai.js';
import { hud, msg, screen, showDeathScreen } from './hud.js';


export function killEnemy(e,distance,method){
 if(!e.alive)return;e.alive=false;set_kills(kills+1);
 const conf=ETYPES[e.type];addXp((conf&&conf.xp)||10);
 enemyScream(e);puff(e.x,e.y,14,C(210,30,30));
 if(decals.length<70){decals.push({x:e.x,y:e.y,spr:sBlood,wh:.34,ww:.34});for(let i=0;i<2;i++)decals.push({x:e.x+(Math.random()-.5)*.7,y:e.y+(Math.random()-.5)*.7,spr:sBlood,wh:.14+Math.random()*.08,ww:.14+Math.random()*.08})}
 bloodWall(e.x,e.y,3);
 if(e.fr&&e.fr.isSet){const cs=e.fr.corpses[(Math.random()*3)|0],ch=e.height*cs.hr;corpses.push({x:e.x,y:e.y,spr:cs,loot:e.loot.slice(),wh:ch,ww:ch*cs.w/cs.h,z0:0,flip:Math.random()<.5,dying:e.fr.death,t0:gt,eh:e.height})}
 else corpses.push({x:e.x,y:e.y,spr:e.corpse,loot:e.loot.slice(),wh:e.height*.45,ww:e.height*.45*e.corpse.w/e.corpse.h,z0:0});
 const key='kills_'+e.type;if(meta.stats[key]!==undefined)meta.stats[key]++;
 updateDailyProgress('kills',1);
 if(P.weapon===2||P.weapon===3||P.weapon===4||P.weapon===5)updateDailyProgress('rifle_kills',1);
 if(kills>=1)unlockAchievement('first_blood');
 if(method==='melee'){runStats.meleeKills++;meta.achievementProgress.meleeKills++;if(meta.achievementProgress.meleeKills>=10)unlockAchievement('berserker')}
 if(distance!==undefined&&distance>20){runStats.longKills++;meta.achievementProgress.longKills++;if(meta.achievementProgress.longKills>=5)unlockAchievement('sniper_ace')}
 if(e.type==='commander')unlockAchievement('commander_down');
 if(e.objective){const obj=objectives.find(o=>o.id==='kill_officer');if(obj&&!obj.done){obj.done=true;msg('¡SARGENTO ELIMINADO!','#7dff8f');meta.stats.objectivesDone++;updateDailyProgress('objectives',1)}}
 checkOutpostCleared(e);saveMeta();
}

function fragExplode(x,y,byEnemy){SFX.boom();addFlash(x,y,6,.4);addBlast(x,y,1.8);if(!byEnemy)damageAlarmsAt(x,y,4.0,120);if(navigator.vibrate)navigator.vibrate(50);
 puff(x,y,30,C(255,180,40));puff(x,y,15,C(255,240,150));puff(x,y,20,C(80,80,80));
 let killCount=0;
 for(const e of enemies){if(!e.alive)continue;const d=Math.hypot(e.x-x,e.y-y);
  if(d<4.5&&los(x,y,e.x,e.y)){const dm=Math.round(90*(1-d/4.5));if(dm>0){const before=e.alive;hit(e,dm,false);if(before&&!e.alive)killCount++}}}
 if(killCount>=3)unlockAchievement('demolisher');
 for(const a of allies){if(!a.alive)continue;const d=Math.hypot(a.x-x,a.y-y);
  if(d<4.5){a.hp-=Math.round(60*(1-d/4.5));if(a.hp<=0){a.hp=0;a.alive=false;msg('¡ALIADO CAÍDO!','#ff6a5a')}}}
 const dp=Math.hypot(P.x-x,P.y-y);if(dp<4.0&&los(x,y,P.x,P.y))hurt(Math.max(1,Math.round(50*(1-dp/4.0))),x,y)}

function spawnSmoke(x,y){if(smokes.length>=5)smokes.shift();
 smokes.push({x,y,life:8,maxLife:8,radius:3.5,seed:Math.random()*100});SFX.smoke()}

function spawnFire(x,y){fires.push({x,y,life:3.5,maxLife:3.5,radius:2.5});SFX.fire();if(navigator.vibrate)navigator.vibrate(30)}

export function updateThrowables(dt){for(let i=throwables.length-1;i>=0;i--){const g=throwables[i];
 g.life-=dt;g.age+=dt;if(g.type==='frag')g.fuse-=dt;g.vz-=12*dt;g.z+=g.vz*dt;
 const nx=g.x+g.vx*dt,ny=g.y+g.vy*dt;let hitWall=false;
 if(isWall(nx,g.y)||propBlocksAt(nx,g.y)){g.vx=-g.vx*.45;hitWall=true}else g.x=nx;
 if(isWall(g.x,ny)||propBlocksAt(g.x,ny)){g.vy=-g.vy*.45;hitWall=true}else g.y=ny;
 let hitGround=false;
 if(g.z<=.05){g.z=.05;
  if(Math.abs(g.vz)>.5){g.vz=-g.vz*.35;g.vx*=.55;g.vy*=.55;g.bounces++;hitGround=true;SFX.bounce()}
  else{g.vz=0;g.vx*=.85;g.vy*=.85;if(g.bounces===0){g.bounces=1;hitGround=true}}}
 let detonate=false;
 if(g.life<=0)detonate=true;
 else if(g.type==='frag'&&g.fuse<=0)detonate=true;
 else if((g.type==='smoke'||g.type==='molotov')&&(hitGround||hitWall)&&g.age>.15)detonate=true;
 if(detonate){if(g.type==='frag')fragExplode(g.x,g.y);
  else if(g.type==='smoke')spawnSmoke(g.x,g.y);
  else spawnFire(g.x,g.y);
  throwables.splice(i,1)}}}

export function updateEGrenades(dt){
 for(let i=eGrenades.length-1;i>=0;i--){const g=eGrenades[i];
  g.life-=dt;g.fuse-=dt;g.vz-=12*dt;g.z+=g.vz*dt;
  const nx=g.x+g.vx*dt,ny=g.y+g.vy*dt;
  if(isWall(nx,g.y)||propBlocksAt(nx,g.y))g.vx=-g.vx*.4;else g.x=nx;
  if(isWall(g.x,ny)||propBlocksAt(g.x,ny))g.vy=-g.vy*.4;else g.y=ny;
  if(g.z<=.05){g.z=.05;
   if(Math.abs(g.vz)>.5){g.vz=-g.vz*.35;g.vx*=.5;g.vy*=.5}
   else{g.vz=0;g.vx*=.85;g.vy*=.85}}
  if(g.fuse<=0||g.life<=0){fragExplode(g.x,g.y,true);eGrenades.splice(i,1)}}}

export function updateSmokes(dt){for(let i=smokes.length-1;i>=0;i--){const s=smokes[i];s.life-=dt;if(s.life<=0)smokes.splice(i,1)}
 for(const s of smokes){if(Math.random()<.5){const a=Math.random()*6.28,r=Math.random()*s.radius;
  parts.push({x:s.x+Math.cos(a)*r,y:s.y+Math.sin(a)*r,vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2,life:1.2+Math.random()*.5,col:C(200,200,200)})}}}

export function updateFires(dt){for(let i=fires.length-1;i>=0;i--){const f=fires[i];f.life-=dt;if(f.life<=0){fires.splice(i,1);continue}
 for(let k=0;k<3;k++){const a=Math.random()*6.28,r=Math.random()*f.radius;
  parts.push({x:f.x+Math.cos(a)*r,y:f.y+Math.sin(a)*r,vx:0,vy:0,life:.35+Math.random()*.25,col:C(255,80+Math.random()*130,30)})}
 const dx=P.x-f.x,dy=P.y-f.y;
 if(dx*dx+dy*dy<f.radius*f.radius&&los(f.x,f.y,P.x,P.y)){P.fireHurtCd-=dt;if(P.fireHurtCd<=0){P.fireHurtCd=.4;hurt(4,f.x,f.y);if(navigator.vibrate)navigator.vibrate(30)}}
 for(const al of ALARMS){if(al.alive&&Math.hypot(al.x-f.x,al.y-f.y)<f.radius+.3)damageAlarm(al,18*dt)}
 for(const e of enemies){if(!e.alive)continue;const ex=e.x-f.x,ey=e.y-f.y;
  if(ex*ex+ey*ey<f.radius*f.radius){e.hp-=10*dt;if(e.hp<=0)killEnemy(e)}}}}

export function melee(){if(state!=='play'||P.fireCd>0.15||paused())return;
 P.fireCd=0.55;P.meleeAnim=0.28;SFX.punch();
 const dx=Math.cos(P.a),dy=Math.sin(P.a);
 for(const al of ALARMS){if(!al.alive)continue;const ex=al.x-P.x,ey=al.y-P.y,t=ex*dx+ey*dy;if(t>0&&t<1.7&&Math.abs(ex*dy-ey*dx)<.7)damageAlarm(al,22)}
 for(const e of enemies){if(!e.alive)continue;
  const ex=e.x-P.x,ey=e.y-P.y,t=ex*dx+ey*dy;
  if(t<=0||t>1.5)continue;
  const perp=Math.abs(ex*dy-ey*dx);
  if(perp<.55){const dist=Math.hypot(ex,ey);hit(e,22,false,{dist:dist,melee:true});const push=.45;
   if(canStandProp(e.x+dx*push,e.y+dy*push,.3)){e.x+=dx*push;e.y+=dy*push}break}}
 hud(false)}

export function worldToScreen(wx,wy,zh){
 const dx=Math.cos(P.a),dy=Math.sin(P.a),px=-dy*PL,py=dx*PL;
 const sx=wx-P.x,sy=wy-P.y;const inv=1/(px*dy-dx*py);
 const tX=inv*(dy*sx-dx*sy),tY=inv*(-py*sx+px*sy);
 if(tY<0.3)return null;
 return {x:(RW/2)*(1+tX/tY),y:RH/2+(0.5-zh)*(projDist/tY),dist:tY,sc:projDist/tY,tX:tX,tY:tY}}

export function shoot(){if(state!=='play'||P.fireCd>0||paused()||P.reloading>0)return;
 const w=WEAPONS[P.weapon],wi=P.weapon;
 if(w.ammo){if(P.mag[wi]<=0){if(P[w.ammo]>0){startReload();return}SFX.empty();P.fireCd=.25;return}}
 P.fireCd=w.rate;P.muzzle=.09;
 if(w.ammo)P.mag[wi]--;
 SFX[w.sfx]();
 const noiseR=w.rocket?35:w.ammo==='shells'?30:w.ammo==='bullets'?28:22;
 noises.push({x:P.x,y:P.y,radius:noiseR,life:2.5,intensity:1});
 if(noises.length>15)noises.shift();
 if(w.rocket){
   const ox=Math.cos(P.a),oy=Math.sin(P.a);
   rockets.push({
     x:P.x+ox*.5, y:P.y+oy*.5,
     vx:ox*15, vy:oy*15,
     life:3,
     originX:P.x, originY:P.y, armed:false
   });
   P.muzzle=.12;P.rpgSmoke=gt;
   whoosh();
   if(smokes.length<6){
     smokes.push({x:P.x+ox*.5,y:P.y+oy*.5,life:1.5,maxLife:1.5,radius:1.0,seed:Math.random()*100});
   }
   hud(true);
   return;
 }
 /* Vaina expulsada: lateral y ligeramente hacia atrás, con física solo visual. */
 addCasing(P.x+Math.cos(P.a+Math.PI/2)*.2,P.y+Math.sin(P.a+Math.PI/2)*.2,Math.cos(P.a),Math.sin(P.a));
 for(let i=0;i<w.pellets;i++){const a=P.a+(Math.random()-.5)*w.spread,rx=Math.cos(a),ry=Math.sin(a);let bt=wallDist(P.x,P.y,rx,ry,40),be=null;const wd0=bt;
  for(const e of enemies){if(!e.alive)continue;const ex=e.x-P.x,ey=e.y-P.y,t=ex*rx+ey*ry;if(t<=.3||t>=bt)continue;if(Math.abs(ex*ry-ey*rx)<.42){bt=t;be=e}}
  if(!be){for(const al of ALARMS){if(!al.alive)continue;const ex=al.x-P.x,ey=al.y-P.y,t=ex*rx+ey*ry;
   if(t<=.3)continue;
   if(Math.abs(ex*ry-ey*rx)<al.prop.r+.08&&wd0>=t-al.prop.r-.25){damageAlarm(al,w.dmg);break}}}
  if(!be&&wd0<26)bulletMark(P.x,P.y,rx,ry,26);
  if(be){const crit=Math.random()<0.2;hit(be,w.dmg*(crit?1.5:1),crit,{dist:bt})}}
 hud(true)}

function damageEnemyArmor(e,d){
 const head=Math.random()<.3,q=head?'helmet':'vest',piece=e[q];
 if(!piece)return d;
 const def=ITEMS[piece.id];if(!def)return d;
 const reduction=def.red||0,absorbed=Math.min(piece.dur,d*reduction);
 piece.dur-=absorbed;
 if(piece.dur<=.01){e[q]=null}
 return d-absorbed;
}

export function hit(e,d,crit,info){d=damageEnemyArmor(e,d);e.hp-=d;e.hurtT=.16;
 e.recentDmg+=d;e.recentDmgT=1.5;
 if(crit){runStats.headshots++;meta.achievementProgress.headshots++;updateDailyProgress('headshots',1);if(meta.achievementProgress.headshots>=10)unlockAchievement('surgeon')}
 if(e.hp<=0){killEnemy(e,info&&info.dist,info&&info.melee?'melee':'shoot')}
 else{
  if(e.state!=='COMBAT'&&e.state!=='FLEE'){setState(e,'COMBAT');e.lastKnownPos={x:P.x,y:P.y};if(e.outpost)raiseAlert(e.outpost,'ALERT');broadcastToSquad(e,e.lastKnownPos)}
  e.detect=1;
  SFX.enemyHit();puff(e.x,e.y,5,C(200,40,40));if(Math.random()<.5)bloodWall(e.x,e.y,1);
  const sp=worldToScreen(e.x,e.y,e.height*.55);
  if(sp){hitMarkers.push({sx:sp.x,sy:sp.y,life:.18,max:.18});
   dmgNumbers.push({sx:sp.x+(Math.random()-.5)*14,sy:sp.y-4,life:.7,max:.7,val:Math.round(d),crit:!!crit})}
  if(crit)SFX.crit()}}

export function hurt(d,srcX,srcY){if(state!=='play')return;P.hp-=d;P.hurt=.45;SFX.playerHurt();
 set_noDamageTimer(0);runStats.damageTaken=true;
 if(navigator.vibrate)navigator.vibrate(Math.min(80,Math.round(d*1.5)));
 if(srcX!==undefined){const a=Math.atan2(srcY-P.y,srcX-P.x);dmgDirs.push({angle:a,life:1.2,max:1.2})}
 if(P.hp<=0){P.hp=0;cancelSafeCrack();$('safeCrackUI').style.display='none';set_state('dead');set_fireHeld(false);stopPainLoop(200);stopOutpostRadio();SFX.playerDeath();onDeath();showDeathScreen()}
 hud(true)}

export function puff(x,y,n,col){for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()-.5)*2.4,vy:(Math.random()-.5)*2.4,life:.4+Math.random()*.4,col})}

/* ¿El segmento cruza alguna celda de pared, aunque solo roce una esquina? (recorrido exacto de la cuadrícula) */
export function segWall(x0,y0,x1,y1){
 const wc=(cx,cy)=>cx<0||cy<0||cx>=MW||cy>=MH||map[cy*MW+cx]!==0;
 const dx=x1-x0,dy=y1-y0;
 let x=Math.floor(x0),y=Math.floor(y0);const xe=Math.floor(x1),ye=Math.floor(y1);
 if(x===xe&&y===ye)return false;
 const sx=dx>0?1:-1,sy=dy>0?1:-1;
 const tdx=dx!==0?Math.abs(1/dx):1e30,tdy=dy!==0?Math.abs(1/dy):1e30;
 let tx=dx>0?(x+1-x0)*tdx:dx<0?(x0-x)*tdx:1e30;
 let ty=dy>0?(y+1-y0)*tdy:dy<0?(y0-y)*tdy:1e30;
 for(let g=0;g<600&&!(x===xe&&y===ye);g++){
  if(Math.abs(tx-ty)<1e-9){
   if(wc(x+sx,y)||wc(x,y+sy))return true;
   x+=sx;y+=sy;tx+=tdx;ty+=tdy;
  } else if(tx<ty){x+=sx;tx+=tdx}else{y+=sy;ty+=tdy}
  if(!(x===xe&&y===ye)&&wc(x,y))return true;
 }
 return false}

export function los(x0,y0,x1,y1){
 if(segWall(x0,y0,x1,y1))return false;
 const dx=x1-x0,dy=y1-y0,n=Math.ceil(Math.hypot(dx,dy)/.12);
 for(let i=1;i<n;i++){const tx=x0+dx*i/n,ty=y0+dy*i/n;
  if(propBlocksAt(tx,ty))return false;
  if(smokes.length)for(const s of smokes){const sdx=tx-s.x,sdy=ty-s.y;if(sdx*sdx+sdy*sdy<s.radius*s.radius)return false}}
 return true}

export function moveE(e,dx,dy){
 e.mvAt=gt;
 // Modo conquista: ningún enemigo puede pisar tu territorio (si ya está dentro, sí puede salir).
 const blk=conquestOn&&e.outpost&&!ownedCell(e.x,e.y);
 if(canStandProp(e.x+dx,e.y,.3)&&!(blk&&ownedCell(e.x+dx,e.y)))e.x+=dx;
 if(canStandProp(e.x,e.y+dy,.3)&&!(blk&&ownedCell(e.x,e.y+dy)))e.y+=dy}

export function stashValue(arr){let v=0;for(const it of arr)if(it)v+=ITEMS[it.id].v*it.count;return v}

export function insuranceCost(){return Math.max(20,Math.round(stashValue(meta.stash)*INSURANCE_RATE))}

function onDeath(){
 meta.stats.runs++;if(meta.stats.runs>=10)unlockAchievement('veteran');
 const lost=Math.round(meta.money*DEATH_MONEY_PENALTY);
 meta.money-=lost;meta.stats.totalLostOnDeath+=lost;lastEco.tax=lost;
 let insurancePaid=0;
 if(meta.insuranceActive){insurancePaid=Math.round(stashValue(meta.stash)*INSURANCE_RECOVER);meta.money+=insurancePaid;meta.insuranceActive=false}
 meta.stash=new Array(12).fill(null);saveMeta();
 $('stats').innerHTML='ENEMIGOS: <b>'+kills+'/'+total+'</b><br>PUESTOS: <b>'+outpostsTaken+'/'+OUTPOSTS.length+'</b><br>TIEMPO: <b>'+gt.toFixed(1)+'s</b><br>'+
  '<span style="color:#ff6a5a">-$'+lost+' (10%)</span>'+(insurancePaid>0?'<br><span style="color:#7dff8f">+$'+insurancePaid+' (seguro 50%)</span>':'<br><span style="color:#ff6a5a">Equipo perdido</span>');
}

export function onWin(){
 const currentVal=(()=>{let v=0;
  for(const it of P.inventory)if(it)v+=ITEMS[it.id].v*it.count;
  for(const q in P.eq)if(P.eq[q])v+=ITEMS[P.eq[q].id].v;
  for(const wi of (P.weaponSlots||[]))if(wi>=0)v+=ITEMS[WID[wi]].v;
  for(const t in P.throwables)if(P.throwables[t]>0)v+=ITEMS[t].v*P.throwables[t];
  return v})();
 const laObj=objectives.find(o=>o.id==='loot_amount');
 if(laObj&&!laObj.done&&currentVal>=2500){laObj.done=true;msg('¡$2500+ EXTRAÍDOS!','#7dff8f');meta.stats.objectivesDone++;updateDailyProgress('objectives',1)}
 let itemCount=0;
 for(const it of P.inventory)if(it)itemCount+=it.count;
 for(const t in P.throwables)if(P.throwables[t]>0)itemCount+=P.throwables[t];
 if(!runStats.damageTaken)unlockAchievement('ghost');
 if(currentVal>=5000)unlockAchievement('rich');
 if(gt<240)unlockAchievement('speedrun');
 if(itemCount>=12)unlockAchievement('collector');
 let totalVal=currentVal,objBonus=0;
 let miscBonus=0;for(const it of P.inventory)if(it&&ITEMS[it.id].misc)miscBonus+=ITEMS[it.id].v*it.count*(1-RESALE_RATE);
 for(const o of objectives)if(o.done){totalVal+=500;objBonus++}
 let allyBonus=0;
 for(const a of allies)if(a.alive&&a.following){totalVal+=800;allyBonus++}
 const nightmareMul=meta.nightmareActive?3:1;
 const gross=Math.round((totalVal*RESALE_RATE+miscBonus)*nightmareMul);
 const tax=Math.round(gross*EXTRACT_TAX);
 const earned=gross-tax;
 lastEco.gross=gross;lastEco.tax=tax;lastEco.net=earned;
 meta.money+=earned;meta.stats.runs++;meta.stats.wins++;meta.stats.kills+=kills;
 if(!meta.stats.bestTime||gt<meta.stats.bestTime)meta.stats.bestTime=gt;
 if(earned>meta.stats.bestLoot)meta.stats.bestLoot=earned;
 meta.stats.totalEarned+=earned;meta.stats.objectivesDone+=objBonus;meta.stats.alliesRescued+=allyBonus;meta.stats.totalTaxPaid+=tax;
 updateDailyProgress('extract_money',currentVal);
 updateDailyProgress('objectives',objBonus);
 updateDailyProgress('allies',allyBonus);
 updateDailyProgress('no_death_win',1);
 updateDailyProgress('survive_time',gt);
 if(meta.stats.wins>=3&&!meta.nightmareUnlocked){
  meta.nightmareUnlocked=true;saveMeta();
  setTimeout(()=>{const p=document.createElement('div');p.className='achievement-popup';
   p.innerHTML='<div class="ic">💀</div><div class="info"><div class="t1">MODO DESBLOQUEADO</div><div class="t2">PESADILLA</div><div class="t3">Actívalo en el menú principal</div></div>';
   document.body.appendChild(p);setTimeout(()=>p.classList.add('show'),60);
   setTimeout(()=>{p.classList.remove('show');setTimeout(()=>p.remove(),600)},4200)},500)
 }
 if(meta.stats.runs>=10)unlockAchievement('veteran');
 addXp(100);meta.stash=new Array(12).fill(null);saveMeta();
 return earned;
}
