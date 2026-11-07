import { MH, MW, gmap } from './core.js';
import { U_ALARM } from '../data/audio-urls.js';
import { P, selectedMap, state } from './state.js';
import { U_PISTOL, U_PISTOL_RELOAD, U_AMB, U_DEATH_BRAAM, U_PAIN_GRUNTS, U_PLAYER_DEATH, U_RADIO, U_SND, U_SND_10, U_SND_2, U_SND_3, U_SND_4, U_SND_5, U_SND_6, U_SND_7, U_SND_8, U_SND_9, U_STEP, U_STEP_10, U_STEP_11, U_STEP_12, U_STEP_13, U_STEP_14, U_STEP_15, U_STEP_16, U_STEP_17, U_STEP_18, U_STEP_19, U_STEP_2, U_STEP_20, U_STEP_21, U_STEP_3, U_STEP_4, U_STEP_5, U_STEP_6, U_STEP_7, U_STEP_8, U_STEP_9, U_UIS , U_RADIO_REQ_ALFA, U_RADIO_REQ_BRAVO, U_RADIO_REQ_DELTA, U_RADIO_REQ_ECHO, U_RADIO_REQ_CHARLIE, U_RADIO_ACK_ALFA, U_RADIO_ACK_BRAVO, U_RADIO_ACK_CHARLIE, U_RADIO_ACK_DELTA, U_RADIO_ACK_ECHO, U_RADIO_REJECT } from '../data/audio-urls.js';


export let actx=null;

/* Carga un audio por URL y lo decodifica con WebAudio */
export function loadAudioBuf(url,ok,fail){const f=fail||(()=>{});fetch(url).then(r=>{if(!r.ok)throw new Error('http '+r.status);return r.arrayBuffer()}).then(ab=>{const pr=actx.decodeAudioData(ab,ok,()=>f());if(pr&&pr.catch)pr.catch(()=>f())}).catch(()=>f())}

/* ===== SONIDO DE BOTONES ===== */
const UIS={buf:null,loading:false,last:0,el:null,url:U_UIS};

export function uiLoad(){
 if(!UIS.el){try{UIS.el=new Audio(UIS.url);UIS.el.preload='auto';UIS.el.volume=.8}catch(e){}}
 if(!actx||UIS.buf||UIS.loading)return;UIS.loading=true;
 try{loadAudioBuf(UIS.url,b=>{UIS.buf=b},()=>{UIS.loading=false})}catch(e){UIS.loading=false}}

export function uiClick(){
 const now=performance.now();if(now-UIS.last<130)return;UIS.last=now;
 try{if(actx&&actx.state==='suspended')actx.resume()}catch(e){}
 uiLoad();
 if(UIS.buf&&actx&&actx.state==='running'){try{const s=actx.createBufferSource(),g=actx.createGain();s.buffer=UIS.buf;g.gain.value=.9;s.connect(g);g.connect(actx.destination);s.start();return}catch(e){}}
 if(UIS.el){try{UIS.el.currentTime=0;const p=UIS.el.play();if(p&&p.catch)p.catch(()=>{})}catch(e){}}
}

export function ensureAudio(){if(!actx){try{actx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(actx&&actx.state==='suspended')actx.resume();uiLoad();sndLoad();radioLoad();alarmLoad();ambLoad();stepLoad()}

function noise(dur,f,g,type){if(!actx)return;const n=Math.max(1,actx.sampleRate*dur|0),b=actx.createBuffer(1,n,actx.sampleRate),d=b.getChannelData(0);
 for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.2);const s=actx.createBufferSource();s.buffer=b;
 const fl=actx.createBiquadFilter();fl.type=type||'lowpass';fl.frequency.value=f;const ga=actx.createGain();ga.gain.value=g;s.connect(fl);fl.connect(ga);ga.connect(actx.destination);s.start()}

function tone(f0,f1,dur,g,t){if(!actx)return;const o=actx.createOscillator(),ga=actx.createGain(),n=actx.currentTime;o.type=t||'square';
 o.frequency.setValueAtTime(f0,n);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),n+dur);ga.gain.setValueAtTime(g,n);ga.gain.exponentialRampToValueAtTime(.0001,n+dur);
 o.connect(ga);ga.connect(actx.destination);o.start();o.stop(n+dur+.02)}

