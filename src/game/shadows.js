import { MH, MW } from './core.js';

/* ===== SOMBRAS EN TIEMPO REAL =====
   1) Mascara de sombra/oclusion ambiental sobre la grilla del mapa (SUBxSUB por celda): sombra direccional de muros y
      edificios hacia el sol (DDA), bordes suavizados (blur que ignora muros) y oscurecimiento junto a los muros (AO).
      Se calcula POR PARTES durante varios cuadros (presupuesto de ms) para no causar tirones; solo se rehace cuando cambia
      el mapa, el clima, el sol o la calidad. El primer calculo es completo (sincrono).
   2) Sombras "blob" bajo sprites (enemigos, aliados, cadaveres, props), proyectadas con la geometria de la camara.
   Interruptor: tecla H o shadowCfg.on = false. */

export const SUB=8,MS=MW*SUB,N=MS*MS;
export const shadowCfg={on:true,walls:true,blobs:true};
try{if(localStorage.getItem('xd_shadows')==='0')shadowCfg.on=false}catch(e){}
export function toggleShadows(){shadowCfg.on=!shadowCfg.on;try{localStorage.setItem('xd_shadows',shadowCfg.on?'1':'0')}catch(e){}return shadowCfg.on}

const solid=new Uint8Array(N),aoA=new Uint8Array(N),raw=new Uint8Array(N),tmp=new Uint8Array(N);
let cur=new Uint8Array(N).fill(255),work=new Uint8Array(N),have=false;
let lastSig=-1,nextChk=0,sigDirty=true,job=null,activeKey='';
export let sunX=.6,sunY=.8,strength=1;
const WEATHER_STR={clear:1,fog:.25,rain:.3,sandstorm:.5,night:.07},AO_AMT=.3;

/* ---------- etapas (cada una procesa filas j0..j1) ---------- */
function stSolidAO(c,j0,j1){
  const {map,bIdx,bAct}=c,inv=1/SUB;
  for(let j=j0;j<j1;j++){
    const y=(j+.5)*inv,cy=y|0,row=j*MS;
    for(let i=0;i<MS;i++){
      const x=(i+.5)*inv,cx=x|0,ci=cy*MW+cx;
      if(map[ci]||(bIdx&&bIdx[ci]>=0&&bAct[bIdx[ci]])){solid[row+i]=1;aoA[row+i]=255;continue}
      solid[row+i]=0;
      let dmin=9;
      for(let dy=-1;dy<=1;dy++){const ny=cy+dy;if(ny<0||ny>=MH)continue;
        for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx;if(nx<0||nx>=MW||!map[ny*MW+nx])continue;
          const ex=Math.max(nx-x,0,x-(nx+1)),ey=Math.max(ny-y,0,y-(ny+1)),d=Math.hypot(ex,ey);if(d<dmin)dmin=d}}
      if(dmin<.5){const f=1-dmin/.5;aoA[row+i]=(255*(1-AO_AMT*f*f))|0}else aoA[row+i]=255}}}

function stRaw(c,j0,j1){
  const {map}=c,inv=1/SUB,L=c.L,amp=.5*c.str,ddx=sunX===0?1e30:Math.abs(1/sunX),ddy=sunY===0?1e30:Math.abs(1/sunY),stx=sunX<0?-1:1,sty=sunY<0?-1:1;
  for(let j=j0;j<j1;j++){
    const y=(j+.5)*inv,cy=y|0,row=j*MS;
    for(let i=0;i<MS;i++){
      if(solid[row+i]){raw[row+i]=255;continue}
      const x=(i+.5)*inv,cx=x|0;
      let mx=cx,my=cy,sdx=sunX<0?(x-mx)*ddx:(mx+1-x)*ddx,sdy=sunY<0?(y-my)*ddy:(my+1-y)*ddy,hit=-1;
      for(let n=0;n<12;n++){
        let t;
        if(sdx<sdy){t=sdx;sdx+=ddx;mx+=stx}else{t=sdy;sdy+=ddy;my+=sty}
        if(t>L)break;
        if(mx<0||my<0||mx>=MW||my>=MH)break;
        if(map[my*MW+mx]){hit=t;break}}
      raw[row+i]=hit<0?255:(255*(1-amp*(1-.55*hit/L)))|0}}}

/* blur horizontal (src->dst) ignorando celdas solidas */
function stBlurH(c,j0,j1){const r=c.rad,src=c.src,dst=c.dst;
  for(let j=j0;j<j1;j++){const row=j*MS;
    for(let i=0;i<MS;i++){const o=row+i;if(solid[o]){dst[o]=255;continue}
      let s=0,n=0;for(let k=-r;k<=r;k++){const ii=i+k;if(ii<0||ii>=MS)continue;const q=row+ii;if(solid[q])continue;s+=src[q];n++}
      dst[o]=n?(s/n)|0:src[o]}}}
function stBlurV(c,j0,j1){const r=c.rad,src=c.src,dst=c.dst;
  for(let j=j0;j<j1;j++){
    for(let i=0;i<MS;i++){const o=j*MS+i;if(solid[o]){dst[o]=255;continue}
      let s=0,n=0;for(let k=-r;k<=r;k++){const jj=j+k;if(jj<0||jj>=MS)continue;const q=jj*MS+i;if(solid[q])continue;s+=src[q];n++}
      dst[o]=n?(s/n)|0:src[o]}}}

