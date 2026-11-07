import { C, MH, MW, OUTPOSTS, clamp, isWall, map } from './core.js';
import { ALARMS, NEAR_SENSE, canStandProp, propBlocksAt } from './outposts.js';
import { campFires, sAlarm, sAlarmOn, sCampfire } from './sprites.js';
import { ETYPES, ITEMS, WEAPONS, initEnemyGear } from './data.js';
import { P, allies, eGrenades, enemies, gt, meta, noises, projs, selectedMap, set_total, state, throwables, total, weather } from './state.js';
import { makeLoot } from './worldgen.js';
import { assignAlarmRunner, dispatchReinforcements, handleAlarmRun, handleReinforceState, unstickE } from './operations.js';
import { SFX, sndPlay, outpostRadioResult, enemyGunshot } from './audio.js';
import { updChatter } from './chatter.js';
import { buildFlow, flowDir, flowT, set_flowT } from './backdrop.js';
import { findPath } from './pathfinding.js';
import { paused } from './input.js';
import { armor } from './inventory.js';
import { hud, msg } from './hud.js';
import { hurt, killEnemy, los, moveE, puff } from './combat.js';


export function swapOrReload(){const w=WEAPONS[P.weapon];if(w.ammo&&P.mag[P.weapon]<=0&&P[w.ammo]>0)startReload();else swapWeapon()}

function swapWeapon(){if(state!=='play'||paused())return;const available=(P.weaponSlots||[0,-1]).filter(w=>w>=0);if(!available.length){msg('NO TIENES OTRA ARMA EQUIPADA','#ffb060');return}P.reloading=0;P.reloadTotal=0;const cur=available.indexOf(P.weapon);P.weapon=available[(cur+1)%available.length];SFX.swap();hud(true)}

export function wallDist(px,py,dx,dy,m){
 for(let d=0;d<m;d+=.08){const x=px+dx*d,y=py+dy*d;if(isWall(x,y))return d;if(propBlocksAt(x,y))return d}
 return m}

export function startReload(){if(P.reloading>0||state!=='play'||paused())return;
 const wi=P.weapon,w=WEAPONS[wi];if(!w.ammo)return;
 if(P.mag[wi]>=w.magMax)return;
 if(P[w.ammo]<=0){msg('SIN MUNICIÓN','#ff6a5a');return}
 P.reloading=w.reload;P.reloadTotal=w.reload;if(w.rocket&&sndPlay('rpgreload',.9)){}else if(wi===0)SFX.pistolReload();else SFX.reload();hud(true)}

export function finishReload(){const wi=P.weapon,w=WEAPONS[wi];if(!w.ammo)return;
 const need=w.magMax-P.mag[wi],avail=P[w.ammo],take=Math.min(need,avail);
 P.mag[wi]+=take;P[w.ammo]-=take;SFX.reloadEnd();hud(true)}

export function cycleThrowable(){const order=['frag','smoke','molotov'];const cur=order.indexOf(P.currentThrow);
 for(let i=1;i<=3;i++){const next=order[(cur+i)%3];if(P.throwables[next]>0){P.currentThrow=next;msg('SELEC: '+ITEMS[next].name,'#9fd8ff');SFX.ui();hud(true);return}}
 P.currentThrow=order[(cur+1)%3];SFX.ui();hud(true)}

export function throwGrenade(){if(state!=='play'||paused())return;if(P.throwCd>0)return;
 const type=P.currentThrow;
 if(!type||P.throwables[type]<=0){msg('SIN '+((ITEMS[type]||{}).name||'ARROJADIZOS'),'#ff6a5a');cycleThrowable();return}
 P.throwCd=.7;P.throwables[type]--;
 const speed=11,dx=Math.cos(P.a),dy=Math.sin(P.a);
 throwables.push({x:P.x+dx*.4,y:P.y+dy*.4,z:.6,vx:dx*speed,vy:dy*speed,vz:4.5,type,fuse:type==='frag'?2.5:.5,bounces:0,life:6,age:0,kills:0});
 SFX.throwG();if(navigator.vibrate)navigator.vibrate(20);hud(true)}