/* ===== RADIO DEL CAMPAMENTO: pide refuerzos al caer el puesto (sonido de proximidad) ===== */
const RADIO={url:U_RADIO,buf:null,loading:false,cur:null};

function radioLoad(){if(!actx||RADIO.loading)return;RADIO.loading=true;try{loadAudioBuf(RADIO.url,b=>{RADIO.buf=b})}catch(e){}}

function radioStop(){const c=RADIO.cur;if(!c)return;RADIO.cur=null;clearInterval(c.iv);try{c.src.stop()}catch(e){}try{c.g.disconnect()}catch(e){}}

export function radioCall(op){
 if(!actx||!op||!op.radioPos)return;radioLoad();radioStop();
 if(!RADIO.buf){setTimeout(()=>{if(RADIO.buf&&state==='play')radioCall(op)},400);return}
 const src=actx.createBufferSource(),g=actx.createGain(),pn=actx.createStereoPanner?actx.createStereoPanner():null;
 src.buffer=RADIO.buf;src.connect(g);if(pn){g.connect(pn);pn.connect(actx.destination)}else g.connect(actx.destination);
 const c={src,g,iv:0};RADIO.cur=c;
 const upd=()=>{if(RADIO.cur!==c)return;if(state!=='play'){radioStop();return}
  const dx=op.radioPos.x-P.x,dy=op.radioPos.y-P.y,d=Math.hypot(dx,dy);
  const vol=.95*Math.pow(Math.max(0,1-d/30),1.6); /* se oye fuerte cerca de la radio y se apaga con la distancia */
  g.gain.setTargetAtTime(vol,actx.currentTime,.08);
  if(pn&&d>.2)pn.pan.setTargetAtTime(Math.max(-1,Math.min(1,(-Math.sin(P.a)*dx+Math.cos(P.a)*dy)/d))*.85,actx.currentTime,.08)};
 upd();c.iv=setInterval(upd,100);src.onended=()=>{if(RADIO.cur===c)radioStop()};src.start()}

/* ===== ALARMA FÍSICA: sonido en bucle que se oye más fuerte cuanto más cerca estás del sprite ===== */
const ALM={url:U_ALARM,buf:null,loading:false,cur:new Map(),iv:0};
const ALM_RANGE=45;

function alarmLoad(){if(!actx||ALM.buf||ALM.loading)return;ALM.loading=true;try{loadAudioBuf(ALM.url,b=>{ALM.buf=b;ALM.loading=false},()=>{ALM.loading=false})}catch(e){ALM.loading=false}}

function alarmShouldSound(al){
 if(!al||!al.alive||!al.activated)return false;
 const op=al.op;if(!op||op.taken)return false;
 if(op.enemies&&!op.enemies.some(x=>x.alive))return false; /* todos los enemigos eliminados */
 return true}

function alarmKill(al,fade){
 const c=ALM.cur.get(al);if(!c)return;ALM.cur.delete(al);
 try{if(fade&&actx){c.g.gain.cancelScheduledValues(actx.currentTime);c.g.gain.setTargetAtTime(0,actx.currentTime,.05);setTimeout(()=>{try{c.src.stop()}catch(e){}try{c.g.disconnect()}catch(e){}},300)}else{c.src.stop();c.g.disconnect()}}catch(e){}
 if(!ALM.cur.size&&ALM.iv){clearInterval(ALM.iv);ALM.iv=0}}

function alarmTick(){
 if(!actx){return}
 for(const al of Array.from(ALM.cur.keys())){
  const c=ALM.cur.get(al);
  if(!alarmShouldSound(al)){alarmKill(al,true);continue}
  const dx=al.x-P.x,dy=al.y-P.y,d=Math.hypot(dx,dy);
  const vol=state==='play'?.9*Math.pow(Math.max(0,1-d/ALM_RANGE),1.5):0;
  c.g.gain.setTargetAtTime(vol,actx.currentTime,.08);
  if(c.pn&&d>.2)c.pn.pan.setTargetAtTime(Math.max(-1,Math.min(1,(-Math.sin(P.a)*dx+Math.cos(P.a)*dy)/d))*.8,actx.currentTime,.08)}}

