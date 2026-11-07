import { WEAPONS } from './data.js';
import { P, gt } from './state.js';
import { ctx } from './backdrop.js';
import { B_D, B_D_2, B_D_3, B_D_4, B_D_5, B_D_6, B_D_7, B_D_8 } from '../data/graphics.js';

const WEAPON_ASSET_IMAGES=[];
const trackWeaponImage=im=>(WEAPON_ASSET_IMAGES.push(im),im);
export function waitForWeaponAssets(){return Promise.all(WEAPON_ASSET_IMAGES.map(im=>{if(im.complete)return Promise.resolve(im.naturalWidth>0);return new Promise(resolve=>{im.addEventListener('load',()=>resolve(true),{once:true});im.addEventListener('error',()=>resolve(false),{once:true})})}))}

const WP=[
 [['#2a2a32',-7,62,14,52],['#46465a',-9,34,18,34],['#62627a',-11,20,22,20],['#16161c',-3,70,6,12],['#a0a0b4',-2,68,4,3],['#d9a77c',-12,14,24,14]],
 [['#22242c',-14,74,12,60],['#22242c',2,74,12,60],['#3c404e',-15,44,30,30],['#565a6c',-17,26,34,26],['#14161c',-12,82,10,10],['#14161c',2,82,10,10],['#7c8196',-11,78,8,3],['#d9a77c',-14,14,28,14]],
 [['#1c1d22',-5,92,10,70],['#30333a',-12,50,24,34],['#44474f',-14,28,28,24],['#0e0f12',-3,100,6,12],['#5a5d68',-9,68,18,6],['#22242c',-6,40,12,22],['#d9a77c',-14,14,28,14]],
 [['#5a4329',-10,94,20,74],['#25292a',-5,76,10,50],['#6b5232',-14,46,28,30],['#313538',-17,30,34,18],['#17191a',-4,24,8,28],['#25292a',-3,98,6,14],['#d9a77c',-14,14,28,14]],
 [['#333638',-15,96,30,72],['#505457',-20,60,40,28],['#222629',-24,40,48,18],['#17191b',-5,25,10,35],['#62676a',-7,75,14,8],['#242729',-17,100,34,14],['#d9a77c',-14,14,28,14]],
 [['#333b32',-5,100,10,78],['#3e493b',-12,68,24,32],['#68745e',-14,42,28,24],['#171b17',-3,27,6,34],['#242b23',-8,83,16,8],['#d9a77c',-13,14,26,14]],
 [['#2e332a',-10,34,20,14],['#0e0f0c',-6,33,12,8],
  ['#3a3f36',-6,78,12,54],['#555c4d',-5,78,3,54],['#262a22',3,78,3,54],
  ['#8b5a2b',-9,62,18,24],['#6b4220',-9,62,18,3],['#6b4220',-9,41,18,3],['#a06a35',-6,59,3,17],
  ['#1b1d1b',-17,72,9,24],['#7fb2e5',-16,71,7,3],['#101210',-16,50,7,3],['#2a2d29',-9,64,3,5],
  ['#5d6f4a',-10,94,20,16,1],['#2b2b2b',-10,87,20,3,1],['#4a5a3c',-7,103,14,9,1],['#35352f',-4,108,8,5,1],['#b8b8b0',-1.5,111,3,3,1],
  ['#d9a77c',-11,54,22,9],['#b98a62',-11,54,22,2],['#d9a77c',-14,14,28,14]]
 ];

/* BERETTA 92FS: sprites HD (reposo / recarga / llama). Se dibujan en una capa propia a resolución real de pantalla
   (no en el lienzo de baja resolución del juego) para que se vean nítidos y no borrosos.
   Medidas en píxeles del PNG: g = reposo, r = recarga (manga extendida abajo para que el brazo nunca quede cortado). */
