import { $, hash } from './core.js';
import { LIGHT_HOOKS, LR, lightCfg } from './lights.js';
import { ALARMS, BEACON, fortTowers } from './outposts.js';
import { sAntenna, sBunker, sBusStop, sEnemyTents, sGenerator, sLamp, sMapTable } from './sprites.js';
import { decos, isNight } from './state.js';
import { msg } from './hud.js';
import { SFX } from './audio.js';

/* ===== MODO NOCHE · DISTRITO CERO =====
   Registra todos los emisores de luz del mapa (postes, semáforos, puestos, alarmas, torres, baliza) y la linterna del
   jugador, y los entrega al sistema de luces de lights.js (mapa de luz con oclusión por muros que se suma al piso, a los
   muros y a los sprites). Además dibuja un halo brillante sobre cada foco para verlos a lo lejos en la oscuridad. */

export const FL={on:true};

const EM=[];          /* emisores estáticos del mapa */
const GL=[];let GN=0; /* halos de este cuadro (se reutilizan los objetos) */

/* colores */
const C_LAMP=[255,206,128],C_LAMP2=[255,236,196],C_RED=[255,40,28],C_GRN=[50,255,100],C_TOWER=[255,248,214],C_FLASH=[238,233,206],
      C_FLASH_AMB=[204,200,176],C_GEN=[176,214,255],C_WARM=[255,198,116],C_TENT=[255,164,72],C_BUS=[192,226,255],C_BEACON_G=[70,255,140],C_BEACON_R=[255,70,44];

/* ¿La sirena de esta alarma está sonando? (mismas condiciones que el sonido en audio.js) */
function sounding(al){
  if(!al.alive||!al.activated)return false;
  const op=al.op;if(!op||op.taken)return false;
  if(op.enemies&&!op.enemies.some(x=>x.alive))return false;
  return true}

/* Se llama desde reset(): recorre las decoraciones ya creadas y arma la lista de emisores. */
export function buildNightEmitters(){
  EM.length=0;GN=0;
  FL.on=true;refreshLightBtn();
  const nt=isNight();lightCfg.night=nt;
  const btn=$('btnLight');if(btn)btn.style.display=nt?'flex':'none';
  if(!nt)return;
  for(const d of decos){
    const ph=hash(d.x*7|0,d.y*13|0,322)*6.28;
    if(d.spr===sLamp){
      const tall=d.wh>3;
      EM.push({k:'lamp',x:d.x,y:d.y,z:(d.z0||0)+d.wh*.92,r:tall?10:8,I:tall?1.05:.92,c:tall?C_LAMP:C_LAMP2,flk:hash(d.x*5|0,d.y*11|0,321)>.84,ph,gr:tall?.62:.5,gI:1});
    }else if(d.tl!==undefined){
      EM.push({k:'tl',x:d.x,y:d.y,z:0,r:5,I:.85,tl:d.tl,ph,gr:.3,gI:1,ox:-.25,ww:d.ww});
    }else if(d.spr===sBusStop){
      EM.push({k:'bus',x:d.x,y:d.y,z:d.wh*.8,r:4.4,I:.6,c:C_BUS,ph,gr:.3,gI:.7});
    }else if(d.spr===sGenerator){
      EM.push({k:'gen',x:d.x,y:d.y,z:d.wh*.9,r:5.2,I:.7,c:C_GEN,ph,gr:.22,gI:.8});
    }else if(d.spr===sMapTable){
      EM.push({k:'tbl',x:d.x,y:d.y,z:d.wh*1.1,r:4.8,I:.82,c:C_WARM,ph,gr:.24,gI:.8});
    }else if(d.spr===sBunker){
      EM.push({k:'bnk',x:d.x,y:d.y,z:d.wh*.8,r:5.8,I:.78,c:C_WARM,ph,gr:.3,gI:.8});
    }else if(d.spr===sAntenna){
      EM.push({k:'ant',x:d.x,y:d.y,z:d.wh*.95,r:3.6,I:1,c:C_RED,ph,gr:.28,gI:1});
    }else if(sEnemyTents.indexOf(d.spr)>=0){
      EM.push({k:'tent',x:d.x,y:d.y,z:d.wh*.5,r:4.2,I:.52,c:C_TENT,ph,gr:.3,gI:.55});
    }
  }
}

