import { resMul } from './quality.js';
import { $, C, MH, MW, clamp, gmap, hash, map, mulberry32 } from './core.js';
import { pblk } from './outposts.js';
import { FOG, NIGHT } from './textures.js';
import { P, isNight, mapMarkers, selectedMap, weather } from './state.js';
import { set_ceilMask, set_ceilRow } from './render.js';


export const canvas=$('scene'),ctx=canvas.getContext('2d',{alpha:false}),mm=$('mm'),mctx=mm.getContext('2d');

export let RW=320,RH=180,projDist=100,img,buf,zbuf,ztop,sky,SW=0,qs=1,ft=[],adapt=0;

export const PL=1.25;

/* ===== Fondo panoramico (como Doom): montanas lejanas, montanas cercanas y bosque, fijo al cielo y girando con la camara ===== */
export let skyMapKey='';


/* ===== Panorama del Frente de Ceniza: imagen pixel art incrustada. Montañas hacia la zona verde (norte), ruinas hacia la zona desvastada (sur) ===== */
const FRONT_PANO={ready:false,w:0,h:0,data:null};

const FRONT_PANO_READY=new Promise(resolve=>{const im=new Image();im.onload=()=>{try{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);FRONT_PANO.data=x.getImageData(0,0,c.width,c.height).data;FRONT_PANO.w=c.width;FRONT_PANO.h=c.height;FRONT_PANO.ready=true;skyMapKey='';if(sky&&selectedMap==='front')buildSky()}catch(err){}finally{resolve(FRONT_PANO.ready)}};im.onerror=()=>resolve(false);im.src=new URL('../assets/img/front-panorama.png',import.meta.url).href});
export function waitForBackdropAssets(){return FRONT_PANO_READY}

function drawFrontPano(hh){
 const P=FRONT_PANO;if(!P.ready)return false;
 const d=P.data,sW=P.w,sH=P.h,F=FOG,wx=weather,TN=.6204;
 const gx=new Float32Array(SW),gx2=new Float32Array(SW),gw=new Float32Array(SW);
 // Circulo completo: la imagen entera ocupa el medio circulo del norte (montañas centradas al mirar al norte); el sur repite las ruinas en espejo
 for(let x=0;x<SW;x++){
  const t=x/SW;let a=0,b=-1,w=0;
  if(t>=TN||t<TN-.5)a=((t>=TN?t-TN:t+1-TN)/.5)*(sW-1);
  else if(t<.2204)a=(sW-1)-(t-(TN-.5))/.10*280;
  else if(t<.2404){a=(sW-1)-(t-(TN-.5))/.10*280;b=(t-.2204)/.195*330;w=(t-.2204)/.02}
  else if(t<.4154)a=(t-.2204)/.195*330;
  else a=330-(t-.4154)/.205*330;
  gx[x]=Math.max(0,Math.min(sW-1.001,a));gx2[x]=b<0?-1:Math.max(0,Math.min(sW-1.001,b));gw[x]=w}
 const samp=(sx,sy,o)=>{const x0=sx|0,y0=sy|0,fx=sx-x0,fy=sy-y0,i00=(y0*sW+x0)*4,i10=i00+4,i01=i00+sW*4,i11=i01+4;
  for(let k=0;k<3;k++)o[k]=(d[i00+k]*(1-fx)+d[i10+k]*fx)*(1-fy)+(d[i01+k]*(1-fx)+d[i11+k]*fx)*fy};
 const c1=[0,0,0],c2=[0,0,0];
 for(let y=0;y<hh;y++){const sy=Math.max(0,Math.min(sH-1.001,(y+.5)/hh*sH-.5));
  for(let x=0;x<SW;x++){
   samp(gx[x],sy,c1);let r=c1[0],g=c1[1],b=c1[2];
   if(gx2[x]>=0){samp(gx2[x],sy,c2);const w=gw[x];r=r*(1-w)+c2[0]*w;g=g*(1-w)+c2[1]*w;b=b*(1-w)+c2[2]*w}
   if(wx==='rain'){r*=.8;g*=.84;b*=.92}
   else if(wx==='fog'){r=r*.62+F[0]*.38;g=g*.62+F[1]*.38;b=b*.62+F[2]*.38}
   else if(wx==='sandstorm'){r=r*.52+200*.48;g=g*.52+150*.48;b=b*.52+90*.48}
   sky[y*SW+x]=C(r,g,b)}}
 return true}

