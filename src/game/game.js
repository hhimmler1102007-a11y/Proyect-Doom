import { isAuto } from './quality.js';
import { $, MAP_SEED, MH, MW, OUTPOSTS, OUTPOST_NAMES, clamp, gmap, gmapOrig, hash, map, walkmapOrig } from './core.js';
import { BEACON, DISTRICT_OUTPOSTS, FRONT_CAMPS, walkmap } from './outposts.js';
import { applyWallStyle, gSh, set_gSh, shades, tAsph, tBlackDirt, tDirt, tGrass, tMilFloor, tSide } from './textures.js';
import { refreshMarket, rollDailyMissions } from './data.js';
import { P, gt, loadMeta, mapMarkers, markerPathT, meta, saveMeta, selectedMap, set_currentOutpostShown, set_fireHeld, set_gt, set_mapMarkers, set_markerPathT, set_selectedMap, set_shopTab, set_state, shopTab, state, updWeather, weather } from './state.js';
import { isNight, night, set_night } from './state.js';
import { updateSafeCrack } from './operations.js';
import { resetWithProgress } from './reset.js';
import { SFX, actx, ensureAudio, startPainLoop, stopPainLoop, setPainVolume, isPainPlaying, stopOutpostRadio } from './audio.js';
import { waitForSpriteAssets } from './sprites.js';
import { waitForWeaponAssets } from './weapon-view.js';
import { adapt, buf, buildSky, ft, qs, rebuildMinimap, resize, set_adapt, set_qs, skyMapKey, waitForBackdropAssets } from './backdrop.js';
import { conquestTick } from './conquest.js';
import { findPath } from './pathfinding.js';
import { joyBase, onTap, paused, set_joyId, set_joyOn, set_lookId } from './input.js';
import { playRespawnIntro, prepareRespawnIntro } from './respawn-intro.js';
import { U_RESPAWN } from '../data/audio-urls.js';
import { playBriefing } from './briefing.js';
import { updAllies, updEnemies } from './ai.js';
import { updFx, updParts, updPlayer, updProjs, updRockets, updateAmbient } from './update.js';
import { closeAch, closeDaily, closeShop, openAch, openDaily, openShop, refreshMenuStats, renderShop } from './shop.js';
import { render } from './render.js';
import { hud, msg, screen } from './hud.js';
import { updateEGrenades, updateFires, updateSmokes, updateThrowables } from './combat.js';
import { closeBigMap, drawBigMap, initBigMapControls, openBigMap, resizeBigMapCanvas } from './bigmap.js';


let lastT=0,running=true,lastBodyState=null;

