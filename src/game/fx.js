/* Efectos visuales: piso mojado (nivel de humedad), viñeta, bloom y gradación de color */
import { PL, RH, RW, canvas, ctx, projDist } from './backdrop.js';
import { P, projs } from './state.js';
import { gmap, map, MW, MH, TEX } from './core.js';

/* ---- humedad del piso: sube rápido con lluvia y se seca despacio ---- */
export let wet=0;
let lastT=0;
export function updWet(rain){
  const n=performance.now(),dt=Math.min(.1,(n-lastT)/1000||0);lastT=n;
  wet=rain?Math.min(1,wet+dt*.25):Math.max(0,wet-dt*.04);
  return wet}

/* ---- viñeta (se regenera solo al cambiar el tamaño) ---- */
let vig=null,vw=0,vh=0;
function buildVig(W,H,night){
  vig=document.createElement('canvas');vig.width=W;vig.height=H;vw=W;vh=H;
  const g=vig.getContext('2d'),r=Math.hypot(W,H)/2,
        gr=g.createRadialGradient(W/2,H/2,r*.45,W/2,H/2,r*.98);
  gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,night?'rgba(0,0,10,.45)':'rgba(0,0,0,.32)');
  g.fillStyle=gr;g.fillRect(0,0,W,H);vig._n=night}

/* ---- bloom: se reduce la imagen, se filtran los brillos y se vuelve a sumar ampliada (suave por interpolación) ---- */
let bc=null,bx=null,bimg=null,frame=0,bw=0,bh=0;
function bloom(W,H,night,gain){
  if(!bc||bw!==Math.max(8,W>>3)||bh!==Math.max(8,H>>3)){
    bw=Math.max(8,W>>3);bh=Math.max(8,H>>3);
    bc=document.createElement('canvas');bc.width=bw;bc.height=bh;
    bx=bc.getContext('2d',{willReadFrequently:true});bimg=null}
  if((frame++&1)===0){
    bx.imageSmoothingEnabled=true;bx.drawImage(canvas,0,0,bw,bh);
    bimg=bx.getImageData(0,0,bw,bh);const d=bimg.data,th=night?185:200,k=1;
    for(let i=0;i<d.length;i+=4){
      const l=(d[i]*.3+d[i+1]*.59+d[i+2]*.11);
      if(l<=th){d[i]=d[i+1]=d[i+2]=0;continue}
      const m=(l-th)/(255-th)*k;
      d[i]=Math.min(255,d[i]*m);d[i+1]=Math.min(255,d[i+1]*m);d[i+2]=Math.min(255,d[i+2]*m)}
    bx.putImageData(bimg,0,0)}
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=gain;
  ctx.imageSmoothingEnabled=true;ctx.drawImage(bc,0,0,W,H);ctx.restore()}

/* ---------- proyección simple mundo -> pantalla (zh: altura sobre el suelo, 0 = suelo) ---------- */
function proj(wx,wy,zh){
  const dx=Math.cos(P.a),dy=Math.sin(P.a),px=-dy*PL,py=dx*PL,sx=wx-P.x,sy=wy-P.y,inv=1/(px*dy-dx*py),
        tX=inv*(dy*sx-dx*sy),tY=inv*(-py*sx+px*sy);
  if(tY<.3)return null;
  return {x:(RW/2)*(1+tX/tY),y:RH/2+(.5-zh)*(projDist/tY),sc:projDist/tY,tY}}
const vis=(p,zb)=>p.x>=0&&p.x<RW&&p.tY<zb[p.x|0];

