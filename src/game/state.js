import { C } from './core.js';
import { buildWallShades, gSh, set_FOG, set_NIGHT, set_gSh, set_gShCeil, shades, tAsph, tBlackDirt, tCeil, tDirt, tGrass, tMilFloor, tSide } from './textures.js';
import { ALLSPR, bakedKey, set_bakedKey } from './sprites.js';
import { ACHIEVEMENTS } from './data.js';
import { SFX } from './audio.js';
import { RH, RW, buildSky, skyMapKey } from './backdrop.js';
import { msg } from './hud.js';


export let P,enemies,corpses,decos,projs,parts,leaves=[],pickups,rockets=[],throwables=[],smokes=[],fires=[],noises=[],eGrenades=[],rain=[],state='menu',kills=0,total=0,ext=0,gt=0,fireHeld=false,nearC=null,lastHp=-1,lastAm=-1,lastW=-1,lF=-1,lW=-1,lO=-1,lWt=-1,lTh='',lastBtnSwap='';

export let hitMarkers=[],dmgNumbers=[],dmgDirs=[],decals=[],visibleEnemies=[];

export let objectives=[],allies=[],noDamageTimer=0,milBoxesLooted=0,nearAlly=null,lastObjHtml='',nearCache=null;

export let weather='clear',dayPhase=0,shopTab='weapons',runStats={},lastEco={gross:0,tax:0,net:0},outpostsTaken=0,currentOutpostShown=null;

export let selectedMap='district';

/* ===== MODO NOCHE (solo Distrito Cero) =====
   Se activa desde el menú de selección de mapa; la preferencia se guarda en el navegador. */
export let night=false;
try{night=localStorage.getItem('xd_night')==='1'}catch(e){}
export function set_night(v){night=!!v;try{localStorage.setItem('xd_night',night?'1':'0')}catch(e){}return night}
export const isNight=()=>night&&selectedMap==='district';
export const NIGHT_MUL=[.34,.40,.64];

export let revealedOutposts=new Set();


/* ===== NUEVO: SISTEMA DE MARCAS Y MAPA AMPLIADO ===== */
export let mapMarkers=[];

export let bigMapTransform=null;

export let markerPathT=0;


const DEFAULT_META={
 money:0,xp:0,level:1,stash:new Array(12).fill(null),safeStash:new Array(2).fill(null),
 insuranceActive:false,marketMult:1.0,marketDate:'',dailyMissions:[],dailyDate:'',
 stats:{runs:0,wins:0,kills:0,bestTime:0,bestLoot:0,totalEarned:0,kills_soldier:0,kills_heavy:0,kills_sniper:0,kills_shotgunner:0,kills_officer:0,kills_dog:0,kills_commander:0,objectivesDone:0,alliesRescued:0,totalTaxPaid:0,totalLostOnDeath:0,outpostsTaken:0},
 achievements:{},achievementProgress:{longKills:0,meleeKills:0,headshots:0},
 nightmareUnlocked:false,nightmareActive:false
};

export let meta=JSON.parse(JSON.stringify(DEFAULT_META));

export function loadMeta(){
 try{const s=localStorage.getItem('exd_meta');
  if(s){const m=JSON.parse(s);
   if(m&&typeof m==='object'){Object.assign(meta,m);
    if(!Array.isArray(meta.stash)||meta.stash.length!==12)meta.stash=new Array(12).fill(null);
    if(!Array.isArray(meta.safeStash)||meta.safeStash.length!==2)meta.safeStash=new Array(2).fill(null);
    if(typeof meta.insuranceActive!=='boolean')meta.insuranceActive=false;
    if(typeof meta.marketMult!=='number'||meta.marketMult<=0)meta.marketMult=1.0;
    if(typeof meta.marketDate!=='string')meta.marketDate='';
    if(!Array.isArray(meta.dailyMissions))meta.dailyMissions=[];
    if(typeof meta.dailyDate!=='string')meta.dailyDate='';
    if(!meta.stats)meta.stats={...DEFAULT_META.stats};
    else meta.stats={...DEFAULT_META.stats,...meta.stats};
    if(!meta.achievements)meta.achievements={};
    if(!meta.achievementProgress)meta.achievementProgress={longKills:0,meleeKills:0,headshots:0};
    else meta.achievementProgress={longKills:0,meleeKills:0,headshots:0,...meta.achievementProgress};
    if(typeof meta.nightmareUnlocked!=='boolean')meta.nightmareUnlocked=false;
    if(typeof meta.nightmareActive!=='boolean')meta.nightmareActive=false}
  }}catch(e){}
}

export function saveMeta(){try{localStorage.setItem('exd_meta',JSON.stringify(meta))}catch(e){}}

function xpForLevel(l){return Math.round(100*Math.pow(l,1.6))}

export function xpNeeded(){return xpForLevel(meta.level)}

export function addXp(amount){
 meta.xp+=amount;let leveled=false;
 while(meta.xp>=xpNeeded()){meta.xp-=xpNeeded();meta.level++;meta.money+=500;leveled=true}
 if(leveled){msg('¡NIVEL '+meta.level+'! +$500','#ffd24a');SFX.win()}
 if(meta.level>=10)unlockAchievement('survivor');
 saveMeta();
}

export function unlockAchievement(id){
 if(meta.achievements[id])return;
 const ach=ACHIEVEMENTS.find(a=>a.id===id);
 if(!ach)return;
 meta.achievements[id]=Date.now();
 saveMeta();showAchievementPopup(ach);SFX.win();
}