const AI_S={PATROL:'PATROL',SUSPICIOUS:'SUSPICIOUS',SEARCH:'SEARCH',COMBAT:'COMBAT',FLEE:'FLEE'};

export function setState(e,s){if(e.state===s)return;e.prevState=e.state;e.state=s;e.stateT=0;e.ppath=null;e.pBlocked=0;e.pStk=0;e.pxx=undefined}

export function broadcastToSquad(srcE,pos){
  const op=srcE.outpost;
  if(!op||!pos)return;
  for(const a of op.enemies){
    if(a===srcE||!a.alive)continue;
    if(Math.hypot(a.x-srcE.x,a.y-srcE.y)>24)continue;
    a.lastKnownPos={x:pos.x,y:pos.y};
    if(a.state!=='COMBAT'&&a.state!=='FLEE'&&a.state!=='SEARCH'){setState(a,'SUSPICIOUS');a.suspT=2.5}
  }
}

export function raiseAlert(op,level){
  if(!op||op.taken)return;
  const ord={CALM:0,ALERT:1,ALARM:2,CLEARED:-1};
  if(ord[level]>ord[op.alertState||'CALM']){
    op.alertState=level;op.alertT=0;
    if(level==='ALERT')msg('¡'+op.name+' EN ALERTA!','#ffb040');
    if(level==='ALARM'){
      msg('¡'+op.name+' EN ALERTA MÁXIMA!','#ff3a3a');
    }
  }
}

function findCoverFrom(e,awayX,awayY){
  const dx0=e.x-awayX,dy0=e.y-awayY;
  const d0=Math.hypot(dx0,dy0)||1;
  const fx=dx0/d0,fy=dy0/d0;
  for(let r=3;r<=9;r++){
    for(let spread=0;spread<6;spread++){
      const side=(spread%2)?1:-1;
      const ang=Math.atan2(fy,fx)+side*Math.floor(spread/2)*0.5;
      const tx=e.x+Math.cos(ang)*r,ty=e.y+Math.sin(ang)*r;
      const ix=Math.floor(tx),iy=Math.floor(ty);
      if(ix<2||iy<2||ix>=MW-2||iy>=MH-2)continue;
      if(map[iy*MW+ix])continue;
      if(!canStandProp(tx,ty,0.3))continue;
      if(!los(tx,ty,awayX,awayY))return {x:tx,y:ty};
    }
  }
  return null;
}

