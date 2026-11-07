import { $, MH, MW, OUTPOSTS, SAFE_BOXES, gmap, map } from './core.js';
import { ALARMS, BEACON } from './outposts.js';
import { P, allies, bigMapTransform, enemies, gt, mapMarkers, revealedOutposts, set_bigMapTransform, set_fireHeld, state } from './state.js';
import { SFX } from './audio.js';
import { DEF_R, conquestOn, rebuildTerritoryCanvas, terrCanvas, terrDirty } from './conquest.js';
import { findPath } from './pathfinding.js';
import { joyBase, set_joyId, set_joyOn, set_lookId } from './input.js';
import { hexA, rr } from './render.js';
import { EC } from './hud.js';


/* ===== NUEVO: MISIONES AMPLIADO ===== */
export function resizeBigMapCanvas(){
 const canvas=$('bigMapCanvas');
 if(!canvas)return false;
 const rect=canvas.getBoundingClientRect();
 if(rect.width<10||rect.height<10)return false;
 const dpr=Math.min(window.devicePixelRatio||1,2);
 const W=Math.floor(rect.width*dpr);
 const H=Math.floor(rect.height*dpr);
 if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
 return true;
}

/* ===== ZOOM / DESPLAZAMIENTO DEL MAPA GRANDE (estilo Google Maps) ===== */
const view={zoom:1,cx:MW/2,cy:MH/2};
const MAX_ZOOM=12;
let drawQueued=false;
export function requestBigMapDraw(){
 if(drawQueued)return;
 drawQueued=true;
 requestAnimationFrame(()=>{drawQueued=false;drawBigMap()});
}
function baseScale(canvas){return Math.min(canvas.width/MW,canvas.height/MH)}
function clampView(canvas){
 const s=baseScale(canvas)*view.zoom;
 const vw=canvas.width/s,vh=canvas.height/s;
 view.cx=vw>=MW?MW/2:Math.max(vw/2,Math.min(MW-vw/2,view.cx));
 view.cy=vh>=MH?MH/2:Math.max(vh/2,Math.min(MH-vh/2,view.cy));
}
export function resetBigMapView(){view.zoom=1;view.cx=MW/2;view.cy=MH/2}
// factor de zoom alrededor de un punto del canvas (px del canvas)
function zoomAt(canvas,factor,fx,fy){
 const old=baseScale(canvas)*view.zoom;
 const mx=view.cx+(fx-canvas.width/2)/old,my=view.cy+(fy-canvas.height/2)/old;
 view.zoom=Math.max(1,Math.min(MAX_ZOOM,view.zoom*factor));
 const ns=baseScale(canvas)*view.zoom;
 view.cx=mx-(fx-canvas.width/2)/ns;view.cy=my-(fy-canvas.height/2)/ns;
 clampView(canvas);requestBigMapDraw();
}
// Los nombres se desvanecen al acercar: visibles a zoom 1, invisibles desde ~2.2x
function labelAlpha(){return Math.max(0,Math.min(1,1-(view.zoom-1)/1.2))}

