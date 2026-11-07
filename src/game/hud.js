import { $, MH, MW, OUTPOSTS, SAFE_BOXES, safeCrack } from './core.js';
import { ALARMS, BEACON } from './outposts.js';
import { MAXW, WEAPONS } from './data.js';
import { EXT_AT, P, allies, corpses, enemies, fires, gt, lF, lO, lTh, lW, lWt, lastAm, lastBtnSwap, lastHp, lastObjHtml, lastW, mapMarkers, objectives, revealedOutposts, set_lF, set_lO, set_lTh, set_lW, set_lWt, set_lastAm, set_lastBtnSwap, set_lastHp, set_lastObjHtml, set_lastW, smokes } from './state.js';
import { cancelSafeCrack } from './operations.js';
import { mctx, mm, mmBase, updCompass } from './backdrop.js';
import { DEF_R, conquestOn, rebuildTerritoryCanvas, terrCanvas, terrDirty } from './conquest.js';
import { simplifyPath } from './pathfinding.js';
import { armorHud, weight } from './inventory.js';
import { SFX } from './audio.js';

export const EC={soldier:'#f33',heavy:'#f60',sniper:'#f0f',shotgunner:'#fa0',officer:'#ff0',dog:'#f88',commander:'#fff'};

export function minimap(){
 const MMS=mm.width,MM_VIEW=40,MMZ=MMS/MM_VIEW; /* se ven 40x40 casillas alrededor del jugador */
 mctx.setTransform(1,0,0,1,0,0);
 mctx.imageSmoothingEnabled=false;
 mctx.clearRect(0,0,MMS,MMS);
 mctx.setTransform(MMZ,0,0,MMZ,MMS/2-P.x*MMZ,MMS/2-P.y*MMZ);
 mctx.drawImage(mmBase,0,0,MW,MH,0,0,MW,MH);
 if(conquestOn){if(terrDirty)rebuildTerritoryCanvas();mctx.imageSmoothingEnabled=false;mctx.drawImage(terrCanvas,0,0);
  for(const o of OUTPOSTS)if(o.terr==='disputed'){mctx.strokeStyle='#ffd23a';mctx.lineWidth=.9;mctx.beginPath();mctx.arc(o.x,o.y,DEF_R,0,6.2832);mctx.stroke()}}
 for(const op of OUTPOSTS){
  let color,fillColor;
  if(op.taken){color='#7dff8f';fillColor='rgba(125,255,143,.35)'}
  else if(op.alertState==='ALARM'){color='#ff2020';fillColor='rgba(255,30,30,.45)'}
  else if(op.alertState==='ALERT'){color='#ffd24a';fillColor='rgba(255,210,74,.35)'}
  else if(op.tier===3){color='#ff3a3a';fillColor='rgba(255,60,60,.35)'}
  else if(op.tier===2){color='#ffb040';fillColor='rgba(255,150,60,.30)'}
  else{color='#9fd8ff';fillColor='rgba(120,180,255,.28)'}
  if(op.mask){
    mctx.fillStyle=fillColor;
    for(let my=0;my<op.maskH;my++)for(let mx=0;mx<op.maskW;mx++){
      if(op.mask[my*op.maskW+mx])mctx.fillRect(op.maskX+mx,op.maskY+my,1,1);
    }
    mctx.fillStyle=color;
    for(const cell of op.perimeter){
      mctx.fillRect(op.maskX+cell.mx,op.maskY+cell.my,1,1);
    }
    if(revealedOutposts.has(op.id)&&!op.taken){
      mctx.strokeStyle='#9fd8ff';mctx.lineWidth=1;
      mctx.setLineDash([2,2]);
      mctx.strokeRect(op.maskX-0.5,op.maskY-0.5,op.maskW+1,op.maskH+1);
      mctx.setLineDash([]);
    }
  }
 }
 for(const e of enemies)if(e.alive&&(e.x-P.x)**2+(e.y-P.y)**2<400){
  mctx.fillStyle=EC[e.type]||'#f33';const sz=e.boss?3:2;mctx.fillRect(e.x-sz/2,e.y-sz/2,sz,sz);
  if(e.objective){mctx.strokeStyle='#ffd24a';mctx.lineWidth=1;mctx.strokeRect(e.x-2.5,e.y-2.5,5,5)}
 }
 for(const a of allies){if(!a.alive)continue;
  if((a.x-P.x)**2+(a.y-P.y)**2<400){mctx.fillStyle=a.following?'#5bd8ff':'#9cf';mctx.fillRect(a.x-1.5,a.y-1.5,3,3);
   if(!a.following){mctx.strokeStyle='#9fd8ff';mctx.lineWidth=1;mctx.strokeRect(a.x-2.5,a.y-2.5,5,5)}}}
 for(const c of corpses){if(c.perm)continue;
  if(c.cache){mctx.fillStyle='#ffd24a';mctx.fillRect(c.x-1.5,c.y-1.5,3,3)}
  else{mctx.fillStyle='#fd4';mctx.fillRect(c.x,c.y,1,1)}}
 for(const e of enemies)if(e.alive&&e.reinf&&!e.arrived){const pz=1+0.3*Math.sin(gt*6+e.x);mctx.fillStyle='#000';mctx.fillRect(e.x-1.9*pz,e.y-1.9*pz,3.8*pz,3.8*pz);mctx.fillStyle='#ff8a2a';mctx.fillRect(e.x-1.3*pz,e.y-1.3*pz,2.6*pz,2.6*pz)}
 for(const al of ALARMS)if(al.alive&&(al.x-P.x)**2+(al.y-P.y)**2<900){mctx.fillStyle=(al.activated&&((gt*4)|0)%2)?'#fff':'#ff3a3a';mctx.fillRect(al.x-1,al.y-1,2,2)}
 for(const box of SAFE_BOXES)if(!box.opened){mctx.fillStyle='#d6a343';mctx.fillRect(box.x-1.2,box.y-1.2,2.4,2.4)}
 for(const s of smokes){mctx.fillStyle='rgba(200,200,200,.6)';mctx.beginPath();mctx.arc(s.x,s.y,s.radius,0,6.28);mctx.fill()}
 for(const f of fires){mctx.fillStyle='rgba(255,120,30,.6)';mctx.beginPath();mctx.arc(f.x,f.y,f.radius,0,6.28);mctx.fill()}
 // NUEVO: rutas y marcas del jugador en el minimapa
 mctx.lineWidth=0.9;
 for(const m of mapMarkers){
  if(!m.path||m.path.length<2)continue;
  const pts=simplifyPath(m.path);
  mctx.strokeStyle='rgba(255,210,74,0.9)';
  mctx.beginPath();
  mctx.moveTo(pts[0][0]+0.5,pts[0][1]+0.5);
  for(let i=1;i<pts.length;i++)mctx.lineTo(pts[i][0]+0.5,pts[i][1]+0.5);
  mctx.stroke();
 }
 for(const m of mapMarkers){
  const pulse=1+0.35*Math.sin(gt*5+m.x*0.7+m.y);
  mctx.fillStyle='#000';mctx.fillRect(m.x-1.8*pulse,m.y-1.8*pulse,3.6*pulse,3.6*pulse);
  mctx.fillStyle='#ffd24a';mctx.fillRect(m.x-1.2*pulse,m.y-1.2*pulse,2.4*pulse,2.4*pulse);
 }
 mctx.fillStyle='#4f8';mctx.fillRect(BEACON.x-1.5,BEACON.y-1.5,3,3);
 mctx.fillStyle='#fff';mctx.fillRect(P.x-1.5,P.y-1.5,3,3);
 mctx.strokeStyle='#fff';mctx.beginPath();mctx.moveTo(P.x,P.y);mctx.lineTo(P.x+Math.cos(P.a)*5,P.y+Math.sin(P.a)*5);mctx.stroke();
 mctx.setTransform(1,0,0,1,0,0);
}

