import { BUILDINGS, MAP_LAYOUT, MAP_SEED, MH, MW, OUTPOSTS, OUTPOST_NAMES, canStand, clamp, frontZoneAt, getBlockBounds, gmap, isWall, map, mulberry32 } from './core.js';
import { CAMP_ITEMS, campFires, campLoot, sAlarm, sAntenna, sBagWall, sBunker, sCampfire, sCar, sCar2, sCrate, sCzech, sEnemyTents, sFuelBarrel, sGate, sGateLight, sGenerator, sLamp, sMapTable, sMil, sTower, sWire } from './sprites.js';
import { corpses, decos } from './state.js';

/* ===== Campamentos del Frente de Ceniza: reemplazan los puestos militares en ese mapa ===== */
export const DISTRICT_OUTPOSTS=[],FRONT_CAMPS=[];

const FRONT_CAMP_NAMES_MID=['CAMPAMENTO DEL ARROYO SECO','REFUGIO DE LOS LEÑADORES'];

const FRONT_CAMP_NAMES_WASTE=['VIVAC DEL CRÁTER','HOGUERA DEL CUERVO','TOLDOS DEL BARRANCO','REFUGIO DE LA ALAMBRADA','CAMPAMENTO ÚLTIMA BRASA','POSADA DE LA CENIZA'];

export let PRE_FORT_MAP=null;

function campOverlapsBuilding(cx,cy,R){
 for(const b of BUILDINGS){const nx=clamp(cx,b[0],b[2]+1),ny=clamp(cy,b[1],b[3]+1);if(Math.hypot(cx-nx,cy-ny)<R+1.5)return true}
 return false;
}

function makeFrontCamp(i,name,cx,cy,zone){
 const R=5,W=2*R+1,mask=new Uint8Array(W*W),op={id:'camp_'+i,name,camp:true,zone,tier:1,min:4,max:6,leash:9,
  alertState:'CALM',alertT:0,radioCd:0,broadcastT:0,reinforcementCount:0,waypoints:[],
  mask,maskX:cx-R,maskY:cy-R,maskW:W,maskH:W,interiorCells:[],perimeter:[],gates:[],lootedCache:false,reflected:false,
  x:cx+.5,y:cy+.5,r:R+.5,layoutSeed:(MAP_SEED^(i*0x9E3779B1)^0xCA4B)>>>0,clearB:[]};
 for(let y=0;y<W;y++)for(let x=0;x<W;x++)if(Math.hypot(x-R,y-R)<=R+.3)mask[y*W+x]=1;
 for(let y=0;y<W;y++)for(let x=0;x<W;x++){if(!mask[y*W+x])continue;
  const edge=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const nx=x+dx,ny=y+dy;return nx<0||ny<0||nx>=W||ny>=W||!mask[ny*W+nx]});
  (edge?op.perimeter:op.interiorCells).push({mx:x,my:y});}
 // Edificios que tocan el campamento: se retiran por completo para que no quede techo encima.
 BUILDINGS.forEach((b,k)=>{const nx=clamp(cx+.5,b[0],b[2]+1),ny=clamp(cy+.5,b[1],b[3]+1);if(Math.hypot(cx+.5-nx,cy+.5-ny)<R+1.5)op.clearB.push(k)});
 return op;
}

export function buildFrontCamps(){
 FRONT_CAMPS.length=0;
 const rng=mulberry32((MAP_SEED^0x5CA3F1)>>>0),R=5;
 const placed=[];
 const okSpot=(cx,cy,zone,strict)=>{
  if(Math.hypot(cx-2.5,cy-2.5)<22||Math.hypot(cx-BEACON.x,cy-BEACON.y)<12)return false;
  for(const p of placed)if(Math.hypot(cx-p[0],cy-p[1])<(strict===2?13:17))return false;
  for(let a=0;a<16;a++){const ang=a/16*6.2832;for(const rr of [0,R*.5,R+1]){const zx=Math.round(cx+Math.cos(ang)*rr),zy=Math.round(cy+Math.sin(ang)*rr);
   if(zx<2||zy<2||zx>=MW-2||zy>=MH-2)return false;const z=frontZoneAt(zx,zy);if(zone===3?z===2:z!==6)return false;}}
  if(frontZoneAt(cx,cy)!==zone)return false;
  if(strict===true&&campOverlapsBuilding(cx+.5,cy+.5,R))return false;
  return true;
 };
 const place=(zone,count,names)=>{
  let n=0;
  for(const strict of [true,false,2]){
   for(let t=0;t<900&&n<count;t++){
    const cx=8+Math.floor(rng()*(MW-16)),cy=8+Math.floor(rng()*(MH-16));
    if(!okSpot(cx,cy,zone,strict))continue;
    placed.push([cx,cy]);FRONT_CAMPS.push(makeFrontCamp(FRONT_CAMPS.length,names[n]||('CAMPAMENTO '+(FRONT_CAMPS.length+1)),cx,cy,zone));n++;
   }
  }
 };
 // Zona verde: ninguno. Zona media: como máximo dos. Zona devastada: varios.
 place(3,2,FRONT_CAMP_NAMES_MID); // Zona media: siempre dos campamentos.
 place(6,5,FRONT_CAMP_NAMES_WASTE);
}

