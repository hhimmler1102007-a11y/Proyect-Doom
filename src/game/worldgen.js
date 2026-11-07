import { BUILDINGS, CONTS, FURNITURE, MAP_LAYOUT, MH, MW, OUTPOSTS, PICKUP_SPOTS, canStand, getBlockBounds, gmap, isInsideBuilding, isWall, map, mulberry32, set_CONTS, set_FURNITURE, set_PICKUP_SPOTS } from './core.js';
import { BEACON, GATE_RES, STREET_DECOS, canStandProp, maskCellToWorld, pblk, walkmap } from './outposts.js';
import { sBench, sBul, sBusStop, sCone, sDumpster, sHydrant, sMed, sShell, sStreetSign, sTrafficLight, sTrashBag } from './sprites.js';
import { ENEMY_LOADOUTS, ETYPES, FOODS, ITEMS, WID, initEnemyGear } from './data.js';
import { P, enemies, meta, selectedMap, set_total, total } from './state.js';
import { armorRoll } from './inventory.js';
import { msg } from './hud.js';


export function makeLoot(type){
 type=type||'soldier';const l=[],r=Math.random;
 const add=(id,n)=>{if(!id)return;const it=l.find(x=>x.id===id);if(it)it.count+=(n||1);else l.push({id,count:n||1})};
 // Consumibles comunes: mantienen algo de variación sin soltar munición de calibres incompatibles.
 if(r()<.28)add(r()<.7?'bandage':'medkit',1);
 if(r()<(selectedMap==='front'?.07:.25))add(FOODS[r()*FOODS.length|0],1);
 if(r()<.16)add(['frag','smoke','molotov'][r()*3|0],1);
 const g=ENEMY_LOADOUTS[type];
 if(g){
   const weaponItem=WID[g.weapon];
   add(weaponItem,1);
   add(g.helmet,1);add(g.vest,1);
   // La cantidad es aleatoria, pero el calibre siempre corresponde al arma que llevaba.
   if(r()<.95)add(g.ammo,1+(r()<.35?1:0));
   if(r()<.22)add(g.ammo,1);
 }
 return l;
}

export function contLoot(t){const l=[],r=Math.random,pk=a=>a[r()*a.length|0],add=id=>l.push({id,count:1});const thr=['frag','smoke','molotov'];
 if(t==='s'){for(let i=0,n=2+(r()*2|0);i<n;i++)add(pk(FOODS));if(r()<.18)add(pk(thr))}
 else if(t==='c'){add(pk(FOODS));if(r()<.5)add(pk(['bandage','shells','bullets','ammo9','ammo76239','water']));if(r()<.28)add(pk(thr))}
 else if(t==='b'){add(pk(FOODS));if(r()<.6)add(pk(['bandage','medkit','bullets','shells']));if(r()<.32)add(pk(thr))}
 else if(t==='l'){add(pk(['bullets','shells','ammo9','ammo76239','bandage','medkit']));if(r()<.5)add(pk(FOODS));if(r()<.06)add('rocketl');
  if(r()<.55)add(pk(thr));if(r()<.3){add(pk(thr));if(r()<.4)add(pk(thr))}}
 else{add(pk(['bullets','shells']));add(pk(['medkit','bandage']));if(r()<.55)add('rockets');if(r()<.22)add('rocketl');if(r()<.3)add(pk(['rifle','shotgun']));
  if(r()<.75){add(pk(thr));if(r()<.5)add('frag');if(r()<.4)add(pk(thr))}}
 if(r()<{s:.12,c:.22,b:.18,l:.35,m:.6}[t])add(armorRoll());
 if(selectedMap==='front'&&r()<.78){return l.filter(it=>{const d=ITEMS[it.id];return !(d&&(d.food||d.water))})}
 return l}

export function makeOutpostReward(tier){
 const l=[],r=Math.random;
 const add=(id,n)=>{const it=l.find(x=>x.id===id);if(it)it.count+=(n||1);else l.push({id,count:n||1})};
 if(tier===1){
  add('shells',2+((r()*2)|0));add('bullets',2+((r()*2)|0));if(r()<.35)add('ammo9',1);
  if(r()<.6)add('bandage',1);if(r()<.4)add('medkit',1);
  if(r()<.5)add(FOODS[(r()*FOODS.length)|0],1);
  if(r()<.3)add(['frag','smoke','molotov'][(r()*3)|0],1);
 } else if(tier===2){
  add('shells',3+((r()*3)|0));add('bullets',3+((r()*3)|0));if(r()<.4)add('ammo76239',2);
  if(r()<.7)add('medkit',1+(r()<.3?1:0));
  if(r()<.5)add('frag',1);if(r()<.3)add('smoke',1);
  if(r()<.5)add('vest'+(1+((r()*2)|0)),1);
  if(r()<.4)add('helm'+(1+((r()*2)|0)),1);
  if(r()<.35)add(r()<.5?'rifle':'shotgun',1);
  if(r()<.2)add('rockets',1);
 } else {
  add('shells',4+((r()*3)|0));add('bullets',4+((r()*3)|0));add('ammo792',2+((r()*2)|0));if(r()<.35)add('ammo76239',2);if(r()<.25)add('ammo76251',1);
  add('medkit',2);add('frag',2);add('smoke',1);
  if(r()<.7)add('rockets',2);
  add('vest3',1);
  if(r()<.6)add('helm3',1);else if(r()<.5)add('helm2',1);
  add(r()<.35?'mg42':r()<.65?'ak47':r()<.8?'rifle':'rocketl',1);
  if(r()<.5)add('vest2',1);
  if(r()<.4)add('shotgun',1);
 }
 return l}


