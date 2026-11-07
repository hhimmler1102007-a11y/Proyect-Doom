import { C, MAP_SEED, hash } from './core.js';
import { shades } from './textures.js';
import { FOODS, ITEMS } from './data.js';
import { B_soldierAtlas, B_gunnerAtlas, B_sAshBrokenTrunkD, B_sAshDeadPineA, B_sAshDeadPineB, B_sAshDeadTreeC, B_sAshWasteTreeA, B_sAshWasteTreeB, B_sCzech, B_sEnemyTent0, B_sEnemyTent1, B_sEnemyTent2, B_sEnemyTent3, B_sEnemyTent4, B_sEnemyTent5, B_sPine, B_sRocket, B_sTree, B_sWasteTent0, B_sWasteTent1, B_sWasteTent2, B_sWasteTent3, B_sWasteTent4, B_sWasteTent5, B_sWire } from '../data/graphics.js';


export const ALLSPR=[];
export let bakedKey='clear';
const SPRITE_ASSET_PROMISES=[];
export function waitForSpriteAssets(){return Promise.all(SPRITE_ASSET_PROMISES)}

function spr(w,h,d){const s={w,h,data:d,sh:shades(d,1,0,true),red:null};ALLSPR.push(s);return s}

function art(a,p){const w=a[0].length,h=a.length,d=new Uint32Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=p[a[y][x]];d[y*w+x]=c===undefined?0:c}return spr(w,h,d)}

export function proc(w,h,fn){const d=new Uint32Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)d[y*w+x]=fn(x,y)||0;return spr(w,h,d)}

const SOL=['................','....HHHHHH......','...HHHHHHHH.....','...HHffffHH.....','...HHfkkfHH.....','...HHffffHH.....','....HHHHHH......','...UUUUUUUU.....','..UUVVVVVVU.....','..UUVVVVVVUAA...','..UUVVVVVVUGGG..','..UUVVVVVVU.GG..','..AAAAAAAAA.....','..AAAAAAAAA.....','...AAAAAAA......','...AAAAAAA......','...LL..LL.......','...LL..LL.......','...LL..LL.......','...LL..LL.......','..BBB..BBB......','..BBB..BBB......','................','................'];

const SOLB=SOL.slice();
for(let i=16;i<20;i++)SOLB[i]='..LL....LL......';
SOLB[20]=SOLB[21]='.BBB....BBB.....';

const PS={'.':0,H:C(96,116,70),f:C(230,186,140),k:C(30,24,16),U:C(130,150,96),V:C(78,92,56),A:C(104,124,78),G:C(36,36,42),L:C(112,128,84),B:C(44,32,20)};

const PH={'.':0,H:C(70,78,96),f:C(214,168,126),k:C(255,60,40),U:C(96,102,120),V:C(56,60,78),A:C(80,86,104),G:C(30,30,36),L:C(76,82,98),B:C(30,24,16)};

const PSN={'.':0,H:C(64,80,48),f:C(200,170,120),k:C(20,15,10),U:C(58,72,44),V:C(34,46,28),A:C(64,80,48),G:C(28,30,32),L:C(54,68,42),B:C(30,22,14)};

const PSH={'.':0,H:C(92,72,60),f:C(220,180,130),k:C(30,20,14),U:C(120,74,50),V:C(170,40,30),A:C(108,66,44),G:C(30,30,34),L:C(94,60,44),B:C(42,30,18)};

const POF={'.':0,H:C(44,50,80),f:C(220,180,130),k:C(30,20,14),U:C(58,62,88),V:C(200,160,40),A:C(52,56,80),G:C(30,30,34),L:C(50,54,76),B:C(26,20,16)};

const PCO={'.':0,H:C(18,18,22),f:C(180,140,100),k:C(255,40,30),U:C(28,28,36),V:C(80,20,20),A:C(26,26,34),G:C(18,18,22),L:C(22,22,30),B:C(12,10,10)};

const PAL_ALLY={'.':0,H:C(60,80,140),f:C(230,186,140),k:C(30,24,16),U:C(80,110,180),V:C(50,70,130),A:C(70,95,160),G:C(36,36,42),L:C(70,100,170),B:C(30,24,20)};

export const sALLY=[art(SOL,PAL_ALLY),art(SOLB,PAL_ALLY)];

export const sS=[art(SOL,PS),art(SOLB,PS)],sH=[art(SOL,PH),art(SOLB,PH)];

export const sSN=[art(SOL,PSN),art(SOLB,PSN)];

export const sSH=[art(SOL,PSH),art(SOLB,PSH)];

export const sOF=[art(SOL,POF),art(SOLB,POF)];

export const sCO=[art(SOL,PCO),art(SOLB,PCO)];

const CORP=['................','................','..HHHH..........','.HHHHHHGGGGG....','HHffffHHGGGGGG..','.UUUUUUUUGGGG...','.UUUUUUUUUUUU...','..LLLLLLLL......','..BBBBBBBB......','................'];

// ===== Soldado y Artillero (sprites remasterizados de alta resolucion) =====
// Cada atlas PNG trae 42 sprites con las mismas animaciones: 5 vistas (frente ... espalda) de caminar x4,
// quieto, apuntar, disparar; 4 cuadros de muerte y 3 cadaveres. Se decodifican al cargar la pagina.
function atlasSet(b64,META){
 const all=META.map(([x,y,w,h,hr])=>{const q=spr(w,h,new Uint32Array(w*h));q.hr=hr;return q});
 const im=new Image();
 const ready=new Promise(resolve=>{im.onload=()=>{try{
  const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;
  const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(im,0,0);
  const AW=c.width,p=cx.getImageData(0,0,AW,c.height).data;
  META.forEach(([x,y,w,h],i)=>{const q=all[i],d=q.data;
   for(let j=0;j<h;j++)for(let k=0;k<w;k++){const o=((y+j)*AW+x+k)*4;if(p[o+3]>127)d[j*w+k]=C(p[o],p[o+1],p[o+2])}
   q.sh=shades(d,1,0,true);q.red=null})}catch(e){}finally{resolve(true)}};im.onerror=()=>resolve(false)});
 SPRITE_ASSET_PROMISES.push(ready);
 im.src='data:image/png;base64,'+b64;
 let k=0;const take=n=>all.slice(k,k+=n);
 const S={isSet:true,walk:[take(5),take(5),take(5),take(5)]};
 S.idle=take(5);S.aim=take(5);S.fire=take(5);S.death=take(4);S.corpses=take(3);
 return S}

export const SOLDIER=atlasSet(B_soldierAtlas,[[91,0,85,129,1.032],[576,0,77,127,1.016],[826,132,88,125,1.0],[622,260,97,121,0.968],[655,0,73,127,1.016],[260,0,76,128,1.024],[886,0,79,126,1.008],[0,132,73,126,1.008],[916,132,85,125,1.0],[75,132,70,126,1.008],[0,0,89,130,1.04],[338,0,79,128,1.024],[0,260,85,125,1.0],[147,132,93,126,1.008],[419,0,70,128,1.024],[491,0,83,128,1.024],[242,132,81,126,1.008],[204,260,68,123,0.984],[274,260,85,123,0.984],[730,0,73,127,1.016],[805,0,79,127,1.016],[178,0,80,129,1.032],[325,132,90,126,1.008],[429,260,82,122,0.976],[417,132,67,126,1.008],[486,132,49,126,1.008],[537,132,91,126,1.008],[721,260,104,121,0.968],[361,260,66,123,0.984],[630,132,45,126,1.008],[677,132,50,126,1.008],[729,132,95,126,1.008],[513,260,107,122,0.976],[129,260,73,124,0.992],[87,260,40,125,1.0],[827,260,92,114,0.912],[0,387,70,99,0.792],[921,260,74,101,0.808],[72,387,82,85,0.68],[156,387,108,33,0.264],[266,387,108,29,0.232],[376,387,108,29,0.232]]);

export const GUNNER=atlasSet(B_gunnerAtlas,[[84,0,80,129,1.032],[810,0,73,126,1.008],[885,0,91,126,1.008],[645,260,97,121,0.968],[565,0,76,127,1.016],[321,0,82,128,1.024],[0,132,76,126,1.008],[643,0,78,127,1.016],[134,260,84,124,0.992],[78,132,75,126,1.008],[0,0,82,130,1.04],[723,0,85,127,1.016],[155,132,86,126,1.008],[243,132,93,126,1.008],[166,0,71,129,1.032],[405,0,83,128,1.024],[338,132,79,126,1.008],[907,132,72,125,1.0],[220,260,84,124,0.992],[490,0,73,128,1.024],[419,132,76,126,1.008],[239,0,80,129,1.032],[0,260,90,125,1.0],[385,260,83,122,0.976],[497,132,67,126,1.008],[566,132,49,126,1.008],[617,132,91,126,1.008],[470,260,104,122,0.976],[576,260,67,122,0.976],[710,132,46,126,1.008],[758,132,50,126,1.008],[810,132,95,126,1.008],[744,260,107,121,0.968],[306,260,77,124,0.992],[92,260,40,125,1.0],[853,260,92,116,0.928],[947,260,70,107,0.856],[0,387,74,101,0.808],[76,387,82,89,0.712],[160,387,107,33,0.264],[269,387,107,30,0.24],[378,387,108,30,0.24]]);

