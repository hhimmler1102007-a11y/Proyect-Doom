document.addEventListener('DOMContentLoaded', function(){
  const boot = document.getElementById('bootScreen');
  const menu = document.getElementById('menuScreen');
  const fill = document.getElementById('bootLoadingFill');
  const text = document.getElementById('bootLoadingText');
  const intro = document.getElementById('introScreen');
  const video = document.getElementById('introVideo');
  if(!boot || !fill) return;

  // Asegurar menú oculto al inicio
  if(menu) menu.classList.remove('on');

  /* ===== CARGA INICIAL REAL ===== */
  let bootFinished = false;
  function finishBoot(){
    if(bootFinished) return;
    bootFinished = true;
    fill.style.width = '100%';
    text.textContent = 'RECURSOS LISTOS - INICIANDO';
    setTimeout(function(){
      boot.style.transition = 'opacity .45s ease';
      boot.style.opacity = '0';
      setTimeout(function(){
        boot.classList.remove('on');
        boot.style.display = 'none';
        if(menu) menu.classList.add('on');
        window.dispatchEvent(new Event('bootComplete'));
      }, 460);
    }, 120);
  }

  function startBoot(){
    fill.style.width = '0%';
    text.textContent = 'ESPERANDO A QUE LOS RECURSOS ESTÉN LISTOS...';
    if(window.__EXTRACTION_DOOM_READY__){ finishBoot(); return; }
    window.addEventListener('extractionDoomReady', finishBoot, {once:true});
  }


  /* ===== INTRO EN VIDEO ===== */
  // Si no hay video, se va directo a la pantalla de carga.
  if(!intro || !video){ startBoot(); return; }

  let started = false;   // false = esperando el primer toque ("Toca para comenzar")
  let introDone = false;
  const startGate = document.getElementById('introStart');

  function endIntro(){
    if(introDone) return;      // solo una vez (fin del video, toque o error)
    introDone = true;
    removeEventListener('keydown', onKey, true);
    intro.removeEventListener('pointerdown', onTap);
    intro.removeEventListener('click', onStartClick);
    try{ video.pause(); }catch(e){}
    intro.classList.add('fade');
    // la pantalla de carga ya está debajo: se ve apenas se desvanece la intro
    startBoot();
    setTimeout(function(){
      intro.classList.add('off');
      try{ video.removeAttribute('src'); video.load(); }catch(e){} // libera memoria
      window.dispatchEvent(new Event('introComplete'));
    }, 480);
  }

  // Primer toque: el navegador lo cuenta como interacción, así el video suena.
  function startIntro(){
    started = true;
    if(startGate) startGate.classList.add('off');
    intro.classList.add('playing'); // muestra "Toca en cualquier lugar para saltar intro"
    video.muted = false;
    video.volume = 1;
    const p = video.play();
    if(p && p.catch){
      p.catch(function(){
        if(introDone) return;
        video.muted = true;       // último recurso: sin sonido antes que trabarse
        const p2 = video.play();
        if(p2 && p2.catch) p2.catch(endIntro);
      });
    }
  }

  // OJO: en Chrome/Android "pointerdown" y "touchstart" NO cuentan como interacción
  // para reproducir con sonido; "click" (y keydown) sí. Por eso:
  //  - empezar  -> evento "click"
  //  - saltar   -> "pointerdown" (inmediato), solo cuando el video ya empezó
  function onTap(e){ if(started){ e.preventDefault(); endIntro(); } }
  function onStartClick(e){ e.preventDefault(); if(!started) startIntro(); }
  function onKey(e){
    if(e.key==='Enter'||e.key===' '||e.key==='Escape'){
      e.preventDefault();
      if(!started) startIntro(); else endIntro();
    }
  }

  intro.addEventListener('click', onStartClick);
  intro.addEventListener('pointerdown', onTap);
  addEventListener('keydown', onKey, true);
  video.addEventListener('ended', endIntro);
  video.addEventListener('error', endIntro);
});