export function alarmSoundStart(al){
 if(!actx||!al||ALM.cur.has(al))return;alarmLoad();
 if(!ALM.buf){setTimeout(()=>{if(alarmShouldSound(al))alarmSoundStart(al)},400);return}
 const src=actx.createBufferSource(),g=actx.createGain(),pn=actx.createStereoPanner?actx.createStereoPanner():null;
 src.buffer=ALM.buf;src.loop=true;g.gain.value=0;src.connect(g);if(pn){g.connect(pn);pn.connect(actx.destination)}else g.connect(actx.destination);
 ALM.cur.set(al,{src,g,pn});src.start();
 if(!ALM.iv)ALM.iv=setInterval(alarmTick,100);alarmTick()}

export function alarmSoundStop(al){alarmKill(al,true)}
export function alarmSoundStopAll(){for(const al of Array.from(ALM.cur.keys()))alarmKill(al,true)}

/* ===== AMBIENTE: guerra lejana (con filtro y eco para que suene muy lejos y bajito) ===== */
const AMB={url:U_AMB,buf:null,loading:false,src:null,fade:null,lfo:null};

function ambLoad(){if(!actx||AMB.loading)return;AMB.loading=true;try{loadAudioBuf(AMB.url,b=>{AMB.buf=b})}catch(e){}}

function ambStart(){
 const now=actx.currentTime,src=actx.createBufferSource();src.buffer=AMB.buf;src.loop=true;
 const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1100;lp.Q.value=.4;
 const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=90;
 const dry=actx.createGain();dry.gain.value=.7;
 const dl=actx.createDelay(1);dl.delayTime.value=.32;const fb=actx.createGain();fb.gain.value=.38;const wl=actx.createBiquadFilter();wl.type='lowpass';wl.frequency.value=800;const wet=actx.createGain();wet.gain.value=.5;
 const lvl=actx.createGain();lvl.gain.value=.15;
 const lfo=actx.createOscillator(),lg=actx.createGain();lfo.frequency.value=.05;lg.gain.value=.05;lfo.connect(lg);lg.connect(lvl.gain);lfo.start(); /* el volumen sube y baja muy lento, como oleadas de combate lejano */
 const fade=actx.createGain();fade.gain.setValueAtTime(0,now);fade.gain.linearRampToValueAtTime(1,now+4);
 src.connect(hp);hp.connect(lp);lp.connect(dry);lp.connect(dl);dl.connect(wl);wl.connect(fb);fb.connect(dl);wl.connect(wet);
 dry.connect(lvl);wet.connect(lvl);lvl.connect(fade);fade.connect(actx.destination);
 src.start(0,Math.random()*(AMB.buf.duration-1));AMB.src=src;AMB.fade=fade;AMB.lfo=lfo}

function ambStop(){const s=AMB.src,f=AMB.fade,l=AMB.lfo;if(!s)return;AMB.src=null;AMB.fade=null;AMB.lfo=null;const now=actx.currentTime;
 f.gain.cancelScheduledValues(now);f.gain.setValueAtTime(f.gain.value,now);f.gain.linearRampToValueAtTime(0,now+1.5);
 setTimeout(()=>{try{s.stop()}catch(e){}try{l.stop()}catch(e){}try{f.disconnect()}catch(e){}},1700)}

setInterval(()=>{if(!actx||actx.state!=='running')return;
 const _bs=document.getElementById('bootScreen'),_ls=document.getElementById('loadingScreen'),blocked=(_bs&&_bs.classList.contains('on'))||(_ls&&_ls.classList.contains('on'));
 if(state==='play'&&!blocked){if(!AMB.src){ambLoad();if(AMB.buf)ambStart()}}else if(AMB.src)ambStop()},500);

/* ===== PASOS: suenan según el suelo (pasto, tierra o piso sólido) ===== */
export const STEP={urls:{"solid": [U_STEP, U_STEP_2, U_STEP_3, U_STEP_4, U_STEP_5, U_STEP_6, U_STEP_7], "dirt": [U_STEP_8, U_STEP_9, U_STEP_10, U_STEP_11, U_STEP_12, U_STEP_13, U_STEP_14], "grass": [U_STEP_15, U_STEP_16, U_STEP_17, U_STEP_18, U_STEP_19, U_STEP_20, U_STEP_21]},buf:{solid:[],dirt:[],grass:[]},started:false,ph:0,last:{}};

function stepLoad(){if(!actx||STEP.started)return;STEP.started=true;
 for(const k in STEP.urls)for(const url of STEP.urls[k]){try{loadAudioBuf(url,b=>{STEP.buf[k].push(b)})}catch(e){}}}

