import { $ } from './core.js';
import { P, set_fireHeld, state } from './state.js';
import { cancelSafeCrack } from './operations.js';
import { ensureAudio } from './audio.js';
import { canvas, resize } from './backdrop.js';
import { cycleThrowable, startReload, swapOrReload, throwGrenade } from './ai.js';
import { openLoot, toggleInv } from './inventory.js';
import { melee, shoot } from './combat.js';
import { closeBigMap, openBigMap } from './bigmap.js';
import { shadowCfg, toggleShadows } from './shadows.js';
import { cycleQuality, qualityLabel } from './quality.js';
import { toggleFlashlight } from './night.js';


export function onTap(el,handler){
 if(!el)return;
 let sx=0,sy=0,moved=false,lastTouch=0;
 el.addEventListener('touchstart',e=>{e.stopPropagation();const t=e.touches[0];sx=t.clientX;sy=t.clientY;moved=false},{passive:true});
 el.addEventListener('touchmove',e=>{const t=e.touches[0];if(Math.abs(t.clientX-sx)>10||Math.abs(t.clientY-sy)>10)moved=true},{passive:true});
 el.addEventListener('touchend',e=>{e.stopPropagation();if(moved)return;e.preventDefault();lastTouch=Date.now();try{ensureAudio()}catch(_){}handler()},{passive:false});
 el.addEventListener('touchcancel',e=>{e.stopPropagation()},{passive:true});
 el.addEventListener('click',e=>{if(Date.now()-lastTouch<600)return;e.preventDefault();handler()});
}

export function onHold(el,onShort,onLong){
 if(!el)return;
 let tmr=null,longFired=false,touched=false;
 const START=(e)=>{e.preventDefault();e.stopPropagation();touched=true;longFired=false;tmr=setTimeout(()=>{longFired=true;onLong()},450)};
 const END=(e)=>{e.stopPropagation();if(tmr)clearTimeout(tmr);if(touched&&!longFired)onShort();touched=false};
 const CANCEL=()=>{if(tmr)clearTimeout(tmr);touched=false};
 el.addEventListener('touchstart',START,{passive:false});
 el.addEventListener('touchend',END,{passive:true});
 el.addEventListener('touchcancel',CANCEL,{passive:true});
 let moTmr=null,moLong=false,moDown=false;
 el.addEventListener('mousedown',e=>{e.preventDefault();moDown=true;moLong=false;moTmr=setTimeout(()=>{moLong=true;onLong()},450)});
 el.addEventListener('mouseup',e=>{e.preventDefault();if(moTmr)clearTimeout(moTmr);if(moDown&&!moLong)onShort();moDown=false});
 el.addEventListener('mouseleave',()=>{if(moTmr)clearTimeout(moTmr);moDown=false});
}

export const keys={};

addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
 if(k==='escape'){if($('bigMapOverlay')&&$('bigMapOverlay').classList.contains('on')){closeBigMap();e.preventDefault();return}if($('invPanel').classList.contains('on')){$('invPanel').classList.remove('on');return}if($('lootPanel').classList.contains('on')){$('lootPanel').classList.remove('on');return}}
 if(state!=='play')return;if(k===' ')set_fireHeld(true);if(k==='q')swapOrReload();if(k==='i')toggleInv();if(k==='e')openLoot();
 if(k==='r')startReload();if(k==='f')melee();if(k==='l')toggleFlashlight();
 if(k==='g')throwGrenade();if(k==='v')cycleThrowable();if(k==='m')openBigMap();if(k==='h')toggleShadows();if(k==='g'){cycleQuality();resize()}});

addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;if(e.key===' ')set_fireHeld(false)});

$('zoneR').addEventListener('click',()=>{if(state==='play'&&!('ontouchstart' in window)&&canvas.requestPointerLock)canvas.requestPointerLock()});

document.addEventListener('mousemove',e=>{if(document.pointerLockElement&&state==='play'&&!paused())P.a+=e.movementX*.0026});

document.addEventListener('mousedown',e=>{if(document.pointerLockElement&&state==='play'&&!paused())set_fireHeld(true)});

addEventListener('mouseup',()=>{set_fireHeld(false);$('btnFire').classList.remove('on')});

export function paused(){return window.__portrait||$('invPanel').classList.contains('on')||$('lootPanel').classList.contains('on')||($('bigMapOverlay')&&$('bigMapOverlay').classList.contains('on'))}

export const joyBase=$('joyBase'),joyKnob=$('joyKnob');
export let joyId=null,jcx=0,jcy=0,joyX=0,joyY=0,joyOn=false;
const JM=52;

const zL=$('zoneL'),zR=$('zoneR'),NP={passive:false};

zL.addEventListener('touchstart',e=>{e.preventDefault();ensureAudio();for(const t of e.changedTouches)if(joyId===null){joyId=t.identifier;jcx=t.clientX;jcy=t.clientY;joyOn=true;joyX=joyY=0;
 joyBase.style.left=jcx+'px';joyBase.style.top=jcy+'px';joyBase.style.display='block';joyKnob.style.left=joyKnob.style.top='50%'}},NP);

