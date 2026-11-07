import { BUILDINGS, C, MH, MW, OUTPOSTS, SAFE_BOXES, SH, TEX, bldDirty, bldNext, clamp, frontZoneAt, gmap, hash, isFrontBuildingStanding, map, set_bldDirty, set_bldNext } from './core.js';
import { BEACON, walkmap } from './outposts.js';
import { CEIL_TEX, FOG, cSh, gSh, shadeAt, shades, wSh, wShD, wTex } from './textures.js';
import { campFires, sBeacon, sFire, sFragGren, sMolotov, sRocket, sShot, sSmoke, sSmokeGren, sTrafficLightG, sTrafficLightR } from './sprites.js';
import { EXT_AT, P, allies, corpses, currentTint, decals, decos, dmgDirs, dmgNumbers, eGrenades, enemies, fires, gt, hitMarkers, leaves, parts, pickups, projs, rain, rockets, selectedMap, smokes, throwables, visibleEnemies, weather } from './state.js';
import { PL, RH, RW, SW, buf, ctx, img, projDist, qs, sky, zbuf, ztop } from './backdrop.js';
import { FEATURES, level } from './quality.js';
import { addL, addLN, buildLights, lightAt, lightsActive } from './lights.js';
import { setWeaponBrightness, weapon } from './weapon-view.js';
import { minimap } from './hud.js';
import { los, worldToScreen } from './combat.js';
import { MS, SUB, blobShadow, shadowCfg, updateShadows } from './shadows.js';
import { dayPhase, isNight, NIGHT_MUL } from './state.js';
import { FL, drawNightGlows } from './night.js';
import { NMK, drawClouds, getOv, postFx, updWet, wet } from './fx.js';
import { lightCfg } from './lights.js';


/* máximo de luces dinámicas de noche por nivel de calidad (BAJO / MEDIO / ALTO) */
const NIGHT_LIGHTS=[5,9,14,18];
const SL=[],pool=[];
let pn=0;
/* Profundidad (tY) del sprite más cercano dibujado en cada píxel. Solo se usa de noche: los halos de los focos la consultan
   para NO dibujarse a través de árboles, postes, canecas, erizos, etc. */
let sdep=null;

function add(x,y,sp,wh,ww,z0,hurt,flip,bob,br){
  const o=pool[pn]||(pool[pn]={});pn++;
  const dx=x-P.x,dy=y-P.y;
  o.x=x;o.y=y;o.d2=dx*dx+dy*dy;o.sp=sp;o.wh=wh;o.ww=ww;
  o.z0=z0;o.hurt=hurt;o.flip=flip;o.bob=bob;o.br=br;
  o.isEnemy=false;o.e=null;o.isAlly=false;o.sh=false;o.occ=true;
  SL.push(o)
}

function drawHudFx(W,H){const cxp=W/2,cyp=H/2;
 for(const e of enemies){
  if(!e.alive||!e.sniper||e.aimT<=0)continue;
  if(!los(e.x,e.y,P.x,P.y))continue;
  const sp=worldToScreen(e.x,e.y,e.height*.7);
  if(!sp)continue;
  const t=1-Math.min(1,e.aimT/1.5);
  ctx.strokeStyle='rgba(255,30,30,'+(0.35+t*0.6)+')';ctx.lineWidth=1.5+t;
  ctx.beginPath();ctx.moveTo(sp.x,sp.y);ctx.lineTo(cxp,cyp);ctx.stroke();
  ctx.fillStyle='rgba(255,30,30,'+(0.4+t*0.5)+')';
  ctx.beginPath();ctx.arc(cxp,cyp,3+t*5,0,6.28);ctx.fill()
 }
 for(const d of dmgDirs){const rel=d.angle-P.a;const sa=Math.atan2(Math.sin(rel),Math.cos(rel));if(Math.abs(sa)>1.2)continue;
  const a=d.life/d.max,r0=Math.min(W,H)*0.16,r1=Math.min(W,H)*0.22,ca=-Math.PI/2+sa;
  ctx.strokeStyle='rgba(255,40,20,'+(a*0.85)+')';ctx.lineWidth=6;
  ctx.beginPath();ctx.arc(cxp,cyp,r1,ca-0.22,ca+0.22);ctx.stroke();
  ctx.lineWidth=3;ctx.strokeStyle='rgba(255,120,80,'+(a*0.7)+')';
  ctx.beginPath();ctx.arc(cxp,cyp,r0,ca-0.18,ca+0.18);ctx.stroke()}
 for(const m of hitMarkers){const a=m.life/m.max;ctx.strokeStyle='rgba(255,255,255,'+a+')';ctx.lineWidth=2;
  const s=6;ctx.beginPath();ctx.moveTo(m.sx-s,m.sy-s);ctx.lineTo(m.sx+s,m.sy+s);ctx.moveTo(m.sx+s,m.sy-s);ctx.lineTo(m.sx-s,m.sy+s);ctx.stroke()}
 ctx.textAlign='center';ctx.textBaseline='middle';
 for(const n of dmgNumbers){const a=n.life/n.max;ctx.font='bold 14px "Courier New",monospace';
  ctx.strokeStyle='rgba(0,0,0,'+a+')';ctx.lineWidth=3;ctx.strokeText(n.val,n.sx,n.sy);
  ctx.fillStyle=(n.crit?'rgba(255,220,50,':'rgba(255,255,255,')+a+')';ctx.fillText(n.val,n.sx,n.sy);
  if(n.crit){ctx.font='bold 10px "Courier New",monospace';ctx.fillStyle='rgba(255,220,50,'+a+')';ctx.fillText('CRÍT',n.sx,n.sy-14)}}
}