function surfaceAt(x,y){const ix=x|0,iy=y|0;if(ix<0||iy<0||ix>=MW||iy>=MH)return 'dirt';const g=gmap[iy*MW+ix];
 if(g===2)return 'grass';if(g===3||(g===6&&selectedMap==='front'))return 'dirt';return 'solid'}

export function stepPlay(){if(!actx||actx.state!=='running')return;const k=surfaceAt(P.x,P.y),arr=STEP.buf[k];if(!arr||!arr.length)return;
 let i=(Math.random()*arr.length)|0;if(arr.length>1&&i===STEP.last[k])i=(i+1)%arr.length;STEP.last[k]=i;
 const s=actx.createBufferSource(),g=actx.createGain();s.buffer=arr[i];s.playbackRate.value=.96+Math.random()*.08;g.gain.value=.5*(.85+Math.random()*.25);
 s.connect(g);g.connect(actx.destination);s.start()}

/* ===== SONIDOS GRABADOS (MP3 incrustados) ===== */
const SND={buf:{},active:0,started:false,urls:{pistol:U_PISTOL,pistolReload:U_PISTOL_RELOAD,ui:U_SND,rpgfire:U_SND_2,rpgboom:U_SND_3,rpgreload:U_SND_4,scr1:U_SND_5,scr2:U_SND_6,reload:U_SND_7,m4:U_SND_8,mg42:U_SND_9,ak:U_SND_10,deathBraam:U_DEATH_BRAAM,painGrunts:U_PAIN_GRUNTS,playerDeath:U_PLAYER_DEATH,radioReqAlfa:U_RADIO_REQ_ALFA,radioReqBravo:U_RADIO_REQ_BRAVO,radioReqDelta:U_RADIO_REQ_DELTA,radioReqEcho:U_RADIO_REQ_ECHO,radioReqCharlie:U_RADIO_REQ_CHARLIE,radioAckAlfa:U_RADIO_ACK_ALFA,radioAckBravo:U_RADIO_ACK_BRAVO,radioAckCharlie:U_RADIO_ACK_CHARLIE,radioAckDelta:U_RADIO_ACK_DELTA,radioAckEcho:U_RADIO_ACK_ECHO,radioReject:U_RADIO_REJECT}};

function sndLoad(){if(!actx||SND.started)return;SND.started=true;
 for(const k in SND.urls){try{loadAudioBuf(SND.urls[k],b=>{SND.buf[k]=b})}catch(e){}}}

export function sndPlay(k,vol){const b=SND.buf[k];if(!b||!actx||SND.active>14)return false;
 const s=actx.createBufferSource(),g=actx.createGain();s.buffer=b;s.playbackRate.value=1+(Math.random()-.5)*.06;g.gain.value=vol;
 s.connect(g);g.connect(actx.destination);SND.active++;s.onended=()=>{SND.active--};s.start();return true}

export function sndPlayAt(k,vol,x,y,range){const b=SND.buf[k];if(!b||!actx||SND.active>14)return false;
 const dx=x-P.x,dy=y-P.y,d=Math.hypot(dx,dy),v=vol*Math.pow(Math.max(0,1-d/(range||30)),1.5);if(v<.01)return true;
 const s=actx.createBufferSource(),g=actx.createGain(),pn=actx.createStereoPanner?actx.createStereoPanner():null;s.buffer=b;s.playbackRate.value=1+(Math.random()-.5)*.08;g.gain.value=v;
 s.connect(g);if(pn){pn.pan.value=d>.2?Math.max(-1,Math.min(1,(-Math.sin(P.a)*dx+Math.cos(P.a)*dy)/d))*.85:0;g.connect(pn);pn.connect(actx.destination)}else g.connect(actx.destination);
 SND.active++;s.onended=()=>{SND.active--};s.start();return true}

/* Disparos de enemigos y aliados con el sonido real de su arma, por proximidad:
   volumen bajo, cae con la distancia y se apaga (filtro) al alejarse. Máx. 4 a la vez para no saturar. */
