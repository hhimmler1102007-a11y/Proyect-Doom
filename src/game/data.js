import { GUNNER, SOLDIER, cCO, cDOG, cH, cOF, cS, cSH, cSN, sCO, sDOG, sH, sOF, sSH, sSN } from './sprites.js';
import { meta, saveMeta, showAchievementPopup } from './state.js';
import { SFX } from './audio.js';
import { refreshMenuStats, renderDaily } from './shop.js';
import { msg } from './hud.js';
import { armorIco, weaponIco } from './armor-icons.js';

export const ITEMS={medkit:{name:'BOTIQUÍN',color:'#c8281e',sym:'✚',heal:40},bandage:{name:'VENDAJE',color:'#b89a6a',sym:'▤',heal:15},
  shells:{name:'CARTUCHOS CAL. 12',color:'#b66a1e',sym:'▮',ammo:'ammo12g',amount:8},
  bullets:{name:'5,56×45 mm OTAN',color:'#a8861e',sym:'▪',ammo:'ammo556',amount:30},
  ammo9:{name:'9×19 mm',color:'#c6a45a',sym:'▪',ammo:'ammo9',amount:30},
  ammo76239:{name:'7,62×39 mm',color:'#9d874d',sym:'▪',ammo:'ammo76239',amount:30},
  ammo792:{name:'7,92×57 mm Mauser',color:'#796a46',sym:'▪',ammo:'ammo792',amount:50},
  ammo76251:{name:'7,62×51 mm OTAN',color:'#827b65',sym:'▪',ammo:'ammo76251',amount:10},
  shotgun:{name:'BENELLI M4 · CAL. 12',color:'#5a5a64',sym:'⌐',weapon:1,minLevel:2},
  rifle:{name:'M4 · 5,56×45 mm',color:'#40464e',sym:weaponIco('rifle'),weapon:2,minLevel:3},
  ak47:{name:'AK-47 · 7,62×39 mm',color:'#594b34',sym:weaponIco('ak47'),weapon:3,minLevel:4},
  mg42:{name:'MG42 · 7,92×57 mm',color:'#46413b',sym:weaponIco('mg42'),weapon:4,minLevel:7},
  beretta:{name:'BERETTA 92FS · 9×19 mm',color:'#55585d',sym:weaponIco('beretta'),weapon:0},
  m24:{name:'M24 · 7,62×51 mm OTAN',color:'#5a5146',sym:'⌁',weapon:5,minLevel:6},
  rocketl:{name:'RPG-7 · LANZACOHETES',color:'#4a5a3c',sym:weaponIco('rocketl'),weapon:6,minLevel:8},
  rockets:{name:'COHETE PG-7V · 40 mm',color:'#8a2a1a',sym:'▲',ammo:'rockets',amount:1},
  water:{name:'AGUA',color:'#2a7ac8',sym:'💧',water:40},soda:{name:'SODA',color:'#b02a3a',sym:'🥤',water:22,food:6},burger:{name:'HAMBURGUESA',color:'#a8691e',sym:'🍔',food:45},
  fruit:{name:'FRUTA',color:'#4a9a2a',sym:'🍎',food:16,water:10},can:{name:'ENLATADO',color:'#6a6a5a',sym:'🥫',food:30},
  frag:{name:'GRANADA',color:'#4a5a3c',sym:'💣',throwable:true},
  smoke:{name:'HUMO',color:'#8a8a94',sym:'💨',throwable:true},
  molotov:{name:'MOLOTOV',color:'#b04a1a',sym:'🔥',throwable:true},
  briefcase:{name:'MALETÍN',color:'#8b5a2b',sym:'💼'},
 bronze_lion:{name:'LEÓN DE BRONCE',color:'#95633e',sym:'🦁',w:1,v:6,misc:true,metal:'BRONCE',weightLabel:'1 kg'},
 bronze_eagle:{name:'ÁGUILA DE BRONCE',color:'#a87548',sym:'🦅',w:2.5,v:15,misc:true,metal:'BRONCE',weightLabel:'2,5 kg'},
 bronze_bust:{name:'BUSTO DE BRONCE',color:'#7f5639',sym:'🏺',w:5,v:30,misc:true,metal:'BRONCE',weightLabel:'5 kg'},
 silver_watch:{name:'RELOJ DE BOLSILLO',color:'#b8c2ca',sym:'⌚',w:.1,v:181,misc:true,metal:'PLATA 925',weightLabel:'100 g'},
 silver_chalice:{name:'CÁLIZ DE PLATA',color:'#c6cbd0',sym:'🏆',w:.25,v:453,misc:true,metal:'PLATA 925',weightLabel:'250 g'},
 silver_teapot:{name:'TETERA DE PLATA',color:'#aeb8c0',sym:'🫖',w:.6,v:1088,misc:true,metal:'PLATA 925',weightLabel:'600 g'},
 gold_ring:{name:'ANILLO DE ORO',color:'#e2bb45',sym:'💍',w:.005,v:506,misc:true,metal:'ORO 18K',weightLabel:'5 g'},
 gold_watch:{name:'RELOJ DE ORO',color:'#d9ae34',sym:'⌚',w:.02,v:2025,misc:true,metal:'ORO 18K',weightLabel:'20 g'},
 gold_lion:{name:'LEÓN DE ORO',color:'#f0c342',sym:'🦁',w:.05,v:5063,misc:true,metal:'ORO 18K',weightLabel:'50 g'}};