export function initBigMapControls(){
 const canvas=$('bigMapCanvas');
 if(!canvas||canvas._zoomInit)return;
 canvas._zoomInit=true;
 const ptrs=new Map();
 let tap=null,pinchD=0;
 const toCanvas=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}};
 canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();
  try{canvas.setPointerCapture(e.pointerId)}catch(_){}
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===1)tap={x:e.clientX,y:e.clientY,moved:false};
  else{if(tap)tap.moved=true;const [a,b]=[...ptrs.values()];pinchD=Math.hypot(a.x-b.x,a.y-b.y)}
 });
 canvas.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId))return;
  const prev=ptrs.get(e.pointerId);
  const r=canvas.getBoundingClientRect(),k=canvas.width/r.width;
  if(ptrs.size>=2){
   const before=[...ptrs.values()];
   const mid0={x:(before[0].x+before[1].x)/2,y:(before[0].y+before[1].y)/2};
   ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
   const [a,b]=[...ptrs.values()];
   const d=Math.hypot(a.x-b.x,a.y-b.y),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   const sc=baseScale(canvas)*view.zoom;
   view.cx-=(mid.x-mid0.x)*k/sc;view.cy-=(mid.y-mid0.y)*k/sc; // arrastre con dos dedos
   if(pinchD>0&&d>0)zoomAt(canvas,d/pinchD,(mid.x-r.left)*k,(mid.y-r.top)*k);
   else{clampView(canvas);requestBigMapDraw()}
   pinchD=d;
   return;
  }
  const dx=e.clientX-prev.x,dy=e.clientY-prev.y;
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(tap&&!tap.moved&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8)tap.moved=true;
  if(tap&&tap.moved){
   const sc=baseScale(canvas)*view.zoom;
   view.cx-=dx*k/sc;view.cy-=dy*k/sc;
   clampView(canvas);requestBigMapDraw();
  }
 });
 const end=(e,cancel)=>{
  if(!ptrs.has(e.pointerId))return;
  ptrs.delete(e.pointerId);
  try{canvas.releasePointerCapture(e.pointerId)}catch(_){}
  if(ptrs.size===0){
   const t=tap;tap=null;pinchD=0;
   if(!cancel&&t&&!t.moved)handleBigMapClick(e); // toque simple = marcar / quitar marca
  }else if(ptrs.size===1){pinchD=0;if(tap)tap.moved=true}
 };
 canvas.addEventListener('pointerup',e=>end(e,false));
 canvas.addEventListener('pointercancel',e=>end(e,true));
 canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  const p=toCanvas(e);
  zoomAt(canvas,Math.exp(-e.deltaY*0.0016),p.x,p.y);
 },{passive:false});
 const bind=(id,fn)=>{const b=$(id);if(b)b.addEventListener('click',ev=>{ev.preventDefault();fn();SFX.ui()})};
 bind('bigMapZoomIn',()=>zoomAt(canvas,1.6,canvas.width/2,canvas.height/2));
 bind('bigMapZoomOut',()=>zoomAt(canvas,1/1.6,canvas.width/2,canvas.height/2));
 bind('bigMapCenter',()=>{view.zoom=Math.max(view.zoom,3);view.cx=P.x;view.cy=P.y;clampView(canvas);requestBigMapDraw()});
 bind('bigMapFit',()=>{resetBigMapView();requestBigMapDraw()});
}

export function openBigMap(){
 if(state!=='play')return;
 const overlay=$('bigMapOverlay');
 if(!overlay)return;
 overlay.classList.add('on');
 resetBigMapView();
 set_fireHeld(false);set_joyOn(false);set_joyId(null);set_lookId(null);
 if(joyBase)joyBase.style.display='none';
 for(const m of mapMarkers){m.path=findPath(P.x,P.y,m.x,m.y)}
 requestAnimationFrame(()=>{resizeBigMapCanvas();drawBigMap()});
}

export function closeBigMap(){
 const overlay=$('bigMapOverlay');
 if(!overlay)return;
 overlay.classList.remove('on');
}

