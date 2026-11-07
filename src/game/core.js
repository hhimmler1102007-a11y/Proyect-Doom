
'use strict';

/* EXTRACTION DOOM — v7: piso militar, variantes de muro, props y beneficio al tomar */
export const MW=96,MH=96,TEX=64,SH=16,$=id=>document.getElementById(id);

export const clamp=(v,a,b)=>v<a?a:v>b?b:v;

export const C=(r,g,b)=>(((255<<24)|(clamp(b|0,0,255)<<16)|(clamp(g|0,0,255)<<8)|clamp(r|0,0,255))>>>0);

export function hash(x,y,s){let n=(x*374761393+y*668265263+s*1442695041)|0;n=(n^(n>>13))*1274126177;return((n^(n>>16))>>>0)/4294967295}

export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

export const RESALE_RATE=0.75,EXTRACT_TAX=0.15,DEATH_MONEY_PENALTY=0.10,INSURANCE_RATE=0.20,INSURANCE_RECOVER=0.50,REPAIR_RATE=0.30;


export const map=new Uint8Array(MW*MH),gmap=new Uint8Array(MW*MH),mapOrig=new Uint8Array(MW*MH),gmapOrig=new Uint8Array(MW*MH),walkmapOrig=new Uint8Array(MW*MH);

export const BUILDINGS=[],PARKS=[];
export let bldDirty=true,bldNext=0;

export let CONTS=[],FURNITURE=[],PICKUP_SPOTS=[];

export let SAFE_BOXES=[],nearSafe=null,safeCrack=null;

export const MAP_LAYOUT={NUM_BLOCKS_X:6,NUM_BLOCKS_Y:6,STREET_W:3,BLOCK_W:0,BLOCK_H:0,PITCH_X:0,PITCH_Y:0,BLOCKS:[],SPAWN_BLOCK:[0,0],EXTRACTION_BLOCK:[5,5],OUTPOST_BLOCKS:[]};

{
  const L=MAP_LAYOUT;
  L.BLOCK_W=Math.floor((MW-2-(L.NUM_BLOCKS_X+1)*L.STREET_W)/L.NUM_BLOCKS_X);
  L.BLOCK_H=Math.floor((MH-2-(L.NUM_BLOCKS_Y+1)*L.STREET_W)/L.NUM_BLOCKS_Y);
  L.PITCH_X=L.BLOCK_W+L.STREET_W;
  L.PITCH_Y=L.BLOCK_H+L.STREET_W;
}

export function getBlockBounds(bx,by){
  const L=MAP_LAYOUT;
  const x0=1+L.STREET_W+bx*L.PITCH_X;
  const y0=1+L.STREET_W+by*L.PITCH_Y;
  return[x0,y0,x0+L.BLOCK_W-1,y0+L.BLOCK_H-1];
}