/* Cuadros HD (sprite sheet de recarga, Beretta): 0 = reposo, 1..7 = recarga (cargador fuera, nuevo cargador, corredera...).
   Todos están alineados por la muñeca en un mismo espacio de referencia (px del cuadro de reposo) y con el brazo
   prolongado para que nunca se vea cortado. PF[i] = [x, y, ancho, alto] de cada imagen en ese espacio. */
const PF=[[0,0,406,605],[-46,-38,380,605],[-53,-10,386,605],[-78,-4,370,605],[-82,-18,363,645],[-19,-68,356,646],[12,-83,312,645],[-9,-80,355,648]];
const PISTOL_IMG={a:[],f:trackWeaponImage(new Image()),ok:0,need:PF.length+1,
 MX:57.36,BH:288,GW:239,   /* x de la boca del cañón, alto visible del cuadro de reposo, ancho del cuadro de reposo */
 fw:200,fh:242};          /* llama */
[new URL('../assets/img/pistol_a0.webp',import.meta.url).href,new URL('../assets/img/pistol_a1.webp',import.meta.url).href,new URL('../assets/img/pistol_a2.webp',import.meta.url).href,new URL('../assets/img/pistol_a3.webp',import.meta.url).href,new URL('../assets/img/pistol_a4.webp',import.meta.url).href,new URL('../assets/img/pistol_a5.webp',import.meta.url).href,new URL('../assets/img/pistol_a6.webp',import.meta.url).href,new URL('../assets/img/pistol_a7.webp',import.meta.url).href].forEach(u=>{const im=trackWeaponImage(new Image());im.onload=()=>{PISTOL_IMG.ok++};im.src=u;PISTOL_IMG.a.push(im)});
PISTOL_IMG.f.onload=()=>{PISTOL_IMG.ok++};
PISTOL_IMG.f.src=new URL('../assets/img/pistol_f.png',import.meta.url).href;

/* capa HD del arma: un canvas encima de la escena, a resolución nativa de la pantalla */
const WCV=document.createElement('canvas');WCV.id='weaponHD';
WCV.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:1;display:none';
document.getElementById('scene').insertAdjacentElement('afterend',WCV);   /* ojo: sin usar valores importados al cargar (módulos circulares) */
const WCTX=WCV.getContext('2d');
/* modo noche: el arma en mano se oscurece como el resto de la escena (más clara con la linterna o al disparar) */
let wcvBright=1;
export function setWeaponBrightness(v){v=Math.round(v*50)/50;if(v===wcvBright)return;wcvBright=v;WCV.style.filter=v>=.99?'':'brightness('+v+')'}
let wcvLast=0,wcvOn=false;
function wcvFit(){const dpr=Math.min(window.devicePixelRatio||1,2),cw=Math.max(2,Math.min(2400,Math.round(innerWidth*dpr))),ch=Math.max(2,Math.min(2400,Math.round(innerHeight*dpr)));
 if(WCV.width!==cw||WCV.height!==ch){WCV.width=cw;WCV.height=ch}}
function wcvHide(){if(wcvOn){WCTX.setTransform(1,0,0,1,0,0);WCTX.clearRect(0,0,WCV.width,WCV.height);WCV.style.display='none';wcvOn=false}}
/* si el juego deja de dibujar (menús, muerte, pausa total) la capa se oculta sola para no quedarse congelada */
setInterval(()=>{if(wcvOn&&performance.now()-wcvLast>250)wcvHide()},200);