export function loop(t){
 requestAnimationFrame(loop);if(!running)return;
 const dt=Math.min(.05,(t-lastT)/1000)||0;lastT=t;
 if(state==='play'){
  if(!paused()){
   set_gt(gt+(dt));updPlayer(dt);updateAmbient(dt);updateSafeCrack(dt);updEnemies(dt);conquestTick(dt);updAllies(dt);updProjs(dt);updRockets(dt);
   updateThrowables(dt);updateEGrenades(dt);updateSmokes(dt);updateFires(dt);updWeather(dt);
   set_markerPathT(markerPathT-(dt));
   if(markerPathT<=0){set_markerPathT(1.5);for(const m of mapMarkers)m.path=findPath(P.x,P.y,m.x,m.y)}
  }
  updParts(dt);updFx(dt);hud(false);
  $('damage').style.opacity=P.hurt>0?Math.min(.85,P.hurt*2):0;
  // --- Feedback de vida baja (≤35 HP): bordes rojos + quejidos ---
  const hp = P.hp, maxHp = P.maxHp || 100;
  const hpR = hp / maxHp;
  // Vignette suave general bajo 50%
  let lowA = 0;
  if(hpR < 0.5){
    const tt = (0.5 - hpR) / 0.5;
    lowA = tt * tt * 0.55;
    if(hpR < 0.2){ lowA += Math.sin(gt * 7) * 0.06; lowA = Math.max(0, Math.min(0.75, lowA)); }
  }
  $('lowhp').style.opacity = lowA;

  // Desde 35 HP: bordes rojos que se intensifican al bajar más
  const critical = hp <= 35 && hp > 0;
  const critIntensity = critical ? Math.min(1, (35 - Math.max(0, hp)) / 35) : 0;
  // 0 en 35 HP → 1 cerca de 0 HP
  const edge = $('lowhpEdge');
  if(edge){
    // Empieza visible en 35 y se pone más fuerte al bajar
    edge.style.opacity = critical ? (0.35 + critIntensity * 0.55) : 0;
  }
  // Asegurar que la capa de partículas de sangre quede apagada
  const blood = $('lowhpBlood');
  if(blood) blood.style.opacity = 0;

  // Quejidos mientras estés ≤35
  if(critical){
    if(!isPainPlaying()) startPainLoop();
    setPainVolume(0.35 + critIntensity * 0.4);
  } else {
    if(isPainPlaying()) stopPainLoop(1000);
  }
 } else {
  updParts(dt);updFx(dt);$('damage').style.opacity=0;$('lowhp').style.opacity=0;
  const edge=$('lowhpEdge'); if(edge) edge.style.opacity=0;
  const blood=$('lowhpBlood'); if(blood) blood.style.opacity=0;
  if(isPainPlaying()) stopPainLoop(400);
 }
 if(buf&&state!=='menu'&&state!=='loading')render();
 if(state!==lastBodyState){lastBodyState=state;document.body.classList.toggle('inmenu',state==='menu')}
 if(state==='play'&&!paused()){ft.push(dt);
  if(!isAuto()){ft.length=0;if(qs!==1){set_qs(1);resize()}}
  else if(ft.length>45){let s=0;for(const v of ft)s+=v;const a=s/ft.length;ft.length=0;set_adapt(adapt+1);
   if(adapt>2){if(a>.033&&qs>.45){set_qs(Math.max(.45,qs-.12));resize();set_adapt(0)}
    else if(a<.017&&qs<1){set_qs(Math.min(1,qs+.08));resize();set_adapt(0)}}}}
}

const LOADING_TIPS=[
 'La ciudad alberga <strong>seis puestos fortificados</strong>. Los de mayor nivel concentran más defensas: no confundas una entrada abierta con una zona segura.',
 'La <strong>base de nivel 3</strong> es la posición más pesada: puede tener cuatro torres, alambradas y defensas interiores. Prepárate antes de cruzar su perímetro.',
 'El <strong>RPG-7</strong> dispara un cohete PG-7V de 40 mm y solo admite uno cargado. Si lo llevas, busca el momento adecuado: la recarga no es instantánea.',
 'Los disparos del lanzacohetes delatan tu posición a gran distancia. <strong>Haz que cada cohete cuente</strong> y no lo uses como si fuera un fusil.',
 'La extracción está en el extremo opuesto de la ciudad. <strong>La baliza verde es tu salida</strong>; sobrevivir al combate no basta si no consigues llegar hasta ella.',
 'El botín de los enemigos pesados puede incluir armas, blindaje y cohetes. <strong>Revisa los cuerpos</strong> después de asegurar la zona, pero no te quedes quieto demasiado tiempo.',
 'El contenedor seguro conserva sus objetos incluso si caes en combate. <strong>Asegura lo irremplazable</strong> antes de arriesgar tu equipo en una incursión.',
 'La tienda aplica una tasa al vender y un impuesto a la extracción. <strong>El valor que recoges no siempre es el valor que cobras</strong>: calcula si el riesgo compensa.',
 'El hambre y la sed también importan. Vigila sus indicadores mientras avanzas: <strong>una incursión larga exige suministros</strong>, no solo munición.',
 'Los puestos de nivel bajo tienen más accesos; los fortines superiores cuentan con más obstáculos y equipo. <strong>Elige la aproximación según la defensa</strong>, no por costumbre.',
 'El humo puede ayudarte a romper una línea de visión, pero no convierte una posición expuesta en cobertura sólida. <strong>Muévete mientras el enemigo pierde contacto</strong>.',
 'La MG42 golpea fuerte, pero pesa mucho más que un arma ligera. <strong>Equipa según la misión</strong>: potencia de fuego y movilidad rara vez vienen gratis.',
 'El mercado cambia sus precios. Antes de gastar todo tu dinero, revisa las ofertas y recuerda que <strong>la munición también forma parte del presupuesto</strong>.',
 'La niebla, la lluvia y las tormentas alteran las condiciones de combate. Si el clima reduce la visibilidad enemiga, <strong>aprovecha la ventana para reposicionarte</strong>.',
 'El blindaje ayuda a resistir, pero no te vuelve invulnerable. <strong>Usa muros, esquinas y edificios</strong> para evitar recibir fuego innecesario.',
 'Cada puesto menor tiene una <strong>alarma física</strong> en su interior: un soldado debe correr hasta ella para activarla y la señal tarda <strong>10 segundos</strong> en llegar a la base madre. <strong>Destrúyela</strong> con balas, granadas, molotov o cohetes y ese puesto no podrá pedir refuerzos.',
 'Los refuerzos <strong>no huyen</strong> y no reaparecen. Un puesto solo cae cuando mueren su guarnición <strong>y</strong> sus refuerzos. Si tomas primero la base madre, nadie vendrá a ayudar.',
 'Toca el <strong>minimapa</strong> (arriba a la derecha) para abrir el <strong>MISIONES</strong>: muestra los nombres de cada base, las cajas fuertes y te permite marcar rutas.'
];

