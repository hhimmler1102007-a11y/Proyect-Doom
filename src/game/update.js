import { addFlash } from './lights.js';
import { addBlast } from './fx.js';
import { $, C, MH, MW, OUTPOSTS, PARKS, SAFE_BOXES, isWall, map, set_nearSafe } from './core.js';
import { BEACON, canStandProp, fortTowers, propBlocksAt, rebuildPropGrid, solidProps } from './outposts.js';
import { sRubble, sTower, sWire } from './sprites.js';
import { ITEMS, updateDailyProgress } from './data.js';
import { EXT_AT, P, allies, corpses, decos, dmgDirs, dmgNumbers, enemies, ext, fireHeld, gt, hitMarkers, kills, lastEco, leaves, fires, selectedMap, weather, meta, nearAlly, nearC, noDamageTimer, objectives, outpostsTaken, parts, pickups, projs, rockets, set_dayPhase, set_ext, set_fireHeld, set_nearAlly, set_nearC, set_noDamageTimer, set_state, total } from './state.js';
import { spawnCommander } from './worldgen.js';
import { damageAlarmsAt } from './operations.js';
import { SFX, STEP, sndPlayAt, stepPlay, stopOutpostRadio } from './audio.js';
import { rebuildMinimap } from './backdrop.js';
import { joyOn, joyX, joyY, keys } from './input.js';
import { finishReload } from './ai.js';
import { addInv, armor, lootReport } from './inventory.js';
import { msg, screen } from './hud.js';
import { hit, hurt, los, onWin, puff, segWall, shoot } from './combat.js';

export function updProjs(dt){for(let i=projs.length-1;i>=0;i--){const p=projs[i];p.life-=dt;
 let ox=p.x,oy=p.y;
 if(!p.started){p.started=true;if(p.srcX!==undefined){ox=p.srcX;oy=p.srcY}}
 p.x+=p.vx*dt;p.y+=p.vy*dt;
 if(p.life<=0||isWall(p.x,p.y)||propBlocksAt(p.x,p.y)||segWall(ox,oy,p.x,p.y)||propBlocksAt((ox+p.x)/2,(oy+p.y)/2)){puff(p.x,p.y,4,C(255,170,40));projs.splice(i,1);continue}
 if(p.allyTarget){let hitAlly=false;
  for(const a of allies){if(!a.alive)continue;const dx=p.x-a.x,dy=p.y-a.y;
   if(dx*dx+dy*dy<.18){a.hp-=p.dmg;if(a.hp<=0){a.hp=0;a.alive=false;msg('¡ALIADO CAÍDO!','#ff6a5a')}
    puff(p.x,p.y,6,C(255,170,40));hitAlly=true;break}}
  if(hitAlly){projs.splice(i,1);continue}
  const dx=P.x-p.x,dy=P.y-p.y;if(dx*dx+dy*dy<.18){hurt(armor(p.dmg),p.srcX||p.x,p.srcY||p.y);puff(p.x,p.y,6,C(255,170,40));projs.splice(i,1);continue}
 } else {const dx=p.x-P.x,dy=p.y-P.y;if(dx*dx+dy*dy<.18){hurt(armor(p.dmg),p.srcX||p.x,p.srcY||p.y);puff(p.x,p.y,6,C(255,170,40));projs.splice(i,1)}}
}}

export function updateAmbient(dt){
 // Hojas secas en parques del Distrito Cero.
 if(selectedMap==='district'&&Math.random()<.35){
  for(const[x0,y0,x1,y1]of PARKS){
   if(P.x>x0-14&&P.x<x1+14&&P.y>y0-14&&P.y<y1+14){
    if(leaves.length<52)leaves.push({kind:'leaf',x:x0+Math.random()*(x1-x0),y:y0+Math.random()*(y1-y0),ph:Math.random()*6.28,life:6+Math.random()*4,col:Math.random()<.5?C(150,110,40):C(110,140,50)});
    break;
   }
  }
 }
 // Ceniza suspendida en Frente de Ceniza: más visible en clima seco y casi ausente con lluvia.
 if(selectedMap==='front'&&weather!=='rain'&&leaves.length<72&&Math.random()<(weather==='fog'?.12:.24)){
  const a=Math.random()*Math.PI*2,d=3+Math.random()*8;
  leaves.push({kind:'ash',x:P.x+Math.cos(a)*d,y:P.y+Math.sin(a)*d,z:.18+Math.random()*1.25,
   vx:(Math.random()-.5)*.42,vy:-.12-Math.random()*.28,vz:(Math.random()-.5)*.08,
   ph:Math.random()*6.28,life:2.8+Math.random()*3.5,col:C(112+Math.random()*48,108+Math.random()*44,100+Math.random()*38)});
 }
 // Pequeñas brasas que ascienden desde fuegos activos.
 if(fires.length&&leaves.length<84&&Math.random()<.22){
  const f=fires[(Math.random()*fires.length)|0];
  if((f.x-P.x)**2+(f.y-P.y)**2<150){
   leaves.push({kind:'ember',x:f.x+(Math.random()-.5)*f.radius,y:f.y+(Math.random()-.5)*f.radius,z:.12+Math.random()*.35,
    vx:(Math.random()-.5)*.24,vy:(Math.random()-.5)*.18,vz:.28+Math.random()*.5,
    ph:Math.random()*6.28,life:.65+Math.random()*.8,col:C(255,105+Math.random()*95,35+Math.random()*35)});
  }
 }
 for(let i=leaves.length-1;i>=0;i--){const l=leaves[i];l.life-=dt;l.ph+=dt*(l.kind==='ember'?5:2);
  if(l.kind==='ash'||l.kind==='ember'){l.x+=l.vx*dt+Math.sin(l.ph)*dt*.12;l.y+=l.vy*dt;l.z=Math.max(.04,(l.z||.2)+(l.vz||0)*dt);l.vx*=.995;l.vy*=.995}
  else{l.y+=dt*.55;l.x+=Math.sin(l.ph)*dt*.8}
  if(l.life<=0)leaves.splice(i,1)
 }
}