export function generateCity(seed){
  const rng=mulberry32(seed>>>0);
  const L=MAP_LAYOUT;
  L.BLOCKS.length=0;BUILDINGS.length=0;PARKS.length=0;bldDirty=true;
  map.fill(0);gmap.fill(0);
  for(let x=0;x<MW;x++){map[x]=10;map[(MH-1)*MW+x]=10}
  for(let y=0;y<MH;y++){map[y*MW]=10;map[y*MW+MW-1]=10}
  for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++)gmap[y*MW+x]=0;
  const allBlocks=[];
  for(let by=0;by<L.NUM_BLOCKS_Y;by++)for(let bx=0;bx<L.NUM_BLOCKS_X;bx++){
    const[x0,y0,x1,y1]=getBlockBounds(bx,by);
    if(x1>=MW-1||y1>=MH-1)continue;
    allBlocks.push([bx,by,x0,y0,x1,y1]);
  }
  L.BLOCKS.push(...allBlocks);
  const candidates=allBlocks.filter(b=>!(b[0]===L.SPAWN_BLOCK[0]&&b[1]===L.SPAWN_BLOCK[1])&&!(b[0]===L.EXTRACTION_BLOCK[0]&&b[1]===L.EXTRACTION_BLOCK[1]));
  for(let i=candidates.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  L.OUTPOST_BLOCKS=candidates.slice(0,6);
  const outpostSet=new Set(L.OUTPOST_BLOCKS.map(b=>b[0]+','+b[1]));
  const spawnKey=L.SPAWN_BLOCK[0]+','+L.SPAWN_BLOCK[1];
  const extractKey=L.EXTRACTION_BLOCK[0]+','+L.EXTRACTION_BLOCK[1];
  for(const[bx,by,x0,y0,x1,y1]of allBlocks){
    const key=bx+','+by;
    const isOutpost=outpostSet.has(key);
    const isSpawn=key===spawnKey;
    const isExtract=key===extractKey;
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)gmap[y*MW+x]=1;
    if(isSpawn||isExtract||isOutpost)continue;
    if(rng()<0.15){
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)gmap[y*MW+x]=2;
      PARKS.push([x0,y0,x1,y1]);
      continue;
    }
    genBlockBuildings(x0,y0,x1,y1,rng);
  }
  for(let i=0;i<26;i++){
    const cx=2+Math.floor(rng()*(MW-4)),cy=2+Math.floor(rng()*(MH-4)),r=1+Math.floor(rng()*3);
    for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){
      if(x>0&&x<MW-1&&y>0&&y<MH-1&&map[y*MW+x]===0&&rng()<0.75)gmap[y*MW+x]=3;
    }
  }
  for(let bx=0;bx<L.NUM_BLOCKS_X-1;bx++){
    const b1=getBlockBounds(bx,0);
    const streetCenter=b1[2]+2;
    if(streetCenter>=MW-1)continue;
    for(let y=1;y<MH-1;y++)if(gmap[y*MW+streetCenter]===0)gmap[y*MW+streetCenter]=4;
  }
  for(let by=0;by<L.NUM_BLOCKS_Y-1;by++){
    const b1=getBlockBounds(0,by);
    const streetCenter=b1[3]+2;
    if(streetCenter>=MH-1)continue;
    for(let x=1;x<MW-1;x++)if(gmap[streetCenter*MW+x]===0)gmap[streetCenter*MW+x]=5;
  }
}

function genBlockBuildings(x0,y0,x1,y1,rng){
  const w=x1-x0+1,h=y1-y0+1,roll=rng();
  if(roll<0.25){makeBuilding(x0+1,y0+1,x1-1,y1-1,rng);}
  else if(roll<0.65){
    if(w>=h){const mid=x0+Math.floor(w/2);makeBuilding(x0+1,y0+1,mid-1,y1-1,rng);makeBuilding(mid+1,y0+1,x1-1,y1-1,rng);}
    else{const mid=y0+Math.floor(h/2);makeBuilding(x0+1,y0+1,x1-1,mid-1,rng);makeBuilding(x0+1,mid+1,x1-1,y1-1,rng);}
  } else {
    const midX=x0+Math.floor(w/2),midY=y0+Math.floor(h/2);
    makeBuilding(x0+1,y0+1,midX-1,midY-1,rng);makeBuilding(midX+1,y0+1,x1-1,midY-1,rng);
    makeBuilding(x0+1,midY+1,midX-1,y1-1,rng);makeBuilding(midX+1,midY+1,x1-1,y1-1,rng);
  }
}

function makeBuilding(x0,y0,x1,y1,rng){
  if(x1-x0<3||y1-y0<3)return;
  const wt=1+Math.floor(rng()*4);
  for(let x=x0;x<=x1;x++){map[y0*MW+x]=wt;map[y1*MW+x]=wt}
  for(let y=y0;y<=y1;y++){map[y*MW+x0]=wt;map[y*MW+x1]=wt}
  const numDoors=1+Math.floor(rng()*3);
  for(let d=0;d<numDoors;d++){
    const side=Math.floor(rng()*4);
    if(side===0){const x=x0+1+Math.floor(rng()*(x1-x0-1));map[y0*MW+x]=0}
    else if(side===1){const y=y0+1+Math.floor(rng()*(y1-y0-1));map[y*MW+x1]=0}
    else if(side===2){const x=x0+1+Math.floor(rng()*(x1-x0-1));map[y1*MW+x]=0}
    else{const y=y0+1+Math.floor(rng()*(y1-y0-1));map[y*MW+x0]=0}
  }
  BUILDINGS.push([x0,y0,x1,y1]);
}