function fireEnemyWeapon(e,dt,per,nx,ny){
  const dist=per.dist,tgtAlly=per.tgtAlly;
  if(e.sniper){
    if(e.aimT<=0){e.aimT=1.5;SFX.aim()}
    else{e.aimT-=dt;
      if(e.aimT<=0){e.aimT=0;e.atkCd=2.5+Math.random()*1.5;
        const sp=16;
        projs.push({x:e.x+nx*.5,y:e.y+ny*.5,vx:nx*sp,vy:ny*sp,dmg:e.dmg,life:2.4,srcX:e.x,srcY:e.y,big:true,allyTarget:!!tgtAlly});
        SFX.sniper();}}
    return;
  }
  if(e.meleeType){
    if(dist<1.3&&los(e.x,e.y,per.tgtX,per.tgtY)){e.atkCd=.7+Math.random()*.4;
      if(tgtAlly){tgtAlly.hp-=e.dmg;if(tgtAlly.hp<=0){tgtAlly.hp=0;tgtAlly.alive=false;msg('¡ALIADO CAÍDO!','#ff6a5a')}}
      else hurt(armor(e.dmg),e.x,e.y);
      SFX.dogBite();}
    return;
  }
  if(e.type==='shotgunner'){
    if(dist<10){e.atkCd=1.4+Math.random()*.6;
      for(let i=0;i<8;i++){const a=Math.atan2(ny,nx)+(Math.random()-.5)*.35;const sp=9;
        projs.push({x:e.x+nx*.3,y:e.y+ny*.3,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,dmg:8,life:1.2,srcX:e.x,srcY:e.y,small:true,allyTarget:!!tgtAlly});}
      SFX.shotgun();}
    return;
  }
  if(dist>1.6){e.atkCd=(e.boss?.5:e.type==='heavy'?1.1:1.3)+Math.random()*.7;
    const sp=e.boss?11:9;
    projs.push({x:e.x+nx*.4,y:e.y+ny*.4,vx:nx*sp,vy:ny*sp,dmg:e.dmg,life:2.4,srcX:e.x,srcY:e.y,allyTarget:!!tgtAlly});
    enemyGunshot(e);e.fireAt=gt;
    if(e.boss&&Math.random()<.25&&!tgtAlly){eGrenades.push({x:e.x+nx*.5,y:e.y+ny*.5,z:.6,vx:nx*8,vy:ny*8,vz:4,fuse:2.2,life:5});SFX.throwG()}
  } else if(dist<1.3&&los(e.x,e.y,per.tgtX,per.tgtY)){e.atkCd=1.05;
    if(tgtAlly){tgtAlly.hp-=e.dmg;if(tgtAlly.hp<=0){tgtAlly.hp=0;tgtAlly.alive=false;msg('¡ALIADO CAÍDO!','#ff6a5a')}}
    else hurt(armor(e.dmg),e.x,e.y);}
}

function handlePatrolState(e,dt,per){
  if(per.clearLOS){setState(e,'COMBAT');e.lastKnownPos={x:per.tgtX,y:per.tgtY};if(e.outpost)raiseAlert(e.outpost,'ALERT');broadcastToSquad(e,e.lastKnownPos);return}
  if((e.detect||0)>0.7){setState(e,'SUSPICIOUS');e.suspT=3+Math.random()*2;if(e.lastNoise)e.lastKnownPos={x:e.lastNoise.x,y:e.lastNoise.y};return}
  const op=e.outpost;
  if(!op||!op.waypoints||!op.waypoints.length){
    e.wanderT=(e.wanderT||0)-dt;
    if(e.wanderT<=0){e.wanderT=1.5+Math.random()*2.5;e.wander=Math.random()*6.28}
    moveE(e,Math.cos(e.wander)*0.35*dt,Math.sin(e.wander)*0.35*dt);e.face=e.wander;return;
  }
  if(e.waypointIdx===undefined)e.waypointIdx=Math.floor(Math.random()*op.waypoints.length);
  const wp=op.waypoints[e.waypointIdx];if(!wp){e.waypointIdx=0;return}
  const wdx=wp.x-e.x,wdy=wp.y-e.y,wd=Math.hypot(wdx,wdy);
  if(wd<0.6){e.ppath=null;e.pBlocked=0;e.wpWait=(e.wpWait||0)+dt;e.face+=dt*0.8;if(e.wpWait>2){e.wpWait=0;e.waypointIdx=(e.waypointIdx+1)%op.waypoints.length}return}
  /* Si lleva más de 1.2 s sin avanzar (caja, barril...), busca ruta alrededor del obstáculo; si no hay, pasa al siguiente punto */
  e.pStk=(e.pStk||0)+dt;
  if(e.pStk>=1.2){
    const moved=e.pxx===undefined?9:Math.hypot(e.x-e.pxx,e.y-e.pyy);
    e.pxx=e.x;e.pyy=e.y;e.pStk=0;
    if(moved<0.25){
      e.pBlocked=(e.pBlocked||0)+1;e.ppath=null;
      if(e.pBlocked>=3){e.pBlocked=0;e.waypointIdx=(e.waypointIdx+1)%op.waypoints.length;unstickE(e,wp.x,wp.y);return}
      const pth=findPath(e.x,e.y,wp.x,wp.y);
      if(pth&&pth.length>1){e.ppath=pth;e.ppI=1}
      unstickE(e,wp.x,wp.y);
    } else e.pBlocked=0;
  }
  const sp=e.speed*0.6;
  if(e.ppath){
    let w=e.ppath[e.ppI];
    while(w&&Math.hypot(w[0]+.5-e.x,w[1]+.5-e.y)<.5){e.ppI++;w=e.ppath[e.ppI]}
    if(w){
      const px=w[0]+.5-e.x,py=w[1]+.5-e.y,pd=Math.hypot(px,py)||1;
      e.face=Math.atan2(py,px);moveE(e,px/pd*sp*dt,py/pd*sp*dt);return;
    }
    e.ppath=null;
  }
  e.face=Math.atan2(wdy,wdx);
  moveE(e,(wdx/wd)*sp*dt,(wdy/wd)*sp*dt);
}