export function computeInteriorProps(seed){
  const rng=mulberry32((seed^0xA5A5A5A5)>>>0);
  set_CONTS([]);set_FURNITURE([]);
  const FURN_TYPES=['sofa','sofa2','bed','bed2','table','rug'];
  for(const[x0,y0,x1,y1]of BUILDINGS){
    const iw=x1-x0-1,ih=y1-y0-1;
    if(iw<2||ih<2)continue;
    const nC=1+Math.floor(rng()*3);
    for(let i=0;i<nC;i++){
      const px=x0+1+Math.floor(rng()*iw),py=y0+1+Math.floor(rng()*ih);
      const types=['s','c','b','l','m'];
      CONTS.push([px,py,types[Math.floor(rng()*types.length)]]);
    }
    const nF=Math.floor(rng()*2);
    for(let i=0;i<nF;i++){
      const px=x0+1+Math.floor(rng()*iw),py=y0+1+Math.floor(rng()*ih);
      FURNITURE.push([px,py,FURN_TYPES[Math.floor(rng()*FURN_TYPES.length)]]);
    }
  }
}

export function computePickupSpots(seed){
  const rng=mulberry32((seed^0x9E3779B9)>>>0);
  set_PICKUP_SPOTS([]);
  const types=['medkit','shells','bullets'];
  const sprs={medkit:sMed,shells:sShell,bullets:sBul};
  let placed=0,tries=0;
  while(placed<14&&tries<500){
    tries++;
    const x=2.5+Math.floor(rng()*(MW-5)),y=2.5+Math.floor(rng()*(MH-5));
    if(isWall(x,y))continue;
    if(isInsideBuilding(x,y))continue;
    let tooClose=false;
    for(const p of PICKUP_SPOTS)if(Math.hypot(p.x-x,p.y-y)<4){tooClose=true;break}
    if(tooClose)continue;
    const type=types[Math.floor(rng()*types.length)];
    PICKUP_SPOTS.push({x,y,type,spr:sprs[type]});
    placed++;
  }
}


