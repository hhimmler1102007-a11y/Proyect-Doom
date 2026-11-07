import { clearMarks } from './fx.js';
import { stopChatter } from './chatter.js';
import { BUILDINGS, CONTS, FURNITURE, MAP_SEED, MH, MW, OUTPOSTS, PARKS, PICKUP_SPOTS, frontZoneAt, gmap, hash, isInsideBuilding, map, mapOrig, mulberry32, set_bldDirty } from './core.js';
import { ALARMS, ALARM_HP, BEACON, PRE_FORT_MAP, STREET_DECOS, addSolidProp, fortDecos, fortProps, fortTowers, pblk, placeFrontCampProps, rebuildPropGrid, resetOutposts, solidProps } from './outposts.js';
import { cALLY, campFires, pickAshDeadTree, pickAshWasteTree, sALLY, sAlarm, sBag, sBed, sBed2, sBench, sBush, sCampLantern, sCampTent, sCampTent2, sCampfire, sChair, sChairBurnt, sClock, sCrate, sCzech, sDebris, sFallenTrunk, sFirewood, sFoodCrate, sLamp, sLocker, sLogSeat, sMil, sPainting, sPine, sRubble, sRug, sShelf, sSofa, sSofa2, sTable, sTrashBag, sTree, sTree2, sWire } from './sprites.js';
import { ITEMS } from './data.js';
import { P, applyAtmosphere, corpses, decos, enemies, meta, selectedMap, set_P, set_allies, set_bigMapTransform, set_corpses, set_dayPhase, set_decals, set_decos, set_dmgDirs, set_dmgNumbers, set_eGrenades, set_enemies, set_ext, set_fireHeld, set_fires, set_gt, set_hitMarkers, set_kills, set_lF, set_lO, set_lTh, set_lW, set_lWt, set_lastAm, set_lastBtnSwap, set_lastEco, set_lastHp, set_lastObjHtml, set_lastW, set_leaves, set_mapMarkers, set_milBoxesLooted, set_nearAlly, set_nearC, set_nearCache, set_noDamageTimer, set_noises, set_objectives, set_outpostsTaken, set_parts, set_pickups, set_projs, set_rain, set_revealedOutposts, set_rockets, set_runStats, set_smokes, set_throwables, set_total, set_visibleEnemies, set_weather } from './state.js';
import { computeOutpostWaypoints, contLoot, spawnOutpostEnemies } from './worldgen.js';
import { buildNightEmitters } from './night.js';
import { rollObjectives, spawnSafeBoxes } from './operations.js';
import { rebuildMinimap, set_flowT } from './backdrop.js';
import { buildTerritory } from './conquest.js';
import { set_bTexK } from './render.js';
import { frontTrail } from './game.js';