/* ---------- balas trazadoras de los enemigos: estela fina amarilla, sin sprite cuadrado ---------- */
function drawTracers(zb,q){
  if(!projs.length)return;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  for(const p of projs){
    const sp=Math.hypot(p.vx,p.vy);if(sp<.01)continue;
    const L=Math.min(p.small?.9:1.7,sp*.075),h=proj(p.x,p.y,.38);if(!h||!vis(h,zb))continue;
    let tx=p.x-p.vx/sp*L,ty=p.y-p.vy/sp*L,t=proj(tx,ty,.38);
    if(!t){ /* cola detrás de la cámara: se acorta hasta el plano de visión */
      let a=0,b=1;for(let i=0;i<6;i++){const m=(a+b)/2;proj(p.x+(tx-p.x)*m,p.y+(ty-p.y)*m,.38)?a=m:b=m}
      t=proj(p.x+(tx-p.x)*a,p.y+(ty-p.y)*a,.38);if(!t)continue}
    const fade=Math.max(.35,1-h.tY/45),big=p.big?1.5:p.small?.7:1;
    if(q>=1){ctx.strokeStyle='rgba(255,150,30,'+(.28*fade).toFixed(3)+')';ctx.lineWidth=2.2*big;
      ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(h.x,h.y);ctx.stroke()}
    const g=ctx.createLinearGradient(t.x,t.y,h.x,h.y);
    g.addColorStop(0,'rgba(255,190,60,0)');g.addColorStop(.6,'rgba(255,215,90,'+(.8*fade).toFixed(3)+')');g.addColorStop(1,'rgba(255,250,215,'+fade.toFixed(3)+')');
    ctx.strokeStyle=g;ctx.lineWidth=Math.max(.8,big);
    ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(h.x,h.y);ctx.stroke()}
  ctx.restore()}

/* ---------- explosiones: bola de fuego, onda de choque, chispas y humo ---------- */
const blasts=[];
export function addBlast(x,y,size){
  if(blasts.length>6)blasts.shift();
  const sp=[],sm=[];
  for(let i=0;i<14;i++){const a=Math.random()*6.283,v=.6+Math.random()*1.4;sp.push({a,v,u:.5+Math.random()*1.2})}
  for(let i=0;i<7;i++)sm.push({ox:(Math.random()-.5)*.9,oy:(Math.random()-.5)*.4,r:.35+Math.random()*.35,d:Math.random()*.25,up:.5+Math.random()*.6});
  blasts.push({x,y,size:size||2,t0:performance.now(),sp,sm})}
const BL=2.4;
function drawBlasts(zb){
  const now=performance.now();
  for(let i=blasts.length-1;i>=0;i--){
    const b=blasts[i],t=(now-b.t0)/1000;if(t>BL){blasts.splice(i,1);continue}
    const p=proj(b.x,b.y,.3);if(!p||!vis(p,zb))continue;
    const R=p.sc*b.size;
    /* humo (detrás del fuego) */
    for(const s of b.sm){const tt=t-s.d;if(tt<=0)continue;const k=tt/(BL-s.d),a=.5*(1-k)*Math.min(1,tt*4);if(a<=.01)continue;
      const cx=p.x+s.ox*R,cy=p.y+s.oy*R*.3-s.up*R*k*.9,r=R*s.r*(.5+k*1.1),g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
      g.addColorStop(0,'rgba(60,56,52,'+a.toFixed(3)+')');g.addColorStop(1,'rgba(40,40,40,0)');
      ctx.fillStyle=g;ctx.fillRect(cx-r,cy-r,r*2,r*2)}
    ctx.save();ctx.globalCompositeOperation='lighter';
    /* bola de fuego */
    if(t<.7){const k=t/.7,r=R*(.35+.55*Math.sqrt(k)),a=(1-k)*(1-k),cx=p.x,cy=p.y-R*.15*k,g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
      g.addColorStop(0,'rgba(255,245,200,'+(a*.9).toFixed(3)+')');g.addColorStop(.35,'rgba(255,170,60,'+(a*.7).toFixed(3)+')');g.addColorStop(1,'rgba(180,40,0,0)');
      ctx.fillStyle=g;ctx.fillRect(cx-r,cy-r,r*2,r*2)}
    /* onda de choque en el suelo */
    if(t<.6){const k=t/.6,gp=proj(b.x,b.y,0);if(gp){const rx=gp.sc*b.size*1.7*Math.sqrt(k);
      ctx.strokeStyle='rgba(255,225,180,'+((1-k)*.35).toFixed(3)+')';ctx.lineWidth=Math.max(1,2*(1-k));
      ctx.beginPath();ctx.ellipse(gp.x,gp.y,rx,rx*.22,0,0,6.283);ctx.stroke()}}
    /* chispas */
    if(t<.9){ctx.strokeStyle='rgba(255,200,90,'+(1-t/.9).toFixed(3)+')';ctx.lineWidth=1;ctx.beginPath();
      for(const s of b.sp){const d=s.v*t*R*.9,hx=p.x+Math.cos(s.a)*d,hy=p.y-s.u*t*R*.9+t*t*R*1.6+Math.sin(s.a)*d*.18;
        ctx.moveTo(hx,hy);ctx.lineTo(hx-Math.cos(s.a)*2,hy+1.5)}ctx.stroke()}
    ctx.restore()}}