export function updParts(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy*=.94}}

export function updFx(dt){
 for(let i=hitMarkers.length-1;i>=0;i--){const m=hitMarkers[i];m.life-=dt;if(m.life<=0)hitMarkers.splice(i,1)}
 for(let i=dmgNumbers.length-1;i>=0;i--){const n=dmgNumbers[i];n.life-=dt;n.sy-=28*dt;if(n.life<=0)dmgNumbers.splice(i,1)}
 for(let i=dmgDirs.length-1;i>=0;i--){const d=dmgDirs[i];d.life-=dt;if(d.life<=0)dmgDirs.splice(i,1)}}

function breakWalls(x,y){
 const R=1.7;let broken=0,cracked=0,propsBroken=0;
 const x0=Math.max(1,Math.floor(x-R)),x1=Math.min(MW-2,Math.floor(x+R)),y0=Math.max(1,Math.floor(y-R)),y1=Math.min(MH-2,Math.floor(y+R));
 for(let iy=y0;iy<=y1;iy++)for(let ix=x0;ix<=x1;ix++){
  const i=iy*MW+ix,t=map[i];
  if(t!==5&&t!==6&&t!==7)continue;
  if(Math.hypot(ix+.5-x,iy+.5-y)>R)continue;
  if(t===6){map[i]=7;cracked++;puff(ix+.5,iy+.5,6,C(150,140,125));continue}
  map[i]=0;broken++;
  for(let k=decos.length-1;k>=0;k--){const d=decos[k];if((d.spr===sWire||d.spr===sTower)&&(d.x|0)===ix&&(d.y|0)===iy)decos.splice(k,1)}
  for(const tw of fortTowers)if((tw.x|0)===ix&&(tw.y|0)===iy)tw.dead=true;
  decos.push({x:ix+.5,y:iy+.5,spr:sRubble,wh:.22,ww:.95,z0:0});
  puff(ix+.5,iy+.5,16,C(150,140,125));puff(ix+.5,iy+.5,6,C(90,84,76));
 }
 const RP=1.35;
 for(let i=solidProps.length-1;i>=0;i--){
   const p=solidProps[i];
   if(p.r>=0.5||p.alarm)continue;
   if(Math.hypot(p.x-x,p.y-y)>RP)continue;
   for(let k=decos.length-1;k>=0;k--){
     const d=decos[k];
     if(Math.abs(d.x-p.x)<.15&&Math.abs(d.y-p.y)<.15){decos.splice(k,1);break}
   }
   puff(p.x,p.y,10,C(120,100,80));puff(p.x,p.y,4,C(180,160,120));
   solidProps.splice(i,1);
   propsBroken++;
 }
 if(broken||cracked||propsBroken){
  rebuildPropGrid();
  rebuildMinimap();
  if(broken||propsBroken)msg('¡EXPLOSIÓN DESTRUCTIVA!','#ffb040');
  else if(cracked)msg('MURO AGRIETADO','#ffd24a');
 }
}