export function hud(f){
 const hp=Math.ceil(P.hp);if(f||hp!==lastHp){$('hpv').textContent=hp;$('hpv').className='val'+(hp<=30?' low':'');$('hpfill').style.width=hp+'%';set_lastHp(hp)}
 const w=WEAPONS[P.weapon],wi=P.weapon;
 let amText,amLow=false;
 if(w.ammo){amText=P.mag[wi]+' / '+P[w.ammo];amLow=P.mag[wi]<=Math.max(1,Math.floor(w.magMax*0.25))}
 else amText='∞';
 const rocketReady=w.rocket===true&&P.mag[wi]>0;
 if(f||amText!==lastAm){
   $('amv').textContent=amText;
   $('amv').className='val'+(amLow?' low':'')+(rocketReady?' rocket-ready':'');
   set_lastAm(amText);
 }
 if(f||P.weapon!==lastW){$('wnv').textContent=w.name;set_lastW(P.weapon)}
 const rb=$('reloadBar'),rl=$('reloadLbl');
 if(P.reloading>0){rb.classList.add('on');rl.classList.add('on');$('reloadFill').style.width=Math.round((1-P.reloading/P.reloadTotal)*100)+'%'}
 else{if(rb.classList.contains('on')){rb.classList.remove('on');rl.classList.remove('on')}}
 $('caliberLbl').textContent=w.caliber||'';const sw=$('btnSwap');const wantReload=w.ammo&&P.mag[wi]<=0&&P[w.ammo]>0;const swTxt=wantReload?'RECARGAR':'ARMA';
 if(swTxt!==lastBtnSwap){sw.textContent=swTxt;set_lastBtnSwap(swTxt)}
 const fragN=P.throwables.frag||0,smkN=P.throwables.smoke||0,molN=P.throwables.molotov||0;
 const thTxt='💣×'+fragN+' · 💨×'+smkN+' · 🔥×'+molN;
 if(f||thTxt!==lTh){$('thl').textContent=thTxt;set_lTh(thTxt)}
 const btnT=$('btnThrow');
 const cT=P.currentThrow||'frag';const cN=P.throwables[cT]||0;
 const icon=cT==='frag'?'💣':cT==='smoke'?'💨':'🔥';
 const bTxt=icon+(cN>0?'×'+cN:'');
 if(btnT.textContent!==bTxt){btnT.textContent=bTxt;btnT.classList.toggle('empty',cN===0)}
 const fd=Math.ceil(P.food),wt=Math.ceil(P.water);
 if(f||fd!==lF||wt!==lW){$('foodfill').style.width=fd+'%';$('waterfill').style.width=wt+'%';$('fb').className=fd<=25?'nb low':'nb';$('wb').className=wt<=25?'nb low':'nb';set_lF(fd);set_lW(wt)}
 const rem=Math.max(0,Math.ceil(EXT_AT-gt));
 if(f||rem!==lO){$('objective').textContent=rem?'EXTRACCIÓN EN '+((rem/60)|0)+':'+('0'+rem%60).slice(-2):'EXTRACCIÓN ACTIVA · BALIZA VERDE ↘';set_lO(rem)}
 const wv=Math.round(weight()*10);if(f||wv!==lWt){$('wtl').textContent=(wv/10)+'/'+MAXW+' KG';$('wtl').style.color=wv>MAXW*9?'#ff6a5a':'';set_lWt(wv)}
 if(f)armorHud();
 updCompass();
 const el=$('objList');
 if(el){
  let html='<div class="hdr">OBJETIVOS</div>';
  if(objectives.length===0)html+='<div class="obj">—</div>';
  for(const o of objectives)html+='<div class="obj'+(o.done?' done':'')+'">'+(o.done?'✓ ':'○ ')+o.label+'</div>';
  if(html!==lastObjHtml){el.innerHTML=html;set_lastObjHtml(html)}
 }}