export function placeFrontCampProps(){
 campFires.length=0;
 for(const op of OUTPOSTS){
  if(!op.camp)continue;
  const rng=mulberry32(op.layoutSeed),a0=rng()*6.2832,cx=op.x,cy=op.y;
  const occ=[[cx,cy,.45]];
  const put=(key,ang0,rad0,extra)=>{
   const it=CAMP_ITEMS[key],rr=(it.solid||.38);let x,y,ok=false;
   // Busca un hueco libre cerca del ángulo pedido para que nada se monte encima de otra cosa.
   for(const dr of [0,.55,-.45]){for(const da of [0,.28,-.28,.56,-.56,.85,-.85]){
    x=cx+Math.cos(ang0+da)*(rad0+dr);y=cy+Math.sin(ang0+da)*(rad0+dr);
    if(isWall(x,y))continue;if(occ.some(o=>Math.hypot(o[0]-x,o[1]-y)<o[2]+rr+.18))continue;ok=true;break}if(ok)break}
   if(!ok)return null;occ.push([x,y,rr]);
   const wh=it.wh,ww=wh*it.spr.w/it.spr.h;
   if(it.loot){const c={x,y,spr:it.spr,wh,ww,z0:0,perm:true,label:it.name,loot:campLoot(it.loot),campItem:key};corpses.push(c);}
   else decos.push({x,y,spr:it.spr,wh,ww,z0:0,name:it.name,...(extra||{})});
   if(key==='radio'&&!op.radioPos)op.radioPos={x,y};
   if(it.solid)addSolidProp(x,y,it.solid);
   return true;
  };
  // Fogata en el centro (animada) con troncos para sentarse y una olla.
  const fire={x:cx,y:cy,spr:sCampfire[0],wh:.85,ww:.85*sCampfire[0].w/sCampfire[0].h,z0:0,name:'FOGATA',ph:rng()*3};
  decos.push(fire);campFires.push(fire);addSolidProp(cx,cy,.3);
  put('logSeat',a0+1.05,1.45);put('logSeat',a0+3.14,1.5);put('logSeat',a0+5.24,1.45);
  put('cookPot',a0+2.1,1.15);
  // Tiendas en anillo, con huecos para entrar y moverse.
  const tents=op.zone===6?['wasteTent0','wasteTent1','wasteTent2','wasteTent3','wasteTent4','wasteTent5']:['enemyTent0','enemyTent1','enemyTent2','enemyTent3','enemyTent4','enemyTent5'];
  const nT=3+(rng()<.5?1:0),step=6.2832/nT,start=(rng()*tents.length)|0;
  if(op.zone===6){for(let i=tents.length-1;i>0;i--){const j=(rng()*(i+1))|0;[tents[i],tents[j]]=[tents[j],tents[i]]}} /* zona devastada: variantes al azar sin repetir */
  for(let k=0;k<nT;k++){const key=tents[(start+k)%tents.length];put(key,a0+k*step,3.45);if(key==='leanTo'||rng()<.35)put('bedroll',a0+k*step+.32,2.45)}
  // Recursos entre las tiendas: siempre comida y agua, más munición y botiquín según el campamento.
  const supplies=['foodCrate','waterDrum','ammoCrate',rng()<.6?'sacks':'foodCrate'];
  if(rng()<.65)supplies.push('medBox');
  supplies.forEach((key,k)=>{const ang=a0+(k+.5)*(6.2832/supplies.length)+(rng()-.5)*.25;put(key,ang,k%2?3.7:3.0)});
  put('firewood',a0+.5,2.15);
  put('lantern',a0+3.9,2.3);
  rng();put('radio',a0+4.7,2.4);if(!op.radioPos)op.radioPos={x:cx+1.2,y:cy+1.2}; /* siempre hay una radio en el campamento (de ahí sale el pedido de ayuda) */
  // Parapetos improvisados en el borde, hacia fuera.
  const nP=1+(rng()<.6?1:0);for(let k=0;k<nP;k++)put('parapet',a0+step*.5+k*3.14+(rng()-.5)*.4,5.4);
 }
}