export const FOODS=['water','soda','burger','fruit','can'];

export const LC=['','#2f6fd0','#2e9a3e','#c43030'],WID=['beretta','shotgun','rifle','ak47','mg42','m24','rocketl'],MAXW=60;

for(let l=1;l<=3;l++){
 ITEMS['helm'+l]={name:'CASCO '+['LIVIANO','AVANZADO','PESADO'][l-1]+' · TIER '+l,color:LC[l],sym:armorIco('helm'+l),slot:'helmet',lvl:l,red:[.3,.45,.6][l-1],dur:[20,35,55][l-1],minLevel:[1,3,6][l-1]};
 ITEMS['vest'+l]={name:'CHALECO '+['LIVIANO','AVANZADO','PESADO'][l-1]+' · TIER '+l,color:LC[l],sym:armorIco('vest'+l),slot:'vest',lvl:l,red:[.35,.5,.65][l-1],dur:[40,70,100][l-1],minLevel:[2,5,8][l-1]};
}

const WV={medkit:[1,30],bandage:[.1,3],shells:[.4,18],bullets:[.4,35],ammo9:[.35,25],ammo76239:[.45,35],ammo792:[.7,60],ammo76251:[.45,45],shotgun:[3.6,2000],rifle:[3.1,1200],ak47:[3.8,900],mg42:[11.6,12000],m24:[5.4,3500],beretta:[.95,700],rocketl:[6.3,5000],rockets:[2.2,800],water:[.5,2],soda:[.35,2],burger:[.3,6],fruit:[.2,1],can:[.4,3],helm1:[1.2,60],helm2:[1.6,180],helm3:[2.2,600],vest1:[3.5,120],vest2:[6,400],vest3:[9,1500],
 frag:[.7,180],smoke:[.6,120],molotov:[.7,100],briefcase:[2.5,3000]};

for(const k in WV){ITEMS[k].w=WV[k][0];ITEMS[k].v=WV[k][1]}

export const WEAPONS=[
  {name:'BERETTA 92FS',caliber:'9×19 mm',dmg:20,pellets:1,spread:.014,rate:.28,ammo:'ammo9',sfx:'pistol',magMax:15,reload:1.15},
  {name:'BENELLI M4',caliber:'CALIBRE 12',dmg:11,pellets:8,spread:.12,rate:.72,ammo:'ammo12g',sfx:'shotgun',magMax:6,reload:1.8},
  {name:'M4',caliber:'5,56×45 mm OTAN',dmg:29,pellets:1,spread:.018,rate:.115,ammo:'ammo556',sfx:'m4',magMax:30,reload:1.35},
  {name:'AK-47',caliber:'7,62×39 mm',dmg:32,pellets:1,spread:.026,rate:.14,ammo:'ammo76239',sfx:'ak',magMax:30,reload:1.5},
   {name:'MG42',caliber:'7,92×57 mm Mauser',dmg:25,pellets:1,spread:.055,rate:.075,ammo:'ammo792',sfx:'mg42',magMax:50,reload:3.2},
  {name:'M24',caliber:'7,62×51 mm OTAN',dmg:92,pellets:1,spread:.0025,rate:1.15,ammo:'ammo76251',sfx:'rifle',magMax:5,reload:2.4},
  {name:'RPG-7',caliber:'PG-7V · 40 mm HEAT',dmg:0,pellets:0,spread:0,rate:1.7,ammo:'rockets',sfx:'rocket',rocket:true,magMax:1,reload:2.8}
 ];