let lastLoadingTip=-1,operationReady=false;

export const frontTrail=new Uint8Array(MW*MH);

function applyMapProfile(){
 // Cada mapa usa su propia lista: puestos militares en el distrito, campamentos improvisados en el frente.
 OUTPOSTS.length=0;OUTPOSTS.push(...(selectedMap==='front'?FRONT_CAMPS:DISTRICT_OUTPOSTS));
 gmap.set(gmapOrig);walkmap.set(walkmapOrig);applyWallStyle();
 set_gSh([shades(tAsph),shades(tSide),shades(tGrass),shades(tDirt),shades(tAsph),shades(tAsph),shades(selectedMap==='front'?tBlackDirt:tMilFloor)]);
 gSh[6]=shades(selectedMap==='front'?tBlackDirt:tMilFloor);
 if(selectedMap==='front'){
  // El frente no conserva asfalto, aceras, cebras ni marcas viales.
  walkmap.fill(0);frontTrail.fill(0);
  for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++){
   const i=y*MW+x;if(map[i])continue;
   const n=hash(x,y,MAP_SEED%997);
   // Fronteras irregulares: cada columna y cada celda desplazan la transición.
   const boundaryNoise=Math.sin(x*.16)*2.8+Math.sin(x*.047+1.7)*3.5+(hash(x>>1,y>>2,1977)-.5)*5.2;
   const p=clamp((y+boundaryNoise)/(MH-1),0,1);
   const zone2Start=.34+(Math.sin(x*.12)*2.5)/(MH-1);
   const zone3Start=.665+(Math.sin(x*.09+2.2)*3.2)/(MH-1);
   gmap[i]=p<zone2Start?((n>.78||n<.08)?3:2):p<zone3Start?3:6;
   // Caminos de barro serpenteantes: una ruta principal y ramales hacia los campamentos.
   const mainX=2+p*86+Math.sin(y*.19)*4.2+Math.sin(y*.047)*2.8;
   let trail=Math.abs(x-mainX)<(1.25+hash(x,y,991)*.7);
   for(const op of OUTPOSTS){
    const ox=op.x,oy=op.y;
    const vx=ox-2.5,vy=oy-2.5,len=Math.hypot(vx,vy)||1;
    const t=clamp(((x-2.5)*vx+(y-2.5)*vy)/(len*len),0,1);
    const px=2.5+vx*t+Math.sin(t*12+oy)*1.6,py=2.5+vy*t+Math.cos(t*10+ox)*1.5;
    if(Math.hypot(x-px,y-py)<1.05)trail=true;
   }
   const bx=BEACON.x,by=BEACON.y;
   const dx=bx-2.5,dy=by-2.5,den=dx*dx+dy*dy;
   const t=clamp(((x-2.5)*dx+(y-2.5)*dy)/(den||1),0,1);
   const px=2.5+dx*t+Math.sin(t*17)*2.2,py=2.5+dy*t+Math.cos(t*14)*1.8;
   if(Math.hypot(x-px,y-py)<1.45)trail=true;
   if(trail)frontTrail[i]=1;
   if(trail&&p<zone3Start)gmap[i]=3;
   // Cráteres y tramos de trinchera, concentrados hacia la línea de contacto.
   if(p>.28&&p<.94&&n>.94)walkmap[i]=5;
   else if(p>.24&&n>.975)walkmap[i]=4;
   else if(p>.34&&n>.987)walkmap[i]=6;
  }
  // Los campamentos ya tienen nombre propio y de 4 a 6 soldados cada uno.
 }else{
  OUTPOSTS.forEach((op,i)=>{op.name=OUTPOST_NAMES[i]||('PUESTO '+i);op.min=[4,8,15][op.tier-1];op.max=[7,12,20][op.tier-1];});
 }
 rebuildMinimap();
}

