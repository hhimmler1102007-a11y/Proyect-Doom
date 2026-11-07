import { C, SH, TEX, hash } from './core.js';
import { B_tBurnt_Axe, B_tBurnt_Basic, B_tBurnt_Moss, B_tBurnt_Rotos, B_tDirt, B_tGrass, B_tLogWall_Axe, B_tLogWall_Basic, B_tLogWall_Moss, B_tLogWall_Rotos } from '../data/graphics.js';


export let FOG=[196,212,230];

/* MODO NOCHE: multiplicador de color por canal aplicado a TODO lo que pasa por shades() (suelo, muros, techos, sprites).
   null = de día. Los píxeles "emisivos" de los sprites (luces rojas/verdes/naranjas, fuego, ojos) no se oscurecen. */
export let NIGHT=null;
export function set_NIGHT(v){return NIGHT=v}

export function shades(d,mul,red,emis){
  mul=mul||1;
  const f0=FOG[0],f1=FOG[1],f2=FOG[2],nm=NIGHT;
  const build=s=>{
    const f=s/(SH-1),a=new Uint32Array(d.length);
    for(let i=0;i<d.length;i++){
      const c=d[i];if(!c)continue;
      let r=(c&255)*mul,g=((c>>8)&255)*mul,b=((c>>16)&255)*mul;
      if(nm){const mx=r>g?(r>b?r:b):(g>b?g:b),mn=r<g?(r<b?r:b):(g<b?g:b);
        if(!(emis&&mx>=215&&mx-mn>=130)){r*=nm[0];g*=nm[1];b*=nm[2]}}
      if(red){r=r*.5+150;g*=.45;b*=.45}
      a[i]=C(r*f+f0*(1-f),g*f+f1*(1-f),b*f+f2*(1-f));
    }
    return a;
  };
  const o=new Array(SH);
  // Sprites grandes (alta resolucion): cada nivel de niebla se calcula solo cuando se usa, para ahorrar memoria.
  if(d.length>4096){
    for(let s=0;s<SH;s++)Object.defineProperty(o,s,{configurable:true,enumerable:true,get(){const a=build(s);Object.defineProperty(o,s,{value:a,writable:true,configurable:true,enumerable:true});return a}});
  }else for(let s=0;s<SH;s++)o[s]=build(s);
  return o;
}

function mk(fn){const d=new Uint32Array(TEX*TEX);for(let y=0;y<TEX;y++)for(let x=0;x<TEX;x++)d[y*TEX+x]=fn(x,y);return d}

/* Detalle procedural de baja intensidad: conserva la paleta pixel-art original y añade
   grava, grietas, hierba irregular y desgaste sin cargar imágenes externas. */
function textureDetail(base,kind){
 const out=base.slice();
 for(let y=0;y<TEX;y++)for(let x=0;x<TEX;x++){
  const i=y*TEX+x,c=base[i],r=c&255,g=(c>>>8)&255,b=(c>>>16)&255;
  const n=hash(x,y,kind==='grass'?911:kind==='dirt'?921:kind==='asphalt'?931:941);
  let k=0,rr=r,gg=g,bb=b;
  if(kind==='grass'){
   const cell=hash(x>>3,y>>3,912),lx=x&7,ly=y&7;
   const blade=cell>.48&&((ly===6-(lx>>2))||(ly===5-(lx>>2)&&lx>1&&lx<7));
   if(blade){k=(cell>.78?.16:-.14);}
   else if(n>.986)k=n>.994?.12:-.12;
   if((x%16===0||y%16===0)&&n>.7)k-=.035;
  }else if(kind==='dirt'){
   const stone=hash(x>>2,y>>2,922)>.84&&n>.48;
   if(stone)k=(n>.78?.17:-.2);
   const crack=Math.abs(((x*5+y*3+((hash(x>>3,y>>3,923)*9)|0))%29)-14);
   if(crack<.7&&hash(x>>3,y>>3,924)>.68)k-=.13;
   if(n>.992)k+=.13;
  }else if(kind==='asphalt'){
   const pebble=hash(x>>1,y>>1,932)>.94&&n>.45;
   if(pebble)k=n>.78?.16:-.18;
   const crack=Math.abs(((x*7-y*3+((hash(x>>3,y>>3,933)*13)|0))%43)-21);
   if(crack<.65&&hash(x>>3,y>>3,934)>.78)k-=.16;
   if(hash(x>>4,y>>4,935)>.965&&n>.5)k-=.08;
  }else if(kind==='concrete'){
   const chip=(x%16===0||y%16===0)&&n>.45;
   if(chip)k=-.12;
   if(n>.992)k=.13;
  }
  if(k){const f=1+k;rr*=f;gg*=f;bb*=f;out[i]=C(rr,gg,bb)}
 }
 return out;
}