function stCombine(c,j0,j1){const useAO=c.ao;
  for(let j=j0;j<j1;j++){const row=j*MS;
    for(let i=0;i<MS;i++){const o=row+i,r=raw[o];work[o]=useAO?((r*aoA[o])/255)|0:r}}}

/* ---------- planificador ---------- */
function makeJob(ctx,withAO){
  const st=[];
  if(withAO)st.push({fn:stSolidAO,c:ctx});
  st.push({fn:stRaw,c:ctx});
  for(const rad of ctx.soft){
    st.push({fn:stBlurH,c:{rad,src:raw,dst:tmp}});
    st.push({fn:stBlurV,c:{rad,src:tmp,dst:raw}});}
  st.push({fn:stCombine,c:ctx});
  return{st,s:0,row:0,key:ctx.key}}

function runJob(budgetMs){
  const t0=performance.now();
  while(job){
    const S=job.st[job.s];
    const j1=Math.min(MS,job.row+16);
    S.fn(S.c,job.row,j1);job.row=j1;
    if(job.row>=MS){job.s++;job.row=0;
      if(job.s>=job.st.length){const t=cur;cur=work;work=t;have=true;activeKey=job.key;job=null;return}}
    if(budgetMs>=0&&performance.now()-t0>budgetMs)return}}

/* Devuelve la mascara (255 = sin sombra) o null si las sombras estan apagadas. Llamar una vez por cuadro.
   opts: {ao:boolean, soft:[radios de blur]} segun la calidad. */
export function updateShadows(map,bIdx,bAct,dayPhase,weather,opts){
  if(!shadowCfg.on||!shadowCfg.walls)return null;
  const ph=Math.round(Math.min(1,dayPhase)*12)/12;
  strength=WEATHER_STR[weather]!==undefined?WEATHER_STR[weather]:1;
  const az=.9+ph*1.1;sunX=Math.cos(az);sunY=Math.sin(az);
  const L=1.1+ph*1.9;
  const ao=!!(opts&&opts.ao),soft=(opts&&opts.soft)||[];
  const key=ph+'|'+weather+'|'+(ao?1:0)+'|'+soft.join(',');
  const now=performance.now();
  let mapChanged=false;
  if(now>=nextChk){
    nextChk=now+250;
    let sig=0;for(let i=0;i<map.length;i++)sig=(sig+map[i]*((i%251)+1))|0;
    if(bAct)for(let k=0;k<bAct.length;k++)if(bAct[k])sig=(sig+k*7+1)|0;
    if(sig!==lastSig){lastSig=sig;sigDirty=true}}
  if(sigDirty||key!==activeKey&&(!job||job.key!==key)){
    // si solo cambio el sol/clima/calidad (no el mapa) no hace falta rehacer solido+AO, salvo que antes no hubiera AO
    const needAO=sigDirty||(ao&&!aoReady);
    const ctx={map,bIdx,bAct,L,str:strength,ao,soft,key};
    job=makeJob(ctx,needAO);
    if(needAO)aoReady=ao||aoReady;
    sigDirty=false;
    if(!have)runJob(-1)}
  if(job)runJob(3);
  return have?cur:null}
let aoReady=false;

/* Sombra elipsoidal en el piso bajo un sprite. (wx,wy) = pie del sprite, r = radio en unidades de mundo.
   Se oscurece el buffer respetando el z-buffer (los muros la tapan). Debe dibujarse antes que los sprites. */
export function blobShadow(buf,zbuf,W,H,projDist,Px,Py,dx,dy,px,py,inv,wx,wy,r,fade){
  if(!shadowCfg.on||!shadowCfg.blobs)return;
  const k0=.55*strength*fade;if(k0<=.02)return;
  const sx=wx-sunX*r*.7-Px,sy=wy-sunY*r*.7-Py;
  const tX=inv*(dy*sx-dx*sy),tY=inv*(-py*sx+px*sy);
  if(tY<.35||tY>26)return;
  const sc=projDist/tY,cx=(W/2)*(1+tX/tY),cy=H/2+.5*sc,rr=r*sc,rx=rr*1.15,ry=Math.max(1.3,rr*.5/tY);
  if(cx+rx<0||cx-rx>=W||rx<.8)return;
  const hh=H>>1,xa=Math.max(0,Math.floor(cx-rx)),xb=Math.min(W-1,Math.ceil(cx+rx));
  for(let x=xa;x<=xb;x++){
    if(tY>=zbuf[x])continue;
    const ex=(x-cx)/rx,e2=1-ex*ex;if(e2<=0)continue;
    const hy=ry*Math.sqrt(e2),ya=Math.max(hh+1,Math.floor(cy-hy)),yb=Math.min(H-1,Math.ceil(cy+hy));
    for(let y=ya;y<=yb;y++){
      const ey=(y-cy)/ry,w=Math.min(1,2.4*(e2-ey*ey));if(w<=0)continue;
      const k=(256*(1-k0*w))|0,o=y*W+x,c=buf[o];
      buf[o]=(0xFF000000|((((c>>16)&255)*k>>8)<<16)|((((c>>8)&255)*k>>8)<<8)|((c&255)*k>>8))>>>0}}}