export const cS=art(CORP,PS),cH=art(CORP,PH),cSN=art(CORP,PSN),cSH=art(CORP,PSH),cOF=art(CORP,POF),cCO=art(CORP,PCO),cALLY=art(CORP,PAL_ALLY);

const DOG=['....................','..KK..........KK....','..KKK........KKK....','..KKKK......KKKK....','...KKKKKKKKKKKK.....','...KKDDDDDDDDKK.....','...KDDDDDDDDDDK.....','...KDDDDDDDDDDK.....','....KKKK..KKKK......','....KK....KK........','....KK....KK........','....................'];

const DOGB=DOG.slice();
DOGB[9]='...KKK.....KKK......';
DOGB[10]='..KKK......KKK......';
DOGB[11]='..K.........K.......';

const PDG={'.':0,K:C(50,30,20),D:C(80,50,30)};

export const sDOG=[art(DOG,PDG),art(DOGB,PDG)];

const CDOG=['....................','....................','....KKKKKKKKKK......','...KKDDDDDDDDKK.....','...KDDDDDDDDDDK.....','....KKKK..KKKK......','....KK....KK........','....................'];

export const cDOG=art(CDOG,PDG);

// Sprites pixel art (RGBA en base64, fondo transparente): reemplazan los arboles procedurales
const sprRaw=(w,h,b64)=>{const bin=atob(b64),d=new Uint32Array(w*h);for(let i=0;i<w*h;i++){const o=i*4;if(bin.charCodeAt(o+3)>127)d[i]=C(bin.charCodeAt(o),bin.charCodeAt(o+1),bin.charCodeAt(o+2))}return spr(w,h,d)};

export const sTree=sprRaw(59,64,B_sTree);

export const sBush=proc(16,10,(x,y)=>{const dx=(x-8)/8,dy=(y-6)/5;if(dx*dx+dy*dy<1){const g=110+hash(x,y,52)*60+(5-y)*6;return C(g*.45,g,g*.35)}});

const sDead=art(['...T........T...','....T......T....','.....T....T.....','......T..T......','.......TT.......','.......TT.......','......TTTT......','.......TT.......','.......TT.......','.......TT.......','.......TT.......','.......TT.......','.......TT.......','......TTTT......','.....TTTTTT.....','.....TTTTTT.....'],{'.':0,T:C(96,76,56)});

const CAR=['................','..BBBBBBBBBB....','.BBBBBBBBBBBB...','.BBBBBBBBBBBB...','BWWWWWWWWWWWWB..','BWWWWWWWWWWWWB..','BBBBBBBBBBBBBB..','BKKKKB..BKKKKB..','KKKKKK..KKKKKK..','KKKKKK..KKKKKK..','.KKKK....KKKK...','................'];

export const sCar=art(CAR,{'.':0,B:C(180,70,60),W:C(170,210,230),K:C(30,28,26)}),sCar2=art(CAR,{'.':0,B:C(70,100,150),W:C(170,210,230),K:C(30,28,26)});

const sBarrel=art(['............','..MMMMMM....','.MMMMMMMM...','.MRRRRRRM...','.MRRRRRRM...','.MMMMMMMM...','.MRRRRRRM...','.MRRRRRRM...','.MMMMMMMM...','.MRRRRRRM...','.MRRRRRRM...','..MMMMMM....'],{'.':0,M:C(130,60,36),R:C(200,110,50)});

const sTrash=art(['..........','..GGGGGG..','.GGGGGGGG.','.GGGGGGGG.','.GGGGGGGG.','.GGGGGGGG.','.GGGGGGGG.','.GGGGGGGG.','.GGGGGGGG.','..GGGGGG..'],{'.':0,G:C(100,120,96)});

export const sCrate=art(['............','.WWWWWWWWWW.','.WDDDDDDDDW.','.WDWWWWWWDW.','.WDWDDDDWDW.','.WDWDDDDWDW.','.WDWWWWWWDW.','.WDDDDDDDDW.','.WWWWWWWWWW.','............'],{'.':0,W:C(200,148,86),D:C(140,98,54)});

export const sLamp=art(['........','..LLL...','..LLL...','...L....','...L....','...L....','...L....','...L....','...L....','...L....','...L....','...L....','...L....','...L....','...L....','...L....','..LLL...','..LLL...'],{'.':0,L:C(96,100,110)});

export const sShelf=proc(16,22,(x,y)=>{const r=y%7,b=(y/7)|0;if(x<1||x>14||r===0||y>20)return C(130,92,52);if(r<=4&&hash(x>>1,b,60)>.3){const h=hash(x>>1,b,61);return h<.25?C(210,64,52):h<.5?C(72,134,210):h<.75?C(226,196,64):C(84,176,94)}return C(66,48,32)});

export const sBag=proc(16,12,(x,y)=>{
  const row=Math.floor(y/6),rowY=y%6,offsetX=(row%2)*4;
  const bagX=(x+offsetX)%8;
  if(rowY===0||rowY===5||bagX===0||bagX===7)return C(50,42,28);
  if(bagX===1||rowY===1)return C(140,120,80);
  const n=hash(x,y,400+row);
  return C(155+n*30,135+n*25,95+n*20);
});

export const sLocker=proc(10,18,(x,y)=>{if(x===0||x===9||y===0||y===17)return C(62,72,88);if(x===5)return C(74,84,100);if(y>=3&&y<=5&&x%2===0)return C(84,96,112);if((x===3||x===7)&&y===9)return C(226,204,92);const g=hash(x,y,63)*14;return C(120+g,142+g,164+g)});

export const sMil=proc(14,9,(x,y)=>{if(x===0||x===13||y===0||y===8)return C(40,58,34);if(y===4&&x>=4&&x<=9)return C(232,204,64);if(x===3||x===10)return C(52,70,44);const g=hash(x,y,64)*12;return C(72+g,96+g,60+g)});

export const sCache=proc(20,16,(x,y)=>{const dx=(x-9.5)/10,dy=(y-7.5)/8;if(dx*dx+dy*dy>1.15)return 0;
 if(y<2||y>14)return C(60,50,40);
 if(x<2||x>18)return C(60,50,40);
 const n=hash(x,y,150);if(y>=6&&y<=9&&x>=8&&x<=12)return C(255,215,80);
 if(y>=3&&y<=4&&x>=4&&x<=16)return C(180,140,60);
 if(n>.7)return C(140,105,55);return C(100,80,45)});

export const sCacheOpen=proc(20,16,(x,y)=>{const dx=(x-9.5)/10,dy=(y-7.5)/8;if(dx*dx+dy*dy>1.15)return 0;
 if(y<2||y>14)return C(50,42,34);
 if(x<2||x>18)return C(50,42,34);
 const n=hash(x,y,151);if(y>=10&&y<=12&&x>=3&&x<=17)return C(220,180,60);
 if(n>.75)return C(80,65,40);return C(60,50,38)});

export const sSafe=proc(24,28,(x,y)=>{if(x<2||x>21||y<2||y>25)return 0; if(x<4||x>19||y<4||y>23)return C(35,39,41); if(x===4||x===19||y===4||y===23)return C(125,132,133); if(x>=7&&x<=16&&y>=7&&y<=19){if(x===8||x===15||y===8||y===18)return C(76,82,82);if(x>=10&&x<=13&&y>=11&&y<=14)return C(224,177,64);return C(62,69,70)} if(y>=20&&y<=22)return C(46,50,50);return C(95+hash(x,y,734)*22,100+hash(x,y,735)*22,101+hash(x,y,736)*22)});

export const sBlood=proc(12,12,(x,y)=>{const dx=(x-5.5)/5.5,dy=(y-5.5)/5.5,d=dx*dx+dy*dy;
 if(d>1)return 0;const n=hash(x,y,200);if(d>0.75&&n>0.4)return 0;return C(110+n*60,12+n*15,12+n*15)});

export const sMed=proc(12,12,(x,y)=>{if(x<1||x>10||y<1||y>10)return 0;
 if((x>=5&&x<=6&&y>=3&&y<=8)||(x>=3&&x<=8&&y>=5&&y<=6))return C(245,245,245);return C(190,40,40)});