function boom(x,y,armed){
 if(!sndPlayAt('rpgboom',1,x,y,55))SFX.boom();addFlash(x,y,7,.5);addBlast(x,y,2.4);damageAlarmsAt(x,y,3.0,200);
 breakWalls(x,y);
 puff(x,y,28,C(255,150,30));puff(x,y,14,C(255,240,150));puff(x,y,12,C(90,90,90));
 for(const p of pickups){
   if(p.taken)continue;
   if(Math.hypot(p.x-x,p.y-y)<2.0){p.taken=true;puff(p.x,p.y,6,C(200,200,200))}
 }
 for(const e of enemies){if(!e.alive)continue;const d=Math.hypot(e.x-x,e.y-y);if(d<2.6&&los(x,y,e.x,e.y))hit(e,Math.round(120*(1-d/2.6)),false,{dist:d})}
 for(const a of allies){if(!a.alive)continue;const d=Math.hypot(a.x-x,a.y-y);if(d<2.6){a.hp-=Math.round(70*(1-d/2.6));if(a.hp<=0){a.hp=0;a.alive=false;msg('¡ALIADO CAÍDO!','#ff6a5a')}}}
 if(armed!==false){
   const dp=Math.hypot(P.x-x,P.y-y);
   if(dp<2.2&&los(x,y,P.x,P.y))hurt(Math.max(1,Math.round(45*(1-dp/2.2))),x,y);
 }
}

export function updRockets(dt){for(let i=rockets.length-1;i>=0;i--){const r=rockets[i];r.life-=dt;
 if(!r.armed){const pd=Math.hypot(r.x-r.originX,r.y-r.originY);if(pd>1.5)r.armed=true}
 r.vx*=.998;r.vy*=.998;
 let h=r.life<=0;
 for(let s=0;s<3&&!h;s++){r.x+=r.vx*dt/3;r.y+=r.vy*dt/3;if(isWall(r.x,r.y)||propBlocksAt(r.x,r.y))h=true;else for(const e of enemies)if(e.alive&&Math.hypot(e.x-r.x,e.y-r.y)<.5){h=true;break}}
 if(Math.random()<.35)parts.push({x:r.x,y:r.y,vx:0,vy:0,life:.3,col:C(150,150,150)});
 if(Math.random()<.4)parts.push({x:r.x-r.vx*.02,y:r.y-r.vy*.02,vx:0,vy:0,life:.18,col:C(255,140+Math.random()*90,40)});
 if(h){r.x-=r.vx*.03;r.y-=r.vy*.03;boom(r.x,r.y,r.armed);rockets.splice(i,1)}}}