const GUNSHOT_KEY={0:'pistol',2:'m4',3:'ak',4:'mg42'};   /* escopeta (1) y francotirador (5): sin sample todavía */
const GUNSHOT_VOL={pistol:.42,m4:.4,ak:.4,mg42:.34};
let gunshotActive=0;
export function enemyGunshot(e,weaponIdx){
 const k=GUNSHOT_KEY[weaponIdx!==undefined?weaponIdx:e.weaponIdx],b=k&&SND.buf[k];
 if(!b||!actx||SND.active>12||gunshotActive>=4)return false;
 const range=26,dx=e.x-P.x,dy=e.y-P.y,d=Math.hypot(dx,dy),f=Math.max(0,1-d/range),v=GUNSHOT_VOL[k]*Math.pow(f,1.6);
 if(v<.015)return true;
 const s=actx.createBufferSource(),g=actx.createGain(),lp=actx.createBiquadFilter(),pn=actx.createStereoPanner?actx.createStereoPanner():null;
 s.buffer=b;s.playbackRate.value=1+(Math.random()-.5)*.08;g.gain.value=v;
 lp.type='lowpass';lp.frequency.value=1500+f*f*12000;
 s.connect(lp);lp.connect(g);
 if(pn){pn.pan.value=d>.2?Math.max(-1,Math.min(1,(-Math.sin(P.a)*dx+Math.cos(P.a)*dy)/d))*.85:0;g.connect(pn);pn.connect(actx.destination)}else g.connect(actx.destination);
 SND.active++;gunshotActive++;s.onended=()=>{SND.active--;gunshotActive--};s.start();return true}

export function enemyScream(e){if(e.type==='dog'||!sndPlayAt(Math.random()<.5?'scr1':'scr2',.42,e.x,e.y,30))SFX.enemyDie()}

export const SFX={m4(){if(!sndPlay('m4',.9))SFX.rifle()},ak(){if(!sndPlay('ak',.9))SFX.rifle()},mg42(){if(!sndPlay('mg42',.8))SFX.rifle()},pistol(){if(sndPlay('pistol',.9))return;noise(.13,2200,.26);tone(320,60,.09,.13)},pistolAlly(){if(sndPlay('pistol',.3))return;noise(.13,2200,.26);tone(320,60,.09,.13)},pistolReload(){if(sndPlay('pistolReload',.9))return;SFX.reload()},shotgun(){noise(.3,1300,.4);tone(160,40,.2,.19,'sawtooth')},rifle(){noise(.1,3000,.22);tone(420,90,.07,.12)},
 enemyHit(){tone(220,90,.1,.09)},enemyDie(){tone(180,40,.45,.15,'sawtooth');noise(.35,700,.18)},playerHurt(){tone(260,70,.25,.2,'sawtooth')},
 pickup(){tone(700,1300,.12,.13)},bullet(){tone(600,250,.14,.09,'triangle')},empty(){tone(140,90,.06,.09)},swap(){},ui(){uiClick()},rocket(){if(sndPlay('rpgfire',.95))return;noise(.35,900,.3);tone(220,60,.3,.14,'sawtooth')},boom(){noise(.7,500,.55);tone(110,30,.5,.22,'sawtooth')},
 reload(){if(sndPlay('reload',.8))return;tone(220,180,.08,.15);setTimeout(()=>tone(180,140,.1,.14),110);setTimeout(()=>tone(280,320,.08,.13),220)},
 reloadEnd(){tone(420,560,.06,.15)},
 punch(){noise(.09,700,.22);tone(160,60,.1,.14,'sawtooth')},
 hitmark(){tone(1200,1500,.04,.11)},
 crit(){tone(1400,1800,.06,.13,'square');setTimeout(()=>tone(1600,2000,.05,.11,'square'),50)},
 throwG(){tone(380,200,.14,.13,'triangle')},
 bounce(){tone(700,400,.06,.1)},
 smoke(){noise(.8,900,.3,'lowpass');tone(300,150,.4,.1,'triangle')},
 fire(){noise(1.2,700,.35);tone(150,80,.6,.14,'sawtooth')},
 shout(){tone(280,520,.15,.22,'sawtooth');setTimeout(()=>tone(500,300,.15,.2,'sawtooth'),120)},
 sniper(){noise(.5,2400,.5);tone(200,50,.3,.25,'sawtooth')},
 dogBite(){noise(.08,1400,.28);tone(180,80,.1,.16,'sawtooth')},
 aim(){tone(900,1100,.25,.08,'sine')},
 detect(){tone(600,900,.08,.12,'triangle')},
 ally(){tone(500,900,.12,.15,'sine');setTimeout(()=>tone(700,1100,.1,.13,'sine'),100)},
 buy(){tone(800,1200,.08,.14,'square');setTimeout(()=>tone(1000,1400,.06,.12,'square'),50)},
 sell(){tone(600,400,.08,.14,'square')},
 error(){tone(200,100,.15,.15,'sawtooth')},
 heal(){tone(700,1200,.15,.15,'sine');setTimeout(()=>tone(900,1500,.12,.13,'sine'),80)},
 win(){tone(400,900,.5,.17);setTimeout(()=>tone(700,1400,.6,.17),160)},dead(){/* braaam al revelar pantalla */ if(sndPlay('deathBraam',1.0))return;tone(300,50,.9,.2,'sawtooth')},playerDeath(){if(sndPlay('playerDeath',1.0))return;tone(220,40,.5,.2,'sawtooth')}};