export const sShell=proc(10,10,(x,y)=>{if(y<2||y>7||x<1||x>8)return 0;return C(190,120,40)});

export const sBul=proc(10,10,(x,y)=>{if(y<2||y>7||x<1||x>8)return 0;return C(180,150,50)});

export const sSmoke=proc(16,16,(x,y)=>{const dx=(x-7.5)/8,dy=(y-7.5)/8,d=dx*dx+dy*dy;
 if(d>1)return 0;const n=hash(x,y,210);if(d>0.7&&n>0.4)return 0;const a=180+n*70;return C(a,a,a)});

export const sFire=proc(12,12,(x,y)=>{const dx=(x-5.5)/6,dy=(y-5.5)/6,d=dx*dx+dy*dy;
 if(d>1)return 0;const n=hash(x,y,211);if(d>0.7&&n>0.5)return 0;return C(255,90+n*150,20+n*40)});

export const sShot=proc(6,6,(x,y)=>{const dx=x-2.5,dy=y-2.5;if(dx*dx+dy*dy>4.5)return 0;return C(255,240,140)});

export const sRocket=loadPngSpr(84,128,B_sRocket);
 /* cohete del RPG visto de frente (PNG) */
export const sRubble=proc(16,8,(x,y)=>{const n=hash(x,y,310),n2=hash(x>>1,y>>1,311);
 const h=Math.sin(x*.5)*1.6+3.5;if(y<7-h||n2>.8)return 0;
 const v=95+n*70;return C(v,v*.95,v*.86)});

export const sFragGren=proc(10,10,(x,y)=>{const dx=(x-4.5)/5,dy=(y-4.5)/5,d=dx*dx+dy*dy;
 if(d>1.05)return 0;const n=hash(x,y,220);if(d>0.8&&n>0.4)return 0;return C(70+n*30,90+n*30,50+n*20)});

export const sSmokeGren=proc(10,10,(x,y)=>{const dx=(x-4.5)/5,dy=(y-4.5)/5,d=dx*dx+dy*dy;
 if(d>1.05)return 0;const n=hash(x,y,221);if(d>0.8&&n>0.4)return 0;return C(120+n*40,130+n*40,140+n*30)});

export const sMolotov=proc(10,10,(x,y)=>{const dx=(x-4.5)/5,dy=(y-4.5)/5,d=dx*dx+dy*dy;
 if(d>1.05)return 0;const n=hash(x,y,222);if(d>0.8&&n>0.4)return 0;return C(200+n*30,120+n*20,40+n*20)});

export const sBeacon=proc(24,48,(x,y)=>{
 if(x>=10&&x<=14&&y>=14&&y<=42){const n=hash(x,y,230);return C(120+n*30,110+n*30,100+n*30)}
 if(y>=40&&y<=46&&x>=8&&x<=16){const n=hash(x,y,231);return C(90+n*20,80+n*20,70+n*20)}
 if(y>=4&&y<=14&&x>=10&&x<=22){const n=hash(x,y,232);const w=(y-4);if(x>10+w)return 0;return C(220+n*30,50+n*30,50+n*30)}
 return 0});

export const sSofa=proc(20,12,(x,y)=>{const n=hash(x,y,240);
 if(y<3)return C(140+n*30,60+n*20,50+n*15);
 if(x<2||x>17)return C(160+n*25,80+n*20,60+n*15);
 if(y<=8)return C(180+n*25,100+n*20,80+n*15);return C(120+n*20,60+n*15,40+n*10)});

export const sSofa2=proc(20,12,(x,y)=>{const n=hash(x,y,241);
 if(y<3)return C(50+n*20,90+n*30,60+n*20);
 if(x<2||x>17)return C(60+n*20,110+n*30,80+n*20);
 if(y<=8)return C(80+n*25,140+n*30,100+n*20);return C(40+n*15,70+n*20,50+n*15)});

export const sBed=proc(20,16,(x,y)=>{const n=hash(x,y,242);
 if(y<4&&x>=2&&x<=17)return C(230+n*20,230+n*20,240+n*15);
 if(y>=4&&y<=14&&x>=1&&x<=18){const stripe=((x+y)>>2)%2;return stripe?C(60+n*20,90+n*40,150+n*30):C(80+n*20,120+n*40,180+n*30)}
 return C(80,60,50)});

export const sBed2=proc(20,16,(x,y)=>{const n=hash(x,y,243);
 if(y<4&&x>=2&&x<=17)return C(230+n*20,230+n*20,240+n*15);
 if(y>=4&&y<=14&&x>=1&&x<=18){const stripe=((x+y)>>2)%2;return stripe?C(80+n*20,60+n*20,50+n*20):C(110+n*20,80+n*20,60+n*20)}
 return C(80,60,50)});

export const sTable=proc(20,14,(x,y)=>{const n=hash(x,y,244);
 if(y>=10){if(x<3||x>16)return C(80+n*20,50+n*15,30+n*15);return 0}
 if(y<3)return C(160+n*30,110+n*25,60+n*20);return C(140+n*30,95+n*25,50+n*20)});

export const sRug=proc(24,16,(x,y)=>{const n=hash(x,y,245);const border=(x<1||x>22||y<1||y>14);
 if(border)return C(140+n*30,80+n*25,50+n*20);
 const stripe=((x>>1)+(y>>1))%2;return stripe?C(160+n*30,40+n*20,40+n*20):C(120+n*20,30+n*15,30+n*15)});

export const sBagWall=proc(20,16,(x,y)=>{
  const rowH=8,row=Math.floor(y/rowH),rowY=y%rowH;
  const offsetX=row*5;
  const bagX=(x+offsetX)%10;
  if(bagX<1)return C(55,45,30);
  if(rowY<1||rowY>=rowH-1)return C(45,38,24);
  const bulgeX=1-Math.abs(bagX-5)/5;
  const bulgeY=1-Math.abs(rowY-3.5)/3.5;
  const bulge=Math.max(0,bulgeX*bulgeY);
  const n=hash(x,y,700),v=130+n*25+bulge*35;
  return C(v*0.9,v*0.82,v*0.6);
});

const sBagWall2=sBagWall;

export const sWire=sprRaw(54,41,B_sWire);

export const sCzech=sprRaw(51,48,B_sCzech);

export const sTower=proc(22,48,(x,y)=>{
  if(y<5){if(x<2||x>19)return 0;return C(55,48,40)}
  if(y>=5&&y<32){
    if(x<2||x>19)return 0;
    if(y>=8&&y<=15){if(x>=5&&x<=7)return C(20,20,25);if(x>=14&&x<=16)return C(20,20,25)}
    if(y>=18&&y<=26&&(x===10||x===11))return C(30,30,35);
    const n=hash(x,y,450);return C(85+n*20,75+n*20,65+n*20);
  }
  if(y>=32&&y<48){
    if(x<2||x>19)return 0;
    if(x===2||x===19||y===47)return C(48,42,36);
    if(y===32||y===33)return C(40,36,32);
    const n=hash(x,y,451);return C(95+n*20,86+n*20,76+n*20);
  }
  return 0;
});

const sTent=proc(30,22,(x,y)=>{
  const cx=14.5;
  const halfW=Math.max(0,Math.floor((y/22)*14));
  const dxFromCx=x-cx,absDx=Math.abs(dxFromCx);
  if(absDx>halfW)return 0;
  if(y<=1){const n=hash(x,y,460);return C(40+n*15,38+n*15,32+n*15)}
  const cellX=Math.floor(x/3),cellY=Math.floor(y/3);
  const n=hash(cellX,cellY,461);
  let r,g,b;
  if(n<0.3){r=68;g=88;b=52}
  else if(n<0.55){r=88;g=72;b=48}
  else if(n<0.8){r=48;g=60;b=38}
  else{r=100;g=100;b=60}
  const doorTop=10;
  if(y>=doorTop){const doorW=(y-doorTop)*0.8;if(absDx<doorW)return C(15,15,12)}
  const side=dxFromCx<0?0.85:1.1;
  if(absDx>=halfW-1&&absDx<=halfW){r=Math.min(255,r*1.3);g=Math.min(255,g*1.3);b=Math.min(255,b*1.3)}
  return C(r*side,g*side,b*side);
});


// === TIENDAS ENEMIGAS 6 VARIANTES - ENTERRADAS ===
const sEnemyTent0=spr(64,39,new Uint32Array(B_sEnemyTent0));

const sEnemyTent1=spr(64,41,new Uint32Array(B_sEnemyTent1));

const sEnemyTent2=spr(64,34,new Uint32Array(B_sEnemyTent2));

const sEnemyTent3=spr(64,38,new Uint32Array(B_sEnemyTent3));

const sEnemyTent4=spr(64,45,new Uint32Array(B_sEnemyTent4));