function handleSuspiciousState(e,dt,per){
  if(per.clearLOS){setState(e,'COMBAT');e.lastKnownPos={x:per.tgtX,y:per.tgtY};if(e.outpost)raiseAlert(e.outpost,'ALERT');broadcastToSquad(e,e.lastKnownPos);return}
  const targetPos=e.lastKnownPos||e.lastNoise;
  if(targetPos){
    const tdx=targetPos.x-e.x,tdy=targetPos.y-e.y;
    const targetFace=Math.atan2(tdy,tdx);
    let diff=targetFace-e.face;
    while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
    e.face+=clamp(diff,-2*dt,2*dt);
  }
  e.suspT=(e.suspT||2.5)-dt;
  if(e.suspT<=0){setState(e,'SEARCH');e.searchPoint=e.lastKnownPos||e.lastNoise||{x:per.tgtX,y:per.tgtY};e.searchT=8}
}

function handleSearchState(e,dt,per){
  if(per.clearLOS){setState(e,'COMBAT');e.lastKnownPos={x:per.tgtX,y:per.tgtY};if(e.outpost)raiseAlert(e.outpost,'ALERT');broadcastToSquad(e,e.lastKnownPos);return}
  e.searchT=(e.searchT||8)-dt;
  if(e.searchT<=0){setState(e,'PATROL');return}
  if(!e.searchPoint)e.searchPoint=e.lastKnownPos||{x:e.homeX||e.x,y:e.homeY||e.y};
  const sdx=e.searchPoint.x-e.x,sdy=e.searchPoint.y-e.y,sd=Math.hypot(sdx,sdy);
  if(sd<0.8)e.face+=dt*1.2;
  else{const sp=e.speed*0.85;moveE(e,(sdx/sd)*sp*dt,(sdy/sd)*sp*dt);e.face=Math.atan2(sdy,sdx)}
}

function handleFleeState(e,dt){
  if(!e.fleeTarget)e.fleeTarget=findCoverFrom(e,P.x,P.y);
  if(e.fleeTarget){
    const fdx=e.fleeTarget.x-e.x,fdy=e.fleeTarget.y-e.y,fd=Math.hypot(fdx,fdy);
    if(fd<0.6)e.face=Math.atan2(e.y-P.y,e.x-P.x);
    else{moveE(e,(fdx/fd)*e.speed*1.3*dt,(fdy/fd)*e.speed*1.3*dt);e.face=Math.atan2(fdy,fdx)}
  } else {
    const adx=e.x-P.x,ady=e.y-P.y,ad=Math.hypot(adx,ady)||1;
    moveE(e,(adx/ad)*e.speed*1.3*dt,(ady/ad)*e.speed*1.3*dt);
    e.face=Math.atan2(ady,adx);
  }
  if(e.stateT>10){setState(e,'PATROL');e.hp=Math.min(e.maxHp,e.hp+10);e.fleeTarget=null}
}