function drawBackdrop(hh,F){
 const front=selectedMap==='front',rainy=weather==='rain',fogy=weather==='fog',sand=weather==='sandstorm';
 // Niebla atmosferica: cuanto mas lejos la capa, mas se funde con el color del horizonte
 const haze=fogy?.55:sand?.5:rainy?.22:0;
 const pal=front?{far:[78,66,70],near:[52,42,44],tree:[24,20,20],snow:[120,108,108],city:[0,0,0]}
              :{far:[92,114,152],near:[58,84,92],tree:[22,56,30],snow:[236,242,252],city:[46,54,74]};
 if(sand){pal.far=[168,128,84];pal.near=[142,104,64];pal.tree=[96,74,46];pal.city=[130,100,68]}
 else if(rainy){for(const k of ['far','near','tree','city'])pal[k]=pal[k].map(v=>v*.72)}
 const nite=isNight()&&!!NIGHT;
 if(nite){const nm=NIGHT;for(const k of ['far','near','tree','snow','city'])pal[k]=pal[k].map((v,i)=>v*nm[i]*.8)}
 const mix=(c,a,f)=>[c[0]+(F[0]-c[0])*a,c[1]+(F[1]-c[1])*a,c[2]+(F[2]-c[2])*a];
 const cFar=mix(pal.far,.36+haze*.6),cNear=mix(pal.near,.14+haze*.8),cTree=mix(pal.tree,.04+haze*.85),cSnow=mix(pal.snow,.30+haze*.6),cCity=mix(pal.city,.20+haze*.75);
 // Ruido 1D periodico (se repite sin costuras al dar la vuelta de 360 grados)
 const pn=(x,per,seed)=>{const xi=Math.floor(x),f=x-xi,u=f*f*(3-2*f),a=hash(((xi%per)+per)%per,0,seed),b=hash((((xi+1)%per)+per)%per,0,seed);return a*(1-u)+b*u};
 const ridge=(t,seed)=>{let v=0,a=.55,tot=0;for(const k of [3,7,15,33,71]){v+=a*(1-Math.abs(2*pn(t*k,k,seed+k)-1));tot+=a;a*=.66}return v/tot};
 const tcount=Math.round(SW/10),rm=(v)=>Math.max(0,Math.min(1,(v-.30)/.42));
 // Ciudad lejana (solo distrito): edificios en grupos, algunos incendiandose con humo negro
 const cityH=new Int16Array(SW),cityId=new Int16Array(SW).fill(-1),cityX0=[],cityW=[],cityTop=[],cityR=[];let burning=[];
 if(!front){
  for(let thr=.46,att=0;att<4;att++,thr-=.14){
   cityH.fill(0);cityId.fill(-1);cityX0.length=0;cityW.length=0;cityTop.length=0;burning=[];cityR.length=0;
   const rng=mulberry32(0xC17E5+att);
   let x=Math.floor(rng()*20);
   while(x<SW){
    const t=x/SW,dens=pn(t*5,5,201)*.65+pn(t*13,13,202)*.35;
    if(dens<thr){x+=10+Math.floor(rng()*14);continue}
    const w=9+Math.floor(rng()*17),tall=pn(t*14,14,203);
    const h=Math.floor(hh*(.13+.22*Math.pow(rng(),1.4)+.10*tall*rng()));
    const bi=cityX0.length,rr=[rng(),rng(),rng(),rng()];
    cityX0.push(x);cityW.push(w);cityTop.push(h);cityR.push(rr);
    for(let k=0;k<w;k++){const xx=(x+k)%SW;cityH[xx]=h;cityId[xx]=bi}
    if(rr[0]>.82&&w>11){const cx=(x+(w>>1))%SW;cityH[cx]=h+4+Math.floor(rr[1]*5);cityH[(cx+1)%SW]=cityH[cx]} /* antena */
    else if(rr[2]>.74)burning.push(bi);
    x+=w+2+Math.floor(rng()*9);
   }
   if(cityX0.length>=SW/42)break;
  }
 }
 for(let x=0;x<SW;x++){
  const t=x/SW;
  const rf=rm(ridge(t,11)),rn=rm(ridge(t,47));
  const hFar=Math.floor(hh*(.14+.50*Math.pow(rf,1.25)));
  const hNear=Math.floor(hh*(.07+.30*Math.pow(rn,1.15)));
  const ti=Math.floor(t*tcount),tf=t*tcount-ti,th=.55+.45*hash(ti,0,91),tw=.46;
  let cone=Math.max(0,1-Math.abs(tf-.5)/tw);cone=Math.ceil(cone*5)/5; /* conifera en capas */
  const tree=front?(hash(ti,0,93)>.55?1:.25):1; /* en el frente casi todo son troncos secos */
  const hTree=Math.floor(hh*(.035+.025*pn(t*20,20,5))+hh*.15*th*cone*tree);
  for(let y=hh-1;y>=0;y--){
   const up=hh-y;if(up>hFar&&up>hNear&&up>hTree&&up>cityH[x])break;
   let col=null,n=(hash(x,y,77)-.5)*.12;
   if(up<=hFar){const rel=up/hFar;col=cFar;if(!front&&rel+(hash(x>>1,0,61)-.5)*.14>.86&&hFar>hh*.38){col=cSnow}else col=[col[0]*(1-rel*.18),col[1]*(1-rel*.18),col[2]*(1-rel*.18)]}
   if(up<=hNear){const rel=up/hNear;col=[cNear[0]*(1.12-rel*.3),cNear[1]*(1.12-rel*.3),cNear[2]*(1.12-rel*.3)]}
   if(up<=cityH[x]&&cityId[x]>=0){const bi=cityId[x],wx=(x-cityX0[bi]+SW)%SW,bh=cityTop[bi],sh=.88+cityR[bi][3]*.24;
    let k=sh*(1.06-up/Math.max(1,bh)*.14);
    if(wx===0)k*=.82;
    col=[cCity[0]*k,cCity[1]*k,cCity[2]*k];
    if(up>3&&up<bh-2&&wx>0&&wx<cityW[bi]-1&&(wx&3)>=1&&(wx&3)<=2&&(up&3)<=1){const hv=hash(bi*7919+(wx>>2)*104729,(up>>2)+1013,50);
     if(hv>(nite?.8:.93))col=[255*(1-haze*.6)+F[0]*haze*.6,(hv>.9?196:170)*(1-haze*.6)+F[1]*haze*.6,(hv>.9?110:80)*(1-haze*.6)+F[2]*haze*.6];else if(hv>.42)col=[col[0]*.68,col[1]*.68,col[2]*.7]}
   }
   if(up<=hTree){const rel=up/hTree;col=[cTree[0]*(.7+rel*.5),cTree[1]*(.7+rel*.5),cTree[2]*(.7+rel*.5)]}
   if(col){const m=1+n;sky[y*SW+x]=C(clamp(col[0]*m,0,255),clamp(col[1]*m,0,255),clamp(col[2]*m,0,255))}
  }
 }
 // Humo negro de ambiente sobre los edificios en llamas
 const smokeC=mix([26,24,26],.10+haze*.7);
 for(const bi of burning){
  const cx=cityX0[bi]+(cityW[bi]>>1),topY=hh-cityTop[bi],ph=Math.floor(hh*(.42+.28*cityR[bi][0])),lean=.16+cityR[bi][1]*.18,ph0=cityR[bi][3]*6.28;
  for(let r=0;r<ph;r++){const yy=topY-r;if(yy<0)break;
   const cxr=cx+r*lean+Math.sin(r*.085+ph0)*2.4*(r/ph+.2),hw=1.6+r*.2,fade=Math.pow(1-r/ph,.75);
   for(let xx=Math.floor(cxr-hw);xx<=Math.ceil(cxr+hw);xx++){
    const d=Math.abs(xx-cxr)/hw;if(d>1)continue;
    const a=(1-d*d)*fade*(.55+.45*hash((xx>>1)*7+bi*131,(yy>>1)+977,60));
    const px=((xx%SW)+SW)%SW;if(hash(px*3+1,yy*5+7,29)>a*1.25)continue;
    const c=sky[yy*SW+px],k=.78-(r/ph)*.18;
    const R=(c&255)*(1-k)+smokeC[0]*k,G=((c>>8)&255)*(1-k)+smokeC[1]*k,B=((c>>16)&255)*(1-k)+smokeC[2]*k;
    sky[yy*SW+px]=C(R,G,B)}}
  // llamas en el techo
  for(let i=-2;i<=2;i++)for(let j=0;j<3-Math.abs(i);j++){if(hash(cx*5+i+1000,j*3+7,67)>.25){const px=((cx+i)%SW+SW)%SW,yy=topY-j-1;if(yy>=0)sky[yy*SW+px]=C(255*(1-haze*.4)+F[0]*haze*.4,(j?150:95)*(1-haze*.4)+F[1]*haze*.4,(j?38:20)*(1-haze*.4)+F[2]*haze*.4)}}
 }
}