/* ---------- salpicaduras de lluvia en el piso ---------- */
const splash=[];

/* Casquillos expulsados: física visual breve, sin colisiones ni impacto en la jugabilidad. */
const casings=[];
export function addCasing(x,y,dx,dy){
  if(casings.length>=84)casings.shift();
  const side=(Math.random()<.5?-1:1),speed=1.1+Math.random()*1.1;
  casings.push({x,y,vx:dx*.35-dy*side*speed,vy:dy*.35+dx*side*speed,z:.12,vz:1.7+Math.random()*.8,spin:Math.random()*6.28,dir:side,t0:performance.now(),life:2.25});
}
function drawCasings(zb,q){
  if(!casings.length)return;
  const now=performance.now(),limit=q>=3?84:q>=2?58:q>=1?34:14;
  ctx.save();ctx.lineCap='square';
  for(let i=casings.length-1;i>=0;i--){
    const c=casings[i],t=(now-c.t0)/1000;if(t>c.life||i>=limit){if(t>c.life)casings.splice(i,1);continue}
    const x=c.x+c.vx*t,y=c.y+c.vy*t,z=Math.max(0,c.z+c.vz*t-4.9*t*t);
    const p=proj(x,y,z);if(!p||!vis(p,zb))continue;const sx=p.x|0,sy=p.y|0;if(sx<0||sx>=RW||p.tY>=zb[sx])continue;
    const fade=Math.min(1,(c.life-t)*2.5),sz=Math.max(1,Math.min(3,p.sc*.018));
    if(z>.04){ctx.fillStyle='rgba(15,13,10,'+(fade*.32).toFixed(3)+')';ctx.fillRect(sx+1,sy+sz,sz+1,1)}
    ctx.fillStyle='rgba(190,145,70,'+(fade*.9).toFixed(3)+')';ctx.save();ctx.translate(sx,sy);ctx.rotate(c.spin+t*9*c.dir);ctx.fillRect(-sz,-1,sz*2.4,Math.max(1,sz*.8));ctx.fillStyle='rgba(245,205,125,'+(fade*.75).toFixed(3)+')';ctx.fillRect(-sz,-1,Math.max(1,sz*.7),1);ctx.restore();
  }
  ctx.restore();
}

/* Impactos breves en muros: metal = chispas, madera = astillas, mampostería = polvo. */
const impacts=[];
function drawImpacts(zb,q){
  const now=performance.now(),cap=q>=3?40:q>=2?30:14;ctx.save();ctx.lineCap='square';
  for(let i=impacts.length-1;i>=0;i--){const v=impacts[i],t=(now-v.t0)/1000;if(t>.22){impacts.splice(i,1);continue}if(i>=cap)continue;
    const p=proj(v.x,v.y,.12);if(!p||!vis(p,zb))continue;const a=1-t/.22,s=Math.max(1,Math.min(3,p.sc*.012));
    if(v.kind==='metal'){ctx.strokeStyle='rgba(255,205,105,'+(a*.9).toFixed(3)+')';ctx.lineWidth=1;ctx.beginPath();for(let k=0;k<3;k++){const an=v.seed+k*2.094,d=(1+t*8)*s;ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.cos(an)*d,p.y+Math.sin(an)*d)}ctx.stroke()}
    else{ctx.fillStyle=(v.kind==='wood'?'rgba(190,145,85,':'rgba(155,155,145,')+(a*.65).toFixed(3)+')';for(let k=0;k<3;k++){const an=v.seed+k*2.094,d=(1+t*6)*s;ctx.fillRect(p.x+Math.cos(an)*d,p.y+Math.sin(an)*d,1,1)}}
  }ctx.restore();
}