export function buildOutposts(){
  OUTPOSTS.length=0;
  const L=MAP_LAYOUT,tiers=[1,1,1,2,2,3];
  for(let i=0;i<L.OUTPOST_BLOCKS.length;i++){
    const[bx,by]=L.OUTPOST_BLOCKS[i];
    const[x0,y0,x1,y1]=getBlockBounds(bx,by);
    const cx=(x0+x1)/2+0.5,cy=(y0+y1)/2+0.5;
    const tier=tiers[i]||1;
    OUTPOSTS.push({id:'outpost_'+i,name:OUTPOST_NAMES[i]||('PUESTO '+i),x:cx,y:cy,r:Math.min(x1-x0,y1-y0)/2-1,tier,
      min:[4,8,15][tier-1],max:[7,12,20][tier-1],leash:[7,10,14][tier-1],block:[bx,by],
      alertState:'CALM',alertT:0,radioCd:0,broadcastT:0,reinforcementCount:0,waypoints:[],
      mask:null,maskX:0,maskY:0,maskW:0,maskH:0,interiorCells:[],perimeter:[],gates:[],
      lootedCache:false,reflected:false});
  }
}

export function resetOutposts(){for(const o of OUTPOSTS){
  o.enemies=[];o.taken=false;o.totalCount=0;o.killed=0;
  o.alertState='CALM';o.alertT=0;o.radioCd=0;o.broadcastT=0;o.reinforcementCount=0;
  o.lootedCache=false;o.reinfSent=false;o.reinfDelay=-1;o.reinfSquadsSent=0;
}}


function generateOutpostMask(op){
  const[x0,y0,x1,y1]=getBlockBounds(op.block[0],op.block[1]);
  const pad=1;
  const px0=x0+pad,py0=y0+pad,px1=x1-pad,py1=y1-pad;
  const w=px1-px0+1,h=py1-py0+1;
  op.maskX=px0;op.maskY=py0;op.maskW=w;op.maskH=h;
  const mask=new Uint8Array(w*h);
  const rng=mulberry32((MAP_SEED^(op.block[0]*73856093)^(op.block[1]*19349663)^0xABCDEF)>>>0);
  if(op.tier===1){
    mask.fill(1);
  } else if(op.tier===2){
    const cutSize=Math.max(3,Math.min(w,h)-6)+Math.floor(rng()*3);
    const corner=Math.floor(rng()*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      let cut=false;
      if(corner===0)cut=(x>=w-cutSize&&y<cutSize);
      else if(corner===1)cut=(x>=w-cutSize&&y>=h-cutSize);
      else if(corner===2)cut=(x<cutSize&&y>=h-cutSize);
      else cut=(x<cutSize&&y<cutSize);
      mask[y*w+x]=cut?0:1;
    }
  } else {
    const cutSize=Math.max(2,Math.floor(Math.min(w,h)*0.3));
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const tlx=Math.max(0,cutSize-x);
      const tly=Math.max(0,cutSize-y);
      const trx=Math.max(0,x-(w-1-cutSize));
      const blx=Math.max(0,cutSize-x);
      const bly=Math.max(0,y-(h-1-cutSize));
      const bry=Math.max(0,y-(h-1-cutSize));
      const trY=Math.max(0,cutSize-y);
      const brx=Math.max(0,x-(w-1-cutSize));
      const corners=[tlx+tly,trx+trY,blx+bly,brx+bry];
      let sum=0;
      for(const c of corners)if(c>0)sum=Math.max(sum,c);
      if(sum>cutSize)mask[y*w+x]=0;
      else mask[y*w+x]=1;
    }
  }
  op.mask=mask;
  op.perimeter=[];op.interiorCells=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    if(!mask[y*w+x])continue;
    let isEdge=false;
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(const[dx,dy]of dirs){
      const nx=x+dx,ny=y+dy;
      if(nx<0||ny<0||nx>=w||ny>=h||!mask[ny*w+nx]){isEdge=true;break}
    }
    if(isEdge)op.perimeter.push({mx:x,my:y});
    else op.interiorCells.push({mx:x,my:y});
  }
  if(op.interiorCells.length===0){
    op.interiorCells=op.perimeter.slice();
    op.perimeter=[];
  }
  let cxm=0,cym=0;
  for(const c of op.interiorCells){cxm+=c.mx;cym+=c.my}
  cxm/=op.interiorCells.length;cym/=op.interiorCells.length;
  op.centerMX=cxm;op.centerMY=cym;
  op.x=op.maskX+cxm+0.5;
  op.y=op.maskY+cym+0.5;
  let maxR=0;
  for(const c of op.interiorCells){const d=Math.hypot(c.mx-cxm,c.my-cym);if(d>maxR)maxR=d}
  op.r=maxR+1;
}