export const ETYPES={
 soldier:{hp:40,speed:1.8,dmg:20,stop:5.5,fr:SOLDIER,corpse:cS,h:.62,fov:Math.PI*.55,sight:20,name:'SOLDADO',color:'#f33',xp:10},
 heavy:{hp:70,speed:1.1,dmg:40,stop:4.2,fr:GUNNER,corpse:cH,h:.66,fov:Math.PI*.5,sight:18,name:'ARTILLERO',color:'#f60',xp:25},
 sniper:{hp:45,speed:.9,dmg:65,stop:13,fr:sSN,corpse:cSN,h:.60,fov:Math.PI*.4,sight:26,minDist:10,maxDist:22,laser:true,name:'FRANCOTIRADOR',color:'#f0f',xp:20},
 shotgunner:{hp:55,speed:2.0,dmg:8,pellets:8,stop:3,fr:sSH,corpse:cSH,h:.62,fov:Math.PI*.55,sight:16,maxDist:12,name:'ESCOPETERO',color:'#fa0',xp:20},
 officer:{hp:60,speed:1.5,dmg:25,stop:5,fr:sOF,corpse:cOF,h:.66,fov:Math.PI*.55,sight:20,shout:true,name:'SARGENTO',color:'#ff0',xp:40},
 dog:{hp:25,speed:3.2,dmg:18,stop:.9,fr:sDOG,corpse:cDOG,h:.35,fov:Math.PI*.7,sight:22,melee:true,zigzag:true,name:'PERRO',color:'#f88',xp:5},
 commander:{hp:300,speed:1.2,dmg:40,stop:5,fr:sCO,corpse:cCO,h:.72,fov:Math.PI*.6,sight:28,boss:true,reinforceCd:20,name:'CAPITÁN',color:'#fff',xp:200}};




// Equipo común: las armas conservan los valores de WEAPONS tanto para el jugador como para la IA.
// IDs: 1 escopeta, 2 M4, 4 MG42, 5 M24. El RPG-7 nunca se asigna a enemigos normales.
export const ENEMY_LOADOUTS={
 soldier:{weapon:2,helmet:'helm1',vest:'vest1',ammo:'bullets'},
 heavy:{weapon:4,helmet:'helm2',vest:'vest2',ammo:'ammo792'},
 sniper:{weapon:5,helmet:'helm1',vest:'vest1',ammo:'ammo76251'},
 shotgunner:{weapon:1,helmet:'helm2',vest:'vest2',ammo:'shells'},
 officer:{weapon:2,helmet:'helm2',vest:'vest2',ammo:'bullets'},
 commander:{weapon:2,helmet:'helm3',vest:'vest3',ammo:'bullets'}
};

export function initEnemyGear(e,type){
 const g=ENEMY_LOADOUTS[type];
 if(!g)return e;
 const w=WEAPONS[g.weapon];
 e.weaponIdx=g.weapon;
 e.mag=w.magMax;
 e.reserveAmmo=({soldier:60,heavy:100,sniper:15,shotgunner:18,officer:75,commander:90}[type]||30);
 e.reloadT=0;
 e.helmet={id:g.helmet,dur:ITEMS[g.helmet].dur};
 e.vest={id:g.vest,dur:ITEMS[g.vest].dur};
 e.ammoLootId=g.ammo;
 return e;
}