export function buildSky(){SW=Math.round(RW*3.6);const hh=RH/2|0;sky=new Uint32Array(SW*hh);const sx=SW*.3,sy=hh*.38;
 const nite=isNight()&&!!NIGHT,starry=nite&&(weather==='clear'||weather==='fog');
 const F=FOG,T=nite?(weather==='rain'?[6,9,20]:weather==='sandstorm'?[22,16,12]:[3,6,22]):weather==='rain'?[92,106,124]:weather==='fog'?[150,164,180]:weather==='sandstorm'?[190,150,96]:[55,125,222],sunOn=weather==='clear'&&!nite,thr=weather==='clear'?.5:.3;
 const vn=(x,y,p)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),h=(a,b)=>hash(((a%p)+p)%p,b,5);
  return(h(xi,yi)*(1-u)+h(xi+1,yi)*u)*(1-v)+(h(xi,yi+1)*(1-u)+h(xi+1,yi+1)*u)*v};
 for(let y=0;y<hh;y++){const f=y/hh;for(let x=0;x<SW;x++){let r=T[0]+(F[0]-T[0])*f,g=T[1]+(F[1]-T[1])*f,b=T[2]+(F[2]-T[2])*f;
  let cl=vn(x/SW*8,y/hh*3,8)*.6+vn(x/SW*16,y/hh*6,16)*.4;cl=clamp((cl-thr)*3,0,1)*Math.min(1,(1-f)*2.4)*.9;
  if(nite){const cc=cl*.5;r+=(30-r)*cc;g+=(38-g)*cc;b+=(64-b)*cc}else{r+=(255-r)*cl;g+=(255-g)*cl;b+=(255-b)*cl}
  let dx=Math.abs(x-sx);dx=Math.min(dx,SW-dx);const d=Math.hypot(dx,(y-sy))/hh;
  if(sunOn&&d<.04){r=255;g=252;b=220}else if(sunOn){const gl=Math.pow(Math.max(0,1-d*2.4),2);r+=gl*90;g+=gl*70;b+=gl*20}
  else if(nite&&weather!=='rain'){
   /* luna llena con halo suave */
   if(d<.055){const lim=d/.055,cr=hash(x>>1,y>>1,311)>.9&&lim>.25&&lim<.8?.86:1;r=225*cr;g=232*cr;b=245*cr}
   else{const gl=Math.pow(Math.max(0,1-d*3.2),2.4);r+=gl*52;g+=gl*62;b+=gl*92}}
  if(starry&&y<hh*.8){const hs=hash(x,y,617);if(hs>.9962){const tw=hs>.9992?1:.55,fade=Math.min(1,(1-f)*1.8);r+=(235-r)*tw*fade;g+=(240-g)*tw*fade;b+=(255-b)*tw*fade}}
  sky[y*SW+x]=C(r,g,b)}}
