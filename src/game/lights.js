import { MH, MW } from './core.js';
import { NIGHT } from './textures.js';

/* ===== LUCES DINÁMICAS =====
   Cada cuadro se juntan las fuentes de luz cercanas (fogonazos, explosiones, fuego, fogatas, cohetes) y se calcula un mapa
   de luz de baja resolución alrededor del jugador (con oclusión por muros). Luego el render suma esa luz al piso, a los muros
   y a los personajes. Costo: unas decenas de miles de operaciones por cuadro. */

export const LR=14,LS=3,GN=LR*2*LS;
const LM=new Uint32Array(GN*GN),AR=new Uint16Array(GN*GN),AG=new Uint16Array(GN*GN),AB=new Uint16Array(GN*GN);
let gx0=0,gy0=0,active=false;
export const lightsActive=()=>active;

/* MODO NOCHE: night.js se engancha aquí con un "hook" que añade sus luces (linterna, postes, semáforos, faros, alarmas...) */
export const lightCfg={night:false};
export const LIGHT_HOOKS=[];

const flashes=[];
/* destello temporal (explosiones): dur en segundos */
export function addFlash(x,y,r,dur,col){if(flashes.length>8)flashes.shift();flashes.push({x,y,r,dur,t0:performance.now(),col:col||[200,120,50]})}

const FIRE=[150,86,30],MUZ=[175,145,85],EXP=[200,120,50];
let L=[];

/* sk = distancia inicial que se ignora (luces que nacen dentro de un muro, como los faros de las torres) */
function los(map,x0,y0,x1,y1,sk){
  const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy),n=Math.ceil(len/.4);
  let i0=1;if(sk)i0=Math.max(1,Math.ceil(sk/(len/n)));
  for(let i=i0;i<n;i++){const x=x0+dx*i/n,y=y0+dy*i/n;if(map[(y|0)*MW+(x|0)])return false}
  return true}

/* Luz radial (r,I,c) o, con el parámetro o, luz en cono / de dos lóbulos:
   o={dx,dy: dirección unitaria, ca: coseno del ángulo exterior, ci: coseno del ángulo interior (borde suave),
      bi: true = dos haces opuestos (sirena giratoria), sk: distancia inicial sin oclusión} */
function push(x,y,r,I,c,o){
  if(I<=.04)return;
  const l={x,y,r,I,c,d:0,cn:false,dx:0,dy:0,ca:0,ci:1,bi:false,sk:0};
  if(o){if(o.dx!==undefined){l.cn=true;l.dx=o.dx;l.dy=o.dy;l.ca=o.ca;l.ci=o.ci;l.bi=!!o.bi}if(o.sk)l.sk=o.sk}
  L.push(l)}