/* luz → hook de lights.js (se ejecuta cada cuadro dentro de buildLights) */
function glow(x,y,z,ox,ww,rad,I,c){
  const g=GL[GN]||(GL[GN]={});GN++;
  g.x=x;g.y=y;g.z=z;g.ox=ox;g.ww=ww;g.rad=rad;g.I=I;g.c=c}

function nightHook(add,P,gt){
  GN=0;
  if(!lightCfg.night)return;
  /* ---- linterna: cono + un pequeño halo alrededor de tus pies ---- */
  if(FL.on){
    const ca=Math.cos(P.a),sa=Math.sin(P.a);
    add(P.x+ca*.12,P.y+sa*.12,13,1.18,C_FLASH,{dx:ca,dy:sa,ca:.898,ci:.987});   /* ~26° exterior, ~9° interior */
    add(P.x,P.y,2.8,.42,C_FLASH_AMB);
  }
  const GR=26,LRR=LR+1;
  /* ---- torres: faro giratorio ---- */
  for(const t of fortTowers){
    if(t.dead)continue;
    const dx=t.x-P.x,dy=t.y-P.y,d2=dx*dx+dy*dy;
    if(d2>GR*GR*1.7)continue;
    const a=t.phase+gt*t.speed*1.15,ca=Math.cos(a),sa=Math.sin(a);
    if(d2<(LRR+13)*(LRR+13)){
      add(t.x,t.y,14,1.4,C_TOWER,{dx:ca,dy:sa,ca:.945,ci:.992,sk:.9});            /* haz del faro (~19°) */
      add(t.x,t.y,3.4,.4,C_TOWER,{sk:.9});
    }
    /* el foco "se enciende" cuando el haz apunta hacia ti, como un faro */
    const dd=Math.sqrt(d2)||1,al=Math.max(0,(-dx*ca-dy*sa)/dd);
    glow(t.x,t.y,t.z-.3,0,0,.7,.35+.65*Math.pow(al,4),C_TOWER);
  }
  /* ---- alarmas: sirena roja que gira 360° ---- */
  for(const al of ALARMS){
    if(!al.alive)continue;
    const dx=al.x-P.x,dy=al.y-P.y,d2=dx*dx+dy*dy;
    if(d2>GR*GR)continue;
    const on=sounding(al),rate=on?6.2:.9,a=gt*rate+al.x*1.7+al.y,ca=Math.cos(a),sa=Math.sin(a);
    if(d2<(LRR+10)*(LRR+10)){
      if(on){
        add(al.x,al.y,10,1.7,C_RED,{dx:ca,dy:sa,ca:.82,ci:.96,bi:true});         /* dos haces opuestos girando */
        add(al.x,al.y,3.6,.55+.25*Math.sin(gt*12),C_RED);
      }else{
        add(al.x,al.y,4.6,.5,C_RED,{dx:ca,dy:sa,ca:.8,ci:.95,bi:true});          /* en espera: giro lento y tenue */
      }
    }
    const dd=Math.sqrt(d2)||1,ang=Math.abs(Math.cos(a)*(-dx/dd)+Math.sin(a)*(-dy/dd));
    glow(al.x,al.y,1.25,0,0,on?.45:.3,(on?.35:.2)+(on?.65:.35)*Math.pow(ang,5),C_RED);
  }
  /* ---- baliza de extracción ---- */
  {const dx=BEACON.x-P.x,dy=BEACON.y-P.y,d2=dx*dx+dy*dy;
   if(d2<GR*GR*2.2){
     const on=!!P.extOn,I=on?.95+.25*Math.sin(gt*4):.45,c=on?C_BEACON_G:C_BEACON_R;
     if(d2<(LRR+10)*(LRR+10))add(BEACON.x,BEACON.y,on?10:6,I,c);
     glow(BEACON.x,BEACON.y,1.9,0,0,.9,on?1:.6,c)}}
  /* ---- emisores estáticos ---- */
  for(let i=0;i<EM.length;i++){
    const e=EM[i],dx=e.x-P.x,dy=e.y-P.y,d2=dx*dx+dy*dy;
    if(d2>GR*GR*1.7)continue;
    let I=e.I,c=e.c,gz=e.z,gI=e.gI,ox=0;
    switch(e.k){
      case 'lamp':if(e.flk){const w=Math.sin(gt*11+e.ph)*Math.sin(gt*5.3+e.ph*2);if(w>.5){I*=.25;gI*=.2}}break;
      case 'tl':{const red=((((gt/7)|0)+e.tl)%2)!==0;c=red?C_RED:C_GRN;gz=red?.79:.6;ox=e.ox*e.ww;break}
      case 'gen':I*=.9+.1*Math.sin(gt*31+e.ph);break;
      case 'tent':I*=.86+.14*Math.sin(gt*9+e.ph)*Math.sin(gt*4.1+e.ph);break;
      case 'ant':{const b=((gt*1.1+e.ph)%1)<.18;I=b?1.1:.1;gI=b?1:.12;break}
    }
    if(d2<(LRR+e.r)*(LRR+e.r))add(e.x,e.y,e.r,I,c);
    if(gI>.05)glow(e.x,e.y,gz,ox,0,e.gr,gI,c);
  }
}
LIGHT_HOOKS.push(nightHook);