export function updPlayer(dt){const dx=Math.cos(P.a),dy=Math.sin(P.a);let mx=0,my=0;
 if(keys.w||keys.arrowup)my++;if(keys.s||keys.arrowdown)my--;if(keys.a)mx--;if(keys.d)mx++;
 if(keys.arrowleft)P.a-=2.4*dt;if(keys.arrowright)P.a+=2.4*dt;if(joyOn){mx+=joyX;my+=joyY}
 const ml=Math.hypot(mx,my);if(ml>1){mx/=ml;my/=ml}const mv=Math.abs(mx)>.05||Math.abs(my)>.05,sp=3.6;
 const vx=(dx*my-dy*mx)*sp*dt,vy=(dy*my+dx*mx)*sp*dt;
 const ox0=P.x,oy0=P.y;if(canStandProp(P.x+vx,P.y,.27))P.x+=vx;if(canStandProp(P.x,P.y+vy,.27))P.y+=vy;
 if(mv&&Math.hypot(P.x-ox0,P.y-oy0)>dt*.8){const ph=Math.floor(P.bob/4.7);if(ph!==STEP.ph){STEP.ph=ph;stepPlay()}} /* un paso cada ~0,5 s al caminar */
 P.bob+=dt*(mv?9.5:2);P.walkAmt=(P.walkAmt||0)+((mv?1:0)-(P.walkAmt||0))*Math.min(1,dt*8);if(P.fireCd>0)P.fireCd-=dt;if(P.muzzle>0)P.muzzle-=dt;if(P.hurt>0)P.hurt-=dt;
 if(P.reloading>0){P.reloading-=dt;if(P.reloading<=0){P.reloading=0;finishReload()}}
 if(P.meleeAnim>0)P.meleeAnim-=dt;
 if(P.throwCd>0)P.throwCd-=dt;
 const newPhase=Math.min(1,gt/EXT_AT);set_dayPhase(newPhase);
 if(!P.extOn&&gt>=EXT_AT){P.extOn=true;msg('¡EXTRACCIÓN DISPONIBLE!','#7dff8f');SFX.win();spawnCommander()}
 set_noDamageTimer(noDamageTimer+(dt));
 const ndObj=objectives.find(o=>o.id==='no_damage');
 if(ndObj&&!ndObj.done&&noDamageTimer>=60){ndObj.done=true;msg('¡SOBREVIVISTE 60s SIN DAÑO!','#7dff8f');meta.stats.objectivesDone++;updateDailyProgress('objectives',1)}
 P.food=Math.max(0,P.food-dt*.2);P.water=Math.max(0,P.water-dt*.3);
 if(!P.food||!P.water){P.starve+=dt;if(P.starve>=1.5){P.starve=0;hurt(3);msg(!P.water?'¡TIENES SED!':'¡TIENES HAMBRE!','#ff8a5a')}}
 if(fireHeld)shoot();
 for(const p of pickups){if(p.taken)continue;const a=p.x-P.x,b=p.y-P.y;if(a*a+b*b<.36&&addInv(p.type,1,1)){p.taken=true;SFX.pickup();msg('+ '+ITEMS[p.type].name,'#9fffa0')}}
 set_nearC(null);let bd=2.56;
 for(const c of corpses){const a=c.x-P.x,b=c.y-P.y,d=a*a+b*b;if(d<bd&&!(c.perm&&!c.loot.length)){bd=d;set_nearC(c)}}
 set_nearSafe(null);for(const box of SAFE_BOXES){if(box.opened&&!box.loot.length)continue;const d=Math.hypot(box.x-P.x,box.y-P.y);if(d<1.6&&d*d<bd){bd=d*d;set_nearC(box);set_nearSafe(box)}}
 set_nearAlly(null);let ba=2.56;
 for(const a of allies){if(!a.alive||a.following)continue;const ddx=a.x-P.x,ddy=a.y-P.y,dd=ddx*ddx+ddy*ddy;
  if(dd<ba){ba=dd;set_nearAlly(a)}}
 const btnL=$('btnLoot');
 if(nearAlly){btnL.textContent='LIBERAR';btnL.classList.add('on');btnL.classList.add('ally')}
 else if(nearC){btnL.textContent=nearC.isSafe?(nearC.opened?'REVISAR CAJA':'FORZAR CAJA FUERTE'):(nearC.cache?'ABRIR COFRE':'SAQUEAR');btnL.classList.add('on');btnL.classList.remove('ally')}
 else{btnL.classList.remove('on');btnL.classList.remove('ally')}
 updateOutpostBanner();
 const bx=BEACON.x-P.x,by=BEACON.y-P.y;
 if(gt>=EXT_AT&&Math.hypot(bx,by)<1.8){set_ext(ext+(dt));$('extwrap').classList.add('on');$('extfill').style.width=Math.min(100,ext/3.5*100)+'%';
  if(ext>=3.5){set_state('win');set_fireHeld(false);stopOutpostRadio();SFX.win();
   const earned=onWin();
   const t=gt;
   screen('winScreen');
   const ecoHtml='<div class="ecoBreakdown">'+
    '<div class="row"><span>Valor bruto del botín</span><span>$'+lastEco.gross+'</span></div>'+
    '<div class="row tax"><span>Impuesto operación (15%)</span><span>-$'+lastEco.tax+'</span></div>'+
    '<div class="row total"><span>GANANCIA NETA</span><span>$'+lastEco.net+'</span></div>'+
    '</div>';
   $('stats2').innerHTML=lootReport()+'<br>PUESTOS: <b>'+outpostsTaken+'/'+OUTPOSTS.length+'</b><br>'+
    'ENEMIGOS: <b>'+kills+'/'+total+'</b><br>TIEMPO: <b>'+t.toFixed(1)+'s</b><br>'+
    'DINERO TOTAL: <b>$'+meta.money+'</b>'+ecoHtml+
    (meta.nightmareActive?'<br><span style="color:#ff5a5a">💀 BONUS PESADILLA x3</span>':'')
  }
 } else if(ext>0){set_ext(Math.max(0,ext-ext*dt*2.2));if(ext<=.01){$('extwrap').classList.remove('on');$('extfill').style.width='0'}}
}

function updateOutpostBanner(){
 const el=$('outpostBanner');
 let nearest=null,nd=Infinity;
 for(const op of OUTPOSTS){
  const d=Math.hypot(P.x-op.x,P.y-op.y);
  if(d<op.r+3&&d<nd){nd=d;nearest=op}
 }
 if(!nearest){el.className='';return}
 const alive=nearest.enemies.filter(e=>e.alive).length;
 let extra='',cls='on';
 if(nearest.taken){extra=' · ✓ TOMADO';cls='on taken'}
 else if(nearest.alertState==='ALARM'){extra=' · ALERTA MÁXIMA';cls='on alarm'}
 else if(nearest.alertState==='ALERT'){extra=' · ALERTA';cls='on alert'}
 if(!nearest.taken&&nearest.alarm){const a=nearest.alarm;if(!a.alive)extra+=' · ALARMA DESTRUIDA';else if(a.activated&&!a.spent)extra+=' · SEÑAL '+Math.ceil(a.callT)+'s'}
 if(!nearest.taken&&nearest.enemies.some(x=>x.alive&&x.reinf&&!x.arrived))extra+=' · REFUERZOS EN CAMINO';
 el.className=cls;
 el.innerHTML='<span class="nm">'+nearest.name+'</span> · <span class="ct">'+alive+'/'+nearest.totalCount+extra+'</span>';
}