export const tAsph=textureDetail(mk((x,y)=>{const n=hash(x,y,1),n2=hash(x>>2,y>>2,2);let v=92+n*24+n2*14;
 if(Math.sin(x*.35+y*.7+hash(x>>4,y>>4,5)*10)>.94)v*=.6;if(n>.965)v*=1.5;return C(v,v*.98,v*1.03)}),'asphalt');

export const tSide=mk((x,y)=>{const px=x%16,py=y%16,n=hash(x,y,3);let v=182+n*26;if(px===0||py===0)v*=.7;if(px===1||py===1)v*=1.06;return C(v,v*.98,v*.93)});

// Texturas pixel art (64x64, RGB en base64): pasto y tierra reemplazan las procedurales en todos los mapas
const texRaw=b64=>{const bin=atob(b64),o=new Uint32Array(TEX*TEX);for(let i=0;i<TEX*TEX;i++)o[i]=C(bin.charCodeAt(i*3),bin.charCodeAt(i*3+1),bin.charCodeAt(i*3+2));return o};

export const tGrass=textureDetail(texRaw(B_tGrass),'grass');

export const tDirt=textureDetail(texRaw(B_tDirt),'dirt');

export const tBlackDirt=tDirt;

export const tMilFloor=mk((x,y)=>{
  const n=hash(x,y,801),n2=hash(x>>2,y>>2,802);
  let v=132+n*22+n2*12;
  if(x%16===0||y%16===0)v*=0.72;
  if(x%16===1||y%16===1)v*=1.05;
  if(hash(x>>3,y>>3,803)>0.85)v*=0.88;
  if((x%32>=14&&x%32<=17)&&(y%4<2))v=200;
  return C(v,v*0.97,v*0.88);
});

export let gSh=[shades(tAsph),shades(tSide),shades(tGrass),shades(tDirt),shades(tAsph),shades(tAsph),shades(tMilFloor)];

export const tCeil=mk((x,y)=>{const n=hash(x,y,101);let r=90+n*26,g=64+n*20,b=42+n*14;
 const plank=Math.floor(y/8)%2;if(plank){r*=1.06;g*=1.06}
 if(y%8===0){r*=0.55;g*=0.55;b*=0.55}
 const gr=Math.sin(x*.28+y*.14)*8;return C(r+gr,g+gr*.7,b+gr*.4)});

export let gShCeil=shades(tCeil);

const win=(x,y)=>{const wx=x%32,wy=y%32;return wx>=8&&wx<=23&&wy>=9&&wy<=22};

const tConc=mk((x,y)=>{const n=hash(x,y,19);let v=176+n*28;if(x%16===0||y%16===0)v*=.75;
 if(hash(x>>3,y>>3,25)>.88)v*=.8;
 if(win(x,y)){const wx=x%32,wy=y%32;if(wx===8||wy===9||wx===23||wy===22)return C(70,66,60);
  const sky=150+(wy-9)*5+hash(x,y,4)*20;return hash(x>>2,y>>2,8)>.85?C(30,34,44):C(sky*.55,sky*.75,sky)}
 return C(v,v*.98,v*.92)});

const tBrick=mk((x,y)=>{const off=((y>>3)%2)*8,bx=(x+off)%16,by=y%8;if(by===0||bx===0)return C(150,136,124);
 const n=hash(x,y,23);let r=176+n*30,g=84+n*22,b=64+n*18;if(hash(x>>3,y>>3,29)>.85){r*=.8;g*=.8;b*=.8}
 if(win(x,y)){const wx=x%32,wy=y%32;if(wx===8||wy===9||wx===23||wy===22||wx===15||wy===15)return C(60,50,44);return C(40,50,66)}
 return C(r,g,b)});