function* resetSteps(){
 map.set(mapOrig);rebuildMinimap();
 set_P({x:2.5,y:2.5,a:.9,hp:100,maxHp:100,food:100,water:100,starve:0,extOn:false,eq:{helmet:null,vest:null},weaponSlots:[0,-1],weapons:[true,false,false,false,false,false,false],weapon:0,ammo9:0,ammo12g:0,ammo556:0,ammo76239:0,ammo792:0,ammo76251:0,rockets:0,inventory:new Array(12).fill(null),fireCd:0,bob:0,hurt:0,muzzle:0,
   mag:[15,0,0,0,0,0,0],reloading:0,reloadTotal:0,meleeAnim:0,
  throwables:{frag:0,smoke:0,molotov:0},currentThrow:'frag',throwCd:0,fireHurtCd:0});
 for(let i=0;i<12;i++){if(meta.stash[i])P.inventory[i]={...meta.stash[i]}}
 for(let i=0;i<12;i++){const it=P.inventory[i];if(!it)continue;const d=ITEMS[it.id];
  if(d.slot&&!P.eq[d.slot]){P.eq[d.slot]={id:it.id,dur:d.dur};P.inventory[i]=null}
  else if(d.weapon!==undefined){ /* Las armas del alijo permanecen en el inventario */ }
  else if(d.throwable){P.throwables[it.id]=(P.throwables[it.id]||0)+it.count;P.inventory[i]=null}
  else if(d.ammo){P[d.ammo]+=d.amount*it.count;P.inventory[i]=null}
 }
 set_hitMarkers([]);set_dmgNumbers([]);set_dmgDirs([]);set_decals([]);clearMarks();stopChatter();set_visibleEnemies([]);
 set_objectives([]);set_allies([]);set_noDamageTimer(0);set_milBoxesLooted(0);set_nearAlly(null);set_lastObjHtml('');set_nearCache(null);
 set_runStats({longKills:0,meleeKills:0,headshots:0,damageTaken:false,itemsAtEnd:0,explodedKills:0,rifleKills:0});
 set_lastEco({gross:0,tax:0,net:0});set_outpostsTaken(0);
 set_revealedOutposts(new Set());
 set_mapMarkers([]);set_bigMapTransform(null);/* limpiar marcas */
 set_enemies([]);resetOutposts();
 yield { progress:24, status:'ESTADO DE PARTIDA RESTABLECIDO' };
 if(selectedMap==='front'){
  // Los puestos militares desaparecen por completo; los campamentos ocupan terreno despejado.
  const inCamp=(x,y)=>OUTPOSTS.some(op=>Math.hypot(x-op.x,y-op.y)<op.r+1.5);
  const clearedB=new Set();for(const op of OUTPOSTS)for(const k of (op.clearB||[]))clearedB.add(k);
  const inClearedB=(x,y)=>{for(const k of clearedB){const b=BUILDINGS[k];if(x>=b[0]&&x<=b[2]&&y>=b[1]&&y<=b[3])return true}return false};
  for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++){
   const i=y*MW+x;if(!map[i])continue;
   const z=frontZoneAt(x,y);
   const fort=mapOrig[i]&&PRE_FORT_MAP&&!PRE_FORT_MAP[i];
   if(fort||inCamp(x+.5,y+.5)||inClearedB(x,y)){map[i]=0;gmap[i]=z===2?2:z===3?3:6;continue}
   if(z===6){map[i]=0;gmap[i]=6;}
   else if(z===2)map[i]=8;
   else map[i]=9;
  }
  // === CABAÑAS V3 FINAL - 4 VARIANTES LIMPIAS, HACHA 1x POR CABAÑA, TECHO LISO ===
  for(let k=0;k<BUILDINGS.length;k++){
   const b=BUILDINGS[k];
   const cx=(b[0]+b[2])>>1, cy=(b[1]+b[3])>>1;
   const zc=frontZoneAt(cx,cy);
   if(zc!==2 && zc!==3) continue;
   const walls=[];
   for(let x=b[0];x<=b[2];x++){ if(x>=0&&x<MW){ if(map[b[1]*MW+x]) walls.push([x,b[1]]); if(map[b[3]*MW+x]) walls.push([x,b[3]]); } }
   for(let y=b[1]+1;y<b[3];y++){ if(y>=0&&y<MH){ if(map[y*MW+b[0]]) walls.push([b[0],y]); if(map[y*MW+b[2]]) walls.push([b[2],y]); } }
   if(walls.length===0) continue;
   const axeIdx=Math.floor(hash(cx,cy,k+MAP_SEED+11)*walls.length);
   const isWood=zc===2;
   const basicId=isWood?11:15;
   const rotosId=isWood?12:16;
   const mossId=isWood?13:17;
   const axeId=isWood?14:18;
   for(let i=0;i<walls.length;i++){
    const wx=walls[i][0], wy=walls[i][1];
    const ii=wy*MW+wx;
    if(i===axeIdx){
     map[ii]=axeId;
    }else{
     const r=hash(wx,wy,k+123);
     if(r<0.34) map[ii]=basicId;
     else if(r<0.67) map[ii]=rotosId;
     else map[ii]=mossId;
    }
   }
  }
  rebuildMinimap();
 }
 yield { progress:42, status:'TERRENO Y ESTRUCTURAS PREPARADOS' };
 set_bldDirty(true);set_bTexK([]);
 set_allies([
  {x:2.5,y:5.5,hp:80,maxHp:80,alive:true,following:false,atkCd:0,speed:3.0,name:'ALIADO',color:'#9fd8ff',wt:0,fr:sALLY,corpse:cALLY,height:.62},
  {x:5.5,y:2.5,hp:80,maxHp:80,alive:true,following:false,atkCd:0,speed:3.0,name:'ALIADO',color:'#9fd8ff',wt:0,fr:sALLY,corpse:cALLY,height:.62}
 ]);
 set_corpses([]);set_projs([]);set_parts([]);set_leaves([]);set_decos([]);set_rockets([]);set_throwables([]);set_smokes([]);set_fires([]);set_noises([]);set_eGrenades([]);set_rain([]);
 solidProps.length=0;
 const frontMap=selectedMap==='front';
 for(const tw of fortTowers)tw.dead=frontMap;
 for(const al of ALARMS){al.alive=!frontMap;al.hp=ALARM_HP;al.activated=false;al.spent=false;al.callT=0;al.deco.spr=sAlarm;al.deco.wh=al.wh0;al.deco.ww=al.ww0}
 // En el Frente de Ceniza no hay torres, alarmas, puertas ni defensas de los puestos militares.
 if(!frontMap){for(const fp of fortProps)solidProps.push(fp);for(const fd of fortDecos)decos.push(fd);}
 const free=(x,y)=>x>=1&&y>=1&&x<MW-1&&y<MH-1&&!map[y*MW+x];
 if(!frontMap)for(const[x0,y0,x1,y1]of PARKS){
  for(let y=y0+1;y<y1;y++)for(let x=x0+1;x<x1;x++){
   if(Math.random()<0.16&&free(x,y)){
    const tr=Math.random();
    const tspr=tr<.5?sTree:tr<.78?sPine:sTree2;
    const th=tspr===sPine?3.2:2.8;
    const d={x:x+.5,y:y+.5,spr:tspr,wh:th,ww:th*tspr.w/tspr.h,z0:0};
    decos.push(d);addSolidProp(d.x,d.y,.35);
   } else if(Math.random()<0.07&&free(x,y)){
    decos.push({x:x+.5,y:y+.5,spr:sBush,wh:.5,ww:.5*sBush.w/sBush.h,z0:0});
   } else if(Math.random()<0.05&&free(x,y)){
    decos.push({x:x+.5,y:y+.5,spr:sBench,wh:.5,ww:1.1,z0:0});addSolidProp(x+.5,y+.5,.35);
   }
  }
 }
 const ct={c:[sCrate,.65],s:[sShelf,.9],b:[sBag,.45],l:[sLocker,1],m:[sMil,.6]};
 if(selectedMap!=='front')for(const t of CONTS){
  if(!free(t[0],t[1]))continue;
  const k=ct[t[2]]||ct.c;
  corpses.push({x:t[0]+.5,y:t[1]+.5,spr:k[0],wh:k[1],ww:k[1]*k[0].w/k[0].h,z0:0,perm:true,loot:contLoot(t[2]),military:t[2]==='m'});
  if(t[2]==='l')addSolidProp(t[0]+.5,t[1]+.5,.35);
  else if(t[2]==='c'||t[2]==='m')addSolidProp(t[0]+.5,t[1]+.5,.3);
 }
 const FURN={sofa:{s:sSofa,h:.55,w:1.3},sofa2:{s:sSofa2,h:.55,w:1.3},bed:{s:sBed,h:.5,w:1.2},bed2:{s:sBed2,h:.5,w:1.2},table:{s:sTable,h:.4,w:1.0},rug:{s:sRug,h:.04,w:1.6}};
 if(selectedMap!=='front')for(const f of FURNITURE){
  const[x,y,type]=f;const def=FURN[type];if(!def)continue;
  if(free(x,y)){
   const z0=(type==='rug')?0.001:0;
   decos.push({x:x+.5,y:y+.5,spr:def.s,wh:def.h,ww:def.w,z0:z0});
   if(type==='sofa'||type==='sofa2')addSolidProp(x+.5,y+.5,.42);
   else if(type==='bed'||type==='bed2')addSolidProp(x+.5,y+.5,.45);
   else if(type==='table')addSolidProp(x+.5,y+.5,.3);
  }
 }
 if(selectedMap!=='front'){
  const lampStep=12;
  for(let y=3;y<MH-2;y+=lampStep)for(let x=3;x<MW-2;x+=lampStep){
   if(free(x,y)&&!isInsideBuilding(x+.5,y+.5))decos.push({x:x+.5,y:y+.5,spr:sLamp,wh:3.2,ww:3.2*sLamp.w/sLamp.h,z0:0});
  }
 }
 // Bosque denso en el sector inicial; claros alrededor de la extracción, caminos y campamentos.
 if(selectedMap==='front'){
  const isNearCamp=(x,y)=>OUTPOSTS.some(op=>Math.hypot(x-op.x,y-op.y)<op.r+1.8);
  for(let y=3;y<MH-3;y++)for(let x=3;x<MW-3;x++){
   if(!free(x,y)||pblk[y*MW+x])continue;
   const zoneFloor=frontZoneAt(x,y);
   if(zoneFloor!==6&&isInsideBuilding(x+.5,y+.5))continue;
   if(zoneFloor!==6&&frontTrail[y*MW+x])continue; // Caminos despejados.
   if(Math.hypot(x+.5-2.5,y+.5-2.5)<7||Math.hypot(x+.5-BEACON.x,y+.5-BEACON.y)<5||isNearCamp(x+.5,y+.5))continue;
   const n=hash(x,y,MAP_SEED%7919);if(n>.945)continue;
   if(zoneFloor===2||zoneFloor===1){
    if(n<.105){const spr=sPine;const h=2.8+hash(x,y,1929)*.75;const d={x:x+.5,y:y+.5,spr,wh:h,ww:h*spr.w/spr.h,z0:0};decos.push(d);addSolidProp(d.x,d.y,.32)}
    else if(n<.145)decos.push({x:x+.5,y:y+.5,spr:sBush,wh:.58,ww:.58*sBush.w/sBush.h,z0:0});
   }else if(zoneFloor===3){
    // Segunda zona: recuperar árboles muertos en cantidad visible, además de troncos caídos.
    // Zona intermedia: árboles muertos (secos) y árboles quemados, más troncos caídos.
    if(n<.14){const tree=pickAshDeadTree(x,y,1947),spr=tree.spr,h=tree.wh;const d={x:x+.5,y:y+.5,spr,wh:h,ww:h*spr.w/spr.h,z0:-.12};decos.push(d);addSolidProp(d.x,d.y,.28)}
   }else if(zoneFloor===6){
    // Tierra de nadie: árboles muertos (2 variantes del arte), erizos checos y alambrada en grupos dispersos.
    const obs=hash(x,y,1931);
    // Variantes del arte de referencia solo en la zona devastada; la zona media/verde no se toca.
    if(n<.055){const tree=pickAshWasteTree(x,y,1925),spr=tree.spr,h=tree.wh;const d={x:x+.5,y:y+.5,spr,wh:h,ww:h*spr.w/spr.h,z0:-.12};decos.push(d);addSolidProp(d.x,d.y,.28)}
    else if(obs<.09){const h=.95;decos.push({x:x+.5,y:y+.5,spr:sCzech,wh:h,ww:h*sCzech.w/sCzech.h,z0:-.1});addSolidProp(x+.5,y+.5,.27)}
    else if(obs<.165){const h=.72;decos.push({x:x+.5,y:y+.5,spr:sWire,wh:h,ww:1.15,z0:-.04})}
   }
  }
 }
 /* Decoración urbana generada con la ciudad (semáforos, cebras suelo, mobiliario) */
 if(selectedMap!=='front')for(const d of STREET_DECOS){
  const nd={x:d.x,y:d.y,spr:d.spr,wh:d.wh,ww:d.ww,z0:d.z0||0};
  if(d.tl!==undefined)nd.tl=d.tl;
  if(d.wave)nd.wave=true;
  decos.push(nd);
  if(d.solid)addSolidProp(d.x,d.y,d.solid);
 }
 yield { progress:61, status:'DECORACIÓN DEL ESCENARIO COMPLETADA' };
 