function handleCombatState(e,dt,per){
  const dx=per.dx,dy=per.dy,dist=per.dist;
  const nx=dx/dist,ny=dy/dist;
  if(!per.see){
    e.lostT=(e.lostT||0)+dt;
    if(e.lostT>3){setState(e,'SEARCH');e.searchPoint=e.lastKnownPos||{x:per.tgtX,y:per.tgtY};e.searchT=8;e.lostT=0;return}
  } else {
    e.lostT=0;e.lastKnownPos={x:per.tgtX,y:per.tgtY};
    let diff=per.angleToP-e.face;
    while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
    e.face+=clamp(diff,-4*dt,4*dt);
  }
  if(e.hp/e.maxHp<0.25&&!e.boss&&e.type!=='dog'&&!e.reinf){setState(e,'FLEE');e.fleeTarget=findCoverFrom(e,P.x,P.y);return}
  if(e.type==='officer'&&per.see&&dist<18&&e.shoutT<=0){
    e.shoutT=8+Math.random()*3;SFX.shout();msg('¡EL SARGENTO DA LA ALERTA!','#ff6a5a');
    broadcastToSquad(e,{x:P.x,y:P.y});if(e.outpost)raiseAlert(e.outpost,'ALARM');
  }
  if(selectedMap!=='front'&&e.boss&&e.reinforceT<=0&&dist<20){
    e.reinforceT=20;SFX.shout();msg('¡EL CAPITÁN PIDE REFUERZOS!','#ff2020');
    for(let i=0;i<2;i++){
      const a=Math.random()*6.28,r=3+Math.random()*2;
      const nxx=e.x+Math.cos(a)*r,nyy=e.y+Math.sin(a)*r;
      if(canStandProp(nxx,nyy,.3)){
        const conf=ETYPES.soldier;const nf=Math.random()*6.28;
        const hpMul=meta.nightmareActive?1.5:1,dmgMul=meta.nightmareActive?1.5:1;
        const ne={x:nxx,y:nyy,type:'soldier',hp:Math.round(conf.hp*hpMul),maxHp:Math.round(conf.hp*hpMul),speed:conf.speed,dmg:Math.round(conf.dmg*dmgMul),fr:conf.fr,corpse:conf.corpse,atkCd:.5,hurtT:0,alive:true,wt:0,wander:nf,wanderT:0,loot:makeLoot('soldier'),height:conf.h,aimT:0,shoutT:0,reinforceT:0,recentDmg:0,recentDmgT:0,zigzagT:0,zigzagDir:1,stop:conf.stop,boss:false,sniper:false,meleeType:false,pellets:1,minDist:0,maxDist:30,coverTarget:null,face:nf,detect:1,fov:conf.fov,sight:conf.sight,name:conf.name,color:conf.color,outpost:e.outpost,homeX:e.homeX,homeY:e.homeY,leash:e.leash,state:'COMBAT',stateT:0,lastKnownPos:{x:P.x,y:P.y}};
        initEnemyGear(ne,'soldier');enemies.push(ne);if(e.outpost)e.outpost.enemies.push(ne);set_total(total+1);
      }
    }
  }
  if(per.see){
    let sx=0,sy=0;
    for(const o of enemies){if(o===e||!o.alive)continue;const px=e.x-o.x,py=e.y-o.y,d=Math.hypot(px,py);if(d>.001&&d<.85){sx+=px/d*(.85-d);sy+=py/d*(.85-d)}}
    let mx=0,my=0;const stopD=e.stop;
    if(e.meleeType&&dist>1.5){e.zigzagT=(e.zigzagT||0)-dt;if(e.zigzagT<=0){e.zigzagT=.35;e.zigzagDir=(e.zigzagDir||1)*-1}mx=nx+e.zigzagDir*(-ny)*.7;my=ny+e.zigzagDir*(nx)*.7}
    else if(e.sniper&&dist<e.minDist){mx=-nx;my=-ny}
    else if(dist>stopD){mx=nx;my=ny}
    else if(dist<stopD-1.5){mx=-nx;my=-ny}
    if(dist<10&&!e.meleeType){mx+=-ny*.4;my+=nx*.4}
    if(e.recentDmg>15&&!e.coverTarget){
      outer:for(let r=1;r<=4;r++){for(let a=0;a<8;a++){const ang=a*Math.PI/4;const cx=(e.x+Math.cos(ang)*r)|0,cy=(e.y+Math.sin(ang)*r)|0;if(cx<1||cy<1||cx>=MW-1||cy>=MH-1)continue;if(map[cy*MW+cx])continue;const mx2=cx+.5,my2=cy+.5;if(!los(mx2,my2,per.tgtX,per.tgtY)){e.coverTarget={x:mx2,y:my2,t:2.5};break outer}}}
    }
    if(e.coverTarget){e.coverTarget.t-=dt;if(e.coverTarget.t<=0)e.coverTarget=null;else{const cvx=e.coverTarget.x-e.x,cvy=e.coverTarget.y-e.y;const cvd=Math.hypot(cvx,cvy)||1;mx+=cvx/cvd*1.8;my+=cvy/cvd*1.8}}
    mx+=sx*2;my+=sy*2;
    const l=Math.hypot(mx,my);if(l>1){mx/=l;my/=l}
    let spd=e.speed;if(e.sniper&&e.aimT>0)spd=e.speed*.1;
    moveE(e,mx*spd*dt,my*spd*dt);
  }
  if(e.atkCd<=0&&per.see&&dist<(e.weaponIdx===5?35:e.weaponIdx===1?10:30))fireEnemyWeapon(e,dt,per,nx,ny);
}