function drawSplash(zb,q,rainy){
  const now=performance.now();
  if(rainy&&wet>.3){const n=q>=3?6:q>=2?4:q>=1?3:1;
    for(let i=0;i<n&&splash.length<(q>=3?80:q>=2?60:36);i++){
      const a=P.a+(Math.random()-.5)*1.7,d=1.2+Math.random()*9,x=P.x+Math.cos(a)*d,y=P.y+Math.sin(a)*d,ix=x|0,iy=y|0;
      if(ix<0||iy<0||ix>=MW||iy>=MH||map[iy*MW+ix])continue;
      const g=gmap[iy*MW+ix];if(!(g<=1||g===4||g===5))continue;
      splash.push({x,y,t0:now})}}
  if(!splash.length)return;
  ctx.save();ctx.lineWidth=1;
  for(let i=splash.length-1;i>=0;i--){
    const s=splash[i],t=(now-s.t0)/1000;if(t>.4){splash.splice(i,1);continue}
    const p=proj(s.x,s.y,0);if(!p||!vis(p,zb))continue;
    const k=t/.4,r=Math.max(.6,p.sc*.1*k+.4);
    ctx.strokeStyle='rgba(205,220,240,'+((1-k)*.55).toFixed(3)+')';
    ctx.beginPath();ctx.ellipse(p.x,p.y,r,r*.4,0,0,6.283);ctx.stroke()}
  ctx.restore()}