const tWood=mk((x,y)=>{const n=hash(x,y,31);let r=172+n*40,g=120+n*30,b=70+n*22;if(x%8===0){r*=.65;g*=.65;b*=.65}
 const gr=Math.sin(y*.42+x*.14)*14;return C(r+gr,g+gr*.7,b+gr*.35)});

const tLogWall=mk((x,y)=>{const row=Math.floor(y/10),off=(row%2)*17,ly=y%10,n=hash(x,y,313);let seam=ly===0||ly===9;let knot=Math.pow(Math.max(0,1-Math.abs(((x+row*13)%43)-21)/4),2)*((ly===4||ly===5)?1:0);let r=118+n*34,g=70+n*22,b=38+n*14;const grain=Math.sin((x+Math.sin(y*.13)*3)*.32)*7;r+=grain;g+=grain*.65;b+=grain*.4;if(seam){r*=.42;g*=.4;b*=.38}else if(ly===1||ly===8){r*=1.2;g*=1.16;b*=1.1}if(knot){r*=.55;g*=.5;b*=.45}if(((x+off)%64)<2){r*=.72;g*=.7;b*=.68}return C(r,g,b)});

const tMetal=mk((x,y)=>{const wave=Math.sin(x*.55)*.3+.8,n=hash(x,y,37),v=130*wave+n*22;
 if(hash(x>>3,y>>3,41)>.68)return C(170+n*40,86+n*22,52+n*16);return C(v*.9,v*.97,v*1.1)});

const tSandbag=mk((x,y)=>{
  const bagW=16,bagH=8,row=Math.floor(y/bagH),rowY=y%bagH;
  const offsetX=(row%2)*(bagW/2);
  const bagX=(x+offsetX)%bagW;
  if(bagX<1||bagX>=bagW-1)return C(55,45,30);
  if(rowY<1||rowY>=bagH-1)return C(45,38,24);
  const bulgeX=1-Math.abs(bagX-bagW/2)/(bagW/2);
  const bulgeY=1-Math.abs(rowY-bagH/2)/(bagH/2);
  const bulge=Math.max(0,bulgeX*bulgeY);
  const n=hash(x,y,700+row),v=135+n*30+bulge*40;
  return C(v*0.92,v*0.82,v*0.55);
});

const tMilWall=textureDetail(mk((x,y)=>{
  const n=hash(x,y,740);let v=155+n*25;
  const band=y%16;
  if(band===0||band===15)v*=0.7;
  if(band===1)v*=1.15;
  if(band===14)v*=0.85;
  if((x%16===7||x%16===8)&&(band===7||band===8))v=80+n*20;
  if(x%16===0)v*=0.75;
  return C(v,v*0.98,v*0.92);
}),'concrete');

const tMilWallCrack=textureDetail(mk((x,y)=>{
  const n=hash(x,y,741);let v=155+n*25;
  const band=y%16;
  if(band===0||band===15)v*=0.7;
  if(band===1)v*=1.15;
  const crack1=Math.abs((x+y)%24-12);
  const crack2=Math.abs((x-y+64)%28-14);
  if(crack1<1.5||crack2<1.2){
    const ct=hash(x>>1,y>>1,742);
    v=60+ct*30;
  }
  if(hash(x>>2,y>>2,743)>0.9)v*=0.6;
  if(x%16===0)v*=0.75;
  return C(v,v*0.9,v*0.82);
}),'concrete');

// Madera quemada: tablones carbonizados con grietas, vetas de brasas y manchas de ceniza.
// Muro de contención perimetral: paneles de hormigón con base metálica, sin ventanas.
const tBoundaryWall=mk((x,y)=>{
 const n=hash(x,y,860),n2=hash(x>>3,y>>3,861);
 let v=118+n*20+n2*10;
 const panel=x%48,py=y%32;
 if(panel<2||py<2)v*=.68;
 if(panel===2||py===2)v*=1.08;
 if(hash(x>>2,y>>2,862)>.9)v*=.82;
 if(y>26&&y<30)v*=.55;
 if(y>=30&&y<32)v=70+n*18;
 if(hash(x>>1,y>>1,863)>.94)v*=.7;
 return C(v,v*.99,v*.95);
});