export function updEnemies(dt){
  set_flowT(flowT-(dt));if(flowT<=0){set_flowT(.4);buildFlow()}
  for(let i=noises.length-1;i>=0;i--){noises[i].life-=dt;if(noises[i].life<=0)noises.splice(i,1)}
  for(const al of ALARMS){if(al.alive)al.deco.spr=(al.activated&&((gt*5)|0)%2)?sAlarmOn:sAlarm}
  for(const f of campFires)f.spr=sCampfire[((gt*7+f.ph)|0)%3];
  for(const op of OUTPOSTS){
    if(op.taken){op.alertState='CLEARED';continue}
    if(!op.alertState)op.alertState='CALM';
    if(op.alertState==='ALERT'){
      op.alertT=(op.alertT||0)+dt;
      const engaged=op.enemies.filter(x=>x.alive&&(x.state==='COMBAT'||x.state==='SEARCH')).length;
      if(op.alertT>5&&engaged>0)raiseAlert(op,'ALARM');
    }
    if(op.alertState==='ALARM'){
      if(op.tier<3&&op.alarm&&op.alarm.alive){
        const al=op.alarm;
        if(!al.activated){
          if(!op.enemies.some(x=>x.alive&&x.alarmTask===al))assignAlarmRunner(op);
        } else if(!al.spent){
          al.callT-=dt;
          if(al.callT<=0){al.spent=true;if(dispatchReinforcements(op))outpostRadioResult(op.name,'sent');else{outpostRadioResult(op.name,'rejected');msg('LA BASE MADRE NO PUEDE ENVIAR REFUERZOS','#ffb040')}}
        }
      }
    }
    op.broadcastT=(op.broadcastT||0)-dt;
    if(op.broadcastT<=0&&(op.alertState==='ALERT'||op.alertState==='ALARM')){
      op.broadcastT=2.5;
      const src=op.enemies.find(x=>x.alive&&x.state==='COMBAT'&&x.lastKnownPos);
      if(src)broadcastToSquad(src,src.lastKnownPos);
    }
  }
  for(const e of enemies){
    if(!e.alive)continue;
    if(e.hurtT>0)e.hurtT-=dt;
    if(e.recentDmgT>0)e.recentDmgT-=dt;else e.recentDmg=0;
    if(e.atkCd>0)e.atkCd-=dt;
    if(e.reloadT>0){
      e.reloadT-=dt;
      if(e.reloadT<=0&&e.weaponIdx!==undefined){
        const ew=WEAPONS[e.weaponIdx],take=Math.min(ew.magMax,e.reserveAmmo||0);
        e.mag=take;e.reserveAmmo=Math.max(0,(e.reserveAmmo||0)-take);e.reloadT=0;
      }
    }
    if(e.shoutT>0)e.shoutT-=dt;
    if(e.reinforceT>0)e.reinforceT-=dt;
    if(e.stateT===undefined)e.stateT=0;
    e.stateT+=dt;
    if(e.outpost&&e.outpost.taken&&!e.outpost.contested){e.alive=false;continue} // La oleada sí puede ir a un campamento en disputa.
    if(!e.state)e.state='PATROL';
    const distHome=e.homeX!==undefined?Math.hypot(e.x-e.homeX,e.y-e.homeY):0;
    const inTransit=!!e.reinf&&!e.arrived;
    if(e.alarmTask&&!inTransit){if(handleAlarmRun(e,dt)){e.wt=(e.wt||0)+dt;continue}}
    const outOfLeash=!inTransit&&e.leash!==undefined&&distHome>e.leash;
    const sightMul=weather==='fog'?0.5:weather==='rain'?0.75:weather==='sandstorm'?0.6:1;
    const sightR=e.sight*sightMul;
    let tgtX=P.x,tgtY=P.y,tgtAlly=null;
    if(e.state==='COMBAT'||e.state==='SEARCH'||e.state==='SUSPICIOUS'){
      let bestAllyD=Infinity;
      for(const a of allies){
        if(!a.alive||!a.following)continue;
        const ad=Math.hypot(a.x-e.x,a.y-e.y);
        if(ad<sightR&&ad<bestAllyD&&los(e.x,e.y,a.x,a.y)){
          const pd=Math.hypot(P.x-e.x,P.y-e.y);
          if(ad<pd*0.9){tgtX=a.x;tgtY=a.y;tgtAlly=a;bestAllyD=ad}
        }
      }
    }
    const dx=tgtX-e.x,dy=tgtY-e.y,dist=Math.hypot(dx,dy)||0.001;
    const angleToP=Math.atan2(dy,dx);
    let angleDiff=angleToP-e.face;
    while(angleDiff>Math.PI)angleDiff-=Math.PI*2;
    while(angleDiff<-Math.PI)angleDiff+=Math.PI*2;
    const inFOV=Math.abs(angleDiff)<e.fov/2;
    const inWide=Math.abs(angleDiff)<e.fov;           /* visión periférica: el doble de ancho */
    const nearSense=dist<NEAR_SENSE;                   /* oído/presencia: a corta distancia te notan aunque no miren hacia ti */
    const losP=(!outOfLeash&&dist<sightR&&(inWide||nearSense||e.state==='COMBAT'))?los(e.x,e.y,tgtX,tgtY):false;
    const clearLOS=losP&&(inFOV||nearSense);
    const periph=losP&&!clearLOS&&inWide&&dist<sightR*0.75;
    const visRange=dist<sightR;
    const see=clearLOS||(e.state==='COMBAT'&&losP);   /* en combate: 360° pero SOLO con línea de visión real */
    if(e.state!=='COMBAT'&&e.state!=='FLEE'){
      if(clearLOS)e.detect=Math.min(1,(e.detect||0)+dt*(1+(1-dist/sightR)*2.5));
      else if(periph){e.detect=Math.min(1,(e.detect||0)+dt*0.9);e.lastKnownPos={x:tgtX,y:tgtY}}
      else e.detect=Math.max(0,(e.detect||0)-dt*0.5);
      if(e.detect<1&&noises.length){
        for(const n of noises){const nd=Math.hypot(e.x-n.x,e.y-n.y);if(nd<n.radius&&nd<e.leash){e.detect=Math.max(e.detect,0.55);e.lastNoise={x:n.x,y:n.y}}}
      }
    }
    if(outOfLeash){
      const hdx=e.homeX-e.x,hdy=e.homeY-e.y,hd=Math.hypot(hdx,hdy)||1;
      moveE(e,hdx/hd*e.speed*1.5*dt,hdy/hd*e.speed*1.5*dt);
      e.face=Math.atan2(hdy,hdx);
      e.detect=Math.max(0,(e.detect||0)-dt);
      if(e.state==='COMBAT')setState(e,'SEARCH');
      e.wt=(e.wt||0)+dt;continue;
    }
    const per={see,clearLOS,dist,tgtX,tgtY,dx,dy,angleToP,tgtAlly,inFOV,sightR};
    if(inTransit&&e.state!=='COMBAT'&&e.state!=='REINFORCE')setState(e,'REINFORCE');
    if(e.state==='REINFORCE')handleReinforceState(e,dt,per);
    else if(e.state==='PATROL'||e.state==='IDLE')handlePatrolState(e,dt,per);
    else if(e.state==='SUSPICIOUS')handleSuspiciousState(e,dt,per);
    else if(e.state==='SEARCH')handleSearchState(e,dt,per);
    else if(e.state==='COMBAT')handleCombatState(e,dt,per);
    else if(e.state==='FLEE')handleFleeState(e,dt);
    e.wt=(e.wt||0)+dt;
  }
  updChatter(dt);
}