/* ===== halos de los focos (se dibujan después de los sprites, sumando luz al buffer) =====
   Se ocultan detrás de los muros (zbuf/ztop) y de cualquier sprite sólido más cercano (sdep: profundidad por píxel). */
export function drawNightGlows(buf,zbuf,ztop,sdep,W,H,projDist,Px,Py,dx,dy,px,py,inv,ceilOn,ceilMask,ceilRow){
  if(!lightCfg.night||!GN)return;
  const hh=H>>1;
  for(let n=0;n<GN;n++){
    const g=GL[n],sx=g.x-Px,sy=g.y-Py,tX=inv*(dy*sx-dx*sy),tY=inv*(-py*sx+px*sy);
    if(tY<.4)continue;
    const sc=projDist/tY,X=(W/2)*(1+tX/tY)+g.ox*sc,Y=H/2+(.5-g.z)*sc;
    let R=g.rad*sc*2.2;if(R>38)R=38;if(R<2.2)R=2.2;
    if(X+R<0||X-R>=W||Y+R<0||Y-R>=H)continue;
    const fade=tY>16?Math.max(.35,1-(tY-16)/40):1,I=g.I*fade;if(I<.04)continue;
    const cr=g.c[0],cg=g.c[1],cb=g.c[2],xa=Math.max(0,Math.floor(X-R)),xb=Math.min(W-1,Math.ceil(X+R)),
          ya=Math.max(0,Math.floor(Y-R)),yb=Math.min(H-1,Math.ceil(Y+R)),core=Math.max(1.1,R*.2);
    for(let x=xa;x<=xb;x++){
      let ye=yb+1;
      if(tY>=zbuf[x]){ye=Math.min(ye,ztop[x]);if(ye<=ya)continue}
      const ex=x-X;
      for(let y=ya;y<ye;y++){
        if(ceilOn&&y<hh&&ceilMask[y*W+x]&&tY>ceilRow[y])continue;
        /* un sprite más cerca que el foco (árbol, poste, caneca, erizo...) lo tapa; el margen deja ver el foco sobre su propio poste */
        if(sdep[y*W+x]<tY-.12)continue;
        const ey=y-Y,d=Math.sqrt(ex*ex+ey*ey);if(d>=R)continue;
        let a=1-d/R;a*=a*I*1.15;
        if(d<core)a=Math.min(1.4,a+(1-d/core)*I);
        if(a<.02)continue;
        const o=y*W+x,c=buf[o];
        let r=(c&255)+cr*a,gg=((c>>8)&255)+cg*a,b=((c>>16)&255)+cb*a;
        if(core>1.1&&d<core*.6){const w=(1-d/(core*.6))*.7*I;r+=(255-r)*w;gg+=(255-gg)*w;b+=(255-b)*w}
        buf[o]=(0xFF000000|((b>255?255:b|0)<<16)|((gg>255?255:gg|0)<<8)|(r>255?255:r|0))>>>0}}
  }
}

/* ===== linterna ===== */
export function refreshLightBtn(){const b=$('btnLight');if(b)b.classList.toggle('lit',FL.on)}
export function toggleFlashlight(){
  if(!lightCfg.night)return;
  FL.on=!FL.on;refreshLightBtn();
  try{SFX.ui()}catch(e){}
  msg(FL.on?'LINTERNA ENCENDIDA':'LINTERNA APAGADA',FL.on?'#ffe9a0':'#9aa7b8');
}
