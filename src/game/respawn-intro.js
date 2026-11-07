/* ===== PRESENTACIÓN AL APARECER EN EL MAPA =====
   Pantalla en negro que se aclara poco a poco + música "Comienzo De Operación".
   Muestra el nombre del mapa y el clima. A los 5 s la música y el texto se
   desvanecen juntos. Al salir de la app, el sonido y el tiempo se pausan.
   Funciona igual en Distrito Cero y Frente de Ceniza. */

const T_HOLD = .6;      // s en negro total antes de empezar a aclarar
const T_CLEAR = 5;      // s en que la pantalla termina de aclararse y empieza el desvanecido
const T_OUT = 2;        // s que dura el desvanecido de música + texto
const T_TOTAL = T_CLEAR + T_OUT;
const VOL = .9;

const MAP_NAMES = { district: 'DISTRITO CERO', front: 'FRENTE DE CENIZA' };
const WEATHER_NAMES = { clear: 'SOLEADO', rain: 'LLUVIOSO', fog: 'NEBLINA', sandstorm: 'TORMENTA DE ARENA', night: 'NOCTURNO · VISIBILIDAD MÍNIMA' };

let ctx = null, buf = null, loading = false, loadingPromise = null, url = '';
let run = null; // presentación en curso

function ensureCtx(){
  if(!ctx){ try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){} }
  if(ctx && ctx.state === 'suspended' && !document.hidden){ try{ ctx.resume(); }catch(e){} }
  return ctx;
}

/* Se llama al empezar la pantalla de carga: deja el audio listo para cuando aparezca el jugador */
export function prepareRespawnIntro(audioUrl){
  if(audioUrl) url = audioUrl;
  if(buf) return Promise.resolve(true);
  if(loading) return loadingPromise || Promise.resolve(false);
  if(!ensureCtx() || !url) return Promise.resolve(false);
  loading = true;
  loadingPromise = fetch(url).then(r => {
    if(!r.ok) throw new Error('No se pudo cargar el audio de introducción');
    return r.arrayBuffer();
  }).then(ab => new Promise(resolve => {
    let settled = false;
    const finish = ok => { if(settled)return; settled=true; if(ok)buf=ok===true?buf:ok; resolve(!!ok); };
    let pr;
    try{ pr = ctx.decodeAudioData(ab, b => {buf=b;finish(true)}, () => finish(false)); }
    catch(e){ finish(false); return; }
    if(pr && pr.then) pr.then(b => {buf=b;finish(true)}, () => finish(false));
  })).catch(() => false).finally(() => { loading = false; loadingPromise = null; });
  return loadingPromise;
}

function getEls(){
  let root = document.getElementById('respawnIntro');
  if(!root){
    root = document.createElement('div');
    root.id = 'respawnIntro';
    root.innerHTML = '<div id="respawnBlack"></div><div id="respawnText"><div id="respawnMap"></div><div id="respawnWeather"></div></div>';
    document.body.appendChild(root);
  }
  return root;
}

function stopRun(r, quick){
  if(!r || r.dead) return;
  r.dead = true;
  cancelAnimationFrame(r.raf);
  if(r.src){
    const g = r.gain, now = ctx.currentTime;
    try{ g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + (quick ? .4 : .05)); }catch(e){}
    setTimeout(() => { try{ r.src.stop(); }catch(e){} try{ r.gain.disconnect(); }catch(e){} }, quick ? 500 : 120);
  }
  const root = document.getElementById('respawnIntro');
  if(root && run === r){ root.classList.remove('on'); }
  if(run === r) run = null;
}

/* Se llama justo cuando el jugador aparece en el mapa.
   map: 'district' | 'front' · weather: 'clear' | 'rain' | 'fog' | 'sandstorm'
   getState: función que devuelve el estado del juego (para cortar si muere o sale al menú) */
export function playRespawnIntro(map, weather, getState){
  if(run) stopRun(run, false);
  const root = getEls();
  const black = document.getElementById('respawnBlack');
  const text = document.getElementById('respawnText');
  document.getElementById('respawnMap').textContent = MAP_NAMES[map] || String(map || '').toUpperCase();
  document.getElementById('respawnWeather').textContent = 'CLIMA: ' + (WEATHER_NAMES[weather] || WEATHER_NAMES.clear);
  black.style.opacity = 1; text.style.opacity = 0;
  root.classList.add('on');

  const r = { dead:false, t:0, last:performance.now(), raf:0, src:null, gain:null, quick:false, qt:0 };
  run = r;

  // Música
  if(ensureCtx() && buf){
    try{
      const now = ctx.currentTime, src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(VOL, now + .4);
      g.gain.setValueAtTime(VOL, now + T_CLEAR);                 // a los 5 s empieza a bajar...
      g.gain.linearRampToValueAtTime(0, now + T_TOTAL);          // ...hasta desaparecer por completo
      src.connect(g); g.connect(ctx.destination); src.start(now);
      src.stop(now + T_TOTAL + .1);
      r.src = src; r.gain = g;
    }catch(e){}
  }

  const ss = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  function frame(now){
    if(r.dead) return;
    // el tiempo avanza solo mientras la app está visible (rAF se detiene al salir)
    const dt = Math.min(.1, (now - r.last) / 1000); r.last = now;
    r.t += dt;
    const st = getState ? getState() : 'play';
    if(st !== 'play' && !r.quick){ r.quick = true; r.qt = 0; }   // murió / volvió al menú: cortar suave
    let k = 1;
    if(r.quick){ r.qt += dt; k = Math.max(0, 1 - r.qt / .4); if(k <= 0){ stopRun(r, true); return; } }

    const t = r.t;
    black.style.opacity = (1 - ss((t - T_HOLD) / (T_CLEAR - T_HOLD))) * k;
    const tin = ss((t - .5) / 1);                                // texto aparece
    const tout = 1 - ss((t - T_CLEAR) / T_OUT);                  // texto se va junto con la música
    text.style.opacity = Math.min(tin, tout) * k;

    if(t >= T_TOTAL){ stopRun(r, false); return; }
    r.raf = requestAnimationFrame(frame);
  }
  r.raf = requestAnimationFrame(frame);
}

/* Al salir de la app el sonido se pausa (y el tiempo también); al volver continúa */
document.addEventListener('visibilitychange', () => {
  if(!ctx) return;
  try{
    if(document.hidden){ if(ctx.state === 'running') ctx.suspend(); }
    else if(ctx.state === 'suspended'){ ctx.resume(); }
  }catch(e){}
});