export function isInsideMask(op,wx,wy){
  const mx=Math.floor(wx)-op.maskX;
  const my=Math.floor(wy)-op.maskY;
  if(mx<0||my<0||mx>=op.maskW||my>=op.maskH)return false;
  return op.mask[my*op.maskW+mx]===1;
}

export function maskCellToWorld(op,c){return{x:op.maskX+c.mx+0.5,y:op.maskY+c.my+0.5}}


export const fortProps=[],fortDecos=[],fortTowers=[],ALARMS=[];

export const ALARM_HP=50;

export const NEAR_SENSE=5.5;

/* Celdas (y*MW+x) reservadas frente a cada puerta de TODOS los puestos: ahí no se genera ningún objeto ni torre */
export const GATE_RES=new Set();

function addFortProp(x,y,r,spr,ww,wh,z0){const p={x,y,r,deco:null};fortProps.push(p);if(spr){const d={x,y,spr,wh:wh||0.6,ww:ww||0.9,z0:z0||0};fortDecos.push(d);p.deco=d}return p}

function removeFortProp(p){
  const i=fortProps.indexOf(p);if(i>=0)fortProps.splice(i,1);
  if(p.deco){const k=fortDecos.indexOf(p.deco);if(k>=0)fortDecos.splice(k,1)}
}

function addFortDeco(x,y,spr,wh,ww,z0){fortDecos.push({x,y,spr,wh,ww,z0:z0||0})}


/* Fase 1: máscara + elección de puertas + corredor reservado (se hace para todos los puestos antes de colocar nada) */
export function prepareOutpostGates(op){
  generateOutpostMask(op);
  const rng=mulberry32((MAP_SEED^(op.block[0]*73856093)^(op.block[1]*19349663)^(op.tier*7919)^0x51ED)>>>0);
  const numGates=op.tier===1?3:2;
  const D=[[0,-1],[1,0],[0,1],[-1,0]];
  const inM=(mx,my)=>mx>=0&&my>=0&&mx<op.maskW&&my<op.maskH&&op.mask[my*op.maskW+mx]===1;
  const outDirs=c=>D.filter(d=>!inM(c.mx+d[0],c.my+d[1]));
  /* tramo recto: un solo lado abierto, vecinos laterales y celda interior dentro de la máscara */
  const isStraight=c=>{
    const o=outDirs(c);if(o.length!==1)return false;
    const ox=o[0][0],oy=o[0][1],px=-oy,py=ox;
    return inM(c.mx+px,c.my+py)&&inM(c.mx-px,c.my-py)&&inM(c.mx-ox,c.my-oy);
  };
  const shuffled=op.perimeter.slice();
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  const gates=[];
  const pick=(list,minSep)=>{
    for(const cell of list){
      if(gates.length>=numGates)break;
      let ok=true;
      for(const g of gates)if(Math.abs(g.mx-cell.mx)+Math.abs(g.my-cell.my)<minSep){ok=false;break}
      if(ok)gates.push(cell);
    }
  };
  pick(shuffled.filter(isStraight),5);
  if(gates.length<numGates)pick(shuffled.filter(c=>!gates.includes(c)),5);
  if(gates.length<numGates)pick(shuffled.filter(c=>!gates.includes(c)),3);
  if(!gates.length&&shuffled.length)gates.push(shuffled[0]);
  op.gates=gates;
  op.gateOut=[];
  /* corredor reservado: 3 de ancho; 3 celdas hacia dentro y 4 hacia fuera de cada puerta */
  for(const g of gates){
    let ox=0,oy=0;
    const od=outDirs(g);
    if(od.length){ox=od[0][0];oy=od[0][1]}else{oy=-1}
    op.gateOut.push([ox,oy]);
    const px=-oy,py=ox,gx=op.maskX+g.mx,gy=op.maskY+g.my;
    for(let k=-3;k<=4;k++)for(let l=-1;l<=1;l++){
      const cx=gx+ox*k+px*l,cy=gy+oy*k+py*l;
      if(cx>0&&cy>0&&cx<MW-1&&cy<MH-1)GATE_RES.add(cy*MW+cx);
    }
  }
}