const sEnemyTent5=spr(64,45,new Uint32Array(B_sEnemyTent5));

export const sEnemyTents=[sEnemyTent0,sEnemyTent1,sEnemyTent2,sEnemyTent3,sEnemyTent4,sEnemyTent5];

function loadPngSpr(w,h,b64){const d=new Uint32Array(w*h),s=spr(w,h,d),im=new Image();
 const ready=new Promise(resolve=>{im.onload=()=>{try{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(im,0,0);const p=x.getImageData(0,0,w,h).data;
  for(let i=0;i<w*h;i++){const o=i*4;d[i]=p[o+3]>127?C(p[o],p[o+1],p[o+2]):0}s.sh=shades(d,1,0,true);s.red=null}catch(e){}finally{resolve(true)}};im.onerror=()=>resolve(false)});
 SPRITE_ASSET_PROMISES.push(ready);
 im.src='data:image/png;base64,'+b64;return s}

// === TIENDAS DE LA ZONA DEVASTADA (PNG, 6 variantes) ===
const sWasteTent0=loadPngSpr(178,122,B_sWasteTent0);

const sWasteTent1=loadPngSpr(178,105,B_sWasteTent1);

const sWasteTent2=loadPngSpr(190,102,B_sWasteTent2);

const sWasteTent3=loadPngSpr(177,105,B_sWasteTent3);

const sWasteTent4=loadPngSpr(173,126,B_sWasteTent4);

const sWasteTent5=loadPngSpr(178,104,B_sWasteTent5);

;

export const sBunker=proc(26,20,(x,y)=>{
  if(x<1||x>24||y<1||y>18)return C(90,90,100);
  if(y<3)return C(110,110,118);
  if(y>=8&&y<=10&&x>=5&&x<=20)return C(15,15,20);
  if(x<3||x>22)return C(100,100,110);
  const n=hash(x,y,470);return C(140+n*20,140+n*20,145+n*20);
});

export const sGate=proc(16,20,(x,y)=>{
  if(y<2||y>17||x<2||x>13)return C(70,60,50);
  if(x%3===0)return C(100,90,80);
  if((x+y)%6===0)return C(90,80,70);
  if(x>=6&&x<=9&&y>=8&&y<=11)return C(40,35,30);
  return 0;
});

export const sGateLight=proc(16,14,(x,y)=>{
  if(y<1||y>12||x<1||x>14)return C(60,50,40);
  if(x%4===0)return C(120,100,80);
  return 0;
});

export const sGenerator=proc(22,18,(x,y)=>{
  if(x<1||x>20||y<1||y>16)return 0;
  if(y<3)return C(120,110,90);
  if(x<2||x>19){
    const n=hash(x,y,900);return C(70+n*20,60+n*20,50+n*20);
  }
  const rx=x%3,ry=Math.floor(y/2)%3;
  if(rx===0&&ry<2)return C(30,30,35);
  if(y>=4&&y<=6&&x>=4&&x<=8)return C(220,60,40);
  if(y>=4&&y<=6&&x>=10&&x<=14)return C(60,200,80);
  const n=hash(x,y,901);
  return C(140+n*20,130+n*20,105+n*20);
});

export const sAntenna=proc(14,32,(x,y)=>{
  if(x>=6&&x<=7&&y>=6&&y<30){
    const n=hash(x,y,910);return C(150+n*30,150+n*30,140+n*30);
  }
  if(y>=28&&y<32&&x>=3&&x<=10)return C(80,80,80);
  const dx=x-6.5,dy=y-3.5;
  const d=Math.hypot(dx*0.9,dy*1.4);
  if(d<6&&y<7){
    const n=hash(x,y,911);
    if(d>4.5)return C(180+n*20,180+n*20,170+n*20);
    return C(140+n*30,140+n*30,130+n*30);
  }
  if(x===6&&y>=7&&y<28)return C(20,20,20);
  return 0;
});

export const sMapTable=proc(24,16,(x,y)=>{
  if(y>=13){
    if((x>=1&&x<=3)||(x>=20&&x<=22))return C(60,40,30);
    return 0;
  }
  if(y<2){
    const n=hash(x,y,920);return C(120+n*20,90+n*15,60+n*10);
  }
  const n=hash(x,y,921);
  if(y>=3&&y<=10){
    if(n<0.3)return C(220,210,180);
    if(n<0.55)return C(200,180,140);
    if(n<0.7)return C(180,60,40);
    if(n<0.85)return C(60,90,140);
    return C(150,130,90);
  }
  return C(100,80,60);
});

export const sFuelBarrel=proc(16,20,(x,y)=>{
  const dx=x-7.5;
  const ry=y;
  if(Math.abs(dx)>6)return 0;
  if(ry<2||ry>17)return 0;
  if(ry===6||ry===13)return C(60,60,60);
  const band=ry;
  if((band>=8&&band<=9)||(band>=15&&band<=16)){
    const phase=(x%8);
    return phase<4?C(220,180,30):C(30,30,30);
  }
  const n=hash(x,y,930);
  return C(180+n*20,60+n*15,40+n*10);
});


/* ===== DECORACIÓN URBANA: semáforos, mobiliario y nuevos árboles ===== */
export const sTrafficLight=proc(14,34,(x,y)=>{
 const metal=(n)=>C(74+n*16,78+n*16,86+n*16);
 if((x===6||x===7)&&y>=4&&y<32)return metal(hash(x,y,520));
 if(y>=4&&y<=5&&x>=2&&x<=7)return metal(hash(x,y,521));
 if(x>=1&&x<=6&&y>=6&&y<=19){
  if(x===1||x===6||y===6||y===19)return C(38,40,46);
  if(y>=8&&y<=9&&x>=2&&x<=5)return C(255,70,50);
  if(y>=11&&y<=12&&x>=2&&x<=5)return C(255,200,48);
  if(y>=14&&y<=15&&x>=2&&x<=5)return C(80,230,96);
  return C(24,26,30);
 }
 if(y>=30&&y<=32&&x>=4&&x<=9)return C(60,62,68);
 return 0;
});

export const sStreetSign=proc(10,20,(x,y)=>{
 if((x===4||x===5)&&y>=6&&y<20){const n=hash(x,y,580);return C(110+n*12,114+n*12,120+n*12)}
 const dx=x-4.5,dy=y-3.5,d=dx*dx+dy*dy;
 if(d<7){const n=hash(x,y,581);if(d>4.4)return C(180+n*20,40,36);return C(196+n*20,48,40)}
 return 0;
});

export const sHydrant=proc(10,14,(x,y)=>{
 const n=hash(x,y,540);
 const red=(m)=>C(Math.min(255,196*m+n*16),52*m,38*m);
 if(y>=11&&x>=2&&x<=7)return red(.7);
 if(y>=3&&y<=10&&x>=3&&x<=6)return red(1);
 if(y>=1&&y<=2&&x>=4&&x<=5)return red(1.15);
 if(y>=5&&y<=6&&(x===1||x===2||x===7||x===8))return red(.85);
 return 0;
});

export const sCone=proc(12,14,(x,y)=>{
 if(y>=11&&y<=12&&x>=2&&x<=9)return C(190,90,30);
 const w=1+(y-1)*.42;
 if(y>=2&&y<=10&&Math.abs(x-5.5)<=w){
  if(y>=5&&y<=6)return C(235,235,230);
  return C(232,104,32);
 }
 return 0;
});

export const sTrashBag=proc(12,10,(x,y)=>{
 const dx=(x-5.5)/5,dy=(y-5)/4.6,d=dx*dx+dy*dy;
 if(d>1)return 0;
 const n=hash(x,y,530);const v=46+n*26-d*10;
 return C(v,v+4,v+8);
});

export const sDumpster=proc(26,16,(x,y)=>{
 if(x===0||x===25||y===15)return C(28,52,40);
 if(y<3){const n=hash(x,y,550);return C(46+n*10,84+n*14,64+n*10)}
 if(x<2||x>23)return C(34,64,48);
 const n=hash(x>>2,y,551);
 if(y>=6&&y<=9&&x>=4&&x<=21)return n>.5?C(40,74,56):C(36,66,50);
 return C(40+n*12,76+n*16,58+n*12);
});

export const sBench=proc(22,12,(x,y)=>{
 const wood=(m)=>{const n=hash(x,y,560);return C(150*m+n*20,104*m+n*14,62*m+n*10)};
 if(y>=2&&y<=3)return wood(1);
 if(y>=5&&y<=6)return wood(.92);
 if((y>=7&&y<=9)&&(x<3||x>18))return wood(.7);
 if(y>=10&&y<=11&&((x>=1&&x<=2)||(x>=19&&x<=20)))return wood(.6);
 return 0;
});