export function computeStreetDecor(seed){
 const rng=mulberry32((seed^0xC0FFEE)>>>0);
 walkmap.fill(0);STREET_DECOS.length=0;
 if(selectedMap==='front')return;
 const L=MAP_LAYOUT;
 const vStreets=[],hStreets=[];
 for(let bx=0;bx<L.NUM_BLOCKS_X-1;bx++){const b=getBlockBounds(bx,0);const cx=b[2]+2;if(cx<MW-1)vStreets.push(cx)}
 for(let by=0;by<L.NUM_BLOCKS_Y-1;by++){const b=getBlockBounds(0,by);const cy=b[3]+2;if(cy<MH-1)hStreets.push(cy)}
 const isSt=(x,y)=>{if(x<1||y<1||x>=MW-1||y>=MH-1)return false;const g=gmap[y*MW+x];return g<=5&&!map[y*MW+x]};
 const cornerFree=(x,y)=>x>0&&y>0&&x<MW-1&&y<MH-1&&!map[y*MW+x]&&gmap[y*MW+x]===1&&!pblk[y*MW+x]&&!GATE_RES.has(y*MW+x);
 /* Cruces peatonales (cebras) + esquinas equipadas en cada intersección */
 for(let vi=0;vi<vStreets.length;vi++){const vx=vStreets[vi];
 for(const hy of hStreets){
  if(!isSt(vx,hy))continue;
  const arms=[[-1,0,1],[1,0,1],[0,-1,2],[0,1,2]];
  for(const A of arms){
   for(let k=2;k<=3;k++){
    const bx0=vx+A[0]*k,by0=hy+A[1]*k;
    for(let l=-1;l<=1;l++){
     const mxp=A[0]===0?bx0+l:bx0;
     const myp=A[1]===0?by0+l:by0;
     if(isSt(mxp,myp)&&!GATE_RES.has(myp*MW+mxp))walkmap[myp*MW+mxp]=A[2];
    }
   }
  }
  const corners=[[-2,-2],[2,-2],[-2,2],[2,2]];
  for(const c of corners){
   const px2=vx+c[0],py2=hy+c[1];
   if(!cornerFree(px2,py2))continue;
   const r=rng();
   if(r<.30)STREET_DECOS.push({x:px2+.5,y:py2+.5,spr:sTrafficLight,wh:1.05,ww:.45,z0:0,solid:.18,tl:vi%2});
   else if(r<.42)STREET_DECOS.push({x:px2+.5,y:py2+.5,spr:sStreetSign,wh:.72,ww:.36,z0:0,solid:.12});
   else if(r<.50)STREET_DECOS.push({x:px2+.5,y:py2+.5,spr:sHydrant,wh:.6,ww:.4,z0:0,solid:.16});
  }
 }
 }
 /* Tapas de alcantarilla en calles */
 let placedM=0,tries=0;
 while(placedM<26&&tries<400){tries++;
  const x=2+Math.floor(rng()*(MW-4)),y=2+Math.floor(rng()*(MH-4));
  const g=gmap[y*MW+x];if((g!==4&&g!==5)||walkmap[y*MW+x])continue;
  if(GATE_RES.has(y*MW+x))continue;
  walkmap[y*MW+x]=3;placedM++;
 }
 /* Charcos, baches y parches de asfalto */
 let placedP=0;tries=0;
 while(placedP<30&&tries<600){tries++;
  const x=2+Math.floor(rng()*(MW-4)),y=2+Math.floor(rng()*(MH-4));
  const g=gmap[y*MW+x];if(g>5||map[y*MW+x]||walkmap[y*MW+x])continue;
  if(GATE_RES.has(y*MW+x))continue;
  const r=rng();
  walkmap[y*MW+x]=r<.4?4:r<.75?5:6;
  placedP++;
 }
 /* Zona de influencia de puestos: nada de mobiliario cerca */
 const nearOp=(x,y)=>{for(const o of OUTPOSTS){if(o.mask&&x>=o.maskX-1&&x<=o.maskX+o.maskW&&y>=o.maskY-1&&y<=o.maskY+o.maskH)return true}return false};
 /* Mobiliario urbano disperso (aceras y calles) */
 for(let y=2;y<MH-2;y++)for(let x=2;x<MW-2;x++){
  if(GATE_RES.has(y*MW+x)||map[y*MW+x]||pblk[y*MW+x])continue;
  if(nearOp(x,y))continue;
  const g=gmap[y*MW+x];if(g>1)continue;
  const r=rng();
  if(g===1){ /* acera */
   if(r<.010)STREET_DECOS.push({x:x+.5,y:y+.5,spr:sBench,wh:.5,ww:1.1,z0:0,solid:.35});
   else if(r<.026)STREET_DECOS.push({x:x+.5,y:y+.5,spr:sTrashBag,wh:.34,ww:.42,z0:0});
   else if(r<.031)STREET_DECOS.push({x:x+.5,y:y+.5,spr:sHydrant,wh:.6,ww:.4,z0:0,solid:.16});
   else if(r<.0345)STREET_DECOS.push({x:x+.5,y:y+.5,spr:sDumpster,wh:.82,ww:1.3,z0:0,solid:.45});
  } else { /* calle */
   if(walkmap[y*MW+x])continue;
   if(r<.011)STREET_DECOS.push({x:x+.5,y:y+.5,spr:sCone,wh:.42,ww:.32,z0:0});
   else if(r<.016)STREET_DECOS.push({x:x+.5,y:y+.5,spr:sTrashBag,wh:.34,ww:.42,z0:0});
  }
 }
 /* Marquesinas de autobús junto a calles verticales */
 let bs=0;let guard=0;
 while(bs<4&&guard++<300){
  const vx=vStreets[Math.floor(rng()*vStreets.length)];
  const y=4+Math.floor(rng()*(MH-8));
  const side=rng()<.5?-2:2;
  const px2=vx+side,py2=y;
  if(cornerFree(px2,py2)){STREET_DECOS.push({x:px2+.5,y:py2+.5,spr:sBusStop,wh:1.6,ww:2.0,z0:0,solid:.4});bs++}
 }
}

export function computeOutpostWaypoints(op){
  const validCells=op.interiorCells.filter(c=>{
    const wx=op.maskX+c.mx+0.5,wy=op.maskY+c.my+0.5;
    return canStandProp(wx,wy,0.4)&&!isWall(wx,wy);
  });
  if(validCells.length===0){op.waypoints=[{x:op.x,y:op.y}];return;}
  const n=Math.min(8,Math.max(4,Math.floor(validCells.length/3)));
  const step=Math.max(1,Math.floor(validCells.length/n));
  const wps=[];
  for(let i=0;i<validCells.length&&wps.length<n;i+=step){
    wps.push(maskCellToWorld(op,validCells[i]));
  }
  op.waypoints=wps;
}


