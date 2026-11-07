/* Informe de inteligencia en video (solo Frente de Ceniza).
   Se reproduce al pulsar INICIAR OPERACIÓN; al terminar o al tocar la pantalla continúa a la pantalla de carga. */
import { U_BRIEFING } from '../data/video-urls.js';

let busy = false;

export function playBriefing(onDone){
  const box = document.getElementById('briefingScreen');
  const video = document.getElementById('briefingVideo');
  if(!box || !video){ onDone(); return; }
  if(busy) return;
  busy = true;
  let finished = false;

  function end(){
    if(finished) return;          // solo una vez (fin del video, toque, tecla o error)
    finished = true;
    box.removeEventListener('pointerdown', onTap);
    removeEventListener('keydown', onKey, true);
    video.removeEventListener('ended', end);
    video.removeEventListener('error', end);
    try{ video.pause(); }catch(e){}
    box.classList.add('fade');
    setTimeout(function(){
      box.classList.remove('on','fade');
      try{ video.removeAttribute('src'); video.load(); }catch(e){}  // libera memoria
      busy = false;
    }, 360);
    onDone();                     // la pantalla de carga queda debajo y aparece al desvanecerse el informe
  }
  function onTap(e){ e.preventDefault(); end(); }
  function onKey(e){ if(e.key==='Enter'||e.key===' '||e.key==='Escape'){ e.preventDefault(); end(); } }

  box.addEventListener('pointerdown', onTap);
  addEventListener('keydown', onKey, true);
  video.addEventListener('ended', end);
  video.addEventListener('error', end);

  box.classList.remove('fade');
  box.classList.add('on');
  video.src = U_BRIEFING;
  video.muted = false; video.volume = 1;
  // El toque en INICIAR OPERACIÓN ya cuenta como interacción, así que suena con audio.
  const p = video.play();
  if(p && p.catch) p.catch(function(){
    if(finished) return;
    video.muted = true;           // último recurso: sin sonido antes que trabarse
    const p2 = video.play();
    if(p2 && p2.catch) p2.catch(end);
  });
}