/* ===== DECORACIÓN ADICIONAL — FRENTE DE CENIZA ===== */
if(selectedMap==='front'){
 const drng=mulberry32((MAP_SEED^0xDEC0F1)>>>0);
 const putD=(x,y,spr,wh,solid,z0)=>{if(!free(x,y))return false;const d={x:x+.5,y:y+.5,spr,wh,ww:wh*spr.w/spr.h,z0:z0||0};decos.push(d);if(solid)addSolidProp(x+.5,y+.5,solid);return true};
 const cabinFurn=[[sBed,.62,.4],[sBed2,.62,.4],[sTable,.45,.26],[sSofa,.55,.38],[sSofa2,.55,.38],[sShelf,.68,0],[sRug,.04,0],[sLogSeat,.34,.24],[sCampLantern,.58,0],[sFirewood,.28,0],[sFoodCrate,.4,.26],[sChair,.42,.2],[sChair,.42,.2]];
 const burntFurn=[[sRubble,.24,.85],[sChairBurnt,.44,.2],[sDebris,.3,.26],[sTrashBag,.3,.2],[sFirewood,.26,0],[sBag,.28,.2],[sRug,.035,0]];
 for(const[x0,y0,x1,y1]of BUILDINGS){
  const zc=frontZoneAt(((x0+x1)/2)|0,((y0+y1)/2)|0);
  const iw=x1-x0-1,ih=y1-y0-1;
  if(iw<1||ih<1)continue;
  const cells=[];
  for(let y=y0+1;y<y1;y++)for(let x=x0+1;x<x1;x++)if(free(x,y))cells.push([x,y]);
  if(!cells.length)continue;
  const take=()=>{if(!cells.length)return null;const k=Math.floor(drng()*cells.length);return cells.splice(k,1)[0]};
  if(zc===2){
   const n=Math.min(cells.length,4+Math.floor(drng()*5));
   for(let i=0;i<n;i++){const c=take();if(!c)break;const f=cabinFurn[Math.floor(drng()*cabinFurn.length)];putD(c[0],c[1],f[0],f[1]*(.9+drng()*.2),f[2]);}
   for(let i=0;i<2;i++){
    const c=take();if(!c)break;
    const nearWall=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>map[(c[1]+dy)*MW+(c[0]+dx)]!==0);
    if(!nearWall)continue;
    if(drng()<.5)putD(c[0],c[1],sPainting,.42,0,1.0);
    else putD(c[0],c[1],sClock,.34,0,1.1);
   }
  }else if(zc===3||zc===6){
   const n=Math.min(cells.length,2+Math.floor(drng()*4));
   for(let i=0;i<n;i++){const c=take();if(!c)break;const f=burntFurn[Math.floor(drng()*burntFurn.length)];putD(c[0],c[1],f[0],f[1]*(.85+drng()*.25),f[2]);}
  }
 }
 const nearGreen=(x,y)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>frontZoneAt(x+dx,y+dy)===2);
 for(let y=2;y<MH-2;y++)for(let x=2;x<MW-2;x++){
  if(!free(x,y))continue;
  if(isInsideBuilding(x+.5,y+.5))continue;
  const z=frontZoneAt(x,y);
  if(z===6)continue;
  if(OUTPOSTS.some(op=>Math.hypot(op.x-(x+.5),op.y-(y+.5))<9))continue;
  const n=hash(x,y,4711);
  if(z===2){
   if(n<.011)putD(x,y,sFallenTrunk,.42+hash(x,y,4712)*.14,.24);
   else if(n<.019)putD(x,y,sPine,2.35+hash(x,y,4713)*.85,.3);
   else if(n<.025)putD(x,y,sTree2,2.1+hash(x,y,4714)*.65,.3);
   else if(n<.033)putD(x,y,sBush,.48+hash(x,y,4715)*.18,0);
  }else if(z===3){
   // Zona media: solo árboles muertos / troncos. Sin vegetación verde.
   if(n<.022){const tree=pickAshDeadTree(x,y,4720);putD(x,y,tree.spr,tree.wh,.28,-.12)}
   else if(n<.028)putD(x,y,sFallenTrunk,.42+hash(x,y,4718)*.14,.24);
  }
 }
 // Purga defensiva: en zona media y devastada no debe quedar ningún árbol/arbusto verde.
 if(selectedMap==='front'){
  const greenSpr=new Set([sTree,sTree2,sPine,sBush]);
  for(let i=decos.length-1;i>=0;i--){
   const d=decos[i];if(!greenSpr.has(d.spr))continue;
   const z=frontZoneAt(d.x|0,d.y|0);
   if(z===3||z===6)decos.splice(i,1);
  }
 }
 const civilCamps=[];
 for(let tries=0;tries<220&&civilCamps.length<3;tries++){
  const x=4+Math.floor(drng()*(MW-9)),y=4+Math.floor(drng()*(MH-9));
  if(frontZoneAt(x,y)===6)continue;
  if(isInsideBuilding(x+.5,y+.5))continue;
  if(OUTPOSTS.some(op=>Math.hypot(op.x-(x+.5),op.y-(y+.5))<9))continue;
  let ok=true;
  for(let yy=y-2;yy<=y+2&&ok;yy++)for(let xx=x-2;xx<=x+2;xx++)if(!free(xx,yy)||isInsideBuilding(xx+.5,yy+.5)){ok=false;break}
  if(!ok)continue;
  for(const c of civilCamps)if(Math.hypot(c[0]-x,c[1]-y)<16){ok=false;break}
  if(!ok)continue;
  civilCamps.push([x,y]);
  putD(x,y,sCampfire[0],.62,.26);
  campFires.push(decos[decos.length-1]);
  putD(x-2,y-1,sCampTent,1.05,.38);
  putD(x+2,y+1,sCampTent2,.95,.36);
  putD(x-1,y+2,sLogSeat,.34,.2);
  putD(x+1,y-2,sLogSeat,.34,.2);
  putD(x+2,y-2,sCampLantern,.55,0);
 }
}