function nextPaint(){
 return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
}

function setLoadingProgress(percent,status,activePhase){
 const p=Math.max(0,Math.min(100,percent));
 const bar=$('loadProgress');
 if(bar)bar.style.transform='scaleX('+(p/100)+')';
 const statusEl=$('loadStatus');
 if(statusEl)statusEl.textContent=(status||'PREPARANDO OPERACIÓN')+' · '+Math.round(p)+'%';
 const phases=$('loadPhases');
 if(phases){
  phases.querySelectorAll('.loadPhase').forEach(el=>{
   const n=Number(el.dataset.phase||0);
   el.classList.toggle('done',n<activePhase);
   el.classList.toggle('active',n===activePhase);
  });
 }
}

async function start(){
 if(state!=='menu')return;
 ensureAudio();
 operationReady=false;
 set_state('loading');screen(null);stopOutpostRadio();
 $('invPanel').classList.remove('on');$('lootPanel').classList.remove('on');
 $('extwrap').classList.remove('on');$('extfill').style.width='0';
 $('btnLoot').classList.remove('on');$('btnLoot').classList.remove('ally');
 $('lowhp').style.opacity=0;const _b=$('lowhpBlood'),_e=$('lowhpEdge');if(_b)_b.style.opacity=0;if(_e)_e.style.opacity=0;if(isPainPlaying())stopPainLoop(300);$('outpostBanner').className='';
 set_currentOutpostShown(null);
 let tipIndex=Math.floor(Math.random()*LOADING_TIPS.length);
 if(LOADING_TIPS.length>1&&tipIndex===lastLoadingTip)tipIndex=(tipIndex+1+Math.floor(Math.random()*(LOADING_TIPS.length-1)))%LOADING_TIPS.length;
 lastLoadingTip=tipIndex;
 $('loadingTipText').innerHTML=selectedMap==='front'&&Math.random()<.65?['El Frente de Ceniza no recibe refuerzos. <strong>Cuando una guarnición cae, no vuelve</strong>.','La comida es escasa en la línea de contacto. <strong>Reserva las raciones para cuando realmente las necesites</strong>.','Las trincheras y los cráteres rompen las líneas de visión, pero no detienen todos los disparos. <strong>Avanza de cobertura en cobertura</strong>.'][Math.floor(Math.random()*3)]:LOADING_TIPS[tipIndex];
 $('continueOperationBtn').style.display='none';
 const retry=$('retryLoadingBtn');if(retry)retry.style.display='none';
 $('loadingScreen').classList.add('on');
 setLoadingProgress(2,'INICIANDO PREPARACIÓN TÁCTICA',1);

 try{
  await nextPaint();
  if(state!=='loading')return;

  // Fase 1: esperar a que los sprites, las armas y el panorama estén realmente decodificados.
  setLoadingProgress(5,'CARGANDO RECURSOS GRÁFICOS',1);
  await Promise.all([waitForSpriteAssets(),waitForWeaponAssets(),waitForBackdropAssets()]);
  if(state!=='loading')return;
  setLoadingProgress(13,'RECURSOS GRÁFICOS PREPARADOS',2);
  await nextPaint();

  // Fase 2: aplicar el perfil del mapa elegido y reconstruir el terreno.
  setLoadingProgress(16,'CONFIGURANDO EL MAPA SELECCIONADO',2);
  applyMapProfile();
  await nextPaint();
  await resetWithProgress(stage=>{
   const percent=Math.round(18+stage.progress*.78);
   const phase=stage.progress<43?2:stage.progress<79?3:stage.progress<92?4:5;
   setLoadingProgress(percent,stage.status,phase);
  });
  if(state!=='loading')return;

  // Conserva el comportamiento previo del alijo y su guardado.
  meta.stash=new Array(12).fill(null);saveMeta();

  // Fase final: preparar el cielo del mapa y decodificar el audio de aparición.
  setLoadingProgress(96,'RENDERIZANDO EL ENTORNO Y LA BALIZA',5);
  await nextPaint();
  if(skyMapKey!==selectedMap)buildSky();
  setLoadingProgress(98,'PREPARANDO AUDIO DE OPERACIÓN',5);
  await prepareRespawnIntro(U_RESPAWN); // El audio es opcional si el navegador no lo admite.
  if(state!=='loading')return;

  operationReady=true;
  setLoadingProgress(100,'OPERACIÓN LISTA · ESPERANDO AUTORIZACIÓN',6);
  $('continueOperationBtn').style.display='inline-block';
 }catch(err){
  console.error('[EXTRACTION DOOM] Error al preparar la operación:',err);
  operationReady=false;
  $('loadStatus').textContent='ERROR AL PREPARAR LA OPERACIÓN. VUELVE AL MENÚ E INTENTA DE NUEVO.';
  $('continueOperationBtn').style.display='none';
  if(retry)retry.style.display='inline-block';
 }
}

