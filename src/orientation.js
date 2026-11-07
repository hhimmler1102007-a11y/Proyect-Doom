/* Solo horizontal: intenta bloquear la orientación y pausa el juego en vertical */
(function(){
 const mq=window.matchMedia('(orientation:portrait)');
 const upd=()=>{window.__portrait=mq.matches;if(mq.matches){try{if(typeof fireHeld!=='undefined')fireHeld=false}catch(e){}}};
 upd();(mq.addEventListener?mq.addEventListener('change',upd):mq.addListener(upd));
 const lock=()=>{try{const o=screen.orientation;if(o&&o.lock)o.lock('landscape').catch(()=>{})}catch(e){}};
 lock();
 ['pointerdown','touchend','click'].forEach(ev=>addEventListener(ev,()=>{lock()},{capture:true,passive:true,once:false}));
 document.addEventListener('fullscreenchange',lock);
})();