/* ===== Quejidos de dolor (vida baja ≤35) ===== */
let painSrc=null, painGain=null, painPlaying=false, painLastStart=0;

export function startPainLoop(){
 if(!actx) return;
 ensureAudio();
 // Already playing
 if(painPlaying && painSrc) return;
 const b = SND.buf.painGrunts;
 if(!b){
  // try load if not ready
  if(SND.urls.painGrunts){ try{ loadAudioBuf(SND.urls.painGrunts, buf=>{ SND.buf.painGrunts=buf; startPainLoop(); }); }catch(e){} }
  return;
 }
 try{
  if(actx.state==='suspended') actx.resume();
  const s = actx.createBufferSource();
  const g = actx.createGain();
  s.buffer = b;
  s.loop = true;
  g.gain.value = 0.55;
  s.connect(g); g.connect(actx.destination);
  s.start();
  painSrc = s; painGain = g; painPlaying = true; painLastStart = performance.now();
  s.onended = ()=>{ if(painSrc===s){ painSrc=null; painPlaying=false; } };
 }catch(e){ painPlaying=false; }
}

export function stopPainLoop(fadeMs){
 if(!painPlaying || !painGain || !actx){ painPlaying=false; painSrc=null; return; }
 const g = painGain, s = painSrc;
 const ms = fadeMs==null ? 900 : fadeMs;
 try{
  const now = actx.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(g.gain.value, now);
  g.gain.linearRampToValueAtTime(0.001, now + ms/1000);
  setTimeout(()=>{
   try{ s.stop(); }catch(e){}
   if(painSrc===s){ painSrc=null; painGain=null; painPlaying=false; }
  }, ms + 40);
 }catch(e){
  try{ s.stop(); }catch(e2){}
  painSrc=null; painGain=null; painPlaying=false;
 }
}

export function setPainVolume(v){
 if(painGain && actx){
  try{ painGain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), actx.currentTime, 0.15); }catch(e){}
 }
}

export function isPainPlaying(){ return painPlaying; }


/* ===== Radio de puestos (Distrito Cero): solicitud + respuesta Foxtrot ===== */
const RADIO_BY_OUTPOST = {
  alfa:   { req: 'radioReqAlfa',   ack: 'radioAckAlfa' },
  bravo:  { req: 'radioReqBravo',  ack: 'radioAckBravo' },
  charlie:{ req: 'radioReqCharlie', ack: 'radioAckCharlie' },
  delta:  { req: 'radioReqDelta',  ack: 'radioAckDelta' },
  echo:   { req: 'radioReqEcho',   ack: 'radioAckEcho' },
  foxtrot:{ req: null,             ack: null }
};

function outpostRadioKey(name){
  const n = (name||'').toUpperCase();
  if(n.includes('ALFA') || n.includes('ALPHA')) return 'alfa';
  if(n.includes('BRAVO')) return 'bravo';
  if(n.includes('CHARLIE')) return 'charlie';
  if(n.includes('DELTA')) return 'delta';
  if(n.includes('ECHO')) return 'echo';
  if(n.includes('FOXTROT')) return 'foxtrot';
  return null;
}

let radioBusyUntil = 0;

/* Volumen de TODAS las voces de radio (solicitud, apoyo y rechazo): bajado para que no tapen el juego */
const RADIO_VOICE_VOL = 0.45;

/* Control de la secuencia en curso: así se puede cortar todo de golpe (muerte, salir, victoria) */
const radioClips = new Set();   // fuentes de audio sonando ahora mismo
let radioSeq = null;            // { opName, pair, outcome, ackDue, timer }