function continueOperation(){
 if(state!=='loading'||!operationReady)return;
 operationReady=false;
 $('loadingScreen').classList.remove('on');
 $('continueOperationBtn').style.display='none';
 set_state('play');hud(true);playRespawnIntro(selectedMap,isNight()?'night':weather,()=>state);
 const wmsg=isNight()?'DISTRITO CERO · NOCHE · LINTERNA [L] / 🔦':selectedMap==='front'?'FRENTE DE CENIZA · SIN REFUERZOS · SUMINISTROS ESCASOS':weather==='rain'?'LLUEVE · VISIÓN ENEMIGA REDUCIDA':weather==='fog'?'NIEBLA · LOS ENEMIGOS VEN MENOS':weather==='sandstorm'?'TORMENTA · VISIÓN REDUCIDA':'6 BASES FORTIFICADAS · PISO MILITAR';
 msg(wmsg,'#ffb040');lastT=performance.now();ft.length=0;
}

function toMenu(){
 operationReady=false;
 $('loadingScreen').classList.remove('on');
 $('continueOperationBtn').style.display='none';
 const retry=$('retryLoadingBtn');if(retry)retry.style.display='none';
 set_state('menu');screen('menuScreen');stopOutpostRadio();
 $('extwrap').classList.remove('on');$('lowhp').style.opacity=0;const _b2=$('lowhpBlood'),_e2=$('lowhpEdge');if(_b2)_b2.style.opacity=0;if(_e2)_e2.style.opacity=0;if(isPainPlaying())stopPainLoop(300);
 $('outpostBanner').className='';set_currentOutpostShown(null);
 closeBigMap();
 refreshMenuStats()
}

loadMeta();
refreshMenuStats();
refreshMarket();
rollDailyMissions();


onTap($('startBtn'),()=>{if(state==='menu'){ensureAudio();$('menuScreen').classList.remove('on');$('operationSelectScreen').classList.add('on');SFX.ui()}});

