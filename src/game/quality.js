/* ===== CALIDAD GRÁFICA =====
   AUTO  : calidad media; la resolución se adapta sola a los FPS (game.js) y si baja mucho se apagan las luces/AO.
   BAJO  : resolución reducida, solo sombras básicas.
   MEDIO : sombras suaves + oclusión ambiental + hasta 5 luces dinámicas.
   ALTO  : alta resolución, sombras suaves y hasta 9 luces dinámicas.
   CINEMÁTICO: resolución máxima, sombras más difusas y hasta 14 luces dinámicas. */
const MODES=['auto','low','med','high','cinematic'],LABEL={auto:'AUTO',low:'BAJO',med:'MEDIO',high:'ALTO',cinematic:'CINEMÁTICO'};
export const Q={mode:'auto'};
try{const m=localStorage.getItem('xd_gfx');if(MODES.indexOf(m)>=0)Q.mode=m}catch(e){}
export const FEATURES=[
  {lights:0,ao:false,soft:[]},
  {lights:5,ao:true,soft:[1]},
  {lights:9,ao:true,soft:[2,1]},
  {lights:14,ao:true,soft:[3,2,1]}
];
export const qualityLabel=()=>LABEL[Q.mode];
export const isAuto=()=>Q.mode==='auto';
export function cycleQuality(){Q.mode=MODES[(MODES.indexOf(Q.mode)+1)%MODES.length];try{localStorage.setItem('xd_gfx',Q.mode)}catch(e){}return Q.mode}
export function resMul(){return Q.mode==='low'?.62:Q.mode==='high'?1.7:Q.mode==='cinematic'?2.0:1}
/* nivel efectivo 0/1/2/3; en AUTO depende de la escala de resolución actual (qs) */
export function level(qs){return Q.mode==='low'?0:Q.mode==='med'?1:(Q.mode==='high'?2:Q.mode==='cinematic'?3:(qs<.6?0:1))}
