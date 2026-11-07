import { state } from './state.js';
import { actx, ensureAudio, loadAudioBuf, uiClick, uiLoad } from './audio.js';
import { U_MUS } from '../data/audio-urls.js';


/* ===== MÚSICA DEL MENÚ (canción grabada; se apaga poco a poco al empezar la operación) ===== */
const MUS={on:false,url:U_MUS,buf:null,loading:false,src:null,gain:null};

try{if(localStorage.getItem('ed_music2')==='1')MUS.on=true}catch(e){}

function musLoad(){if(!actx||MUS.loading)return;MUS.loading=true;try{loadAudioBuf(MUS.url,b=>{MUS.buf=b})}catch(e){}}

function musStart(){const now=actx.currentTime,src=actx.createBufferSource(),g=actx.createGain();src.buffer=MUS.buf;src.loop=true;
 g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.7,now+1.5);src.connect(g);g.connect(actx.destination);src.start();MUS.src=src;MUS.gain=g}

function musFade(sec){const s=MUS.src,g=MUS.gain;if(!s)return;MUS.src=null;MUS.gain=null;const now=actx.currentTime;
 g.gain.cancelScheduledValues(now);g.gain.setValueAtTime(g.gain.value,now);g.gain.linearRampToValueAtTime(0,now+sec);
 setTimeout(()=>{try{s.stop()}catch(e){}try{g.disconnect()}catch(e){}},sec*1000+200)}

function musUpdate(){
 if(!actx||actx.state!=='running')return;
 const bs=document.getElementById('bootScreen'),booting=bs&&bs.classList.contains('on');
 const want=MUS.on&&state==='menu'&&!booting;
 if(want&&!MUS.src){musLoad();if(MUS.buf)musStart()}
 else if(!want&&MUS.src)musFade(1.2) /* al empezar la operación baja poco a poco, sin cortar de golpe */}

setInterval(musUpdate,300);

addEventListener('pointerdown',()=>{ensureAudio();musLoad();setTimeout(musUpdate,60)},true);

addEventListener('keydown',()=>{ensureAudio()},true);

(()=>{const b=document.getElementById('musicBtn');if(!b)return;
 const lab=()=>{b.textContent='MÚSICA: '+(MUS.on?'SÍ':'NO')};lab();
 b.addEventListener('click',e=>{e.preventDefault();MUS.on=!MUS.on;try{localStorage.setItem('ed_music2',MUS.on?'1':'0')}catch(err){}lab();ensureAudio();musUpdate()})})();


/* Sonido de botón (litupsubway-ui-close) en TODOS los botones del juego */
(()=>{const BTN='button,.btn,#mmHotspot';          /* se oye al presionar */
 const ITEM='.shopCard,.slot,.achCard,#mapMissionCard'; /* se oye al tocar (no al hacer scroll) */
 const NOT='#btnFire';                              /* el botón de disparo suena a disparo */
 const hit=(e,sel)=>{const t=e.target;if(!t||!t.closest)return false;const b=t.closest(sel);return !!b&&!b.matches(NOT)&&!b.closest(NOT)};
 document.addEventListener('pointerdown',e=>{if(hit(e,BTN))uiClick()},true);
 document.addEventListener('touchstart',e=>{try{uiLoad()}catch(_){}if(hit(e,BTN))uiClick()},{capture:true,passive:true});
 document.addEventListener('mousedown',e=>{if(hit(e,BTN))uiClick()},true);
 let sx=0,sy=0,mv=false,ok=false;
 document.addEventListener('touchstart',e=>{ok=hit(e,ITEM);const t=e.touches[0];if(t){sx=t.clientX;sy=t.clientY}mv=false},{capture:true,passive:true});
 document.addEventListener('touchmove',e=>{const t=e.touches[0];if(t&&(Math.abs(t.clientX-sx)>10||Math.abs(t.clientY-sy)>10))mv=true},{capture:true,passive:true});
 document.addEventListener('touchend',e=>{if(ok&&!mv)uiClick();ok=false},{capture:true,passive:true});
 document.addEventListener('click',e=>{if(hit(e,ITEM))uiClick()},true);
})();