/* Red de seguridad: comprueba con colisión real que se puede entrar por TODAS las puertas y recorrer el interior.
   Si algún objeto bloquea, retira el más grande (de los de este puesto) y vuelve a comprobar. */
function ensureOutpostAccess(op,propStart){
  const R=0.27,STEP=0.25,M=6;
  const x0=op.maskX-M,y0=op.maskY-M;
  const GW=Math.ceil((op.maskW+2*M)/STEP),GH=Math.ceil((op.maskH+2*M)/STEP);
  const free=(x,y)=>{
    if(!canStand(x,y,R))return false;
    for(const p of fortProps){const dx=x-p.x,dy=y-p.y;if(dx*dx+dy*dy<p.r*p.r)return false}
    return true;
  };
  const toG=(x,y)=>[Math.floor((x-x0)/STEP),Math.floor((y-y0)/STEP)];
  const check=()=>{
    const g0=op.gates[0],o0=op.gateOut[0];
    const [sx,sy]=toG(op.maskX+g0.mx+0.5+o0[0]*2.5,op.maskY+g0.my+0.5+o0[1]*2.5);
    const seen=new Uint8Array(GW*GH);
    const ok=(gx,gy)=>gx>=0&&gy>=0&&gx<GW&&gy<GH&&free(x0+gx*STEP+STEP/2,y0+gy*STEP+STEP/2);
    if(!ok(sx,sy))return true; /* punto exterior ocupado por algo ajeno al puesto: no se puede juzgar */
    const q=[[sx,sy]];seen[sy*GW+sx]=1;
    while(q.length){
      const [cx,cy]=q.pop();
      for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=cx+d[0],ny=cy+d[1];
        if(nx<0||ny<0||nx>=GW||ny>=GH||seen[ny*GW+nx]||!ok(nx,ny))continue;
        seen[ny*GW+nx]=1;q.push([nx,ny]);
      }
    }
    for(let i=0;i<op.gates.length;i++){
      const g=op.gates[i],o=op.gateOut[i];
      for(const k of [-1,0,1,2]){
        const [a,b]=toG(op.maskX+g.mx+0.5-o[0]*k,op.maskY+g.my+0.5-o[1]*k);
        if(!seen[b*GW+a])return false;
      }
    }
    let tot=0,reach=0;
    for(const c of op.interiorCells){
      const [a,b]=toG(op.maskX+c.mx+0.5,op.maskY+c.my+0.5);
      if(ok(a,b)){tot++;if(seen[b*GW+a])reach++}
    }
    return tot===0||reach/tot>=0.85;
  };
  for(let it=0;it<14;it++){
    if(check())return;
    let worst=null;
    for(let i=propStart;i<fortProps.length;i++){
      const p=fortProps[i];
      if(!p.alarm&&isInsideMask(op,p.x,p.y)&&(!worst||p.r>worst.r))worst=p;
    }
    if(!worst)return;
    removeFortProp(worst);
  }
}