export const ACHIEVEMENTS=[
 {id:'first_blood',name:'Primera Sangre',desc:'Elimina a tu primer enemigo',icon:'🩸'},
 {id:'sniper_ace',name:'Francotirador',desc:'5 bajas a más de 20m',icon:'🎯'},
 {id:'berserker',name:'Berserker',desc:'10 bajas con cuerpo a cuerpo',icon:'👊'},
 {id:'ghost',name:'Fantasma',desc:'Extrae sin recibir daño',icon:'👻'},
 {id:'rich',name:'Magnate',desc:'Extrae con $5000 o más',icon:'💰'},
 {id:'speedrun',name:'Velocista',desc:'Extrae antes de los 4:00',icon:'⏱️'},
 {id:'demolisher',name:'Demoledor',desc:'3 bajas con 1 granada',icon:'💥'},
 {id:'surgeon',name:'Cirujano',desc:'10 headshots acumulados',icon:'🔪'},
 {id:'survivor',name:'Superviviente',desc:'Alcanza nivel 10',icon:'⭐'},
 {id:'commander_down',name:'Comandante Caído',desc:'Elimina al comandante',icon:'🎖️'},
 {id:'collector',name:'Coleccionista',desc:'Extrae con 12 items',icon:'📦'},
 {id:'veteran',name:'Veterano',desc:'Completa 10 partidas',icon:'🏅'},
];

const MISSION_TYPES=[
 {id:'kill3',desc:'Elimina 3 enemigos',target:3,reward:200,type:'kills'},
 {id:'kill6',desc:'Elimina 6 enemigos',target:6,reward:450,type:'kills'},
 {id:'outpost1',desc:'Toma 1 puesto de vigilancia',target:1,reward:600,type:'outposts'},
 {id:'outpost2',desc:'Toma 2 puestos de vigilancia',target:2,reward:1200,type:'outposts'},
 {id:'extract500',desc:'Extrae con $500+ en botín',target:500,reward:250,type:'extract_money'},
 {id:'extract1000',desc:'Extrae con $1000+ en botín',target:1000,reward:500,type:'extract_money'},
 {id:'headshot2',desc:'Consigue 2 headshots',target:2,reward:300,type:'headshots'},
 {id:'obj1',desc:'Completa 1 objetivo secundario',target:1,reward:400,type:'objectives'},
 {id:'ally1',desc:'Rescata a 1 aliado',target:1,reward:350,type:'allies'},
 {id:'nodeath',desc:'Extrae sin morir',target:1,reward:300,type:'no_death_win'},
 {id:'survive4',desc:'Sobrevive 4 minutos en partida',target:240,reward:400,type:'survive_time'},
 {id:'rifle_kill',desc:'Mata 2 enemigos con rifle',target:2,reward:350,type:'rifle_kills'},
];

function getTodayStr(){const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}

export function rollDailyMissions(){
 const today=getTodayStr();
 if(meta.dailyDate===today&&meta.dailyMissions&&meta.dailyMissions.length===3)return;
 meta.dailyDate=today;
 const pool=[...MISSION_TYPES].sort(()=>Math.random()-0.5);
 meta.dailyMissions=pool.slice(0,3).map(m=>({...m,progress:0,done:false,claimed:false}));
 saveMeta();
}

export function updateDailyProgress(type,amount){
 if(!meta.dailyMissions)return;
 for(const m of meta.dailyMissions){
  if(m.claimed||m.type!==type)continue;
  if(type==='extract_money'||type==='survive_time'){if(amount>m.progress)m.progress=Math.min(m.target,amount)}
  else if(type==='no_death_win')m.progress=1;
  else m.progress=Math.min(m.target,m.progress+amount);
  if(m.progress>=m.target&&!m.done){m.done=true;showAchievementPopup({name:'¡MISIÓN COMPLETADA!',desc:m.desc,icon:'📋'});SFX.win()}
 }
 saveMeta();
}

export function claimDailyMission(idx){
 const m=meta.dailyMissions[idx];
 if(!m||!m.done||m.claimed)return;
 m.claimed=true;meta.money+=m.reward;
 SFX.buy();saveMeta();renderDaily();refreshMenuStats();
 msg('RECOMPENSA: +$'+m.reward,'#7dff8f');
}

export function refreshMarket(){
 const today=getTodayStr();
 if(meta.marketDate===today&&meta.marketMult>0)return;
 meta.marketDate=today;meta.marketMult=0.75+Math.random()*0.75;saveMeta();
}

export function marketPrice(base){return Math.round(base*meta.marketMult)}