function drawEnemyBars(W,H){
 const MAX_DIST=6;
 for(const v of visibleEnemies){
  const e=v.e,isAlly=v.isAlly,x=v.x,y=v.y,sc=v.sc,dist=v.dist;
  if(dist>MAX_DIST)continue;
  const fade=dist>5?(MAX_DIST-dist):1;if(fade<=0)continue;
  const hpR=Math.max(0,e.hp/e.maxHp);
  const barW=Math.max(16,Math.min(34,20*sc/80)),barH=2.5;
  const nameY=y-8;
  ctx.font='bold 7px "Courier New",monospace';
  ctx.textAlign='center';ctx.textBaseline='bottom';
  ctx.strokeStyle='rgba(0,0,0,'+(0.9*fade)+')';ctx.lineWidth=2;
  ctx.strokeText(e.name,x,nameY);
  ctx.fillStyle=isAlly?'rgba(157,216,255,'+fade+')':hexA(e.color||'#fff',fade);
  ctx.fillText(e.name,x,nameY);
  const bx=x-barW/2,by=y-6;
  ctx.fillStyle='rgba(0,0,0,'+(0.6*fade)+')';ctx.fillRect(bx-0.5,by-0.5,barW+1,barH+1);
  ctx.fillStyle='rgba(60,0,0,'+(0.85*fade)+')';ctx.fillRect(bx,by,barW,barH);
  let col;
  if(isAlly)col='#5bd8ff';
  else if(e.state==='FLEE')col='#ff8a2a';
  else if(hpR>0.6)col='#4caf50';
  else if(hpR>0.3)col='#ffb040';
  else col='#ff3020';
  ctx.fillStyle=hexA(col,fade);ctx.fillRect(bx,by,barW*hpR,barH);
  if(e.boss){ctx.strokeStyle='rgba(255,255,255,'+fade+')';ctx.lineWidth=1;ctx.strokeRect(bx-0.5,by-0.5,barW+1,barH+1)}
  if(e.objective){ctx.fillStyle='rgba(255,210,74,'+fade+')';ctx.font='bold 9px "Courier New",monospace';ctx.fillText('★',x+barW/2+6,nameY)}
 }
 ctx.textAlign='center';ctx.textBaseline='middle';
 for(const e of enemies){
  if(!e.alive||e.state==='COMBAT'||(e.detect||0)<0.15)continue;
  const sp=worldToScreen(e.x,e.y,e.height*1.05);if(!sp)continue;
  if(sp.dist>MAX_DIST)continue;
  const xi=sp.x|0;if(xi<0||xi>=W)continue;
  if(sp.tY>=zbuf[xi])continue;
  const a=Math.min(1,e.detect*2);
  let sym='?';
  if(e.state==='SUSPICIOUS')sym='!';
  else if(e.state==='SEARCH')sym='?';
  else if(e.state==='FLEE')sym='!!';
  ctx.font='bold 12px "Courier New",monospace';
  ctx.strokeStyle='rgba(0,0,0,'+a+')';ctx.lineWidth=2;
  ctx.strokeText(sym,sp.x,sp.y);
  const col=(e.state==='SUSPICIOUS'||e.state==='FLEE')?'rgba(255,150,50,':'rgba(255,220,50,';
  ctx.fillStyle=col+a+')';ctx.fillText(sym,sp.x,sp.y)
 }}