export const sBusStop=proc(30,26,(x,y)=>{
 if((x===4||x===5)&&y>=4&&y<24){const n=hash(x,y,570);return C(96+n*14,100+n*14,108+n*14)}
 if(x>=2&&x<=26&&y>=2&&y<=8){
  if(x===2||x===26||y===2||y===8)return C(60,64,72);
  if(y>=3&&y<=5&&x%4<2)return C(230,180,40);
  return C(44,110,190);
 }
 if(y>=22&&y<=23&&x>=4&&x<=24){const n=hash(x,y,571);return C(120+n*16,126+n*16,134+n*16)}
 return 0;
});

export const sPine=sprRaw(39,64,B_sPine);

export const sTree2=sTree;

const sDeadTree=proc(28,44,(x,y)=>{
 // Tronco muerto sin copa ni hojas, con ramas cortas desnudas.
 const lean=(y/44)*2.4,cx=13+lean,dx=Math.abs(x-cx),n=hash(x,y,1911);
 if(y>=3&&y<=43&&dx<2.2){let v=48+n*32;if(dx<.8)v+=14; if(y%7===0)v*=.68;return C(v*1.02,v*.91,v*.76)}
 const branches=[{y:13,x:12,dir:-1,len:5},{y:19,x:14,dir:1,len:6},{y:26,x:14,dir:-1,len:4},{y:31,x:15,dir:1,len:4}];
 for(const b of branches){const t=(y-b.y),bx=b.x+b.dir*t*.8;if(t>=-1&&t<=b.len&&Math.abs(x-bx)<1.15)return C(65+n*24,55+n*20,43+n*16)}
 return 0;
});

const sBurntTree=proc(30,46,(x,y)=>{
 // Árbol calcinado: tronco negro partido arriba, ramas quebradas y brasas en las grietas.
 const lean=Math.sin(y*.09)*1.4-(y/46)*1.6,cx=15+lean,n=hash(x,y,1941);
 const w=y>38?3.4:y<8?1.2+(y/8)*1.2:2.4;
 if(y>=2&&y<=45&&Math.abs(x-cx)<w){
  if(y<6&&((x+y)&1))return 0;
  let v=16+n*20;if(Math.abs(x-cx)<.8)v+=10;
  if(hash(x>>1,y>>2,1942)>.9)return C(170+n*60,60+n*30,14);
  if(y%5===0)v*=.6;return C(v*1.1,v*.95,v*.85);
 }
 const br=[{y:10,x:14,dir:1,len:7},{y:16,x:15,dir:-1,len:6},{y:23,x:15,dir:1,len:5},{y:28,x:14,dir:-1,len:3}];
 for(const b of br){const t=y-b.y,bx=b.x+b.dir*t*1.1;if(t>=-1&&t<=b.len&&Math.abs(x-bx)<1.0)return C(22+n*16,19+n*13,17+n*11)}
 if(y>=43&&Math.abs(x-cx)<6&&n>.45)return C(70+n*30,66+n*28,62+n*26);
 return 0;
});


// ===== ÁRBOLES MUERTOS — FRENTE DE CENIZA (4 variantes del arte de referencia) =====
// Las tres primeras conservan la altura de un pino normal; la cuarta es un tronco más bajo.
const sAshDeadPineA=sprRaw(64,113,B_sAshDeadPineA);

const sAshDeadPineB=sprRaw(62,113,B_sAshDeadPineB);

const sAshDeadTreeC=sprRaw(60,112,B_sAshDeadTreeC);

const sAshBrokenTrunkD=sprRaw(64,108,B_sAshBrokenTrunkD);

const sAshDeadVariants=[sAshDeadPineA,sAshDeadPineB,sAshDeadTreeC,sAshBrokenTrunkD];

export const pickAshDeadTree=(x,y,salt)=>{
 const seed=(MAP_SEED+salt)>>>0;
 const variant=Math.min(3,Math.floor(hash(x,y,seed)*sAshDeadVariants.length));
 const spr=sAshDeadVariants[variant];
 const sizeSeed=(seed+1)>>>0;
 const wh=variant===3?2.22+hash(x,y,sizeSeed)*.18:3.12+hash(x,y,sizeSeed)*.38;
 return {spr,wh,variant};
};


// ===== ÁRBOLES MUERTOS — TIERRA DE NADIE / ZONA DEVASTADA (2 variantes del arte de referencia) =====
const sAshWasteTreeA=sprRaw(56,112,B_sAshWasteTreeA);

const sAshWasteTreeB=sprRaw(45,90,B_sAshWasteTreeB);

const sAshWasteVariants=[sAshWasteTreeA,sAshWasteTreeB];

export const pickAshWasteTree=(x,y,salt)=>{
 const seed=(MAP_SEED+salt)>>>0;
 const variant=Math.min(1,Math.floor(hash(x,y,seed)*sAshWasteVariants.length));
 const spr=sAshWasteVariants[variant];
 const sizeSeed=(seed+1)>>>0;
 const wh=variant===1?2.4+hash(x,y,sizeSeed)*.35:3.0+hash(x,y,sizeSeed)*.4;
 return {spr,wh,variant};
};



export const sFallenTrunk=proc(34,18,(x,y)=>{
 // Tronco caído, corte ovalado visible y corteza quemada.
 const cy=8.5,dy=(y-cy)/7.4,ends=(x<4||x>29),cx=ends?(x<4?4:29):x;
 const edge=Math.abs(dy),n=hash(x,y,1921);
 if(edge>1||x<1||x>32)return 0;
 if(ends&&Math.hypot(x-(x<4?3.2:29.8),y-cy)<4.0){const d=Math.hypot(x-(x<4?3.2:29.8),y-cy);const v=65+n*24;return d<2.4?C(104+n*24,91+n*19,72+n*15):C(v*.72,v*.66,v*.56)}
 let v=42+n*27;if(y%4===0)v*=.68;if((x+y)%11<2)v+=10;return C(v*1.05,v*.86,v*.7);
});


// ===== SPRITES DECORATIVOS EXTRA (Frente de Ceniza) =====
export const sChair=proc(16,22,(x,y)=>{
 const n=hash(x,y,5301);
 if(y>=19&&y<=21&&x>=2&&x<=13)return C(96+n*22,70+n*16,44+n*10);
 if(x>=3&&x<=5&&y>=4)return C(88+n*18,64+n*14,40+n*9);
 if(y>=9&&y<=11&&x>=3&&x<=12)return C(104+n*20,76+n*15,46+n*10);
 if(y>=4&&y<=8&&x>=4&&x<=11&&(x+y)%2)return C(78+n*16,58+n*13,36+n*8);
 return 0;
});

export const sChairBurnt=proc(16,22,(x,y)=>{
 const n=hash(x,y,5311);
 if(y>=19&&y<=21&&x>=2&&x<=13){if((x===4||x===10)&&n>.55)return 0;return C(30+n*16,24+n*12,20+n*8)}
 if(x>=3&&x<=5&&y>=4&&n>.82)return 0;
 if(x>=3&&x<=5&&y>=4)return C(24+n*14,20+n*10,17+n*7);
 if(y>=9&&y<=11&&x>=3&&x<=12)return C(28+n*15,23+n*11,19+n*8);
 if(y>=4&&y<=8&&x>=4&&x<=11&&(x+y)%2&&n>.35)return C(20+n*12,17+n*9,15+n*6);
 if(n>.93)return C(150+n*60,52+n*22,12);
 return 0;
});

export const sPainting=proc(22,18,(x,y)=>{
 const n=hash(x,y,5321);
 if(x<1||x>20||y<1||y>16)return 0;
 if(x<2||x>19||y<2||y>15)return C(96+n*18,72+n*12,40+n*8);
 if(y<7)return C(96+n*24,132+n*24,168+n*20);
 if(y<10)return C(70+n*20,110+n*18,64+n*12);
 return C(52+n*16,84+n*16,46+n*10);
});

export const sClock=proc(16,16,(x,y)=>{
 const dx=x-7.5,dy=y-7.5,d=Math.hypot(dx,dy),n=hash(x,y,5331);
 if(d>7.4)return 0;
 if(d>6.2)return C(84+n*16,62+n*12,36+n*8);
 if(d>5.4)return C(228+n*16,224+n*14,208+n*12);
 if((Math.abs(dx)<.7&&dy<0&&dy>-4.4)||(Math.abs(dy)<.7&&dx>0&&dx<3.4))return C(30,28,26);
 if(d<1.1)return C(40,36,32);
 return C(232+n*10,228+n*10,214+n*8);
});