if(!(selectedMap==='front'&&drawFrontPano(hh)))drawBackdrop(hh,F);skyMapKey=selectedMap}

export function resize(){const cw=innerWidth,ch=innerHeight,as=cw/ch;let rh=Math.round(Math.sqrt(105000*qs*resMul()/as)),rw=Math.round(rh*as);
 rw=clamp(rw,200,760);rh=clamp(Math.round(rw/as),120,900);const ch0=RW!==rw||RH!==rh;RW=rw;RH=rh;canvas.width=RW;canvas.height=RH;
 img=ctx.createImageData(RW,RH);buf=new Uint32Array(img.data.buffer);zbuf=new Float32Array(RW);ztop=new Int16Array(RW);set_ceilMask(new Uint8Array(RW*RH));set_ceilRow(new Float32Array(RH));projDist=RW/(2*PL);if(ch0||!sky)buildSky()}

addEventListener('resize',resize);
addEventListener('orientationchange',()=>setTimeout(resize,200));


export const mmBase=document.createElement('canvas');
mmBase.width=MW;
mmBase.height=MH;

export function rebuildMinimap(){
  const c=mmBase.getContext('2d');
  const im=c.createImageData(MW,MH);
  const b=new Uint32Array(im.data.buffer);
  const col=[C(80,80,90),C(130,130,135),C(90,140,80),C(140,110,70),C(80,80,90),C(80,80,90),C(110,105,95)];
  for(let i=0;i<MW*MH;i++)b[i]=map[i]?C(40,40,44):col[gmap[i]||0];
  c.putImageData(im,0,0);
}

