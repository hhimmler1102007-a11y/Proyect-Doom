/* Conversaciones de los soldados enemigos (solo Distrito Cero, de día o de noche).
   - Cada puesto reparte sus 3 diálogos al azar y sin repetir; al agotarse, ya no hablan más.
   - Habla un solo soldado a la vez en todo el mapa, con pausas entre diálogos.
   - 'entrenamiento' lo dice SIEMPRE un soldado raso (nunca una unidad de élite); los otros, cualquier no-perro.
   - Solo se habla en calma: cualquier alerta, combate, ruido, daño o muerte del hablante corta la voz al instante.
   - El volumen, el paneo y el filtro dependen de la distancia y de si hay muros entre el hablante y el jugador. */
import { P, enemies, gt, noises, selectedMap, state } from './state.js';
import { OUTPOSTS } from './core.js';
import { actx, loadAudioBuf } from './audio.js';
import { segWall } from './combat.js';
import { U_DLG_COMIDA, U_DLG_NOTICIAS, U_DLG_ENTRENAMIENTO } from '../data/audio-urls.js';

const LINES=[
  {id:'comida',url:U_DLG_COMIDA,soldierOnly:false},
  {id:'noticias',url:U_DLG_NOTICIAS,soldierOnly:false},
  {id:'entrenamiento',url:U_DLG_ENTRENAMIENTO,soldierOnly:true}];
const RANGE=24,BASE_VOL=.9,CALM=new Set(['PATROL','IDLE']);
const OP=new WeakMap();           /* puesto -> {used:Set, next:tiempo} */
let buf={},loading=false,cur=null,globalNext=0,lastGt=-1;

const rnd=(a,b)=>a+Math.random()*(b-a);
function load(){
  if(loading||!actx)return;loading=true;
  for(const l of LINES)try{loadAudioBuf(l.url,b=>{buf[l.id]=b},()=>{})}catch(e){}}

function opState(op){let s=OP.get(op);if(!s){s={used:new Set(),next:gt+rnd(8,28)};OP.set(op,s)}return s}

/* ¿sigue todo en calma para que el hablante continúe? */
function calm(e,op){
  if(!e.alive||!CALM.has(e.state)||e.hurtT>0)return false;
  if(op.taken||(op.alertState&&op.alertState!=='CALM'))return false;
  for(const x of op.enemies)if(x.alive&&!CALM.has(x.state))return false;
  return true}

function stop(fade){
  const c=cur;if(!c)return;cur=null;
  try{const t=actx.currentTime;c.g.gain.cancelScheduledValues(t);c.g.gain.setTargetAtTime(0,t,fade?.03:.005);c.src.stop(t+(fade?.15:.03))}catch(e){}
  setTimeout(()=>{try{c.g.disconnect()}catch(e){}},300)}
export function stopChatter(){stop(true);cur=null;globalNext=0;lastGt=-1}

/* volumen / paneo / filtro según la posición actual del hablante */
function place(c){
  const e=c.e,dx=e.x-P.x,dy=e.y-P.y,d=Math.hypot(dx,dy);
  let v=BASE_VOL*Math.pow(Math.max(0,1-d/RANGE),1.6),f=9000-7500*Math.min(1,d/RANGE);
  if(v>.004&&segWall(P.x,P.y,e.x,e.y)){v*=.5;f=Math.min(f,900)}   /* a través de muros: se oye apagado */
  const t=actx.currentTime;
  c.g.gain.setTargetAtTime(v,t,.08);c.lp.frequency.setTargetAtTime(f,t,.08);
  if(c.pn)c.pn.pan.setTargetAtTime(d>.3?Math.max(-1,Math.min(1,(-Math.sin(P.a)*dx+Math.cos(P.a)*dy)/d))*.85:0,t,.08);
  return v}

function start(op,e,line){
  const b=buf[line.id];if(!b)return false;
  const c={op,e,line,t0:gt,dur:b.duration||6};
  try{
    const src=actx.createBufferSource(),g=actx.createGain(),lp=actx.createBiquadFilter(),pn=actx.createStereoPanner?actx.createStereoPanner():null;
    src.buffer=b;lp.type='lowpass';g.gain.value=0;
    src.connect(lp);lp.connect(g);if(pn){g.connect(pn);pn.connect(actx.destination)}else g.connect(actx.destination);
    Object.assign(c,{src,g,lp,pn});
    const v=place(c);g.gain.value=v;       /* sin rampa inicial: arranca ya a su volumen */
    src.onended=()=>{try{g.disconnect()}catch(er){}};
    src.start()}catch(er){return false}
  cur=c;return true}

/* Se llama cada frame desde updEnemies */
export function updChatter(dt){
  if(selectedMap!=='district'||state!=='play'){if(cur)stop(true);return}
  if(!actx||actx.state!=='running'){return}
  if(!loading)load();
  if(gt<lastGt){stopChatter()}lastGt=gt;
  /* hablando: seguir al hablante y cortar al instante si algo pasa */
  if(cur){
    const c=cur,elapsed=gt-c.t0;
    if(!calm(c.e,c.op)||(noises.length&&noises.some(n=>Math.hypot(n.x-c.e.x,n.y-c.e.y)<22))){
      stop(true);globalNext=gt+rnd(10,20);return}
    if(elapsed>=c.dur+.15){
      OP.get(c.op).used.add(c.line.id);              /* se completó: este puesto ya no lo repite */
      OP.get(c.op).next=gt+rnd(25,50);cur=null;globalNext=gt+rnd(7,14);return}
    place(c);return}
  if(gt<globalNext)return;
  /* elegir un puesto cuya pausa ya pasó, al azar */
  const ops=OUTPOSTS.filter(op=>!op.taken&&op.enemies&&op.enemies.length&&gt>=opState(op).next);
  for(let i=ops.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[ops[i],ops[j]]=[ops[j],ops[i]]}
  for(const op of ops){
    const st=opState(op);
    if(op.alertState&&op.alertState!=='CALM')continue;
    if(op.enemies.some(x=>x.alive&&!CALM.has(x.state)))continue;
    const pend=LINES.filter(l=>!st.used.has(l.id)&&buf[l.id]);
    if(!pend.length){st.next=gt+60;continue}      /* ya dijeron todo: silencio */
    const talkers=op.enemies.filter(x=>x.alive&&x.type!=='dog'&&CALM.has(x.state));
    if(!talkers.length)continue;
    for(let i=pend.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[pend[i],pend[j]]=[pend[j],pend[i]]}
    for(const line of pend){
      const pool=line.soldierOnly?talkers.filter(x=>x.type==='soldier'):talkers;
      if(!pool.length)continue;
      const e=pool[(Math.random()*pool.length)|0];
      if(start(op,e,line)){globalNext=gt+1;return}}
    st.next=gt+rnd(8,15)}}