/* ---------- rayos de luz y polvo en el aire (interiores de día) ---------- */
const motes=[];for(let i=0;i<64;i++)motes.push({x:Math.random(),y:Math.random(),z:.4+Math.random()*.9,ph:Math.random()*6.283});
let lastA=null,lastN=0;
const SHAFT=[.5,1.45,2.55,3.7,4.9];
function drawShafts(W,H,q,night,inside){
  const now=performance.now(),dA=lastA===null?0:Math.atan2(Math.sin(P.a-lastA),Math.cos(P.a-lastA)),dt=Math.min(.1,(now-lastN)/1000||0);lastA=P.a;lastN=now;
  ctx.save();ctx.globalCompositeOperation='lighter';
  if(inside&&!night){
    const dx=Math.cos(P.a),dy=Math.sin(P.a),px=-dy*PL,py=dx*PL,inv=1/(px*dy-dx*py);
    const n=q>=2?5:3;
    for(let i=0;i<n;i++){const ang=SHAFT[i],sx=Math.cos(ang),sy=Math.sin(ang),tX=inv*(dy*sx-dx*sy),tY=inv*(-py*sx+px*sy);
      if(tY<.15)continue;const x0=(W/2)*(1+tX/tY),w=W*(.05+.03*((i*7)%3)),sl=W*.22;
      if(x0<-w-sl||x0>W+w)continue;
      const a=(.09+.025*Math.sin(now/1700+i*2))*(q>=2?1:.8),g=ctx.createLinearGradient(0,0,0,H*.85);
      g.addColorStop(0,'rgba(255,225,160,'+a.toFixed(3)+')');g.addColorStop(1,'rgba(255,210,140,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x0-w,0);ctx.lineTo(x0+w,0);ctx.lineTo(x0+w+sl,H*.85);ctx.lineTo(x0-w+sl,H*.85);ctx.closePath();ctx.fill()}}
  /* motas de polvo con paralaje al girar */
  ctx.fillStyle=night?'rgba(200,215,255,.5)':'rgba(255,240,205,.7)';
  const n=Math.min(motes.length,q>=3?64:q>=2?46:26),sh=dA*W/(2*PL);
  for(let i=0;i<n;i++){const m=motes[i];
    m.x-=sh/W*m.z;m.y+=dt*.012*m.z;m.x+=Math.sin(now/2300+m.ph)*dt*.01;
    m.x=((m.x%1)+1)%1;if(m.y>1){m.y=0;m.x=Math.random()}
    const tw=.35+.65*Math.abs(Math.sin(now/900+m.ph));ctx.globalAlpha=tw*(inside?.55:.22);
    ctx.fillRect(m.x*W|0,m.y*H|0,m.z>.9?2:1,m.z>.9?2:1)}
  ctx.restore()}

/* ---------- nubes animadas: se mezclan en el cielo antes de dibujar muros y edificios ---------- */
let CL=null,clW=0,clH=0;
function nz(x,y,s){const v=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return v-Math.floor(v)}
function vn(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  return nz(xi,yi,s)*(1-u)*(1-v)+nz(xi+1,yi,s)*u*(1-v)+nz(xi,yi+1,s)*(1-u)*v+nz(xi+1,yi+1,s)*u*v}
function buildClouds(SWd,hh){
  clW=SWd;clH=hh;CL=new Uint8Array(SWd*hh);
  const per=12; /* nº de celdas horizontales: múltiplo entero para que el cielo cierre sin costura */
  for(let y=0;y<hh;y++){
    const fy=y/hh,band=Math.sin(Math.min(1,fy/.72)*Math.PI)*(fy<.72?1:0);
    for(let x=0;x<SWd;x++){
      const u=x/SWd*per,w=(a,b,s)=>{const xx=u*a;const p=per*a,i=Math.floor(xx),f=xx-i,
        wrap=(k)=>((k%p)+p)%p;const yy=fy*b*3,yi=Math.floor(yy),yf=yy-yi,uu=f*f*(3-2*f),vv=yf*yf*(3-2*yf);
        return nz(wrap(i),yi,s)*(1-uu)*(1-vv)+nz(wrap(i+1),yi,s)*uu*(1-vv)+nz(wrap(i),yi+1,s)*(1-uu)*vv+nz(wrap(i+1),yi+1,s)*uu*vv};
      const n=w(1,1,3)*.55+w(2,2,9)*.3+w(4,4,17)*.15;
      CL[y*SWd+x]=Math.max(0,Math.min(255,(n-.5)*4.2*255*band))|0}}}
export function drawClouds(buf,W,hh,SWd,off,weather,night,FOG,dayPhase){
  if(!SWd)return;
  if(!CL||clW!==SWd||clH!==hh)buildClouds(SWd,hh);
  const drift=(performance.now()/1000*1.6)|0,rain=weather==='rain',sand=weather==='sandstorm';
  const base=night?.34:sand?.3:rain?.8:.62,
        cr=night?FOG[0]*1.3+8:rain?FOG[0]*.78:Math.min(255,FOG[0]*.55+120),
        cg=night?FOG[1]*1.3+8:rain?FOG[1]*.8:Math.min(255,FOG[1]*.55+118),
        cb=night?FOG[2]*1.3+14:rain?FOG[2]*.86:Math.min(255,FOG[2]*.55+115);
  const yMax=(hh*.76)|0;
  for(let y=0;y<yMax;y++){const o=y*W,r=y*SWd;
    for(let x=0;x<W;x++){
      let xi=off+x+drift;xi%=SWd;const a=CL[r+xi];if(a===0)continue;
      const k=a/255*base,c=buf[o+x],ik=1-k;
      buf[o+x]=(0xFF000000|(((c>>16&255)*ik+cb*k)<<16)|(((c>>8&255)*ik+cg*k)<<8)|((c&255)*ik+cr*k))>>>0}}}

/* ---------- niebla baja en el horizonte y grano de película ---------- */
let hz=null,hzKey='',grain=null,gpat=null,gf=0;
function haze(W,H,FOG,rainy,night){
  const key=W+'|'+H+'|'+(FOG[0]|0)+(FOG[1]|0)+(FOG[2]|0)+rainy+night;
  if(key!==hzKey){hzKey=key;hz=document.createElement('canvas');hz.width=4;hz.height=H;const g=hz.getContext('2d'),hh=H/2,
    gr=g.createLinearGradient(0,hh-H*.1,0,hh+H*.14),c=(a)=>'rgba('+(FOG[0]|0)+','+(FOG[1]|0)+','+(FOG[2]|0)+','+a+')',m=rainy?.3:night?.2:.18;
    gr.addColorStop(0,c(0));gr.addColorStop(.42,c(m));gr.addColorStop(1,c(0));g.fillStyle=gr;g.fillRect(0,0,4,H)}
  ctx.drawImage(hz,0,0,4,H,0,0,W,H)}
function filmGrain(W,H){
  if(!grain){grain=document.createElement('canvas');grain.width=grain.height=64;gpat=grain.getContext('2d')}
  if((gf++%3)===0){const im=gpat.createImageData(64,64),d=im.data;
    for(let i=0;i<d.length;i+=4){const v=Math.random()*255|0;d[i]=d[i+1]=d[i+2]=v;d[i+3]=16}
    gpat.putImageData(im,0,0)}
  const ox=(Math.random()*64)|0,oy=(Math.random()*64)|0;
  ctx.save();ctx.translate(-ox,-oy);ctx.fillStyle=ctx.createPattern(grain,'repeat');ctx.fillRect(0,0,W+64,H+64);ctx.restore()}

/* ---------- marcas en muros: agujeros de bala y manchas de sangre (un mapa de superficie por cara de muro) ---------- */
const OV=new Map();export let NMK=0;
export function clearMarks(){OV.clear();NMK=0}
export function getOv(key){return OV.get(key)}
function faceOv(key){let o=OV.get(key);
  if(!o){if(OV.size>=160){OV.delete(OV.keys().next().value)}o=new Uint32Array(TEX*TEX);OV.set(key,o);NMK=1}
  return o}
/* mismo cálculo que el raycaster: devuelve la cara de muro que toca un rayo y la columna de textura */
function castWall(x0,y0,rx,ry,maxD){
  let mx=x0|0,my=y0|0;
  const ddx=rx===0?1e30:Math.abs(1/rx),ddy=ry===0?1e30:Math.abs(1/ry);
  let stx,sty,sdx,sdy;
  if(rx<0){stx=-1;sdx=(x0-mx)*ddx}else{stx=1;sdx=(mx+1-x0)*ddx}
  if(ry<0){sty=-1;sdy=(y0-my)*ddy}else{sty=1;sdy=(my+1-y0)*ddy}
  let side=0,g=0;
  while(g++<80){
    if(sdx<sdy){sdx+=ddx;mx+=stx;side=0}else{sdy+=ddy;my+=sty;side=1}
    if(mx<0||my<0||mx>=MW||my>=MH)return null;
    if(map[my*MW+mx]){
      const pd=side===0?sdx-ddx:sdy-ddy;if(pd>maxD)return null;
      let wx=side===0?y0+pd*ry:x0+pd*rx;wx-=Math.floor(wx);
      let tx=(wx*TEX)|0;if((side===0&&rx>0)||(side===1&&ry<0))tx=TEX-tx-1;
      tx=Math.max(0,Math.min(TEX-1,tx));
      return {key:((my*MW+mx)<<2)+(side===0?(rx>0?0:1):(ry>0?2:3)),tx,pd,x:x0+pd*rx,y:y0+pd*ry,material:map[my*MW+mx]}}}
  return null}
/* pinta un punto suave en la superficie: color rgb + alpha máximo */
function dot(o,cx,cy,r,R,G,B,A){
  const r2=r*r;
  for(let y=Math.floor(cy-r);y<=Math.ceil(cy+r);y++){if(y<0||y>=TEX)continue;
    for(let x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++){if(x<0||x>=TEX)continue;
      const dx=x-cx,dy=y-cy,d=(dx*dx+dy*dy)/r2;if(d>1)continue;
      const a=(A*(1-d*d*.6))|0,old=o[y*TEX+x],oa=old>>>24;
      if(a<=oa)continue;
      o[y*TEX+x]=((a<<24)|(B<<16)|(G<<8)|R)>>>0}}}
/* agujero de bala en el primer muro que toca el disparo */
export function bulletMark(x0,y0,rx,ry,maxD){
  const h=castWall(x0,y0,rx,ry,maxD||28);if(!h)return;
  const o=faceOv(h.key),ty=TEX*(.5+(Math.random()-.5)*.22),m=h.material;
  const metal=m===4,wood=[3,8,11,12,13,14,15,16,17,18].includes(m);
  if(metal){dot(o,h.tx,ty,3.2,150,132,92,150);dot(o,h.tx,ty,1.5,24,22,18,235)}
  else if(wood){dot(o,h.tx,ty,3.8,126,91,52,145);dot(o,h.tx,ty,1.7,35,25,15,235)}
  else{dot(o,h.tx,ty,3.4,70,66,62,95);dot(o,h.tx,ty,1.7,18,18,20,235)}
  const kind=metal?'metal':wood?'wood':'stone';if(impacts.length>=40)impacts.shift();impacts.push({x:h.x,y:h.y,kind,seed:Math.random()*6.283,t0:performance.now()})}  /* agujero + reacción de material */
/* salpicadura de sangre en el muro que está detrás del enemigo; n = tamaño (1 = pequeña, 3 = muerte) */
export function bloodWall(ex,ey,n){
  let rx=ex-P.x,ry=ey-P.y;const L=Math.hypot(rx,ry);if(L<.01)return;rx/=L;ry/=L;
  const h=castWall(ex,ey,rx,ry,n>=3?4.5:3);if(!h)return;
  const o=faceOv(h.key),cy=TEX*(.4+Math.random()*.25),cr=118+Math.random()*30|0;
  dot(o,h.tx,cy,2+n*1.3,cr,10,10,215);
  for(let i=0;i<n*4;i++){const a=Math.random()*6.283,d=Math.random()*(3+n*3.2);
    const px=h.tx+Math.cos(a)*d,py=cy+Math.sin(a)*d*.8;dot(o,px,py,.9+Math.random()*(n*.5+.6),cr-20,6,6,200)}
  if(n>=2)for(let i=0;i<2+n;i++){ /* chorreones hacia abajo */
    const sx=h.tx+(Math.random()-.5)*(4+n*2.4),len=5+Math.random()*(8+n*4)|0;
    for(let k=0;k<len;k++)dot(o,sx,cy+2+k,.7,cr-30,5,5,(190-k*7)|0)}}

/* ---------- sacudida de cámara: balanceo al caminar, patada al disparar y golpe al recibir daño ---------- */
function camShake(W,H){
  const wk=P.walkAmt||0;
  let dy=Math.round(Math.sin(P.bob*2)*wk*H*.0065)+(P.muzzle>0?1:0),dx=0;
  if(P.hurt>0){const k=Math.min(1,P.hurt/.45);dx=Math.round((Math.random()-.5)*4*k);dy+=Math.round((Math.random()-.5)*3*k)}
  if(!dx&&!dy)return;
  ctx.drawImage(canvas,0,0,W,H,dx,dy,W,H)}

/* Se llama al final de la escena (antes del HUD). q: 0 bajo, 1 medio, 2 alto, 3 cinematográfico */
export function postFx(W,H,q,night,rainy,phase,zb,inside,FOG){
  drawBlasts(zb);
  drawCasings(zb,q);
  drawImpacts(zb,q);
  drawTracers(zb,q);
  if(q>=1&&!inside)haze(W,H,FOG,rainy,night);
  if(q>=1)drawSplash(zb,q,rainy);
  if(q>=1&&!rainy)drawShafts(W,H,q,night,inside);
  if(q>=1&&rainy&&inside)drawShafts(W,H,q,night,true);
  if(q>=1)bloom(W,H,night,q>=3?.34:q>=2?.28:.2);
  /* gradación: lluvia = frío y desaturado, atardecer ya lo tiñe currentTint */
  if(rainy&&!night){ctx.fillStyle='rgba(70,95,125,'+(.05*wet).toFixed(3)+')';ctx.fillRect(0,0,W,H)}
  camShake(W,H);
  if(!vig||vw!==W||vh!==H||vig._n!==night)buildVig(W,H,night);
  ctx.drawImage(vig,0,0);
  if(q>=2)filmGrain(W,H)}