const CW=8;

const compassStrip=$('compassStrip');

{let html='';
 for(let i=0;i<CW;i++){
  const dirs=['N','NE','E','SE','S','SO','O','NO'];
  const isCard=i%2===0;
  html+='<span'+(isCard?' class="card"':'')+'>'+dirs[i]+'</span>';
 }
 compassStrip.innerHTML=html+html+html;
 compassStrip.style.width=compassStrip.scrollWidth+'px';
}

export function updCompass(){
 const dirs=8,unit=50,heading=P.a+Math.PI/2;
 const norm=((heading/(Math.PI*2))%1+1)%1;
 const cw=compassEl.clientWidth||220,centerX=cw/2;
 const centerIdx=norm*dirs;
 const offset=centerX-unit/2-(centerIdx*unit);
 compassStrip.style.transform='translateX('+(offset-unit*dirs)+'px)';
 /* marcas del mapa tactico en la brujula */
 const host=$('compassMarks'),ms=mapMarkers;
 while(compassMarks.length<ms.length){const e=document.createElement('span');e.className='cm';host.appendChild(e);compassMarks.push(e)}
 for(let i=0;i<compassMarks.length;i++){
  const e=compassMarks[i];
  if(i>=ms.length){if(e.style.display!=='none')e.style.display='none';continue}
  const m=ms[i];let rel=Math.atan2(m.y-P.y,m.x-P.x)-P.a;
  rel=Math.atan2(Math.sin(rel),Math.cos(rel));
  let x=centerX+rel/(Math.PI*2)*(unit*dirs);
  const lo=cw*.12,hi=cw*.88,edge=x<lo||x>hi;x=Math.max(lo,Math.min(hi,x));
  const txt='\u25C6<small>'+Math.round(Math.hypot(m.x-P.x,m.y-P.y))+'m</small>';
  if(e._t!==txt){e.innerHTML=txt;e._t=txt}
  if(e.style.display!=='block')e.style.display='block';
  e.classList.toggle('edge',edge);
  e.style.transform='translateX('+(x-5).toFixed(1)+'px)';
 }
}

const compassEl=$('compass');
let compassMarks=[];


const flow=new Int16Array(MW*MH);
export let flowT=0;

export const D4=[[1,0],[-1,0],[0,1],[0,-1]],D8=D4.concat([[1,1],[1,-1],[-1,1],[-1,-1]]);

export function buildFlow(){flow.fill(-1);const q=[(P.y|0)*MW+(P.x|0)];flow[q[0]]=0;
 for(let h=0;h<q.length;h++){const c=q[h],cx=c%MW,cy=(c/MW)|0;for(const d of D4){const nx=cx+d[0],ny=cy+d[1];if(nx<0||ny<0||nx>=MW||ny>=MH)continue;const n=ny*MW+nx;if(flow[n]>=0||map[n]||pblk[n])continue;flow[n]=flow[c]+1;q.push(n)}}}

export function flowDir(e){const cx=e.x|0,cy=e.y|0;let b=flow[cy*MW+cx],bx=0,by=0;if(b<0)b=1e9;
 for(const d of D8){const n=(cy+d[1])*MW+cx+d[0];if(flow[n]<0||map[n]||pblk[n])continue;if(d[0]&&d[1]&&(map[cy*MW+cx+d[0]]||map[(cy+d[1])*MW+cx]||pblk[cy*MW+cx+d[0]]||pblk[(cy+d[1])*MW+cx]))continue;if(flow[n]<b){b=flow[n];bx=d[0];by=d[1]}}
 if(!bx&&!by)return null;const dx=cx+.5+bx-e.x,dy=cy+.5+by-e.y,l=Math.hypot(dx,dy)||1;return[dx/l,dy/l]}

/* setters para variables reasignadas desde otros módulos */
export function set_qs(v){return qs=v}
export function set_adapt(v){return adapt=v}
export function set_flowT(v){return flowT=v}