const M4_IMG={g:trackWeaponImage(new Image()),f:trackWeaponImage(new Image()),r:trackWeaponImage(new Image()),ok:0,gw:119,gh:231,bx:0.50,fw:168,fh:209,rw:98,rh:451};

 M4_IMG.g.onload=()=>{M4_IMG.ok|=1};

 M4_IMG.f.onload=()=>{M4_IMG.ok|=2};

 M4_IMG.r.onload=()=>{M4_IMG.ok|=4};

 M4_IMG.g.src=new URL('../assets/img/m4_g.png',import.meta.url).href;

 M4_IMG.f.src=new URL('../assets/img/m4_f.png',import.meta.url).href;

 M4_IMG.r.src=new URL('../assets/img/m4_r.png',import.meta.url).href;

 function drawM4Sprite(W,H){
  const I=M4_IMG,wk=P.walkAmt||0,t=P.bob;
  const dh=H*.43,dw=dh*I.gw/I.gh;
  let sx=Math.sin(t)*W*(.006+.03*wk), sy=Math.abs(Math.cos(t))*H*(.004+.022*wk);
  let rot=Math.sin(t)*(.006+.03*wk), rise=0, liftRot=0;
  if(P.muzzle>0){
   sy+=H*.035*Math.min(1,P.muzzle/.09);
   rise-=H*.015*Math.min(1,P.muzzle/.09);
  }
  let reloadPhase=0;
  if(P.reloading>0&&P.reloadTotal>0){
   const k=1-P.reloading/P.reloadTotal;
   const e=Math.sin(k*Math.PI);
   rise=e*H*.05;
   rot-=e*.18;
   sx+=e*W*.015;
   reloadPhase=k;
   liftRot=e*.18;
  }
  const px=W/2+W*.012+sx, py=H+sy-rise;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.translate(px+dw*.35,H);ctx.rotate(rot+liftRot);ctx.translate(-(px+dw*.35),-H);
  const x0=px-I.bx*dw, y0=py-dh+dh*.02;
  if(P.reloading>0&&P.reloadTotal>0&&reloadPhase>0.15&&reloadPhase<0.85){
   // FIX: anclado abajo para que no se vea cortado / vacio
   const rdh=H*.62, rdw=rdh*I.rw/I.rh;
   const rx0=px-rdw*0.48, ry0=H-rdh+H*.02 + sy*0.5;
   ctx.drawImage(I.r,rx0,ry0,rdw,rdh);
  }else{
   ctx.drawImage(I.g,x0,y0,dw,dh);
   if(P.muzzle>0){
    const m=Math.min(1,P.muzzle/.09);
    const fw=dw*.70*(.85+.4*m+Math.random()*.15),fh=fw*I.fh/I.fw;
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=Math.min(1,.55+m*.45);
    ctx.drawImage(I.f,px-fw/2,y0-fh*.78,fw,fh);
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
   }
  }
  ctx.restore();
 }


 const AK_IMG={g:trackWeaponImage(new Image()),f:trackWeaponImage(new Image()),r:trackWeaponImage(new Image()),ok:0,gw:113,gh:216,bx:0.411,fw:168,fh:204,rw:90,rh:435};

 AK_IMG.g.onload=()=>{AK_IMG.ok|=1};
AK_IMG.f.onload=()=>{AK_IMG.ok|=2};
AK_IMG.r.onload=()=>{AK_IMG.ok|=4};

 AK_IMG.g.src=new URL('../assets/img/ak_g.png',import.meta.url).href;
AK_IMG.f.src=new URL('../assets/img/ak_f.png',import.meta.url).href;
AK_IMG.r.src=new URL('../assets/img/ak_r.png',import.meta.url).href;

const MG_IMG={g:trackWeaponImage(new Image()),f:trackWeaponImage(new Image()),r:trackWeaponImage(new Image()),ok:0,gw:140,gh:222,bx:0.476,fw:167,fh:204,rw:88,rh:436};

 MG_IMG.g.onload=()=>{MG_IMG.ok|=1};
MG_IMG.f.onload=()=>{MG_IMG.ok|=2};
MG_IMG.r.onload=()=>{MG_IMG.ok|=4};

 MG_IMG.g.src=new URL('../assets/img/mg_g.png',import.meta.url).href;
MG_IMG.f.src=new URL('../assets/img/mg_f.png',import.meta.url).href;
MG_IMG.r.src=new URL('../assets/img/mg_r.png',import.meta.url).href;