export function showAchievementPopup(ach,customClass){
 const popup=document.createElement('div');
 popup.className='achievement-popup'+(customClass?' '+customClass:'');
 popup.innerHTML='<div class="ic">'+ach.icon+'</div>'+
  '<div class="info"><div class="t1">'+(customClass==='outpost'?'PUESTO TOMADO':'DESBLOQUEADO')+'</div>'+
  '<div class="t2">'+ach.name+'</div>'+
  '<div class="t3">'+ach.desc+'</div></div>';
 document.body.appendChild(popup);
 setTimeout(()=>popup.classList.add('show'),60);
 setTimeout(()=>{popup.classList.remove('show');setTimeout(()=>popup.remove(),600)},4200);
}

export const EXT_AT=240;


function updateFogFromPhase(){
 let base=[196,212,230];
 if(isNight()){
  /* noche: horizonte azul muy oscuro; la niebla y la tormenta lo aclaran un poco */
  base=[9,13,30];
  if(weather==='rain')base=[8,12,26];
  else if(weather==='fog')base=[26,32,48];
  else if(weather==='sandstorm')base=[34,26,20];
  set_FOG(base);return}
 if(weather==='rain')base=[base[0]*.7,base[1]*.72,base[2]*.8];
 else if(weather==='fog')base=[base[0]*.9+20,base[1]*.9+20,base[2]*.9+20];
 else if(weather==='sandstorm')base=[base[0]*1.05+30,base[1]*.85+15,base[2]*.55];
 set_FOG(base.map(v=>Math.max(0,Math.min(255,v))));
}

export function applyAtmosphere(){
 set_NIGHT(isNight()?NIGHT_MUL:null);
 updateFogFromPhase();
 const atmoKey=weather+(isNight()?'|night':'');
 if(atmoKey!==bakedKey||skyMapKey!==selectedMap){
  set_bakedKey(atmoKey);
  set_gSh([shades(tAsph),shades(tSide),shades(tGrass),shades(tDirt),shades(tAsph),shades(tAsph),shades(selectedMap==='front'?tBlackDirt:tMilFloor)]);
  gSh[6]=shades(selectedMap==='front'?tBlackDirt:tMilFloor);
  set_gShCeil(shades(tCeil));buildWallShades();
  for(const q of ALLSPR){q.sh=shades(q.data,1,0,true);q.red=null}
  buildSky();
 }
}

export function currentTint(){
 if(isNight()||dayPhase<.35)return null;
 const t=(dayPhase-.35)/.65;return'rgba(255,176,96,'+(t*0.16).toFixed(3)+')';
}

export function updWeather(dt){
 if(weather==='rain'){for(let i=rain.length-1;i>=0;i--){const r=rain[i];r.y+=r.vy*dt;r.x+=r.vx*dt;if(r.y>RH+10||r.x<-10||r.x>RW+10)rain.splice(i,1)}
  while(rain.length<120)rain.push({x:Math.random()*RW,y:Math.random()*RH,vy:400+Math.random()*200,vx:-30-Math.random()*40})}
 if(weather==='sandstorm'&&Math.random()<.5)parts.push({x:P.x+(Math.random()-.5)*30,y:P.y+(Math.random()-.5)*30,vx:-8,vy:0,life:1,col:C(200,160,90)});
}

/* setters para variables reasignadas desde otros módulos */
export function set_P(v){return P=v}
export function set_enemies(v){return enemies=v}
export function set_corpses(v){return corpses=v}
export function set_decos(v){return decos=v}
export function set_projs(v){return projs=v}
export function set_parts(v){return parts=v}
export function set_leaves(v){return leaves=v}
export function set_pickups(v){return pickups=v}
export function set_rockets(v){return rockets=v}
export function set_throwables(v){return throwables=v}
export function set_smokes(v){return smokes=v}
export function set_fires(v){return fires=v}
export function set_noises(v){return noises=v}
export function set_eGrenades(v){return eGrenades=v}
export function set_rain(v){return rain=v}
export function set_state(v){return state=v}
export function set_kills(v){return kills=v}
export function set_total(v){return total=v}
export function set_ext(v){return ext=v}
export function set_gt(v){return gt=v}
export function set_fireHeld(v){return fireHeld=v}
export function set_nearC(v){return nearC=v}
export function set_lastHp(v){return lastHp=v}
export function set_lastAm(v){return lastAm=v}
export function set_lastW(v){return lastW=v}
export function set_lF(v){return lF=v}
export function set_lW(v){return lW=v}
export function set_lO(v){return lO=v}
export function set_lWt(v){return lWt=v}
export function set_lTh(v){return lTh=v}
export function set_lastBtnSwap(v){return lastBtnSwap=v}
export function set_hitMarkers(v){return hitMarkers=v}
export function set_dmgNumbers(v){return dmgNumbers=v}
export function set_dmgDirs(v){return dmgDirs=v}
export function set_decals(v){return decals=v}
export function set_visibleEnemies(v){return visibleEnemies=v}
export function set_objectives(v){return objectives=v}
export function set_allies(v){return allies=v}
export function set_noDamageTimer(v){return noDamageTimer=v}
export function set_milBoxesLooted(v){return milBoxesLooted=v}
export function set_nearAlly(v){return nearAlly=v}
export function set_lastObjHtml(v){return lastObjHtml=v}
export function set_nearCache(v){return nearCache=v}
export function set_weather(v){return weather=v}
export function set_dayPhase(v){return dayPhase=v}
export function set_shopTab(v){return shopTab=v}
export function set_runStats(v){return runStats=v}
export function set_lastEco(v){return lastEco=v}
export function set_outpostsTaken(v){return outpostsTaken=v}
export function set_currentOutpostShown(v){return currentOutpostShown=v}
export function set_selectedMap(v){return selectedMap=v}
export function set_revealedOutposts(v){return revealedOutposts=v}
export function set_mapMarkers(v){return mapMarkers=v}
export function set_bigMapTransform(v){return bigMapTransform=v}
export function set_markerPathT(v){return markerPathT=v}