/** Reproduce un clip de radio sin variación de pitch (voz clara). Devuelve duration en s o 0. */
function playRadioClip(k, vol){
  if(!k || !actx) return 0;
  const b = SND.buf[k];
  if(!b){
    // intentar cargar bajo demanda
    if(SND.urls[k]){
      try{ loadAudioBuf(SND.urls[k], buf=>{ SND.buf[k]=buf; }); }catch(e){}
    }
    return 0;
  }
  try{
    if(actx.state==='suspended') actx.resume();
    const s = actx.createBufferSource(), g = actx.createGain();
    s.buffer = b;
    s.playbackRate.value = 1; // sin pitch random: es voz
    g.gain.value = vol==null ? RADIO_VOICE_VOL : vol;
    s.connect(g); g.connect(actx.destination);
    SND.active++;
    radioClips.add(s);
    s.onended = ()=>{ SND.active--; radioClips.delete(s); try{g.disconnect()}catch(e){} };
    s.start();
    return b.duration || 0;
  }catch(e){
    return 0;
  }
}

/** Corta de inmediato TODO el audio de radio: solicitudes, apoyos, rechazos y la radio del campamento. */
export function stopOutpostRadio(){
  if(radioSeq){ clearTimeout(radioSeq.timer); radioSeq = null; }
  for(const s of Array.from(radioClips)){ try{ s.onended=null; s.stop(); }catch(e){} SND.active=Math.max(0,SND.active-1); }
  radioClips.clear();
  radioBusyUntil = 0;
  radioStop();
}

/** Momento de responder: apoyo de Foxtrot si se enviaron refuerzos, o "apoyo rechazado" si no hay. */
function radioAnswer(seq){
  if(radioSeq !== seq || state !== 'play') return;
  if(seq.outcome === 'sent'){ if(seq.pair.ack) playRadioClip(seq.pair.ack); }
  else if(seq.outcome === 'rejected'){ playRadioClip('radioReject'); }
  else if(seq.outcome === null){ seq.ackDue = true; return; } // aún no se sabe: se responde al resolverse
  if(radioSeq === seq) radioSeq = null;
}

/**
 * La base madre ya decidió: sent = envió refuerzos, rejected = no tiene/no puede,
 * cancelled = la alarma fue destruida antes de llegar la señal (no hay respuesta).
 * Sirve para cualquier puesto.
 */
export function outpostRadioResult(opName, outcome){
  const seq = radioSeq;
  if(!seq || seq.opName !== opName) return;
  seq.outcome = outcome;
  if(outcome === 'cancelled'){ clearTimeout(seq.timer); radioSeq = null; return; }
  if(seq.ackDue) radioAnswer(seq);
}

/**
 * Secuencia de radio:
 * 1) Solicitud del puesto completa
 * 2) Pausa de 3 segundos
 * 3) Respuesta: apoyo de Foxtrot, o "apoyo rechazado" si no quedan refuerzos
 * Sin solaparse.
 */
export function playOutpostRadio(opName){
  const key = outpostRadioKey(opName);
  if(!key) return;
  const pair = RADIO_BY_OUTPOST[key];
  if(!pair) return;
  const now = performance.now();
  if(now < radioBusyUntil) return; // evita solapar varias alarmas
  stopOutpostRadio();

  const GAP_MS = 3000; // 3 s entre fin de solicitud y respuesta
  const seq = radioSeq = { opName, pair, outcome:null, ackDue:false, timer:0 };

  if(pair.req){
    const dur = playRadioClip(pair.req);
    // Si el buffer aún no cargó, usar ~13s de respaldo (duración típica de las solicitudes)
    const waitMs = Math.round(((dur > 0.5 ? dur : 13) * 1000) + GAP_MS);
    radioBusyUntil = now + waitMs + 10000;
    seq.timer = setTimeout(()=>radioAnswer(seq), waitMs);
  } else {
    radioBusyUntil = now + 8000;
    seq.timer = setTimeout(()=>radioAnswer(seq), 800);
  }
}

export function whoosh(){
 if(!actx)return;
 const o=actx.createOscillator(),g=actx.createGain(),n=actx.currentTime;
 o.type='sawtooth';
 o.frequency.setValueAtTime(140,n);
 o.frequency.exponentialRampToValueAtTime(50,n+1.2);
 g.gain.setValueAtTime(.08,n);
 g.gain.exponentialRampToValueAtTime(.0001,n+1.2);
 o.connect(g);g.connect(actx.destination);
 o.start(n);o.stop(n+1.25);
}