export const sCampTent=proc(38,26,(x,y)=>{
 const cx=18.5,n=hash(x,y,5341),dx=(x-cx)/17,dy=(25-y)/21;
 if(y===25&&Math.abs(x-cx)<16)return C(42,34,24);
 if(dx*dx+dy*dy>1)return 0;
 const ax=(x-cx)/5,ay=(25-y)/11;
 if(ax*ax+ay*ay<1){if(ax*ax+ay*ay>.76)return C(96+n*14,58+n*10,30);return C(18+n*8,13+n*6,10)}
 let r=196,g=104,b=44;
 if(hash(x>>2,y>>2,5342)>.9){r=170;g=88;b=38}
 if((x+y*2)%10===0){r*=.9;g*=.9;b*=.9}
 const sh=.74+.34*(1-(x-1)/36),k=sh*(.92+n*.12);
 if(dx*dx+dy*dy>.88){r*=.72;g*=.72;b*=.72}
 return C(r*k,g*k,b*k);
});

export const sCampTent2=proc(40,24,(x,y)=>{
 const cx=19.5,n=hash(x,y,5351);
 if(y<4||y>23)return 0;
 const t=(y-4)/19,hw=1+t*17,dx=x-cx;
 if(Math.abs(dx)>hw)return 0;
 if(Math.abs(dx)<.8&&y<7)return C(70,58,40);
 let r=54,g=88,b=136;
 if(((x+y)%12)<4){r=196;g=178;b=136}
 if(hash(x>>2,y>>2,5352)>.92){r=44;g=72;b=112}
 const e=hw-Math.abs(dx);
 if(e<1.1){r*=.6;g*=.6;b*=.6}
 if(Math.abs(dx)<3.2&&y>16){const d=12+n*8;return C(d,d+2,d+4)}
 const k=(dx<0?1.08:.76)*(.92+n*.12);
 return C(r*k,g*k,b*k);
});

export const sDebris=proc(24,14,(x,y)=>{
 const n=hash(x,y,5361);
 const cx=11.5,cy=10;
 if(Math.hypot((x-cx)/10.5,(y-cy)/4.2)>1)return 0;
 if(n>.9)return C(150+n*50,54+n*20,14);
 if(n>.72)return C(34+n*16,28+n*12,24+n*8);
 if(n>.45)return C(70+n*22,60+n*18,50+n*12);
 return C(96+n*24,86+n*20,72+n*14);
});


/* ===== CAMPAMENTOS IMPROVISADOS (Frente de Ceniza) ===== */
const segD=(x,y,x0,y0,x1,y1)=>{const vx=x1-x0,vy=y1-y0,l=vx*vx+vy*vy||1;let t=((x-x0)*vx+(y-y0)*vy)/l;t=t<0?0:t>1?1:t;return Math.hypot(x-(x0+vx*t),y-(y0+vy*t))};

// TIENDA DE LONA: tienda canadiense verde oliva con mástil, vientos y entrada oscura.
const sTentA=proc(42,30,(x,y)=>{
 const cx=20.5,top=3,base=27,n=hash(x,y,2101);
 if(segD(x,y,cx-13,10,1,28)<.55||segD(x,y,cx+13,10,40,28)<.55)return C(150,138,110);
 if((x===1||x===40)&&y>=26&&y<=29)return C(92,70,44);
 if(y===28&&Math.abs(x-cx)<16)return C(26,24,19);
 if(y<top-2||y>base)return 0;
 if(Math.abs(x-cx)<.8&&y<top+1)return C(90,66,40);
 if(y<top)return 0;
 const t=(y-top)/(base-top),hw=1.2+t*14.5,dx=x-cx;
 if(Math.abs(dx)>hw)return 0;
 const ow=y>12?(y-12)/(base-12)*5.6:-1;
 if(Math.abs(dx)<ow){if(Math.abs(dx)>ow-1.2)return C(118+n*12,124+n*12,80+n*8);const d=10+n*10;return C(d+6,d+4,d)}
 let r=92,g=102,b=58;
 if(hash(x>>2,y>>2,2102)>.9){r=132;g=116;b=80}
 const e=hw-Math.abs(dx);if(e<1.1){r*=.62;g*=.62;b*=.62}
 if(y%7===0){r*=.84;g*=.84;b*=.84}
 if(Math.abs(dx)<.7&&y<=12){r=88;g=64;b=38}
 const lit=dx<0?1.08:.74,k=lit*(.9+n*.16);return C(r*k,g*k,b*k);
});

// TIENDA REMENDADA: domo de lona cruda con parches de colores y faldón enrollado.
const sTentB=proc(40,28,(x,y)=>{
 const cx=19.5,n=hash(x,y,2111),dx=(x-cx)/18,dy=(27-y)/23;
 if(y===27&&Math.abs(x-cx)<18)return C(28,25,20);
 if(dx*dx+dy*dy>1)return 0;
 const ax=(x-cx)/5.2,ay=(27-y)/13;
 if(ax*ax+ay*ay<1){if(ax*ax+ay*ay>.78)return C(110+n*14,90+n*10,60);return C(16+n*9,14+n*7,11)}
 const ry=(27-y)/13.6;if(Math.abs(x-cx)<6&&ry>.98&&ry<1.12)return C(170+n*16,150+n*14,108);
 let r=158,g=136,b=96;const p=hash(x>>2,(y+2)>>2,2112);
 if(p>.9){r=96;g=104;b=64}else if(p>.83){r=118;g=118;b=112}else if(p<.05){r=132;g=86;b=56}
 if((x+y*2)%9===0||(x*2-y)%11===0){r*=.88;g*=.88;b*=.88}
 const sh=.72+.36*(1-(x-1)/38)+(dy>.85?.06:0),k=sh*(.9+n*.14);
 if(dx*dx+dy*dy>.9){r*=.7;g*=.7;b*=.7}
 return C(r*k,g*k,b*k);
});

// REFUGIO DE LONA: lona tensada entre dos palos, con saco de dormir debajo.
const sLeanTo=proc(42,30,(x,y)=>{
 const n=hash(x,y,2121);
 if((Math.abs(x-4)<.9&&y>=5&&y<=29)||(Math.abs(x-37)<.9&&y>=9&&y<=29))return C(96+n*20,70+n*14,42+n*8);
 if(segD(x,y,4,5,0,29)<.5||segD(x,y,37,9,41,29)<.5)return C(150,138,110);
 if(x>=4&&x<=37){const t=(x-4)/33,yt=5+t*4+Math.sin(t*3.14)*1.6,yb=yt+11+Math.sin(t*6.28)*1.2;
  if(y>=yt&&y<=yb){let r=66,g=86,b=96;if(y<yt+1.2||y>yb-1.2){r*=.7;g*=.7;b*=.7}if(((x-4)%8)===0){r*=.82;g*=.82;b*=.82}const k=.86+n*.18+(yb-y)/30;return C(r*k,g*k,b*k)}}
 if(y>=24&&y<=28&&x>=9&&x<=31){const e=(y===24||y===28||x===9||x===31);let r=58,g=82,b=50;if((x-9)%6===0){r*=.8;g*=.8;b*=.8}if(x<14){r=170;g=160;b=132}if(e){r*=.65;g*=.65;b*=.65}return C(r*(.9+n*.15),g*(.9+n*.15),b*(.9+n*.15))}
 return 0;
});

// FOGATA: anillo de piedras, leños cruzados y llamas animadas (3 cuadros).
function campfireFrame(f){return proc(22,24,(x,y)=>{
 const cx=10.5,n=hash(x,y,2131+f*7);
 const ex=(x-cx)/10,ey=(y-20.5)/3.2,ed=ex*ex+ey*ey;
 if(ed<1&&ed>.45&&y>=18){const s=hash(x>>1,y,2132);return s>.5?C(110+n*30,106+n*28,100+n*26):C(72+n*20,70+n*18,66+n*16)}
 if((segD(x,y,4,20,17,15)<1.3||segD(x,y,17,20,4,15)<1.3)&&y>=13){const ch=hash(x,y,2133);if(ch>.8)return C(220,90,20);return C(70+n*20,44+n*12,26+n*8)}
 if(y>=19&&ed<.45)return C(200+n*55,70+n*50,10);
 const fy=(19-y)/17;if(fy<0||fy>1)return 0;
 const wave=Math.sin(x*1.15+f*2.1+y*.35)*1.6+Math.sin(x*.5-f*1.4)*1.1;
 const hw=(1-fy)*7.2*(.75+.35*hash(x>>1,y>>2,2134+f));
 const d=Math.abs(x-cx-wave*fy);if(d>hw)return 0;
 const c=1-d/(hw||1);
 if(c>.66&&fy<.55)return C(255,240,170);
 if(c>.33)return C(255,160+n*40,30);
 return C(220,60+n*30,14);
})}

export const sCampfire=[campfireFrame(0),campfireFrame(1),campfireFrame(2)];