/* Fase 2: muros, torres, props (usa las puertas y el corredor ya calculados) */
export function fortifyOutpost(op){
  const rng=mulberry32((MAP_SEED^(op.block[0]*73856093)^(op.block[1]*19349663)^(op.tier*99991))>>>0);
  const isHeavy=op.tier===3,isMed=op.tier===2,isLight=op.tier===1;
  const wallType=isHeavy?6:5;
  const wallGateSpr=isHeavy?sGate:sGateLight;

  for(let y=0;y<op.maskH;y++)for(let x=0;x<op.maskW;x++){
    if(op.mask[y*op.maskW+x]){
      const wx=op.maskX+x,wy=op.maskY+y;
      gmap[wy*MW+wx]=6;
    }
  }

  const gates=op.gates;
  const gateKeys=new Set(gates.map(g=>g.my*op.maskW+g.mx));
  const reservedAt=(wx,wy)=>GATE_RES.has(wy*MW+wx);

  for(const cell of op.perimeter){
    const wx=op.maskX+cell.mx,wy=op.maskY+cell.my;
    if(gateKeys.has(cell.my*op.maskW+cell.mx)){
      addFortDeco(wx+0.5,wy+0.5,wallGateSpr,0.7,1.0,0);
    } else {
      let wt=wallType;
      if(isHeavy&&rng()<0.20)wt=7;
      else if(isMed&&rng()<0.15)wt=7;
      map[wy*MW+wx]=wt;
    }
  }
  if(isMed||isHeavy){
    const wireZ=.97,wireWH=isHeavy?0.6:0.5; /* apoyada sobre el muro (antes flotaba) */
    for(const cell of op.perimeter){
      if(gateKeys.has(cell.my*op.maskW+cell.mx))continue;
      const wx=op.maskX+cell.mx,wy=op.maskY+cell.my;
      addFortDeco(wx+0.5,wy+0.5,sWire,wireWH,1.0,wireZ);
    }
  }

  const quads=[
    {qx:-1,qy:-1,best:null,bestD:0},
    {qx:1,qy:-1,best:null,bestD:0},
    {qx:-1,qy:1,best:null,bestD:0},
    {qx:1,qy:1,best:null,bestD:0},
  ];
  /* una torre nunca va en una puerta, ni a menos de 2 celdas de una, ni en un corredor reservado */
  const nearGate=cell=>{for(const g of gates)if(Math.max(Math.abs(g.mx-cell.mx),Math.abs(g.my-cell.my))<=2)return true;return false};
  for(const cell of op.perimeter){
    if(gateKeys.has(cell.my*op.maskW+cell.mx))continue;
    if(nearGate(cell))continue;
    if(reservedAt(op.maskX+cell.mx,op.maskY+cell.my))continue;
    const dx=cell.mx-op.centerMX,dy=cell.my-op.centerMY;
    const qx=dx<0?-1:1,qy=dy<0?-1:1;
    const d=Math.hypot(dx,dy);
    for(const q of quads)if(q.qx===qx&&q.qy===qy&&d>q.bestD){q.best=cell;q.bestD=d}
  }
  const numTowers=isLight?1:isMed?2:4;
  const towerCells=[];
  const availQuads=quads.filter(q=>q.best);
  for(let i=0;i<Math.min(numTowers,availQuads.length);i++){
    const q=availQuads[i];
    const wx=op.maskX+q.best.mx,wy=op.maskY+q.best.my;
    /* la base de la torre es MURO SÓLIDO (sin hueco, sin prop): colisión, visión y balas coinciden con lo que se ve */
    map[wy*MW+wx]=6;
    addFortDeco(wx+0.5,wy+0.5,sTower,3.0,1.4,0);
    towerCells.push({wx,wy});
    fortTowers.push({x:wx+0.5,y:wy+0.5,z:3.4,phase:rng()*6.28,speed:0.5+rng()*0.4,radius:4+rng()*2,dead:false});
  }

  const pickInterior=()=>{
    if(op.interiorCells.length===0)return null;
    return op.interiorCells[Math.floor(rng()*op.interiorCells.length)];
  };
  const placed=new Set();
  const putProp=(spr,ww,wh,count,extraR,minDistFromCenter)=>{
    let n=0,tries=0;
    while(n<count&&tries<count*12){
      tries++;
      const c=pickInterior();if(!c)break;
      const wx=op.maskX+c.mx+0.5,wy=op.maskY+c.my+0.5;
      const key=c.mx+','+c.my;
      if(placed.has(key))continue;
      if(reservedAt(op.maskX+c.mx,op.maskY+c.my))continue;
      if(minDistFromCenter&&Math.hypot(wx-op.x,wy-op.y)<minDistFromCenter)continue;
      placed.add(key);
      addFortProp(wx,wy,extraR||0.4,spr,ww,wh,0);
      n++;
    }
  };
  const propStart=fortProps.length;
  // Tiendas enemigas: 6 variantes al azar, cada puesto con tiendas diferentes
  (()=>{
    const tents=sEnemyTents;
    let n=0,tries=0; const cnt=isLight?1:isMed?2:3; const tentPos=[];
    while(n<cnt&&tries<cnt*40){
      tries++;
      const c=pickInterior(); if(!c) break;
      const wx=op.maskX+c.mx+0.5, wy=op.maskY+c.my+0.5;
      const key=c.mx+','+c.my;
      if(placed.has(key)) continue;
      if(reservedAt(op.maskX+c.mx,op.maskY+c.my)) continue;
      if(Math.hypot(wx-op.x,wy-op.y)<(isMed||isHeavy?3.2:1.8)) continue; /* lejos del búnker central */
      if(tentPos.some(q=>Math.hypot(q[0]-wx,q[1]-wy)<3.4)) continue; /* tiendas bien separadas entre sí */
      placed.add(key);tentPos.push([wx,wy]);
      const spr=tents[Math.floor(rng()*tents.length)];
      // Ajuste tamaño: las nuevas tiendas son 64px ancho vs 30px original, usamos ww 1.6 para que se vean bien
      addFortProp(wx,wy,0.4,spr,1.35*spr.w/spr.h,1.35,0); /* proporción real del sprite: ya no se estiran */
      n++;
    }
  })();
  if(isMed||isHeavy){
    /* búnker central: la celda interior más cercana al centro cuyo entorno 3x3 esté libre de muros y de corredores de puerta */
    let bunkerSpot=null,bunkerD=1e9;
    for(const c of op.interiorCells){
      const bx=op.maskX+c.mx,by=op.maskY+c.my;
      let ok=true;
      for(let dy=-1;dy<=1&&ok;dy++)for(let dx=-1;dx<=1;dx++){
        if(reservedAt(bx+dx,by+dy)||map[(by+dy)*MW+bx+dx]!==0){ok=false;break}
      }
      if(!ok)continue;
      const d=Math.hypot(c.mx-op.centerMX,c.my-op.centerMY);
      if(d<bunkerD){bunkerD=d;bunkerSpot={x:bx+0.5,y:by+0.5,key:c.mx+','+c.my}}
    }
    if(bunkerSpot){addFortProp(bunkerSpot.x,bunkerSpot.y,0.75,sBunker,1.8,1.35,0);placed.add(bunkerSpot.key)}
    putProp(sBagWall,0.9,0.5,isMed?1:3,0.4,2.0);
    putProp(rng()<0.5?sCar:sCar2,1.35,0.85,1,0.55,2.5);
    putProp(sGenerator,0.85,0.85,1,0.45,2.0);
    putProp(sAntenna,0.55,1.2,1,0.35,2.5);
    putProp(sMapTable,1.0,0.75,1,0.4,2.0);
  }
  if(isHeavy){
    putProp(sCrate,0.7,0.65,3,0.4,2.0);
    putProp(sMil,0.7,0.7,1,0.4,2.0);
    putProp(sFuelBarrel,0.6,0.7,2,0.35,2.5);
  }

  const numHedge=isLight?2:isMed?4:6;
  for(let i=0;i<numHedge;i++){
    const cell=op.perimeter[Math.floor(rng()*op.perimeter.length)];if(!cell)continue;
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    const dir=dirs[Math.floor(rng()*4)];
    const hx=op.maskX+cell.mx+dir[0]*2;
    const hy=op.maskY+cell.my+dir[1]*2;
    if(hx<2||hy<2||hx>=MW-2||hy>=MH-2)continue;
    if(map[hy*MW+hx]!==0)continue;
    if(reservedAt(hx,hy))continue;
    addFortProp(hx+0.5,hy+0.5,0.4,sCzech,0.95,0.9,-.1);
  }
  const extraHedge=isLight?6:isMed?9:12;
  let hPlaced=0,hTries=0;
  while(hPlaced<extraHedge&&hTries<80){
    hTries++;
    const a=rng()*6.28,r=4+rng()*9;
    const hx=Math.floor(op.x+Math.cos(a)*r),hy=Math.floor(op.y+Math.sin(a)*r);
    if(hx<2||hy<2||hx>=MW-2||hy>=MH-2)continue;
    if(map[hy*MW+hx]!==0)continue;
    const g=gmap[hy*MW+hx];if(g>3)continue;
    if(reservedAt(hx,hy))continue;
    let tooClose=false;
    for(const fp of fortProps)if(Math.hypot(fp.x-(hx+0.5),fp.y-(hy+0.5))<1.5){tooClose=true;break}
    if(tooClose)continue;
    addFortProp(hx+0.5,hy+0.5,0.4,sCzech,0.95,0.9,-.1);
    hPlaced++;
  }
  if(op.tier<3){
    let best=null;
    for(const minD of [2,1,0]){
      let bd=1e9;
      for(const c of op.interiorCells){
        const bx=op.maskX+c.mx,by=op.maskY+c.my;
        if(placed.has(c.mx+','+c.my)||reservedAt(bx,by)||map[by*MW+bx]!==0)continue;
        let ok=true;
        for(const d of [[1,0],[-1,0],[0,1],[0,-1]])if(map[(by+d[1])*MW+bx+d[0]]!==0){ok=false;break}
        if(!ok)continue;
        const dc=Math.hypot(c.mx-op.centerMX,c.my-op.centerMY);
        if(dc<minD)continue;
        let clash=false;
        for(const fp of fortProps)if(Math.hypot(fp.x-(bx+.5),fp.y-(by+.5))<1.2){clash=true;break}
        if(clash)continue;
        if(dc<bd){bd=dc;best={x:bx+.5,y:by+.5,key:c.mx+','+c.my}}
      }
      if(best)break;
    }
    if(best){
      const pr=addFortProp(best.x,best.y,0.4,sAlarm,0.7,1.5,0);pr.alarm=true;
      placed.add(best.key);
      const al={x:best.x,y:best.y,op,prop:pr,deco:pr.deco,wh0:1.5,ww0:0.7,hp:ALARM_HP,alive:true,activated:false,spent:false,callT:0};
      ALARMS.push(al);op.alarm=al;
    }
  }
  ensureOutpostAccess(op,propStart);
  for(const tc of towerCells){
    const wx=tc.wx,wy=tc.wy;
    for(const[dx,dy]of[[1,1],[1,-1],[-1,1],[-1,-1]]){
      const lx=wx+dx,ly=wy+dy;
      if(lx>0&&ly>0&&lx<MW-1&&ly<MH-1&&!isWall(lx,ly)&&!reservedAt(lx,ly)){
        addFortDeco(lx+0.5,ly+0.5,sLamp,2.5,1.25,0);
        break;
      }
    }
  }
}