const tBurntWood=mk((x,y)=>{const plank=Math.floor((x+(hash(0,y>>4,335)>.5?0:0))/9),lx=x%9,n=hash(x,y,331),n2=hash(plank,y>>2,332),ash=hash(x>>1,y>>3,333);const wave=Math.sin(y*.21+plank*1.7+Math.sin(y*.05+plank)*2)*0.5+.5;let v=30+n*14+wave*18;if(((y+plank*7)%13)<2&&lx>1&&lx<8)v*=.55;let r=v*1.12,g=v*.93,b=v*.8;if(lx===0){r*=.3;g*=.28;b*=.27}else if(lx===1){r*=1.3;g*=1.2;b*=1.08}const char=hash(x>>1,y>>1,336);if(char>.86){r*=.45;g*=.42;b*=.4}if(hash(plank,y>>3,334)>.9&&lx>2&&lx<7&&n>.55){r=165+n*70;g=58+n*35;b=10}if(ash>.88){r+=38;g+=36;b+=34}const scorch=Math.max(0,(y-40)/24);r*=1-scorch*.35;g*=1-scorch*.4;b*=1-scorch*.4;return C(r,g,b)});

// === TEXTURAS FINALES PNG DIRECTO - SIN RECORTE ===
const tLogWall_Basic=texRaw(B_tLogWall_Basic);

const tLogWall_Rotos=texRaw(B_tLogWall_Rotos);

const tLogWall_Axe=texRaw(B_tLogWall_Axe);

const tLogWall_Moss=texRaw(B_tLogWall_Moss);

const tBurnt_Basic=texRaw(B_tBurnt_Basic);

const tBurnt_Rotos=texRaw(B_tBurnt_Rotos);

const tBurnt_Axe=texRaw(B_tBurnt_Axe);

const tBurnt_Moss=texRaw(B_tBurnt_Moss);


// Techos: misma familia de material que las paredes del edificio, sin ventanas.
const tCeilConc=mk((x,y)=>{const n=hash(x,y,19);let v=176+n*28;if(x%16===0||y%16===0)v*=.75;if(hash(x>>3,y>>3,25)>.88)v*=.8;return C(v,v*.98,v*.92)});

const tCeilCement=mk((x,y)=>{const n=hash(x,y,23),n2=hash(x>>2,y>>2,29);let v=128+n*22+n2*14;if(x%32===0||y%32===0)v*=.7;else if(x%32===1||y%32===1)v*=1.06;if(hash(x>>3,y>>3,27)>.9)v*=.86;return C(v,v*.99,v*.95)});

export const CEIL_TEX={1:tCeilConc,2:tCeilCement,3:tWood,4:tMetal,8:tLogWall_Basic,9:tBurnt_Basic,10:tCeilConc,11:tLogWall_Basic,12:tLogWall_Basic,13:tLogWall_Basic,14:tLogWall_Basic,15:tBurnt_Basic,16:tBurnt_Basic,17:tBurnt_Basic,18:tBurnt_Basic};

export const wTex=[null,tConc,tBrick,tWood,tMetal,tSandbag,tMilWall,tMilWallCrack,tLogWall,tBurntWood,tBoundaryWall,tLogWall_Basic,tLogWall_Rotos,tLogWall_Moss,tLogWall_Axe,tBurnt_Basic,tBurnt_Rotos,tBurnt_Moss,tBurnt_Axe];

export let wSh,wShD,cSh=[];

export function buildWallShades(){wSh=wTex.map(t=>t&&shades(t,1));wShD=wTex.map(t=>t&&shades(t,.78));cSh=[];for(const k in CEIL_TEX)cSh[k]=shades(CEIL_TEX[k])}

buildWallShades();

export function applyWallStyle(){buildWallShades();}

export const shadeAt=d=>Math.max(3,(SH-1)*(1-d/55)|0);

/* setters para variables reasignadas desde otros módulos */
export function set_FOG(v){return FOG=v}
export function set_gSh(v){return gSh=v}
export function set_gShCeil(v){return gShCeil=v}