/* Junta las luces y arma el mapa. max=0 apaga todo. */
export function buildLights(max,map,P,gt,dayPhase,fires,campFires,enemies,rockets){
  if(max<=0){active=false;return}
  if(NIGHT){gR=(1/NIGHT[0]-1)*1.1/255;gG=(1/NIGHT[1]-1)*1.1/255;gB=(1/NIGHT[2]-1)*1.1/255}
  const now=performance.now(),dk=lightCfg.night?1.1:.62+.38*dayPhase;
  L.length=0;
  if(P.muzzle>0)push(P.x+Math.cos(P.a)*.5,P.y+Math.sin(P.a)*.5,5,Math.min(1,P.muzzle/.09)*.9,MUZ);
  for(const f of fires){const dx=f.x-P.x,dy=f.y-P.y;if(dx*dx+dy*dy>400)continue;push(f.x,f.y,f.radius*1.8,Math.min(1,f.life/.5)*(.85+.15*Math.sin(gt*17+f.x)),FIRE)}
  for(const f of campFires){const dx=f.x-P.x,dy=f.y-P.y;if(dx*dx+dy*dy>400)continue;push(f.x,f.y,5,.8+.2*Math.sin(gt*13+f.y*3),FIRE)}
  for(const e of enemies){if(!e.alive||gt-(e.fireAt||-9)>.08)continue;const dx=e.x-P.x,dy=e.y-P.y;if(dx*dx+dy*dy>400)continue;push(e.x,e.y,4,.7,MUZ)}
  for(const r of rockets)push(r.x,r.y,3.5,.7,EXP);
  for(const h of LIGHT_HOOKS)h(push,P,gt);
  for(let i=flashes.length-1;i>=0;i--){const f=flashes[i],a=1-(now-f.t0)/(f.dur*1000);if(a<=0){flashes.splice(i,1);continue}push(f.x,f.y,f.r,a*1.5,f.col)}
  if(!L.length){active=false;return}
  for(const l of L){const dx=l.x-P.x,dy=l.y-P.y;l.d=dx*dx+dy*dy}
  L.sort((a,b)=>a.d-b.d);if(L.length>max)L.length=max;
  gx0=Math.floor(P.x)-LR;gy0=Math.floor(P.y)-LR;
  LM.fill(0);active=true;
  const R=AR,G=AG,B=AB;R.fill(0);G.fill(0);B.fill(0);
  for(const l of L){
    const ia=Math.max(0,Math.floor((l.x-l.r-gx0)*LS)),ib=Math.min(GN-1,Math.ceil((l.x+l.r-gx0)*LS)),
          ja=Math.max(0,Math.floor((l.y-l.r-gy0)*LS)),jb=Math.min(GN-1,Math.ceil((l.y+l.r-gy0)*LS)),sc=l.I*dk;
    for(let j=ja;j<=jb;j++){const cy=gy0+(j+.5)/LS;if(cy<0||cy>=MH)continue;
      for(let i=ia;i<=ib;i++){const cx=gx0+(i+.5)/LS;if(cx<0||cx>=MW)continue;
        const ex=cx-l.x,ey=cy-l.y,d=Math.hypot(ex,ey);if(d>=l.r)continue;
        if(map[(cy|0)*MW+(cx|0)])continue;
        let k=1-d/l.r;k*=k*sc*1.4;if(k<.03)continue;
        if(l.cn&&d>.05){let cs=(ex*l.dx+ey*l.dy)/d;if(l.bi&&cs<0)cs=-cs;
          if(cs<=l.ca)continue;const w=cs>=l.ci?1:(cs-l.ca)/(l.ci-l.ca);k*=w*w*(3-2*w);if(k<.03)continue}
        if(!los(map,l.x,l.y,cx,cy,l.sk))continue;
        const o=j*GN+i;R[o]+=k*l.c[0];G[o]+=k*l.c[1];B[o]+=k*l.c[2]}}}
  for(let o=0;o<GN*GN;o++){const r=R[o],g=G[o],b=B[o];if(r|g|b)LM[o]=(Math.min(255,r)|(Math.min(255,g)<<8)|(Math.min(255,b)<<16))>>>0}
}

/* luz (empaquetada r|g<<8|b<<16) en un punto del mundo; 0 si no hay */
export function lightAt(x,y){
  if(!active)return 0;
  const i=((x-gx0)*LS)|0,j=((y-gy0)*LS)|0;
  if(x<gx0||y<gy0||i>=GN||j>=GN)return 0;
  return LM[j*GN+i]}

/* suma la luz a un color ABGR */
export function addL(c,l){
  let r=(c&255)+(l&255),g=((c>>8)&255)+((l>>8)&255),b=((c>>16)&255)+((l>>16)&255);
  return (0xFF000000|((b>255?255:b)<<16)|((g>255?255:g)<<8)|(r>255?255:r))>>>0}

/* Versión nocturna: la luz se MULTIPLICA sobre el color oscuro (conserva el detalle de las texturas y los sprites en vez de
   quemarlos a blanco). Con luz máxima cada canal recupera su color de día (se deshace el tinte azul de la noche) y suma un
   poco de brillo propio, así la linterna ilumina en blanco y las farolas en cálido. */
let gR=.0079,gG=.0079,gB=.0079;
export function addLN(c,l){
  const lr=l&255,lg=(l>>8)&255,lb=(l>>16)&255,
        r=(c&255)*(1+lr*gR)+lr*.1,g=((c>>8)&255)*(1+lg*gG)+lg*.1,b=((c>>16)&255)*(1+lb*gB)+lb*.1;
  return (0xFF000000|((b>255?255:b|0)<<16)|((g>255?255:g|0)<<8)|(r>255?255:r|0))>>>0}