onTap($('launchOperationBtn'),()=>{if(state==='menu'&&$('operationSelectScreen').classList.contains('on')){SFX.ui();$('operationSelectScreen').classList.remove('on');
 /* Frente de Ceniza: primero el informe de inteligencia (se puede saltar); luego la pantalla de carga */
 if(selectedMap==='front')playBriefing(()=>{if(state==='menu')start()});else start()}});

onTap($('backToMainBtn'),()=>{if(state==='menu'){$('operationSelectScreen').classList.remove('on');$('menuScreen').classList.add('on');SFX.ui()}});

const quitBtn=$('quitBtn');
if(quitBtn)onTap(quitBtn,()=>{try{window.close()}catch(e){}setTimeout(()=>{if(!window.closed)alert('El navegador no permite cerrar esta pestaña automáticamente. Puedes salir cerrando la pestaña o la ventana del juego.');},80)});

const mapMissionCard=$('mapMissionCard');


const MAP_ILLUSTRATIONS = {
  front: new URL('../assets/img/map-front.jpg',import.meta.url).href,
  district: new URL('../assets/img/map-district.jpg',import.meta.url).href
};



export function refreshSelectedMapCard(){
 const front=selectedMap==='front';
 $('frontMapToggle').textContent=front?'✓ FRENTE DE CENIZA SELECCIONADO · VOLVER A DISTRITO CERO':'⚑ CAMBIAR A FRENTE DE CENIZA';
 $('frontMapToggle').style.borderColor=front?'#d6b65e':'#3f4c3f';
 const nb=$('nightModeBtn');
 if(nb){nb.style.display=front?'none':'';nb.textContent=night?'☾ MODO NOCHE: SÍ':'☾ MODO NOCHE: NO';nb.classList.toggle('on',night)}
 $('mapMissionCard').classList.add('selected');
 const illusEl=$('mapIllustrationImg');
 if(illusEl){
   const targetSrc=front?MAP_ILLUSTRATIONS.front:MAP_ILLUSTRATIONS.district;
   if(!illusEl.src.includes('data:') || !illusEl.src.endsWith(targetSrc.slice(-20))){
     illusEl.style.opacity='0';
     setTimeout(()=>{
       illusEl.src=targetSrc;
       illusEl.alt=front?'Frente de Ceniza':'Distrito Cero';
       illusEl.style.opacity='1';
     },120);
   }
 }
 const codeEl=$('mapMissionCard').querySelector('.mapCode');
 if(codeEl) codeEl.textContent=front?'FRENTE DE CENIZA':'DISTRITO CERO';
 const coordsEl=$('mapMissionCard').querySelector('.mapCoords');
 if(coordsEl) coordsEl.textContent=front?'SECTOR BOSCOSO':'SECTOR URBANO';
 const intelTag=$('mapMissionCard').querySelector('.mapIntelTag');
 if(intelTag) intelTag.remove();
 const statusEl=$('mapMissionCard').querySelector('.mapStatus');
 if(statusEl) statusEl.textContent=front?'OPERACIÓN DE ALTO RIESGO':'OPERACIÓN DISPONIBLE';
 const h3El=$('mapMissionCard').querySelector('h3');
 if(h3El) h3El.textContent=front?'FRENTE DE CENIZA':'DISTRITO CERO';
 const descEl=$('mapMissionCard').querySelector('.mapDesc');
 if(descEl) descEl.textContent=front?'Desde un bosque denso hasta una línea de frente devastada. Cabañas de troncos, caminos de barro, cráteres y campamentos militares; sin asfalto, semáforos ni mobiliario urbano. La comida escasea y no existen refuerzos: cada soldado perdido es definitivo. Cruza la tierra de nadie y alcanza la baliza de extracción.':'Un distrito urbano convertido en zona militar. Calles abiertas, edificios abandonados y puestos fortificados controlados por unidades hostiles. Busca suministros, elimina las amenazas y alcanza la baliza de extracción al otro extremo de la ciudad.';
 const facts=$('mapMissionCard').querySelectorAll('.fact b');
 if(facts.length>=4){
   if(front){facts[0].textContent='6 CAMPAMENTOS';facts[1].textContent='GUARNICIONES FIJAS';facts[2].textContent='FRENTE DEVASTADO';facts[3].textContent='1 BALIZA'}else{facts[0].textContent='6 ZONAS';facts[1].textContent='VARIABLE';facts[2].textContent='URBANO';facts[3].textContent='1 BALIZA'}
 }
 const hintEl=$('menuControlsHint');
 if(hintEl) hintEl.textContent=front?'OPERACIÓN DE FRENTE // SIN REFUERZOS':'OPERACIÓN URBANA // ACCESO CLASIFICADO';
 const startSub=$('startBtnSub');
 if(startSub){ startSub.textContent='MISIONES'; }
}