// OLLA EN TRÍPODE: trípode de ramas, cadena y olla tiznada sobre brasas.
const sCookPot=proc(20,26,(x,y)=>{
 const n=hash(x,y,2141);
 if(segD(x,y,10,1,2,25)<.6||segD(x,y,10,1,18,25)<.6||segD(x,y,10,1,12,25)<.45)return C(86+n*20,62+n*14,38+n*8);
 if(Math.abs(x-10)<.5&&y>1&&y<11)return (y%2)?C(120,120,124):C(80,80,84);
 const ex=(x-10)/5.4,ey=(y-14.5)/3.8;if(ex*ex+ey*ey<1&&y>=11){if(y<=11.5)return C(120,118,112);return C(28+n*12,28+n*12,30+n*12)}
 if(y>=22&&y<=24&&Math.abs(x-10)<5){return hash(x,y,2142)>.5?C(230,100,20):C(60,40,30)}
 return 0;
});

// TRONCO DE ASIENTO: tronco partido para sentarse junto al fuego.
export const sLogSeat=proc(30,11,(x,y)=>{
 const n=hash(x,y,2151);
 if(y===10&&x>1&&x<29)return C(26,24,19);
 const d=Math.hypot(x-4,y-5);
 if(d<4.6){if(d<1)return C(120,90,56);if(((d*2)|0)%2)return C(176+n*20,140+n*16,92+n*10);return C(150+n*18,116+n*14,74+n*8)}
 if(x>=4&&x<=28&&y>=1&&y<=9){let v=70+n*28;if(y===1||y===9)v*=.6;if((x+y*3)%7===0)v*=.75;return C(v*1.1,v*.82,v*.56)}
 return 0;
});

// CAJA DE RACIONES: caja de madera con plantilla verde y tapa clavada.
export const sFoodCrate=proc(22,18,(x,y)=>{
 const n=hash(x,y,2161);
 if(y===17)return C(26,24,19);
 let r=160+n*26,g=118+n*20,b=70+n*12;
 if(y<=1||x<=1||x>=20||y>=15){r*=.62;g*=.62;b*=.62}
 else if(y%5===0){r*=.78;g*=.78;b*=.78}
 if(x>=6&&x<=15&&y>=6&&y<=10){r=58;g=88;b=46;if((x===8||x===12)&&y>6&&y<10){r=150;g=126;b=80}}
 if((x===3||x===18)&&(y===3||y===13))return C(60,60,62);
 return C(r,g,b);
});

// CAJA DE MUNICIÓN: caja metálica verde oliva, franja amarilla y asa.
const sAmmoCrate=proc(22,16,(x,y)=>{
 const n=hash(x,y,2171);
 if(y===15)return C(26,24,19);
 if(y<=2){if(y===0&&x>=8&&x<=13)return C(40,42,40);if(y>=1&&(x===8||x===13))return C(40,42,40);if(y===2&&x>=1&&x<=20)return C(60,68,44);return 0}
 let r=74+n*14,g=86+n*14,b=50+n*10;
 if(x<=1||x>=20||y>=13){r*=.66;g*=.66;b*=.66}
 if(y>=6&&y<=8&&x>2&&x<19){r=196;g=168;b=48;if((x%4)===0){r*=.6;g*=.6;b*=.6}}
 if((x===4||x===17)&&y>=3&&y<=5)return C(140,140,136);
 return C(r,g,b);
});

// BOTIQUÍN DE CAMPAÑA: maletín blanco con cruz roja.
const sMedBox=proc(18,15,(x,y)=>{
 const n=hash(x,y,2181);
 if(y===14)return C(26,24,19);
 if(y<=2){if((y===0&&x>=6&&x<=11)||(y>0&&(x===6||x===11)))return C(60,60,64);return 0}
 let v=200+n*30;if(x===0||x===17||y===3||y===13)v*=.65;
 if((Math.abs(x-8.5)<1.6&&y>=5&&y<=11)||(Math.abs(y-8)<1.6&&x>=5&&x<=12))return C(190,30,28);
 return C(v,v,v*.96);
});

// SACOS DE VÍVERES: sacos de yute amarrados.
const sSupplySacks=proc(28,20,(x,y)=>{
 const n=hash(x,y,2191);
 if(y===19&&x>0&&x<27)return C(26,24,19);
 const sacks=[[7,13,6.5,6],[20,13,6.5,6],[13.5,7,6,6]];
 for(let i=sacks.length-1;i>=0;i--){const[sx,sy,rx,ry]=sacks[i],ex=(x-sx)/rx,ey=(y-sy)/ry,d=ex*ex+ey*ey;
  if(Math.abs(x-sx)<1.5&&y<sy-ry+1.5&&y>=sy-ry-1)return C(110,84,50);
  if(d<1){let r=168,g=138,b=92;if(((x+y)%3)===0){r*=.88;g*=.88;b*=.88}if(d>.72){r*=.7;g*=.7;b*=.7}if(i===2&&Math.abs(y-sy)<1&&Math.abs(x-sx)<3)return C(70,110,60);const k=.88+n*.16;return C(r*k,g*k,b*k)}}
 return 0;
});

// BIDÓN DE AGUA: bidón azul de plástico con tapa.
const sWaterDrum=proc(14,22,(x,y)=>{
 const n=hash(x,y,2201);
 if(y===21)return C(26,24,19);
 if(y<=1)return (x>=5&&x<=8)?C(220,220,214):0;
 if(x<1||x>12)return 0;
 const sh=.6+.6*Math.sin((x-.5)/12*3.14);let r=40,g=92,b=168;
 if(y===2||y===20||y===8||y===14){r*=.7;g*=.7;b*=.7}
 const k=sh*(.92+n*.12);return C(r*k,g*k,b*k);
});

// PILA DE LEÑA: troncos apilados con cortes visibles.
export const sFirewood=proc(28,16,(x,y)=>{
 const n=hash(x,y,2211);
 if(y===15&&x>0&&x<27)return C(26,24,19);
 const logs=[[4,12],[10,12],[16,12],[22,12],[7,7],[13,7],[19,7],[10,2.5],[16,2.5]];
 for(const[lx,ly]of logs){const d=Math.hypot(x-lx,y-ly);if(d<2.9){if(d>2.2)return C(70+n*16,48+n*10,30+n*6);if(d<.7)return C(120,86,52);return ((d*2.4)|0)%2?C(182+n*18,146+n*14,96):C(160+n*16,124+n*12,80)}}
 return 0;
});

// FAROL DE CAMPAMENTO: poste de madera con farol encendido.
export const sCampLantern=proc(12,36,(x,y)=>{
 const n=hash(x,y,2221);
 if(Math.abs(x-3)<1&&y>=2)return C(96+n*20,70+n*14,42);
 if(y>=2&&y<=3&&x>=3&&x<=9)return C(96+n*20,70+n*14,42);
 if(x===8&&y>=4&&y<=5)return C(60,60,60);
 if(x>=6&&x<=10&&y>=6&&y<=12){if(x===6||x===10||y===6||y===12)return C(50,50,46);const g=1-Math.hypot(x-8,y-9)/4;return C(255,200+g*50,90+g*80)}
 if(y===35&&x>=1&&x<=5)return C(26,24,19);
 return 0;
});

// MESA DE RADIO: mesa plegable con radio de campaña y antena.
const sRadioTable=proc(24,22,(x,y)=>{
 const n=hash(x,y,2231);
 if(y===21&&x>1&&x<23)return C(26,24,19);
 if(Math.abs(x-18)<.5&&y>=0&&y<=8)return C(40,40,42);
 if(x>=7&&x<=19&&y>=6&&y<=11){if(y===6||y===11||x===7||x===19)return C(30,34,28);if(x>=9&&x<=11&&y>=8&&y<=9)return C(255,180,40);if(x>=14&&x<=17&&y>=8&&y<=9)return ((x+y)&1)?C(20,22,20):C(90,96,86);return C(66+n*10,76+n*10,54)}
 if(y>=12&&y<=13&&x>=1&&x<=22)return C(132+n*16,96+n*12,58);
 if((segD(x,y,3,14,6,20)<.6||segD(x,y,20,14,17,20)<.6||segD(x,y,6,14,3,20)<.6||segD(x,y,17,14,20,20)<.6))return C(80,60,38);
 return 0;
});