// Frente de Ceniza: un edificio sigue en pie si todavía conserva algún muro.
function inCampClearedBuilding(x,y){
  const ix=Math.floor(x),iy=Math.floor(y);
  for(const op of OUTPOSTS){if(!op.camp)continue;for(const k of op.clearB){const b=BUILDINGS[k];if(ix>=b[0]&&ix<=b[2]&&iy>=b[1]&&iy<=b[3])return true}}
  return false;
}

export function isFrontBuildingStanding(x,y){
  const ix=Math.floor(x),iy=Math.floor(y);
  for(const b of BUILDINGS){if(ix<b[0]||ix>b[2]||iy<b[1]||iy>b[3])continue;
    // Solo cuentan los muros que siguen en pie dentro de la tierra de nadie (edificios junto a campamentos).
    for(let xx=b[0];xx<=b[2];xx++){if(map[b[1]*MW+xx]&&frontZoneAt(xx,b[1])===6)return true;if(map[b[3]*MW+xx]&&frontZoneAt(xx,b[3])===6)return true}
    for(let yy=b[1];yy<=b[3];yy++){if(map[yy*MW+b[0]]&&frontZoneAt(b[0],yy)===6)return true;if(map[yy*MW+b[2]]&&frontZoneAt(b[2],yy)===6)return true}}
  return false;
}

export function isInsideBuilding(x,y){
  const ix=Math.floor(x),iy=Math.floor(y);
  for(const b of BUILDINGS)if(ix>=b[0]&&ix<=b[2]&&iy>=b[1]&&iy<=b[3])return true;
  return false;
}

export const isWall=(x,y)=>{const ix=x|0,iy=y|0;return ix<0||iy<0||ix>=MW||iy>=MH||map[iy*MW+ix]!==0};

export const canStand=(x,y,r)=>!isWall(x-r,y-r)&&!isWall(x+r,y-r)&&!isWall(x-r,y+r)&&!isWall(x+r,y+r);


export const OUTPOST_NAMES=['OBSERVACIÓN ALFA','OBSERVACIÓN BRAVO','VIGILANCIA CHARLIE','VIGILANCIA DELTA','BASE MILITAR ECHO','BASE MILITAR FOXTROT'];

const FRONT_CAMP_NAMES=['CAMPAMENTO PINO','CAMPAMENTO DEL ARROYO','NIDO DE AMETRALLADORAS','CAMPAMENTO DEL DIQUE','POSICIÓN DEL CRÁTER','ÚLTIMA LÍNEA'];

export const OUTPOSTS=[];

// Zona del Frente de Ceniza según la posición (igual que el suelo): 2 verde, 3 tierra intermedia, 6 tierra de nadie.
export function frontZoneAt(x,y){
 const boundaryNoise=Math.sin(x*.16)*2.8+Math.sin(x*.047+1.7)*3.5+(hash(x>>1,y>>2,1977)-.5)*5.2;
 const p=clamp((y+boundaryNoise)/(MH-1),0,1);
 const zone2Start=.34+(Math.sin(x*.12)*2.5)/(MH-1);
 const zone3Start=.665+(Math.sin(x*.09+2.2)*3.2)/(MH-1);
 return p<zone2Start?2:p<zone3Start?3:6;
}

export const MAP_SEED=(Date.now()&0xFFFFFF)>>>0;

/* setters para variables reasignadas desde otros módulos */
export function set_bldDirty(v){return bldDirty=v}
export function set_bldNext(v){return bldNext=v}
export function set_CONTS(v){return CONTS=v}
export function set_FURNITURE(v){return FURNITURE=v}
export function set_PICKUP_SPOTS(v){return PICKUP_SPOTS=v}
export function set_SAFE_BOXES(v){return SAFE_BOXES=v}
export function set_nearSafe(v){return nearSafe=v}
export function set_safeCrack(v){return safeCrack=v}