if(selectedMap==='front')placeFrontCampProps();
 rebuildPropGrid();
 spawnSafeBoxes();
 for(const op of OUTPOSTS)computeOutpostWaypoints(op);
 yield { progress:78, status:'CAMPAMENTOS, CONTENEDORES Y CAJAS FUERTES LISTOS' };
 for(const op of OUTPOSTS)spawnOutpostEnemies(op);
 set_total(enemies.length);
 set_pickups(PICKUP_SPOTS.map(p=>({...p,taken:false})));
 yield { progress:91, status:'GUARNICIONES Y PATRULLAS DESPLEGADAS' };
 set_kills(0);set_ext(0);set_gt(0);set_nearC(null);set_fireHeld(false);
 set_lastHp(set_lastAm(set_lastW(set_lF(set_lW(set_lO(set_lWt(-1)))))));set_lastBtnSwap('');set_lTh('');
 set_flowT(0);rollObjectives();buildTerritory();
 const wr=Math.random();
 set_weather(wr<.5?'clear':wr<.75?'rain':wr<.9?'fog':'sandstorm');
 set_dayPhase(0);applyAtmosphere();
 buildNightEmitters();
 yield { progress:97, status:'CLIMA, OBJETIVOS Y BALIZA SINCRONIZADOS' };
}

function yieldToBrowser(){
 return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
}

// Reinicio síncrono conservado para la inicialización del juego.
export function reset(){
 for(const _stage of resetSteps()){}
}

// Reinicio escalonado para las operaciones: permite pintar el progreso real entre fases.
export async function resetWithProgress(onProgress){
 for(const stage of resetSteps()){
  if(onProgress)onProgress(stage);
  await yieldToBrowser();
 }
}