// PARAPETO IMPROVISADO: sacos terreros apilados con estacas.
const sParapet=proc(34,16,(x,y)=>{
 const n=hash(x,y,2241);
 if(y===15&&x>0&&x<33)return C(26,24,19);
 // Tres hileras de sacos terreros redondeados, desplazadas como en una barricada real.
 const rows=[{cy:12,off:0,n:4},{cy:7.6,off:4,n:3},{cy:3.4,off:8,n:2}];
 for(const rw of rows){for(let k=0;k<rw.n;k++){const bx=rw.off+4.2+k*8.5,ex=(x-bx)/4.4,ey=(y-rw.cy)/2.6,d=ex*ex+ey*ey;
  if(d<1){let v=150+n*20;const lit=1.12-ey*.28-ex*.08;v*=lit;if(d>.72)v*=.68;if(Math.abs(ex)<.12&&ey<-.2)v*=.8;return C(v*1.06,v*.92,v*.62)}}}
 return 0;
});

// SACO DE DORMIR: saco enrollado con almohada.
const sBedroll=proc(28,9,(x,y)=>{
 const n=hash(x,y,2251);
 if(y===8&&x>0&&x<27)return C(26,24,19);
 if(x<=6&&y>=2&&y<=7)return C(176+n*12,168+n*12,148);
 if(x>6&&x<=27&&y>=1&&y<=7){let r=60,g=84,b=56;if(y===1||y===7){r*=.65;g*=.65;b*=.65}if(x%6===0){r*=.8;g*=.8;b*=.8}return C(r*(.9+n*.15),g*(.9+n*.15),b*(.9+n*.15))}
 return 0;
});

// Nombre de cada elemento del campamento (se usa al registrar los contenedores).
export const CAMP_ITEMS={
 tentA:{spr:sTentA,name:'TIENDA DE LONA',wh:1.35,solid:.62},
 tentB:{spr:sTentB,name:'TIENDA REMENDADA',wh:1.25,solid:.6},
 leanTo:{spr:sLeanTo,name:'REFUGIO DE LONA',wh:1.3,solid:.55},
 enemyTent0:{spr:sEnemyTent0,name:'TIENDA RADIO',wh:1.35,solid:.62},
 enemyTent1:{spr:sEnemyTent1,name:'TIENDA SUMINISTROS',wh:1.35,solid:.62},
 enemyTent2:{spr:sEnemyTent2,name:'TIENDA LITERAS',wh:1.35,solid:.62},
 enemyTent3:{spr:sEnemyTent3,name:'TIENDA CUARTEL',wh:1.35,solid:.62},
 enemyTent4:{spr:sEnemyTent4,name:'TIENDA COMUNICACIONES',wh:1.35,solid:.62},
 enemyTent5:{spr:sEnemyTent5,name:'TIENDA ARMERIA',wh:1.35,solid:.62},
 wasteTent0:{spr:sWasteTent0,name:'TIENDA DE RADIO',wh:1.52,solid:.62},
 wasteTent1:{spr:sWasteTent1,name:'TIENDA DE SUMINISTROS',wh:1.31,solid:.62},
 wasteTent2:{spr:sWasteTent2,name:'TIENDA DE LITERAS',wh:1.27,solid:.62},
 wasteTent3:{spr:sWasteTent3,name:'TIENDA DE CAMPAÑA',wh:1.31,solid:.62},
 wasteTent4:{spr:sWasteTent4,name:'TIENDA DE COMUNICACIONES',wh:1.57,solid:.62},
 wasteTent5:{spr:sWasteTent5,name:'TIENDA DE ARMERÍA',wh:1.3,solid:.62},
 cookPot:{spr:sCookPot,name:'OLLA EN TRÍPODE',wh:.8},
 logSeat:{spr:sLogSeat,name:'TRONCO DE ASIENTO',wh:.36},
 firewood:{spr:sFirewood,name:'PILA DE LEÑA',wh:.55,solid:.32},
 lantern:{spr:sCampLantern,name:'FAROL DE CAMPAMENTO',wh:1.6,solid:.12},
 radio:{spr:sRadioTable,name:'MESA DE RADIO',wh:.8,solid:.35},
 parapet:{spr:sParapet,name:'PARAPETO IMPROVISADO',wh:.62,solid:.5},
 bedroll:{spr:sBedroll,name:'SACO DE DORMIR',wh:.28},
 foodCrate:{spr:sFoodCrate,name:'CAJA DE RACIONES',wh:.6,solid:.3,loot:'food'},
 ammoCrate:{spr:sAmmoCrate,name:'CAJA DE MUNICIÓN',wh:.48,solid:.3,loot:'ammo'},
 medBox:{spr:sMedBox,name:'BOTIQUÍN DE CAMPAÑA',wh:.42,solid:.25,loot:'med'},
 sacks:{spr:sSupplySacks,name:'SACOS DE VÍVERES',wh:.6,solid:.35,loot:'sacks'},
 waterDrum:{spr:sWaterDrum,name:'BIDÓN DE AGUA',wh:.75,solid:.25,loot:'water'}
};

export function campLoot(kind){
 const l=[],r=Math.random,pk=a=>a[r()*a.length|0];
 const add=(id,n)=>{const it=l.find(q=>q.id===id);if(it)it.count+=(n||1);else l.push({id,count:n||1})};
 if(kind==='food'){for(let i=0,n=2+(r()*2|0);i<n;i++)add(pk(FOODS));}
 else if(kind==='sacks'){add(pk(['can','fruit','burger']));add(pk(['can','fruit']));if(r()<.5)add(pk(FOODS));}
 else if(kind==='water'){add('water',2);if(r()<.4)add('soda',1);}
 else if(kind==='ammo'){add(pk(['bullets','shells','ammo9','ammo76239']),1+(r()<.5?1:0));add(pk(['bullets','shells']));if(r()<.3)add(pk(['frag','smoke','molotov']));}
 else if(kind==='med'){add('bandage',1+(r()<.5?1:0));if(r()<.5)add('medkit',1);}
 return l.filter(it=>ITEMS[it.id]);
}

export const campFires=[];

/* ===== MEJORAS v2: semáforos animados, banderas, charcos/baches ===== */
function trafficLightSprFn(mode){return (x,y)=>{
 const metal=(n)=>C(74+n*16,78+n*16,86+n*16);
 if((x===6||x===7)&&y>=4&&y<32)return metal(hash(x,y,520));
 if(y>=4&&y<=5&&x>=2&&x<=7)return metal(hash(x,y,521));
 if(x>=1&&x<=6&&y>=6&&y<=19){
  if(x===1||x===6||y===6||y===19)return C(38,40,46);
  if(y>=8&&y<=9&&x>=2&&x<=5)return mode==='r'?C(255,70,50):C(90,26,22);
  if(y>=11&&y<=12&&x>=2&&x<=5)return C(140,110,40);
  if(y>=14&&y<=15&&x>=2&&x<=5)return mode==='g'?C(80,230,96):C(30,80,40);
  return C(24,26,30);
 }
 if(y>=30&&y<=32&&x>=4&&x<=9)return C(60,62,68);
 return 0;
}}

export const sTrafficLightR=proc(14,34,trafficLightSprFn('r')),sTrafficLightG=proc(14,34,trafficLightSprFn('g'));

export const sFlag=proc(18,16,(x,y)=>{
 if((x===3||x===4)&&y>=2&&y<15){const n=hash(x,y,990);return C(120+n*16,118+n*16,112+n*16)}
 if(y>=2&&y<=11&&x>=4){const wave=Math.sin(y*1.1)*1.5;
  if(x<17-wave){const n=hash(x,y,991);const s=y<4?1.15:1;return C(Math.min(255,90*s+n*20),Math.min(255,200*s+n*20),Math.min(255,105*s+n*16))}}
 return 0;
});

const alarmSprFn=on=>(x,y)=>{
  if(y>=24&&y<30&&x>=2&&x<=11){const n=hash(x,y,940);if(y===24||x===2||x===11)return C(58,62,68);return C(95+n*20,100+n*20,108+n*20)}
  if(x>=6&&x<=7&&y>=9&&y<24){const n=hash(x,y,941);if(y>=17&&y<=19)return C(205,42,32);return C(112+n*20,116+n*20,120+n*20)}
  const dx=(x-6.5)/4,dy=(y-5)/4;
  if(y<=9&&dx*dx+dy*dy<=1){const n=hash(x,y,942);
    if(on)return dx*dx+dy*dy>.7?C(255,150,40):C(255,238,150);
    return dx*dx+dy*dy>.7?C(120,22,20):C(185+n*25,36,30)}
  return 0};

export const sAlarm=proc(14,30,alarmSprFn(false)),sAlarmOn=proc(14,30,alarmSprFn(true));

export const sAlarmWreck=proc(14,10,(x,y)=>{if(y<4||x<2||x>11)return 0;const n=hash(x,y,943);if(n>.62)return 0;if(n<.18)return C(30,28,26);return C(70+n*60,70+n*55,72+n*50)});

/* setters para variables reasignadas desde otros módulos */
export function set_bakedKey(v){return bakedKey=v}