export function drawBigMap(){
 const canvas=$('bigMapCanvas');
 if(!canvas||canvas.width<10||canvas.height<10)return;
 const ctx=canvas.getContext('2d');
 ctx.imageSmoothingEnabled=false;
 const W=canvas.width,H=canvas.height;
 const dpr=Math.min(window.devicePixelRatio||1,2);
 clampView(canvas);
 const scale=baseScale(canvas)*view.zoom;
 const offsetX=W/2-view.cx*scale;
 const offsetY=H/2-view.cy*scale;
 set_bigMapTransform({scale,offsetX,offsetY,dpr});
 const labelA=labelAlpha();
 const inView=(x0,y0,x1,y1)=>offsetX+x1*scale>=0&&offsetX+x0*scale<=W&&offsetY+y1*scale>=0&&offsetY+y0*scale<=H;
 // Fondo
 ctx.fillStyle='#080808';
 ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#0d0d0d';
 ctx.fillRect(offsetX,offsetY,MW*scale,MH*scale);
 // Terreno
 const cw=Math.ceil(scale),chh=Math.ceil(scale);
 const tx0=Math.max(0,Math.floor(-offsetX/scale)),tx1=Math.min(MW-1,Math.ceil((W-offsetX)/scale));
 const ty0=Math.max(0,Math.floor(-offsetY/scale)),ty1=Math.min(MH-1,Math.ceil((H-offsetY)/scale));
 for(let y=ty0;y<=ty1;y++){
  for(let x=tx0;x<=tx1;x++){
   const wall=map[y*MW+x];
   const g=gmap[y*MW+x];
   let color;
   if(wall)color='#2a2a2e';
   else if(g===1)color='#5a5a62';
   else if(g===2)color='#2e4a26';
   else if(g===3)color='#5a4622';
   else if(g===4)color='#4a4a52';
   else if(g===5)color='#4a4a52';
   else if(g===6)color='#555049';
   else color='#1a1a1a';
   ctx.fillStyle=color;
   ctx.fillRect(offsetX+x*scale,offsetY+y*scale,cw,chh);
  }
 }
 // Territorios del modo conquista (contornos verde / amarillo / rojo)
 if(conquestOn){if(terrDirty)rebuildTerritoryCanvas();ctx.imageSmoothingEnabled=false;ctx.drawImage(terrCanvas,offsetX,offsetY,MW*scale,MH*scale);
  for(const o of OUTPOSTS)if(o.terr==='disputed'){ctx.strokeStyle='#ffd23a';ctx.lineWidth=Math.max(2,2*dpr);ctx.setLineDash([6,4]);ctx.beginPath();ctx.arc(offsetX+o.x*scale,offsetY+o.y*scale,DEF_R*scale,0,6.2832);ctx.stroke();ctx.setLineDash([])}}
 // Puestos (con relleno de máscara)
 for(const op of OUTPOSTS){
  let color,fillColor;
  if(op.taken){color='#7dff8f';fillColor='rgba(125,255,143,0.35)'}
  else if(op.alertState==='ALARM'){color='#ff2020';fillColor='rgba(255,40,40,0.5)'}
  else if(op.alertState==='ALERT'){color='#ffd24a';fillColor='rgba(255,210,74,0.4)'}
  else if(op.tier===3){color='#ff3a3a';fillColor='rgba(255,70,70,0.4)'}
  else if(op.tier===2){color='#ffb040';fillColor='rgba(255,170,64,0.35)'}
  else{color='#9fd8ff';fillColor='rgba(140,200,255,0.3)'}
  if(op.mask&&inView(op.maskX,op.maskY,op.maskX+op.maskW,op.maskY+op.maskH)){
   ctx.fillStyle=fillColor;
   for(let my=0;my<op.maskH;my++)for(let mx=0;mx<op.maskW;mx++){
    if(op.mask[my*op.maskW+mx])ctx.fillRect(offsetX+(op.maskX+mx)*scale,offsetY+(op.maskY+my)*scale,cw,chh);
   }
   ctx.fillStyle=color;
   for(const cell of op.perimeter)ctx.fillRect(offsetX+(op.maskX+cell.mx)*scale,offsetY+(op.maskY+cell.my)*scale,cw,chh);
  }
 }
 // Cajas fuertes
 for(const box of SAFE_BOXES){
  if(box.opened)continue;
  const s=Math.max(4,4*dpr);
  ctx.fillStyle='#d6a343';
  ctx.fillRect(offsetX+box.x*scale-s/2,offsetY+box.y*scale-s/2,s,s);
  ctx.strokeStyle='#000';ctx.lineWidth=1;
  ctx.strokeRect(offsetX+box.x*scale-s/2,offsetY+box.y*scale-s/2,s,s);
 }
 for(const al of ALARMS){
  if(!al.alive||(al.x-P.x)**2+(al.y-P.y)**2>2025)continue;
  const s=Math.max(5,5.5*dpr),ax=offsetX+al.x*scale,ay=offsetY+al.y*scale;
  ctx.fillStyle=(al.activated&&((gt*4)|0)%2)?'#ffffff':'#ff3a3a';
  ctx.beginPath();ctx.moveTo(ax,ay-s);ctx.lineTo(ax+s,ay+s*.8);ctx.lineTo(ax-s,ay+s*.8);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#000';ctx.lineWidth=1.2;ctx.stroke();
 }
 // Extracción (baliza verde)
 {
  const s=Math.max(6,7*dpr);
  const bx=offsetX+BEACON.x*scale,by=offsetY+BEACON.y*scale;
  ctx.fillStyle='#44ff88';
  ctx.fillRect(bx-s/2,by-s/2,s,s);
  ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1.5,1.5*dpr);
  ctx.strokeRect(bx-s/2,by-s/2,s,s);
 }
 // Enemigos
 for(const e of enemies){
  if(!e.alive)continue;
  const isNear=(e.x-P.x)**2+(e.y-P.y)**2<1600;
  const op=e.outpost;
  const show=isNear||(op&&(op.taken||revealedOutposts.has(op.id)||op.alertState==='ALARM'||op.alertState==='ALERT'))||(e.reinf&&!e.arrived);
  if(!show)continue;
  ctx.fillStyle=EC[e.type]||'#f33';
  const sz=e.boss?Math.max(4,5*dpr):Math.max(3,3.5*dpr);
  if(e.reinf&&!e.arrived){
   const rs=Math.max(5,6*dpr);
   ctx.fillStyle='#ff8a2a';ctx.fillRect(offsetX+e.x*scale-rs/2,offsetY+e.y*scale-rs/2,rs,rs);
   ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1.5,1.5*dpr);ctx.strokeRect(offsetX+e.x*scale-rs/2,offsetY+e.y*scale-rs/2,rs,rs);
  } else ctx.fillRect(offsetX+e.x*scale-sz/2,offsetY+e.y*scale-sz/2,sz,sz);
 }
 // Aliados
 for(const a of allies){
  if(!a.alive)continue;
  ctx.fillStyle=a.following?'#5bd8ff':'#9cf';
  const sz=Math.max(3,4*dpr);
  ctx.fillRect(offsetX+a.x*scale-sz/2,offsetY+a.y*scale-sz/2,sz,sz);
 }
 // Rutas (marcas)
 for(const m of mapMarkers){
  if(!m.path||m.path.length<2)continue;
  ctx.strokeStyle='rgba(255,220,80,0.9)';
  ctx.lineWidth=Math.max(2,2.5*dpr);
  ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(offsetX+(m.path[0][0]+0.5)*scale,offsetY+(m.path[0][1]+0.5)*scale);
  for(let i=1;i<m.path.length;i++)ctx.lineTo(offsetX+(m.path[i][0]+0.5)*scale,offsetY+(m.path[i][1]+0.5)*scale);
  ctx.stroke();
 }
 // Nombres de puestos: etiqueta con fondo sobre el perímetro + línea guía
 // (se desvanecen al hacer zoom para no tapar el mapa)
 if(labelA>0.03){
 ctx.globalAlpha=labelA;
 for(const op of OUTPOSTS){
  let color;
  if(op.taken)color='#7dff8f';
  else if(op.alertState==='ALARM')color='#ff4040';
  else if(op.alertState==='ALERT')color='#ffd24a';
  else if(op.tier===3)color='#ff5a5a';
  else if(op.tier===2)color='#ffb040';
  else color='#b8e0ff';
  const fontSize=Math.max(11,Math.min(19,baseScale(canvas)*1.9))*dpr;
  ctx.font='bold '+fontSize+'px "Courier New", monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  const tw=ctx.measureText(op.name).width;
  const padX=8*dpr,padY=4*dpr,badgeH=fontSize+padY*2;
  const mapL=offsetX,mapR=offsetX+MW*scale,mapT=offsetY;
  const opTop=offsetY+op.maskY*scale,opBottom=offsetY+(op.maskY+op.maskH)*scale;
  let bx=offsetX+op.x*scale;
  let badgeBottom=opTop-5*dpr;
  if(badgeBottom-badgeH<mapT+2)badgeBottom=opBottom+5*dpr+badgeH;
  bx=Math.max(mapL+2+tw/2+padX,Math.min(mapR-2-tw/2-padX,bx));
  const by=badgeBottom-badgeH;
  // línea guía punteada hacia el fuerte
  const anchorX=offsetX+op.x*scale;
  const above=badgeBottom<=opTop;
  ctx.strokeStyle=hexA(color,0.6);ctx.lineWidth=1.5*dpr;
  ctx.setLineDash([4*dpr,3*dpr]);
  ctx.beginPath();
  if(above){ctx.moveTo(bx,badgeBottom);ctx.lineTo(anchorX,opTop)}
  else{ctx.moveTo(bx,by);ctx.lineTo(anchorX,opBottom)}
  ctx.stroke();
  ctx.setLineDash([]);
  // badge
  ctx.fillStyle='rgba(5,6,10,0.9)';
  rr(ctx,bx-tw/2-padX,by,tw+padX*2,badgeH,5*dpr);ctx.fill();
  ctx.strokeStyle=hexA(color,0.95);ctx.lineWidth=1.5*dpr;
  rr(ctx,bx-tw/2-padX,by,tw+padX*2,badgeH,5*dpr);ctx.stroke();
  ctx.fillStyle=color;
  ctx.fillText(op.name,bx,by+badgeH/2+0.5*dpr);
  // puntito en el ancla
  ctx.fillStyle=hexA(color,0.9);
  ctx.beginPath();ctx.arc(anchorX,above?opTop:opBottom,2.5*dpr,0,Math.PI*2);ctx.fill();
 }
 ctx.globalAlpha=1;
 }
 // Marcas
 for(const m of mapMarkers){
  const mx=offsetX+m.x*scale,my=offsetY+m.y*scale;
  const r=Math.max(7,8*dpr);
  ctx.fillStyle='#ffd24a';
  ctx.beginPath();ctx.arc(mx,my,r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#000';ctx.lineWidth=Math.max(1.5,2*dpr);ctx.stroke();
  const hs=r*0.45;
  ctx.beginPath();
  ctx.moveTo(mx-hs,my-hs);ctx.lineTo(mx+hs,my+hs);
  ctx.moveTo(mx+hs,my-hs);ctx.lineTo(mx-hs,my+hs);
  ctx.stroke();
 }
 // Jugador
 {
  const px=offsetX+P.x*scale,py=offsetY+P.y*scale;
  ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(2,2.5*dpr);
  ctx.beginPath();ctx.moveTo(px,py);
  const dl=Math.min(scale*2.5,22*dpr);ctx.lineTo(px+Math.cos(P.a)*dl,py+Math.sin(P.a)*dl);
  ctx.stroke();
  const ps=Math.max(4,5*dpr);
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.arc(px,py,ps,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#000';ctx.lineWidth=1.5;ctx.stroke();
 }
}

export function handleBigMapClick(e){
 if(!bigMapTransform)return;
 const canvas=$('bigMapCanvas');
 const rect=canvas.getBoundingClientRect();
 const dprX=canvas.width/rect.width;
 const dprY=canvas.height/rect.height;
 let cx,cy;
 if(e.touches&&e.touches[0]){cx=(e.touches[0].clientX-rect.left)*dprX;cy=(e.touches[0].clientY-rect.top)*dprY}
 else{cx=(e.clientX-rect.left)*dprX;cy=(e.clientY-rect.top)*dprY}
 const t=bigMapTransform;
 const mapX=(cx-t.offsetX)/t.scale;
 const mapY=(cy-t.offsetY)/t.scale;
 if(mapX<0||mapY<0||mapX>=MW||mapY>=MH)return;
 const hitR=14/t.scale;
 for(let i=mapMarkers.length-1;i>=0;i--){
  const m=mapMarkers[i];
  if(Math.hypot(m.x-mapX,m.y-mapY)<hitR){
   mapMarkers.splice(i,1);
   drawBigMap();
   SFX.ui();
   return;
  }
 }
 const path=findPath(P.x,P.y,mapX,mapY);
 mapMarkers.push({x:mapX,y:mapY,path});
 if(mapMarkers.length>6)mapMarkers.shift();
 drawBigMap();
 SFX.ui();
 if(navigator.vibrate)navigator.vibrate(15);
}