let mt=null;
export function msg(t,c){const m=$('msg');m.textContent=t;m.style.color=c||'#ffe080';m.classList.add('show');clearTimeout(mt);mt=setTimeout(()=>m.classList.remove('show'),1100)}

export function screen(id){
 if(id&&id!=='gameScreen'&&safeCrack){cancelSafeCrack();$('safeCrackUI').style.display='none'}
 document.querySelectorAll('.overlay').forEach(o=>o.classList.remove('on'));
 const db=$('deathBlack'); if(db) db.classList.remove('on');
 if(id){
  const el=$(id);
  if(el){
   el.classList.add('on');
   // reset opacity for normal screens (death handles its own)
   if(id!=='deadScreen') el.style.opacity='';
  }
 }
}

/** Cinematic death: fade to black → reveal death screen + braaam */
export function showDeathScreen(){
 const black = $('deathBlack');
 const dead = $('deadScreen');
 if(!dead){ screen('deadScreen'); SFX.dead(); return; }

 // Reset state
 if(black){ black.classList.remove('on'); void black.offsetWidth; }
 dead.classList.remove('on');
 dead.style.opacity = '0';

 // 1) Fade to black
 if(black) black.classList.add('on');

 // 2) After black is up, show death screen + play sound, then fade it in
 setTimeout(()=>{
  // Put death screen on (still opacity 0)
  document.querySelectorAll('.overlay').forEach(o=>o.classList.remove('on'));
  dead.classList.add('on');
  dead.style.opacity = '0';

  // Play the dramatic braaam once
  SFX.dead();

  // Force reflow then fade in
  void dead.offsetWidth;
  requestAnimationFrame(()=>{
   dead.style.opacity = '1';
   // Start fading the black out slightly after so the image reveals underneath
   setTimeout(()=>{ if(black) black.classList.remove('on'); }, 180);
  });
 }, 720);
}