export function updAllies(dt){
 for(const a of allies){
  if(!a.alive)continue;
  if(a.atkCd>0)a.atkCd-=dt;
  if(!a.following)continue;
  const pdx=P.x-a.x,pdy=P.y-a.y,pd=Math.hypot(pdx,pdy);
  if(pd>2.2){
   const ox=a.x,oy=a.y;
   if(pd>0.01){const dx=pdx/pd,dy=pdy/pd;
    if(canStandProp(a.x+dx*a.speed*dt,a.y,.3))a.x+=dx*a.speed*dt;
    if(canStandProp(a.x,a.y+dy*a.speed*dt,.3))a.y+=dy*a.speed*dt}
   const moved=Math.hypot(a.x-ox,a.y-oy);
   if(moved<a.speed*dt*0.3){const v=flowDir(a);if(v){moveE(a,v[0]*a.speed*dt,v[1]*a.speed*dt)}}
   a.wt+=dt
  } else if(pd<1.2&&pd>.01){
   if(canStandProp(a.x-pdx/pd*a.speed*.5*dt,a.y,.3))a.x-=pdx/pd*a.speed*.5*dt;
   if(canStandProp(a.x,a.y-pdy/pd*a.speed*.5*dt,.3))a.y-=pdy/pd*a.speed*.5*dt;
   a.wt+=dt
  }
  if(a.atkCd<=0){
   let best=null,bd=144;
   for(const e of enemies){if(!e.alive)continue;const ex=e.x-a.x,ey=e.y-a.y;const d=ex*ex+ey*ey;
    if(d<bd&&los(a.x,a.y,e.x,e.y)){bd=d;best=e}}
   if(best){a.atkCd=0.75;
    const ex=best.x-a.x,ey=best.y-a.y,ed=Math.hypot(ex,ey);
    const rx=ex/ed,ry=ey/ed;const wd=wallDist(a.x,a.y,rx,ry,ed+0.3);
    if(wd>=ed-0.2){best.hp-=14;best.hurtT=.12;
      if(best.state!=='COMBAT'){setState(best,'COMBAT');best.lastKnownPos={x:P.x,y:P.y}}
      if(best.hp<=0)killEnemy(best);else{puff(best.x,best.y,4,C(255,180,80));SFX.enemyHit()}}
    enemyGunshot(a,0)}
  }
 }
}