zL.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===joyId){let dx=t.clientX-jcx,dy=t.clientY-jcy;const d=Math.hypot(dx,dy);
 if(d>JM){dx=dx/d*JM;dy=dy/d*JM}joyX=dx/JM;joyY=-dy/JM;joyKnob.style.left=(50+dx/JM*44)+'%';joyKnob.style.top=(50+dy/JM*44)+'%'}},NP);

function endJoy(e){for(const t of e.changedTouches)if(t.identifier===joyId){joyId=null;joyOn=false;joyX=joyY=0;joyBase.style.display='none'}}

zL.addEventListener('touchend',endJoy,{passive:true});

zL.addEventListener('touchcancel',endJoy,{passive:true});

export let lookId=null,lx=0,ly=0,lm=0;

zR.addEventListener('touchstart',e=>{e.preventDefault();ensureAudio();for(const t of e.changedTouches)if(lookId===null){lookId=t.identifier;lx=t.clientX;ly=t.clientY;lm=0}},NP);

zR.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===lookId){const dx=t.clientX-lx;lm+=Math.abs(dx)+Math.abs(t.clientY-ly);lx=t.clientX;ly=t.clientY;if(state==='play'&&!paused())P.a+=dx*.0055}},NP);

zR.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===lookId){if(lm<12&&state==='play'&&!paused())shoot();lookId=null}},{passive:true});

zR.addEventListener('touchcancel',()=>{lookId=null},{passive:true});

function bind(id,down,up){const b=$(id);b.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();ensureAudio();down();b.classList.add('on')},NP);
 const u=e=>{e.stopPropagation();if(up)up();b.classList.remove('on')};
 b.addEventListener('touchend',u,{passive:true});
 b.addEventListener('touchcancel',u,{passive:true})}

$('safeCrackCancel').addEventListener('click',()=>cancelSafeCrack('FORZADO CANCELADO'));

 bind('btnFire',()=>{set_fireHeld(true)},()=>{set_fireHeld(false)});
bind('btnSwap',swapOrReload);
bind('btnInv',toggleInv);
bind('btnMelee',melee);
onTap($('btnLight'),toggleFlashlight);

const lootBtn=$('btnLoot');
let lootTouchStarted=false;

lootBtn.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();lootTouchStarted=true;ensureAudio();lootBtn.classList.add('on')},NP);

lootBtn.addEventListener('touchend',e=>{e.preventDefault();e.stopPropagation();const wasStarted=lootTouchStarted;lootTouchStarted=false;lootBtn.classList.remove('on');if(wasStarted&&state==='play')openLoot()},{passive:false});

lootBtn.addEventListener('touchcancel',()=>{lootTouchStarted=false;lootBtn.classList.remove('on')},{passive:true});

lootBtn.addEventListener('click',e=>{if('ontouchstart' in window)return;e.preventDefault();if(state==='play')openLoot()});

const btnThrow=$('btnThrow');
let throwTmr=null,throwLong=false;

btnThrow.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();ensureAudio();btnThrow.classList.add('on');throwLong=false;
 throwTmr=setTimeout(()=>{throwLong=true;cycleThrowable();if(navigator.vibrate)navigator.vibrate(20)},380)},NP);

btnThrow.addEventListener('touchend',e=>{e.stopPropagation();clearTimeout(throwTmr);btnThrow.classList.remove('on');if(!throwLong)throwGrenade()},{passive:true});

btnThrow.addEventListener('touchcancel',()=>{clearTimeout(throwTmr);btnThrow.classList.remove('on')},{passive:true});

btnThrow.addEventListener('mousedown',e=>{e.preventDefault();ensureAudio();btnThrow.classList.add('on');throwLong=false;
 throwTmr=setTimeout(()=>{throwLong=true;cycleThrowable()},380)});

btnThrow.addEventListener('mouseup',e=>{clearTimeout(throwTmr);btnThrow.classList.remove('on');if(!throwLong)throwGrenade()});

$('btnFire').addEventListener('mousedown',()=>{set_fireHeld(true);$('btnFire').classList.add('on')});

/* setters para variables reasignadas desde otros módulos */
export function set_joyId(v){return joyId=v}
export function set_joyOn(v){return joyOn=v}
export function set_lookId(v){return lookId=v}

/* Botones del menú: calidad gráfica y sombras (también táctiles, para Android) */
{const gb=document.getElementById('gfxBtn'),sb=document.getElementById('shadowBtn');
 const lab=()=>{if(gb)gb.textContent='GRÁFICOS: '+qualityLabel();if(sb)sb.textContent='SOMBRAS: '+(shadowCfg.on?'SÍ':'NO')};lab();
 if(gb)gb.addEventListener('click',e=>{e.preventDefault();cycleQuality();resize();lab()});
 if(sb)sb.addEventListener('click',e=>{e.preventDefault();toggleShadows();lab()})}