export function hexA(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return'rgba('+r+','+g+','+b+','+a+')'}

export function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}

export let ceilMask=null,ceilRow=null,ceilOn=false;

export let bIdx=null,bTexK=[],bAct=[];

// Cache por edificio: textura de sus muros y si conserva techo (el Frente de Ceniza elimina edificios).
function refreshBldCache(){
 const now=performance.now();
 if(!bldDirty&&now<bldNext)return;
 set_bldNext(now+300);
 if(!bIdx)bIdx=new Int16Array(MW*MH);
 if(bldDirty){bIdx.fill(-1);BUILDINGS.forEach((b,k)=>{for(let y=b[1];y<=b[3];y++)for(let x=b[0];x<=b[2];x++)bIdx[y*MW+x]=k});set_bldDirty(false)}
 const front=selectedMap==='front';
 for(let k=0;k<BUILDINGS.length;k++){
  const b=BUILDINGS[k],cnt={};let best=0,bn=0;
  const tally=i=>{const v=map[i];if(CEIL_TEX[v]){const c=(cnt[v]=(cnt[v]||0)+1);if(c>bn){bn=c;best=v}}};
  for(let x=b[0];x<=b[2];x++){tally(b[1]*MW+x);tally(b[3]*MW+x)}
  for(let y=b[1]+1;y<b[3];y++){tally(y*MW+b[0]);tally(y*MW+b[2])}
  if(best)bTexK[k]=best;else if(!bTexK[k])bTexK[k]=1;
  let act=true;
  if(front){
   for(const op of OUTPOSTS){if(op.camp&&op.clearB&&op.clearB.indexOf(k)>=0){act=false;break}}
   if(act){const cx=(b[0]+b[2])>>1,cy=(b[1]+b[3])>>1;if(frontZoneAt(cx,cy)===6&&!map[cy*MW+cx]&&!isFrontBuildingStanding(cx+.5,cy+.5))act=false}
  }
  bAct[k]=act;
 }
}

// Soldado: elige vista (0 frente ... 4 espalda) segun hacia donde mira respecto a la camara, y la pose segun lo que hace.
function soldierPick(e){
 const S=e.fr;let rel=e.face-Math.atan2(P.y-e.y,P.x-e.x);rel=Math.atan2(Math.sin(rel),Math.cos(rel));
 const ar=Math.abs(rel),v=ar<.3927?0:ar<1.1781?1:ar<1.9635?2:ar<2.7489?3:4;
 // los sprites laterales miran a la izquierda de la pantalla: se espejan si mira a la derecha
 e._fl=(v>0&&v<4)&&(Math.cos(e.face)*-Math.sin(P.a)+Math.sin(e.face)*Math.cos(P.a))>0;
 if(gt-(e.fireAt||-9)<.28)return S.fire[v];
 if(gt-(e.mvAt||-9)<.2)return S.walk[(e.wt*8|0)%4][v];
 if(e.state==='COMBAT')return S.aim[v];
 return S.idle[v]}