export const BEACON={x:0,y:0};

export function updateBeacon(){
  const L=MAP_LAYOUT;
  const[x0,y0,x1,y1]=getBlockBounds(L.EXTRACTION_BLOCK[0],L.EXTRACTION_BLOCK[1]);
  BEACON.x=(x0+x1)/2+0.5;BEACON.y=(y0+y1)/2+0.5;
}


export const solidProps=[];

export const walkmap=new Uint8Array(MW*MH);
export const STREET_DECOS=[];

export function addSolidProp(x,y,r){solidProps.push({x,y,r:r||.35})}

export const pblk=new Uint8Array(MW*MH),propGrid=new Array(MW*MH).fill(null);

export function rebuildPropGrid(){
  propGrid.fill(null);pblk.fill(0);
  for(const p of solidProps){
    const x0=Math.max(0,Math.floor(p.x-p.r)),x1=Math.min(MW-1,Math.floor(p.x+p.r));
    const y0=Math.max(0,Math.floor(p.y-p.r)),y1=Math.min(MH-1,Math.floor(p.y+p.r));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const i=y*MW+x;(propGrid[i]||(propGrid[i]=[])).push(p);
    }
    pblk[(p.y|0)*MW+(p.x|0)]=1;
  }
}

export function propBlocksAt(x,y){
  const ix=x|0,iy=y|0;
  if(ix<0||iy<0||ix>=MW||iy>=MH)return false;
  const l=propGrid[iy*MW+ix];if(!l)return false;
  for(const p of l){const dx=x-p.x,dy=y-p.y;if(dx*dx+dy*dy<p.r*p.r)return true}
  return false;
}

export function canStandProp(x,y,r){if(!canStand(x,y,r))return false;return !propBlocksAt(x,y)}

/* setters para variables reasignadas desde otros módulos */
export function set_PRE_FORT_MAP(v){return PRE_FORT_MAP=v}