export function spawnCommander(){
 const conf=ETYPES.commander;
 let cx=BEACON.x,cy=BEACON.y;
 for(let r=0;r<12;r++){
  const a=Math.random()*6.28,tx=BEACON.x+Math.cos(a)*(6+r),ty=BEACON.y+Math.sin(a)*(6+r);
  if(tx>1&&ty>1&&tx<MW-1&&ty<MH-1&&canStand(tx,ty,.4)&&!isWall(tx,ty)){cx=tx;cy=ty;break}
 }
 const hpMul=meta.nightmareActive?1.5:1,dmgMul=meta.nightmareActive?1.5:1;
 const bossEnemy={x:cx,y:cy,type:'commander',hp:Math.round(conf.hp*hpMul),maxHp:Math.round(conf.hp*hpMul),speed:conf.speed,dmg:Math.round(conf.dmg*dmgMul),
  fr:conf.fr,corpse:conf.corpse,atkCd:1,hurtT:0,alive:true,wt:0,wander:0,wanderT:0,loot:makeLoot('commander'),
  height:conf.h,aimT:0,shoutT:0,reinforceT:conf.reinforceCd,recentDmg:0,recentDmgT:0,zigzagT:0,zigzagDir:1,
  stop:conf.stop,boss:true,sniper:false,meleeType:false,pellets:1,minDist:0,maxDist:35,coverTarget:null,
  face:Math.random()*6.28,detect:1,fov:conf.fov,sight:conf.sight,name:conf.name,color:conf.color,
  state:'COMBAT',stateT:0,lastKnownPos:{x:P.x,y:P.y}};
 initEnemyGear(bossEnemy,'commander');enemies.push(bossEnemy);
 set_total(total+1);
 msg('¡EL CAPITÁN HA LLEGADO!','#ff2020');
}

export function spawnOutpostEnemies(outpost){
 const count=outpost.min+Math.floor(Math.random()*(outpost.max-outpost.min+1));
 const spawned=[];
 const hpMul=meta.nightmareActive?1.5:1,dmgMul=meta.nightmareActive?1.5:1;
 const validCells=outpost.interiorCells.filter(c=>{
   const wx=outpost.maskX+c.mx+0.5,wy=outpost.maskY+c.my+0.5;
   return canStandProp(wx,wy,0.35)&&!isWall(wx,wy);
 });
 if(validCells.length===0)return;
 for(let i=0;i<count;i++){
  let x,y,tries=0;
  do{
   const c=validCells[Math.floor(Math.random()*validCells.length)];
   x=outpost.maskX+c.mx+0.5;
   y=outpost.maskY+c.my+0.5;
   tries++;
  } while((!canStandProp(x,y,0.35)||isWall(x,y))&&tries<20);
  if(tries>=20)continue;
  const isReserve=outpost.tier===3&&i<9;
  let type;
  if(isReserve||outpost.camp)type='soldier'; // Campamentos: solo soldados.
  else if(outpost.tier===1)type='soldier';
  else if(outpost.tier===2)type=Math.random()<0.75?'soldier':'heavy';
  else{const roll=Math.random();
   if(roll<0.40)type='heavy';
   else if(roll<0.62)type='sniper';
   else if(roll<0.82)type='shotgunner';
   else type='officer';}
  const conf=ETYPES[type];
  const initFace=Math.random()*6.28;
  const e={x,y,type,hp:Math.round(conf.hp*hpMul),maxHp:Math.round(conf.hp*hpMul),speed:conf.speed,dmg:Math.round(conf.dmg*dmgMul),
   fr:conf.fr,corpse:conf.corpse,atkCd:0,hurtT:0,alive:true,wt:0,wander:initFace,wanderT:0,loot:makeLoot(type),
   height:conf.h,aimT:0,shoutT:0,reinforceT:conf.reinforceCd||0,recentDmg:0,recentDmgT:0,zigzagT:0,zigzagDir:1,
   stop:conf.stop,boss:!!conf.boss,sniper:!!conf.laser,meleeType:!!conf.melee,pellets:conf.pellets||1,
   minDist:conf.minDist||0,maxDist:conf.maxDist||30,coverTarget:null,face:initFace,detect:0,fov:conf.fov,sight:conf.sight,
   name:conf.name,color:conf.color,outpost,homeX:outpost.x,homeY:outpost.y,leash:outpost.leash,
   state:'PATROL',stateT:0,reserve:isReserve,waypointIdx:Math.floor(Math.random()*(outpost.waypoints.length||1))};
  initEnemyGear(e,type);enemies.push(e);spawned.push(e);
 }
 outpost.enemies=spawned;outpost.totalCount=spawned.length;outpost.killed=0;outpost.taken=false;
}