export function render(){
 const W=RW,H=RH,hh=H/2|0,dx=Math.cos(P.a),dy=Math.sin(P.a),px=-dy*PL,py=dx*PL;
 const r0x=dx-px,r0y=dy-py,r1x=dx+px,r1y=dy+py,posZ=.5*projDist;
 // Cielo de fondo siempre; si estás dentro, el techo solo cubre el rectángulo del edificio actual.
 {const off=Math.floor(((P.a/6.283185)%1+1)%1*SW),first=Math.min(W,SW-off);
  for(let y=0;y<hh;y++){buf.set(sky.subarray(y*SW+off,y*SW+off+first),y*W);if(first<W)buf.set(sky.subarray(y*SW,y*SW+W-first),y*W+first)}
  if(level(qs)>=1&&selectedMap==='district')drawClouds(buf,W,hh,SW,off,weather,isNight(),FOG,dayPhase)}
 // Techo fijo en todos los edificios, se mire desde dentro o desde fuera (visible por puertas). Usa la textura de sus paredes.
 refreshBldCache();
 ceilOn=true;ceilMask.fill(0,0,hh*W);
 for(let y=0;y<hh;y++){const pyc=hh-y;if(pyc<=0)continue;
  const rd=posZ/pyc;ceilRow[y]=rd;
  if(rd>40)continue;
  const sx=rd*(r1x-r0x)/W,sy=rd*(r1y-r0y)/W;
  let fx=P.x+rd*r0x,fy=P.y+rd*r0y;
  const si=Math.max(3,Math.min(SH-1,(SH-1)*(1-rd/40)|0)),o=y*W;
  for(let x=0;x<W;x++){
   if(fx>=0&&fy>=0&&fx<MW&&fy<MH){const k=bIdx[(fy|0)*MW+(fx|0)];
    if(k>=0&&bAct[k]){buf[o+x]=cSh[bTexK[k]][si][((((fy*32)|0)&63)<<6)+(((fx*32)|0)&63)];ceilMask[o+x]=1}}
   fx+=sx;fy+=sy}}
 const fogC=C(FOG[0],FOG[1],FOG[2]);
 const FT=FEATURES[level(qs)];
 const NT=isNight();lightCfg.night=NT;const addLX=NT?addLN:addL;
 const SM=updateShadows(map,bIdx,bAct,dayPhase,NT?'night':weather,FT);
 /* de noche las luces son lo único que ilumina: más fuentes que de día y también con calidad BAJA */
 buildLights(NT?NIGHT_LIGHTS[level(qs)]:FT.lights,map,P,gt,dayPhase,fires,campFires,enemies,rockets);const LA=lightsActive();
 const rainOn=weather==='rain';const WET=updWet(rainOn)*(FT.ao?1:.7),wetOn=WET>.02;
 /* color del reflejo en el piso mojado: cielo/niebla un poco más claro */
 const rfR=Math.min(255,FOG[0]*.9+6),rfG=Math.min(255,FOG[1]*.9+8),rfB=Math.min(255,FOG[2]*.9+14);
 /* colores fijos del piso (cebras, rayas, tapas, charcos) también se oscurecen de noche */
 const nc=(r,g,b)=>NT?C(r*NIGHT_MUL[0],g*NIGHT_MUL[1],b*NIGHT_MUL[2]):C(r,g,b);
 const cLane=nc(220,180,50),cZeb=nc(210,210,204),cMh1=nc(52,52,58),cMh2=nc(76,76,82),cPud1=rainOn?nc(150,182,224):nc(66,80,94),cPud2=nc(56,62,70),
       cG1=nc(36,34,32),cG2=nc(64,60,54),cT1=nc(76,74,70),cT2=nc(50,48,46);
 const fogR=FOG[0],fogG=FOG[1],fogB=FOG[2];
 for(let y=hh;y<H;y++){const p=y-hh;if(p<=0)continue;const rd=posZ/p;if(rd>45){buf.fill(fogC,y*W,y*W+W);continue}
  const sx=rd*(r1x-r0x)/W,sy=rd*(r1y-r0y)/W;let fx=P.x+rd*r0x,fy=P.y+rd*r0y;const si=shadeAt(rd),o=y*W,sfr=Math.max(0,(1-rd/45)*256)|0;
  const wF=wetOn?WET*Math.min(.24,.04+rd/45*.24):0,wFp=wetOn?Math.min(.6,wF*1.6+.16*WET):0,wD=wetOn?(1-.12*WET)*256|0:256;
  let pLane=cLane,pZeb=cZeb,pMh1=cMh1,pMh2=cMh2,pPud1=cPud1,pPud2=cPud2,pG1=cG1,pG2=cG2,pT1=cT1,pT2=cT2;
  if(NT){const fk=si/(SH-1),ik=1-fk,bl=c=>C((c&255)*fk+fogR*ik,((c>>8)&255)*fk+fogG*ik,((c>>16)&255)*fk+fogB*ik);
   pLane=bl(cLane);pZeb=bl(cZeb);pMh1=bl(cMh1);pMh2=bl(cMh2);pPud1=bl(cPud1);pPud2=bl(cPud2);pG1=bl(cG1);pG2=bl(cG2);pT1=bl(cT1);pT2=bl(cT2)}
  for(let x=0;x<W;x++){const ix=fx|0,iy=fy|0;let g=2;if(ix>=0&&iy>=0&&ix<MW&&iy<MH)g=gmap[iy*MW+ix];
   let col=gSh[g]?gSh[g][si][((((fy*32)|0)&63)<<6)+(((fx*32)|0)&63)]:gSh[0][si][((((fy*32)|0)&63)<<6)+(((fx*32)|0)&63)];
   if(g===4){const frac=fx-Math.floor(fx);if(frac>0.44&&frac<0.56){const dashFrac=(fy*4)%1;if(dashFrac<0.6)col=pLane}}
   else if(g===5){const frac=fy-Math.floor(fy);if(frac>0.44&&frac<0.56){const dashFrac=(fx*4)%1;if(dashFrac<0.6)col=pLane}}
   const wpat=walkmap[iy*MW+ix];
   if(wpat===1){if((((((fy*64)|0)%18)+18)%18)<8)col=pZeb}
   else if(wpat===2){if((((((fx*64)|0)%18)+18)%18)<8)col=pZeb}
   else if(wpat===3){const ux=fx-Math.floor(fx)-.5,uy=fy-Math.floor(fy)-.5;const dd=ux*ux+uy*uy;if(dd<.055)col=pMh1;else if(dd<.085)col=pMh2}
   else if(wpat===4){const ux=fx-Math.floor(fx)-.5,uy=fy-Math.floor(fy)-.5;const dd=(ux*ux+uy*uy)*2.4;const n=hash(ix,iy,97);if(dd<.6-n*.15)col=pPud1;else if(dd<.95-n*.15)col=pPud2}
   else if(wpat===5){const ux=fx-Math.floor(fx)-.5,uy=fy-Math.floor(fy)-.5;const dd=Math.hypot(ux,uy);const n=hash(ix,iy,98);if(dd<.3+n*.06)col=pG1;else if(dd<.37+n*.06)col=pG2}
   else if(wpat===6){const ux=fx-Math.floor(fx),uy=fy-Math.floor(fy);if(ux>.08&&ux<.92&&uy>.08&&uy<.92)col=pT1;else if((ux<.06||ux>.94||uy<.06||uy>.94)&&(((ix+iy)&1)===0))col=pT2}
   if(wetOn&&(g<=1||g===4||g===5)){const pud=wpat===4,tn=hash(ix,iy,55),kf=pud?wFp:wF*(.35+.65*tn),ik=1-kf;
    col=(0xFF000000|(Math.min(255,((col>>16)&255)*wD*ik/256+rfB*kf)<<16)|(Math.min(255,((col>>8)&255)*wD*ik/256+rfG*kf)<<8)|Math.min(255,(col&255)*wD*ik/256+rfR*kf))>>>0}
   if(SM!==null&&ix>=0&&iy>=0&&ix<MW&&iy<MH){const k=SM[((fy*SUB)|0)*MS+((fx*SUB)|0)];
    if(k<255){const kk=255-(((255-k)*sfr)>>8);col=(0xFF000000|((((col>>16)&255)*kk>>8)<<16)|((((col>>8)&255)*kk>>8)<<8)|((col&255)*kk>>8))>>>0}}
   if(LA){const l=lightAt(fx,fy);if(l){col=addLX(col,l);if(wetOn&&wpat===4&&(l&255)>40)col=addL(col,((l>>2)&0x3F3F3F))}}
   buf[o+x]=col;fx+=sx;fy+=sy}}
 for(let x=0;x<W;x++){const cx=2*x/W-1,rx=dx+px*cx,ry=dy+py*cx;let mx=P.x|0,my=P.y|0;const ddx=rx===0?1e30:Math.abs(1/rx),ddy=ry===0?1e30:Math.abs(1/ry);
  let stx,sty,sdx,sdy;if(rx<0){stx=-1;sdx=(P.x-mx)*ddx}else{stx=1;sdx=(mx+1-P.x)*ddx}if(ry<0){sty=-1;sdy=(P.y-my)*ddy}else{sty=1;sdy=(my+1-P.y)*ddy}
  let side=0,tv=0,g=0;while(g++<200){if(sdx<sdy){sdx+=ddx;mx+=stx;side=0}else{sdy+=ddy;my+=sty;side=1}
   if(mx<0||my<0||mx>=MW||my>=MH){tv=1;break}tv=map[my*MW+mx];if(tv)break}
  let pd=side===0?sdx-ddx:sdy-ddy;if(pd<.02)pd=.02;zbuf[x]=pd;
  const lh=projDist/pd,ds=(-lh/2+H/2)|0,de=(lh/2+H/2)|0;let wx=side===0?P.y+pd*ry:P.x+pd*rx;wx-=Math.floor(wx);
  let tx=(wx*TEX)|0;if((side===0&&rx>0)||(side===1&&ry<0))tx=TEX-tx-1;tx=clamp(tx,0,TEX-1);
  const ti=(tv>=1&&tv<wTex.length)?tv:1,sd=(side?wShD:wSh)[ti][shadeAt(pd)],st=TEX/lh;
  const ovr=NMK?getOv(((my*MW+mx)<<2)+(side===0?(rx>0?0:1):(ry>0?2:3))):undefined;let dkr=1,dkg=1,dkb=1;if(ovr){const fk=shadeAt(pd)/(SH-1);dkr=fk*(NT?NIGHT_MUL[0]:1);dkg=fk*(NT?NIGHT_MUL[1]:1);dkb=fk*(NT?NIGHT_MUL[2]:1)}
  const y0=ds<0?0:ds,y1=de>H?H:de;let tp=Math.max(0,(y0+.5-(H/2-lh/2))*st); /* muestreo en el centro del píxel: evita la línea oscura/clara en el borde de los muros lejanos */
  ztop[x]=y0;
  const wl=LA?lightAt(P.x+pd*rx-(side===0?stx*.08:0),P.y+pd*ry-(side===1?sty*.08:0)):0;
  for(let y=y0;y<y1;y++){let ty=tp|0;if(ty>=TEX)ty=TEX-1;tp+=st;let wc=sd[(ty<<6)+tx];if(ovr){const ov=ovr[(ty<<6)+tx];if(ov){const a=(ov>>>24)/255,ia=1-a;wc=(0xFF000000|((((wc>>16)&255)*ia+((ov>>16)&255)*dkb*a)<<16)|((((wc>>8)&255)*ia+((ov>>8)&255)*dkg*a)<<8)|((wc&255)*ia+(ov&255)*dkr*a))>>>0}}buf[y*W+x]=wl?addLX(wc,wl):wc}}
 if(NT){if(!sdep||sdep.length!==W*H)sdep=new Float32Array(W*H);sdep.fill(1e9)}
 SL.length=0;pn=0;visibleEnemies.length=0;
 for(const d of decals){add(d.x,d.y,d.spr,d.wh,d.ww,0,0,0,0,0);pool[pn-1].occ=false} /* las marcas del piso no tapan halos */
 for(const d of decos){
  if(d.tl!==undefined)d.spr=((((gt/7)|0)+d.tl)%2)?sTrafficLightR:sTrafficLightG;
  if((d.x-P.x)**2+(d.y-P.y)**2<2000){add(d.x,d.y,d.spr,d.wh,d.ww,d.z0||0,0,0,d.wave?Math.sin(gt*2.8+d.x)*0.07:0,0);if(!d.z0&&!d.wave&&d.wh>=.3&&d.tl===undefined)pool[pn-1].sh=true}
 }
 for(const box of SAFE_BOXES)if(!box.opened&&(box.x-P.x)**2+(box.y-P.y)**2<2000)add(box.x,box.y,box.spr,box.wh,box.ww,0,0,0,0,0);
 for(const s of smokes){if((s.x-P.x)**2+(s.y-P.y)**2>1200)continue;
  const fadeIn=Math.min(1,(s.maxLife-s.life)/.6),fadeOut=Math.min(1,s.life/1.5),fade=fadeIn*fadeOut;
  for(let i=0;i<8;i++){const a=(i/8)*6.28+s.life*.4+s.seed,r=s.radius*(.25+hash(i,0,90)*.55);
   const px2=s.x+Math.cos(a)*r,py2=s.y+Math.sin(a)*r,pz=.4+hash(i,1,90)*1.6+Math.sin(gt+i)*.15;
   add(px2,py2,sSmoke,1.9*fade,1.9*fade,pz,false,false,0,0)}}
 for(const f of fires){if((f.x-P.x)**2+(f.y-P.y)**2>900)continue;
  const fade=Math.min(1,f.life/.5);
  for(let i=0;i<5;i++){const a=(i/5)*6.28+gt*2+hash(i,0,91)*6,r=f.radius*(.3+hash(i,1,91)*.5);
   const px2=f.x+Math.cos(a)*r*(.8+Math.sin(gt*3+i)*.15),py2=f.y+Math.sin(a)*r*(.8+Math.cos(gt*3+i)*.15);
   const pz=.2+Math.abs(Math.sin(gt*4+i))*.7;
   add(px2,py2,sFire,.9*fade,.9*fade,pz,false,false,0,0)}}
 for(const e of enemies){
  if(!e.alive)continue;
  const nw=e.fr.isSet;const f=(e.wt*4|0)%2;const sp2=nw?soldierPick(e):(e.fr[f]||e.fr[0]);
  const beforePn=pn;
  const wh2=nw?e.height*sp2.hr:e.height;
  add(e.x,e.y,sp2,wh2,wh2*sp2.w/sp2.h,0,e.hurtT>0,nw?e._fl:((e.wt*2|0)%2)===1,0,0);
  const o=pool[beforePn];o.e=e;o.isEnemy=true;o.sh=true
 }
 for(const a of allies){
  if(!a.alive)continue;
  const f=(a.wt*4|0)%2;const sp2=a.fr[f]||a.fr[0];
  const beforePn=pn;
  add(a.x,a.y,sp2,a.height||.62,(a.height||.62)*sp2.w/sp2.h,0,0,0,0,0);
  const o=pool[beforePn];o.e=a;o.isEnemy=true;o.isAlly=true;o.sh=true
 }
 for(const c of corpses)if((c.x-P.x)**2+(c.y-P.y)**2<1200){
  let sp=c.spr,wh=c.wh,ww=c.ww;
  if(c.dying){const age=gt-c.t0;if(age<.84){sp=c.dying[Math.min(3,(age/.21)|0)];wh=c.eh*sp.hr;ww=wh*sp.w/sp.h}}
  add(c.x,c.y,sp,wh,ww,0,0,c.flip||false,0,0);pool[pn-1].sh=true}
 for(const p of pickups)if(!p.taken)add(p.x,p.y,p.spr,.42,.42,.04,0,0,Math.sin(gt*3+p.x)*.04,0);
 for(const p of rockets)add(p.x,p.y,sRocket,.62,.62*sRocket.w/sRocket.h,.4,0,0,0,1);
 for(const g of throwables){const sp3=g.type==='frag'?sFragGren:g.type==='smoke'?sSmokeGren:sMolotov;add(g.x,g.y,sp3,.32,.32,g.z,false,false,0,0)}
 for(const g of eGrenades){add(g.x,g.y,sFragGren,.32,.32,g.z,false,false,0,0)}
 add(BEACON.x,BEACON.y,sBeacon,2.2,1.1,0,gt<EXT_AT,0,0,1);
 SL.sort((a,b)=>b.d2-a.d2);
 const inv=1/(px*dy-dx*py);
 if(shadowCfg.on&&shadowCfg.blobs)for(const s of SL){
  if(!s.sh||s.d2>700)continue;
  blobShadow(buf,zbuf,W,H,projDist,P.x,P.y,dx,dy,px,py,inv,s.x,s.y,Math.max(.1,Math.min(.45,s.ww*.36)),Math.min(1,(26-Math.sqrt(s.d2))/8));
 }
 for(const s of SL){
  const sx=s.x-P.x,sy=s.y-P.y,tX=inv*(dy*sx-dx*sy),tY=inv*(-py*sx+px*sy);
  if(tY<.25)continue;
  const scX=(W/2)*(1+tX/tY),sc=projDist/tY,sH=s.wh*sc,sW=s.ww*sc,bY=H/2+(.5-s.z0+s.bob)*sc,tp=bY-sH;
  const dsx=Math.floor(scX-sW/2),dex=Math.ceil(scX+sW/2);
  let sh=shadeAt(tY);if(s.br)sh=SH-1;
  const sl=(LA&&!s.br)?lightAt(s.x,s.y):0;
  const sp4=s.sp,tbl=s.hurt?(sp4.red||(sp4.red=shades(sp4.data,1,1))):sp4.sh,sd=tbl[sh];
  const x0=Math.max(0,dsx),x1=Math.min(W,dex),ys=Math.max(0,Math.floor(tp)),ye=Math.min(H,Math.ceil(bY)),iw=1/Math.max(1e-4,sW),ih=1/Math.max(1e-4,sH);
  let drewAny=false;
  for(let x=x0;x<x1;x++){
   /* Si el muro de esta columna está más cerca, solo se oculta la parte del objeto que queda DETRÁS del muro
      (de la base del muro hacia abajo); lo que sobresale por encima del muro (torres, postes, árboles) sigue visible. */
   let yEnd=ye;
   if(tY>=zbuf[x]){yEnd=Math.min(ye,ztop[x]);if(yEnd<=ys)continue}
   drewAny=true;
   let tx=((x-dsx)*sp4.w*iw)|0;tx=clamp(tx,0,sp4.w-1);if(s.flip)tx=sp4.w-1-tx;
   for(let y=ys;y<yEnd;y++){
    // Dentro de un edificio, el techo tapa lo que esté más lejos que él (árboles o postes de afuera).
    if(ceilOn&&y<hh&&ceilMask[y*W+x]&&tY>ceilRow[y])continue;
    let ty=((y-tp)*sp4.h*ih)|0;ty=clamp(ty,0,sp4.h-1);const c=sd[ty*sp4.w+tx];if(c){buf[y*W+x]=sl?addLX(c,sl):c;if(NT&&s.occ)sdep[y*W+x]=tY}}}
  if(s.isEnemy&&drewAny){
   const e=s.e;const centerX=Math.floor(scX);
   if(centerX>=0&&centerX<W&&tY<zbuf[centerX]){
    visibleEnemies.push({e:e,x:scX,y:tp-6,dist:tY,sc:sc,isAlly:s.isAlly})
   }
  }
 }
 for(const p of parts){const sx=p.x-P.x,sy=p.y-P.y,tX=inv*(dy*sx-dx*sy),tY=inv*(-py*sx+px*sy);if(tY<.3)continue;
  const X=((W/2)*(1+tX/tY))|0,sc=projDist/tY,sz=Math.max(1,.05*sc|0),Y=(H/2+.1*sc)|0;
  for(let a=-sz;a<=sz;a++)for(let b=-sz;b<=sz;b++){const u=X+a,v=Y+b;if(u<0||u>=W||v<0||v>=H||tY>=zbuf[u])continue;buf[v*W+u]=p.col}}
 for(const l of leaves){const sx=l.x-P.x,sy=l.y-P.y,tX=inv*(dy*sx-dx*sy),tY=inv*(-py*sx+px*sy);if(tY<.3)continue;
  const X=((W/2)*(1+tX/tY))|0,sc=projDist/tY,kind=l.kind||'leaf';
  const Y=(H/2+(.5-(kind==='leaf'?.4:(l.z||.2)))*sc)|0;
  if(X<0||X>=W||tY>=zbuf[X])continue;
  const fade=kind==='leaf'?1:Math.max(0,Math.min(1,l.life/(kind==='ember'?.35:1.2)));
  const col=kind==='leaf'?l.col:C((l.col&255)*fade,((l.col>>>8)&255)*fade,((l.col>>>16)&255)*fade);
  const sz=kind==='leaf'?Math.max(1,.045*sc|0):Math.max(1,Math.min(3,(kind==='ember'?.018:.012)*sc|0));
  if(kind==='ember'){
   const glow=sz>1?2:1;for(let a=-glow;a<=glow;a++)for(let b=-glow;b<=glow;b++){const u=X+a,v=Y+b;if(u<0||u>=W||v<0||v>=H||tY>=zbuf[u])continue;buf[v*W+u]=col}
  }else if(kind==='ash'){
   const u=X,v=Y;if(u>=0&&u<W&&v>=0&&v<H&&tY<zbuf[u])buf[v*W+u]=col;
   if(sz>1&&v+1<H&&v+1>=0)buf[(v+1)*W+u]=col;
  }else{
   for(let a=-sz;a<=sz;a++)for(let b=-sz;b<=sz;b++){const u=X+a,v=Y+b;if(u<0||u>=W||v<0||v>=H||tY>=zbuf[u])continue;buf[v*W+u]=col}
  }
 }
 /* MODO NOCHE: halos brillantes de los focos (postes, semáforos, torres, alarmas...) sobre la escena ya dibujada */
 if(NT)drawNightGlows(buf,zbuf,ztop,sdep,W,H,projDist,P.x,P.y,dx,dy,px,py,inv,ceilOn,ceilMask,ceilRow);
 setWeaponBrightness(NT?(P.muzzle>0?1:FL.on?.92:.5):1);
 ctx.putImageData(img,0,0);
 const tint=currentTint();if(tint){ctx.fillStyle=tint;ctx.fillRect(0,0,W,H)}
 if(weather==='rain'){ctx.strokeStyle=NT?'rgba(120,140,178,.4)':'rgba(180,200,220,.55)';ctx.lineWidth=1;ctx.beginPath();
  for(const r of rain){ctx.moveTo(r.x,r.y);ctx.lineTo(r.x+r.vx*.02,r.y+r.vy*.02)}ctx.stroke()}
 {const _k=bIdx[(P.y|0)*MW+(P.x|0)];postFx(W,H,level(qs),NT,weather==='rain',dayPhase,zbuf,_k>=0&&!!bAct[_k],FOG)}
 drawHudFx(W,H);drawEnemyBars(W,H);weapon(W,H);minimap()
}

/* setters para variables reasignadas desde otros módulos */
export function set_ceilMask(v){return ceilMask=v}
export function set_ceilRow(v){return ceilRow=v}
export function set_bTexK(v){return bTexK=v}