function drawGunImg(I,W,H,K){
  const wk=P.walkAmt||0,t=P.bob;
  const dh=H*.43*K,dw=dh*I.gw/I.gh;
  let sx=Math.sin(t)*W*(.006+.03*wk), sy=Math.abs(Math.cos(t))*H*(.004+.022*wk);
  let rot=Math.sin(t)*(.006+.03*wk), rise=0, liftRot=0, reloadPhase=0;
  if(P.muzzle>0){const m=Math.min(1,P.muzzle/.09);sy+=H*.035*m;rise-=H*.015*m}
  if(P.reloading>0&&P.reloadTotal>0){const k=1-P.reloading/P.reloadTotal,e=Math.sin(k*Math.PI);rise=e*H*.05;rot-=e*.18;sx+=e*W*.015;reloadPhase=k;liftRot=e*.18}
  const px=W/2+W*.012+sx, py=H+sy-rise;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.translate(px+dw*.35,H);ctx.rotate(rot+liftRot);ctx.translate(-(px+dw*.35),-H);
  const x0=px-I.bx*dw, y0=py-dh+dh*.02;
  if(P.reloading>0&&P.reloadTotal>0&&reloadPhase>0.15&&reloadPhase<0.85){
   const rdh=H*.62*K, rdw=rdh*I.rw/I.rh;
   ctx.drawImage(I.r,px-rdw*0.48,H-rdh+H*.02+sy*0.5,rdw,rdh);
  }else{
   ctx.drawImage(I.g,x0,y0,dw,dh);
   if(P.muzzle>0){const m=Math.min(1,P.muzzle/.09),fw=dw*.70*(.85+.4*m+Math.random()*.15),fh=fw*I.fh/I.fw;
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(1,.55+m*.45);
    ctx.drawImage(I.f,px-fw/2,y0-fh*.78,fw,fh);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  }
  ctx.restore();
 }


 const RPG_IMG={ok:0,n:0,im:{},m:{"L": [192, 328], "E": [188, 273], "R0": [181, 231], "R1": [242, 185], "R2": [238, 250], "R3": [199, 254], "F": [169, 207], "S": [220, 232], "Etip": 0.3222517730496454}};

 {const D={L:B_D,E:B_D_2,R0:B_D_3,R1:B_D_4,R2:B_D_5,R3:B_D_6,F:B_D_7,S:B_D_8};for(const k of ["L", "E", "R0", "R1", "R2", "R3", "F", "S"]){const i=trackWeaponImage(new Image());i.onload=()=>{if(++RPG_IMG.n===8)RPG_IMG.ok=1};i.src='data:image/png;base64,'+D[k];RPG_IMG.im[k]=i}}

 function drawRpgSprite(W,H){
  const I=RPG_IMG,M=I.m,wk=P.walkAmt||0,t=P.bob,sc=H*.68/M.L[1];
  let sx=Math.sin(t)*W*(.006+.03*wk), sy=Math.abs(Math.cos(t))*H*(.004+.022*wk), rot=Math.sin(t)*(.004+.02*wk);
  if(P.muzzle>0)sy+=H*.03*Math.min(1,P.muzzle/.12);
  let key=P.mag[6]>0?'L':'E';
  if(P.reloading>0&&P.reloadTotal>0){const k=1-P.reloading/P.reloadTotal;key=k<.22?'R0':k<.5?'R1':k<.78?'R2':'R3'}
  const iw=M[key][0],ih=M[key][1],dw=iw*sc,dh=ih*sc;
  const bx=W/2+M.L[0]*.8*sc+sx,by=H+sy+H*.24; /* esquina inferior derecha fija: todos los cuadros encajan entre sí */
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.translate(bx-dw*.5,H);ctx.rotate(rot);ctx.translate(-(bx-dw*.5),-H);
  ctx.drawImage(I.im[key],bx-dw,by-dh,dw,dh);
  const ew=M.E[0]*sc,eh=M.E[1]*sc,tx=bx-ew+M.Etip*ew,ty=by-eh; /* punta del tubo */
  if(P.muzzle>0){const m=Math.min(1,P.muzzle/.12),fw=ew*.95*(.85+.3*m+Math.random()*.15),fh=fw*M.F[1]/M.F[0];
   ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(1,.5+m);ctx.drawImage(I.im.F,tx-fw/2,ty-fh*.85,fw,fh);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  const age=gt-(P.rpgSmoke===undefined?-99:P.rpgSmoke);
  if(age>=0&&age<3.4){const u=age/3.4,ss=ew*(.4+.9*u),sh=ss*M.S[1]/M.S[0];ctx.globalAlpha=.75*Math.pow(1-u,1.1);
   ctx.drawImage(I.im.S,tx-ss*.5,ty-sh*.7-u*H*.07,ss,sh);ctx.globalAlpha=1}
  ctx.restore()}

 const sstep=(a,b,x)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x)};
 /* mAng/mOffX/pivY: golpe cuerpo a cuerpo (mismo giro que usan las demás armas) */
 /* orden de cuadros de la recarga: reposo -> cargador fuera -> cae -> cargador nuevo -> insertar -> corredera -> reposo */
 const RSEQ=[0,1,2,3,4,5,6,7,0],RB=[.07,.17,.28,.41,.55,.68,.80,.91],RHW=.022;
 function drawPistolSprite(W,H,mAng,mOffX,pivY){
  const I=PISTOL_IMG,wk=P.walkAmt||0,t=P.bob;
  wcvFit();wcvLast=performance.now();if(!wcvOn){WCV.style.display='block';wcvOn=true}
  const g=WCTX,S=WCV.width/W;                       /* todo se calcula en unidades del juego y se escala a pantalla real */
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,WCV.width,WCV.height);
  g.setTransform(S,0,0,S,0,0);
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  /* mismo tamaño y movimiento de siempre: alto visible = 38% de la pantalla */
  const dhB=H*.38,k=dhB/I.BH,dw=I.GW*k;
  let sx=Math.sin(t)*W*(.006+.03*wk), sy=Math.abs(Math.cos(t))*H*(.004+.022*wk);
  let rot=Math.sin(t)*(.006+.03*wk), rise=0, rk=0;
  if(P.muzzle>0)sy+=H*.045*Math.min(1,P.muzzle/.09);
  const reloading=P.reloading>0&&P.reloadTotal>0;
  if(reloading){rk=1-P.reloading/P.reloadTotal;const e=Math.sin(rk*Math.PI);rise=e*H*.05;rot-=e*.05;sx+=e*W*.01}
  const px=W/2+W*.012+sx, py=H+sy-rise;
  g.save();
  if(mAng||mOffX){g.translate(W/2+Math.sin(P.bob)*W*.012+mOffX,pivY);g.rotate(mAng);g.translate(-(W/2+Math.sin(P.bob)*W*.012),-pivY)}
  g.translate(px+dw*.35,H);g.rotate(rot);g.translate(-(px+dw*.35),-H);
  const x0=px-I.MX*k, y0=py-dhB+dhB*.02;       /* origen del espacio de referencia (la boca del cañón queda en px) */
  const put=(fi,al)=>{const f=PF[fi];g.globalAlpha=al;g.drawImage(I.a[fi],x0+f[0]*k,y0+f[1]*k,f[2]*k,f[3]*k);g.globalAlpha=1};
  let idleW=1;
  if(!reloading)put(0,1);
  else{
   /* peso de cada cuadro: fundido corto entre cuadros consecutivos (los pesos siempre suman 1) */
   const w=RSEQ.map((_,i)=>(i===0?1:sstep(RB[i-1]-RHW,RB[i-1]+RHW,rk))-(i===RSEQ.length-1?0:sstep(RB[i]-RHW,RB[i]+RHW,rk)));
   const act=w.map((v,i)=>[v,i]).filter(a=>a[0]>.004).sort((a,b)=>b[0]-a[0]);
   put(RSEQ[act[0][1]],1);                       /* el dominante opaco y el vecino encima con su peso */
   for(let j=1;j<act.length;j++)put(RSEQ[act[j][1]],act[j][0]);
   idleW=w[0]+w[w.length-1];
  }
  if(P.muzzle>0&&idleW>.5){const m=Math.min(1,P.muzzle/.09);
   const fw=dw*.26*(.85+.3*m+Math.random()*.15),fh=fw*I.fh/I.fw;   /* llama pequeña, en la boca del cañón */
   g.globalCompositeOperation='lighter';g.globalAlpha=Math.min(1,.55+m*.45);
   g.drawImage(I.f,px-fw/2,y0+dhB*.05-fh*.86,fw,fh);
   g.globalAlpha=1;g.globalCompositeOperation='source-over'}
  g.restore();
 }

 export function weapon(W,H){const u=H/243,cx=W/2+Math.sin(P.bob)*W*.012;
 let y=H+Math.abs(Math.cos(P.bob))*H*.012+(P.muzzle>0?H*.05:0);
 let rOff=0;if(P.reloading>0&&P.reloadTotal>0){const t=1-P.reloading/P.reloadTotal;rOff=Math.sin(t*Math.PI)*90*u}
 let mAng=0,mOffX=0;if(P.meleeAnim>0){const t=1-P.meleeAnim/0.28;mAng=Math.sin(t*Math.PI)*0.45;mOffX=Math.sin(t*Math.PI)*8*u}
 y+=rOff;
 if(P.weapon===0&&PISTOL_IMG.ok===PISTOL_IMG.need){drawPistolSprite(W,H,mAng,mOffX,y);return}
 wcvHide();
 if(mAng||mOffX){ctx.save();ctx.translate(cx+mOffX,y);ctx.rotate(mAng);ctx.translate(-cx,-y)}
 if(P.weapon===6&&RPG_IMG.ok===1){drawRpgSprite(W,H);if(mAng||mOffX)ctx.restore();return}
 if(P.weapon===2&&M4_IMG.ok===7){drawM4Sprite(W,H);if(mAng||mOffX)ctx.restore();return}
 if(P.weapon===3&&AK_IMG.ok===7){drawGunImg(AK_IMG,W,H,1);if(mAng||mOffX)ctx.restore();return}
 if(P.weapon===4&&MG_IMG.ok===7){drawGunImg(MG_IMG,W,H,1.06);if(mAng||mOffX)ctx.restore();return}
 const isRocketWeapon=WEAPONS[P.weapon].rocket===true;
 for(const r of WP[P.weapon]){if(r[5]&&isRocketWeapon&&P.mag[P.weapon]<=0&&!(P.reloading>0&&P.reloadTotal>0&&(1-P.reloading/P.reloadTotal)>.5))continue;ctx.fillStyle=r[0];ctx.fillRect(cx+r[1]*u,y-r[2]*u,r[3]*u,r[4]*u)}
 if(P.muzzle>0){const m=P.muzzle/.09,fy=y-[72,84,100,104,105,108,113][P.weapon]*u,r=(18+Math.random()*14)*u*m,g=ctx.createRadialGradient(cx,fy,0,cx,fy,r);
  g.addColorStop(0,'rgba(255,255,230,'+.95*m+')');g.addColorStop(.4,'rgba(255,190,60,'+.75*m+')');g.addColorStop(1,'rgba(255,80,0,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,fy,r,0,6.2832);ctx.fill();
  if(isRocketWeapon){const by2=y-24*u,rb=(40+Math.random()*20)*u*m,g2=ctx.createRadialGradient(cx,by2,0,cx,by2,rb);
   g2.addColorStop(0,'rgba(255,240,200,'+Math.min(1,.9*m)+')');g2.addColorStop(.35,'rgba(255,150,50,'+Math.min(1,.6*m)+')');g2.addColorStop(1,'rgba(120,120,120,0)');
   ctx.fillStyle=g2;ctx.beginPath();ctx.arc(cx,by2,rb,0,6.2832);ctx.fill()}}
 if(mAng||mOffX)ctx.restore()}