onTap($('nightModeBtn'),()=>{set_night(!night);refreshSelectedMapCard();SFX.ui()});

onTap($('frontMapToggle'),()=>{set_selectedMap(selectedMap==='district'?'front':'district');refreshSelectedMapCard();SFX.ui()});

if(mapMissionCard){const selectMap=()=>{mapMissionCard.classList.add('selected');SFX.ui()};onTap(mapMissionCard,selectMap);mapMissionCard.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectMap()}})}

onTap($('continueOperationBtn'),continueOperation);
onTap($('retryLoadingBtn'),()=>toMenu());

onTap($('shopBtn'),()=>{if(state==='menu')openShop()});

onTap($('shopClose'),()=>closeShop());

onTap($('dailyBtn'),()=>{if(state==='menu')openDaily()});

onTap($('dailyClose'),()=>closeDaily());

onTap($('achBtn'),()=>{if(state==='menu')openAch()});

onTap($('achClose'),()=>closeAch());

onTap($('nightmareBtn'),()=>{
 if(!meta.nightmareUnlocked)return;
 meta.nightmareActive=!meta.nightmareActive;saveMeta();refreshMenuStats();SFX.ui();
 msg(meta.nightmareActive?'PESADILLA ACTIVADA':'MODO NORMAL',meta.nightmareActive?'#ff5a5a':'#7dff8f')
});

onTap($('retryBtn'),()=>toMenu());

onTap($('againBtn'),()=>toMenu());

document.querySelectorAll('.shopTabs button').forEach(b=>{onTap(b,()=>{set_shopTab(b.dataset.tab);renderShop(shopTab);SFX.ui()})});

onTap($('invClose'),()=>$('invPanel').classList.remove('on'));
onTap($('itemActionCancel'),()=>$('itemActionScreen').classList.remove('on'));

onTap($('lootClose'),()=>$('lootPanel').classList.remove('on'));


/* ===== NUEVO: bindings del mapa táctico ===== */
onTap($('mmHotspot'),()=>{if(state==='play'&&!paused())openBigMap()});

$('bigMapClose').addEventListener('click',e=>{e.preventDefault();closeBigMap();SFX.ui()});

$('bigMapClear').addEventListener('click',e=>{e.preventDefault();set_mapMarkers([]);drawBigMap();SFX.ui()});

initBigMapControls(); /* toque = marcar · arrastrar = mover · pellizco/rueda = zoom */

addEventListener('resize',()=>{if($('bigMapOverlay')&&$('bigMapOverlay').classList.contains('on')){setTimeout(()=>{resizeBigMapCanvas();drawBigMap()},80)}});

addEventListener('orientationchange',()=>{if($('bigMapOverlay')&&$('bigMapOverlay').classList.contains('on')){setTimeout(()=>{resizeBigMapCanvas();drawBigMap()},250)}});


document.addEventListener('visibilitychange',()=>{
 if(document.hidden){running=false;set_fireHeld(false);set_joyOn(false);set_joyId(null);set_lookId(null);joyBase.style.display='none';if(actx&&actx.state==='running')actx.suspend()}
 else{running=true;lastT=performance.now();ft.length=0;if(actx&&actx.state==='suspended')actx.resume()}
});

document.addEventListener('gesturestart',e=>e.preventDefault());

document.addEventListener('contextmenu',e=>e.preventDefault());
