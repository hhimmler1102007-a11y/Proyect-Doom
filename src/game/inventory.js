import { $, RESALE_RATE, SAFE_BOXES, nearSafe, set_SAFE_BOXES, set_nearSafe } from './core.js';
import { sCacheOpen } from './sprites.js';
import { ITEMS, LC, MAXW, WEAPONS, WID, updateDailyProgress } from './data.js';
import { P, allies, corpses, meta, nearAlly, nearC, objectives, saveMeta, set_fireHeld, set_nearC, state } from './state.js';
import { beginSafeCrack } from './operations.js';
import { SFX } from './audio.js';
import { onHold, onTap, paused } from './input.js';
import { hud, msg } from './hud.js';
import { weaponIco } from './armor-icons.js';

function isWeaponEquipped(id){const d=ITEMS[id];return d&&d.weapon!==undefined&&(P.weaponSlots||[]).includes(d.weapon)}

function hasW(id){const d=ITEMS[id];if(d.weapon!==undefined)return isWeaponEquipped(id)||P.inventory.some(i=>i&&i.id===id);if(d.slot)return P.eq[d.slot]===id||(P.eq[d.slot]&&P.eq[d.slot].id===id)||P.inventory.some(i=>i&&i.id===id);return false}

function sum(k){let t=0;for(const it of P.inventory)if(it)t+=ITEMS[it.id][k]*it.count;for(const q in P.eq)if(P.eq[q])t+=ITEMS[P.eq[q].id][k];for(const wi of (P.weaponSlots||[]))if(wi>=0)t+=ITEMS[WID[wi]][k];
 if(P&&P.throwables)for(const t2 in P.throwables)t+=ITEMS[t2][k]*P.throwables[t2];return t}

export const weight=()=>sum('w');

export function armorRoll(){const r=Math.random();return(Math.random()<.5?'helm':'vest')+(r<.62?1:r<.93?2:3)}

export function armor(d){const head=Math.random()<.3,q=head?'helmet':'vest',e=P.eq[q];if(head)d*=1.5;if(!e)return d;const m=ITEMS[e.id],ab=Math.min(e.dur,d*m.red);e.dur-=ab;if(e.dur<=.01){P.eq[q]=null;msg((head?'CASCO':'CHALECO')+' DESTRUIDO','#ff9a5a')}return d-ab}

export function armorHud(){for(const q of['helmet','vest']){const e=P.eq[q],el=$(q==='helmet'?'hb':'vb');if(!e){el.style.display='none';continue}const d=ITEMS[e.id],b=el.querySelector('.nbar div'),ic=el.querySelector('i');if(ic&&ic.dataset.id!==e.id){ic.dataset.id=e.id;ic.className='armor-ico ai-'+e.id}el.style.display='flex';b.style.width=Math.round(e.dur/d.dur*100)+'%';b.style.background=LC[d.lvl]}}

function unequip(q){const e=P.eq[q];if(!e)return;const i=P.inventory.findIndex(x=>!x);if(i<0){msg('INVENTARIO LLENO','#ff6a5a');return}P.inventory[i]={id:e.id,count:1,dur:e.dur};P.eq[q]=null;SFX.swap();hud(true);renderInv()}

function renderEq(){const el=$('eqRow');el.innerHTML='';for(const q of['helmet','vest']){const e=P.eq[q],d=document.createElement('div');d.className='slot';
 if(e){const m=ITEMS[e.id];d.style.borderColor=LC[m.lvl];d.innerHTML='<span>'+m.sym+' '+m.name+'</span><span>'+Math.ceil(e.dur)+'/'+m.dur+' · TAP=QUITAR</span>';onTap(d,()=>unequip(q))}
 else{d.classList.add('emptySlot');d.textContent=q==='helmet'?'SIN CASCO':'SIN CHALECO'}el.appendChild(d)}}

export function lootReport(){
 let rows='';const row=(id,n)=>{const d=ITEMS[id];rows+='<span>'+d.name+(n>1?' ×'+n:'')+'</span><span>$'+Math.round(d.v*n)+'</span>'};
 for(const it of P.inventory)if(it)row(it.id,it.count);for(const q in P.eq)if(P.eq[q])row(P.eq[q].id,1);for(const wi of (P.weaponSlots||[]))if(wi>=0)row(WID[wi],1);
 for(const t in P.throwables)if(P.throwables[t]>0)row(t,P.throwables[t]);
 let objLine='';
 if(objectives.length){objLine+='OBJETIVOS: ';
  for(const o of objectives)objLine+='<span style="color:'+(o.done?'#7dff8f':'#888')+'">'+(o.done?'✓ ':'○ ')+o.label.split(' ').slice(0,3).join(' ')+'</span>  ';
  objLine+='<br>'}
 let allyLine='';
 for(const a of allies)allyLine+='ALIADO: <span style="color:'+(a.alive&&a.following?'#7dff8f':'#888')+'">'+(a.alive&&a.following?'✓ RESCATADO':'✗')+'</span>  ';
 return'<div class="ll">'+(rows||'<span>(sin botín)</span><span>$0</span>')+'</div>'+objLine+allyLine+'<br>'}

export function addInv(id,n,q){const ok=addInv0(id,n,q);
 if(ok&&id==='briefcase'){const obj=objectives.find(o=>o.id==='briefcase');
  if(obj&&!obj.done){obj.done=true;msg('¡MALETÍN RECUPERADO!','#7dff8f');SFX.win();meta.stats.objectivesDone++;updateDailyProgress('objectives',1)}}
 return ok}

function addInv0(id,n,q){
 const d=ITEMS[id];
 if(d.throwable){const cur=P.throwables[id]||0;
  if(cur>=8){if(!q)msg('MÁX 8 '+d.name,'#ff9a5a');return false}
  if(weight()+d.w*n>MAXW){if(!q)msg('DEMASIADO PESO','#ff9a5a');return false}
  P.throwables[id]=Math.min(8,cur+n);return true}
 const bad=(d.slot&&hasW(id))?'YA TIENES ESTE EQUIPO':weight()+d.w*n>MAXW?'DEMASIADO PESO (MÁX '+MAXW+' KG)':null;
 if(bad){if(!q)msg(bad,'#ff9a5a');return false}
 if(d.weapon!==undefined){const wi=d.weapon;P.weapons[wi]=true;const slots=P.weaponSlots||(P.weaponSlots=[0,-1]);if(!slots.includes(wi)){const free=slots.indexOf(-1);if(free>=0){slots[free]=wi;P.weapon=wi;msg('ARMA EQUIPADA: '+d.name,'#bcd8ff');return true}}}
 for(const it of P.inventory)if(it&&it.id===id){it.count+=n;return true}
 for(let i=0;i<12;i++)if(!P.inventory[i]){P.inventory[i]={id,count:n,dur:d.slot?d.dur:undefined};return true}
 if(!q)msg('INVENTARIO LLENO','#ff6a5a');return false}

function useItem(i){const it=P.inventory[i];if(!it)return;const d=ITEMS[it.id];if(d.weapon!==undefined){openItemActions(i);return}
 if(d.heal){if(P.hp>=P.maxHp){msg('VIDA AL MÁXIMO','#ffb040');return}P.hp=Math.min(P.maxHp,P.hp+d.heal);msg('+'+d.heal+' VIDA','#7dff8f')}
 else if(d.food||d.water){if((!d.food||P.food>=100)&&(!d.water||P.water>=100)){msg('YA ESTÁS LLENO','#ffb040');return}P.food=Math.min(100,P.food+(d.food||0));P.water=Math.min(100,P.water+(d.water||0));msg(d.food?'+ COMIDA':'+ AGUA','#7dd8ff')}
 else if(d.slot){const old=P.eq[d.slot];P.eq[d.slot]={id:it.id,dur:it.dur!==undefined?it.dur:d.dur};P.inventory[i]=old?{id:old.id,count:1,dur:old.dur}:null;msg('EQUIPADO: '+d.name,'#9fd8ff');SFX.swap();hud(true);renderInv();return}
 else if(d.ammo){P[d.ammo]+=d.amount;msg('+'+d.amount+' MUNICIÓN','#ffd24a')}
 else if(d.weapon!==undefined){if(!P.weapons[d.weapon]){P.weapons[d.weapon]=true;P.weapon=d.weapon;msg('ARMA: '+WEAPONS[d.weapon].name,'#bcd8ff')}
   else{const w=WEAPONS[d.weapon],n=w.magMax===50?50:w.magMax;P[w.ammo]=(P[w.ammo]||0)+n;msg('MUNICIÓN '+w.caliber+' +'+n,'#ffd24a')}}
 else if(it.id==='briefcase'){msg('MALETÍN: SE VENDERÁ AL EXTRAER','#9fd8ff');return}
 SFX.pickup();if(--it.count<=0)P.inventory[i]=null;hud(true);renderInv()}

function toSafe(i){
 const it=P.inventory[i];if(!it)return;
 const freeIdx=meta.safeStash.findIndex(x=>!x);
 if(freeIdx<0){msg('CONTENEDOR SEGURO LLENO','#ff6a5a');return}
 meta.safeStash[freeIdx]={...it,count:1};
 if(it.count>1)it.count--;else P.inventory[i]=null;
 msg('ASEGURADO: '+ITEMS[it.id].name,'#7dff8f');SFX.ui();saveMeta();hud(true);renderInv()
}

function fromSafe(i){
 const it=meta.safeStash[i];if(!it)return;
 const freeIdx=P.inventory.findIndex(x=>!x);
 if(freeIdx<0){msg('INVENTARIO LLENO','#ff6a5a');return}
 P.inventory[freeIdx]={...it};meta.safeStash[i]=null;
 SFX.ui();saveMeta();hud(true);renderInv()
}

function grid(el,arr,fn,dropFn){el.innerHTML='';for(let i=0;i<12;i++){const it=arr[i],s=document.createElement('div');s.className='slot';
 if(it){const d=ITEMS[it.id];if(!d){s.className+=' emptySlot';s.textContent='OBJETO DESCONOCIDO';el.appendChild(s);continue;}s.style.background=d.color||'#343840';
  const count=Number(it.count)||1; s.innerHTML='<span class="nm">'+d.name+'</span><span class="sym">'+(d.sym||'▪')+'</span><span class="wt">'+(d.weightLabel||(((d.w||0)*count).toFixed(1)+' kg'))+'<br>$'+Math.round((d.v||0)*count)+'</span>'+(count>1?'<span class="cnt">'+count+'</span>':'');
  if(dropFn)onHold(s,()=>fn(i),()=>dropFn(i));
  else onTap(s,()=>fn(i))
 } else s.className+=' emptySlot';el.appendChild(s)}}

function renderSafe(){const el=$('safeRow');el.innerHTML='';for(let i=0;i<2;i++){const it=meta.safeStash[i];const s=document.createElement('div');s.className='slot safeSlot';
 if(it){const d=ITEMS[it.id];if(!d){s.classList.add('emptySlot');s.textContent='OBJETO DESCONOCIDO';el.appendChild(s);continue;}s.style.background=d.color||'#343840';
  s.innerHTML='<span class="nm">'+d.name.slice(0,8)+'</span><span class="sym">'+(d.sym||'▪')+'</span>';
  onTap(s,()=>fromSafe(i))
 } else{s.classList.add('emptySlot');s.textContent='LIBRE'}
 el.appendChild(s)}}

function renderTh(){const el=$('thRow');el.innerHTML='';for(const t of['frag','smoke','molotov']){const n=P.throwables[t]||0,d=ITEMS[t],s=document.createElement('div');s.className='slot'+(n?'':' emptySlot');
 if(P.currentThrow===t)s.style.borderColor='#ffd24a';
 s.innerHTML='<span>'+d.sym+' ×'+n+'</span><span>'+(d.w*n).toFixed(1)+'kg · $'+Math.round(d.v*n)+'</span>';
 if(n)onHold(s,()=>{P.currentThrow=t;SFX.ui();hud(true);renderInv()},()=>{P.throwables[t]--;msg('SOLTADO: '+d.name,'#ffb060');SFX.ui();hud(true);renderInv()});
 el.appendChild(s)}}

function renderWeaponSlots(){const el=$('weaponSlotsRow');if(!el)return;el.innerHTML='';for(let slot=0;slot<2;slot++){const wi=(P.weaponSlots||[0,-1])[slot],d=document.createElement('div');d.className='slot'+(wi===-1||wi==null?' emptySlot':'');if(wi!==-1&&wi!=null){const id=WID[wi],m=ITEMS[id];if(!m){d.className+=' emptySlot';d.textContent=(slot===0?'ARMA PRINCIPAL':'ARMA SECUNDARIA')+' · ERROR DE ARMA';}else{d.style.borderColor=wi===P.weapon?'#ffd24a':(m.color||'#555');d.innerHTML='<span>'+weaponIco(id)+(slot===0?'ARMA PRINCIPAL':'ARMA SECUNDARIA')+'</span><span>'+m.name+(wi===P.weapon?' · ACTIVA':'')+'</span>';onTap(d,()=>{openEquippedWeaponActions(slot)})}}else d.innerHTML='<span>'+(slot===0?'ARMA PRINCIPAL':'ARMA SECUNDARIA')+'</span><span>VACÍA</span>';el.appendChild(d)}}

function itemDescription(id,d){
 const desc={
 medkit:`Botiquín médico de campaña. Recupera ${d.heal||40} puntos de vida.`,
 bandage:`Vendaje para heridas leves. Recupera ${d.heal||15} puntos de vida.`,
 water:`Agua potable. Reduce la sed en ${d.water||40} puntos.`,
 soda:`Bebida azucarada. Reduce la sed en ${d.water||22} y aporta ${d.food||6} de alimento.`,
 burger:`Comida preparada. Recupera ${d.food||45} puntos de hambre.`,
 fruit:`Fruta fresca. Reduce el hambre en ${d.food||16} y la sed en ${d.water||10}.`,
 can:`Ración enlatada. Recupera ${d.food||30} puntos de hambre.`,
 shells:`Munición de escopeta calibre 12. ${d.amount||8} cartuchos por paquete.`,
 bullets:`Munición OTAN 5,56×45 mm. ${d.amount||30} cartuchos por paquete.`,
 ammo9:`Munición de pistola 9×19 mm. ${d.amount||30} cartuchos por paquete.`,
 ammo76239:`Munición 7,62×39 mm para armas compatibles. ${d.amount||30} cartuchos.`,
 ammo792:`Munición Mauser 7,92×57 mm para armas compatibles. ${d.amount||50} cartuchos.`,
 ammo76251:`Munición OTAN 7,62×51 mm para armas compatibles. ${d.amount||10} cartuchos.`,
 rockets:`Cohete PG-7V de 40 mm para el RPG-7. Una unidad por paquete.`,
 frag:`Granada de fragmentación. Lánzala para dañar enemigos cercanos.`,
 smoke:`Granada de humo. Crea una cortina que dificulta la visibilidad.`,
 molotov:`Cóctel incendiario. Provoca fuego en la zona de impacto.`,
 briefcase:`Maletín de botín. Conserva su valor y llévalo hasta la extracción.`,
 beretta:`Pistola semiautomática 9×19 mm. Arma ligera para distancias cortas.`,
 shotgun:`Escopeta Benelli M4 calibre 12. Muy potente a corta distancia.`,
 rifle:`Rifle M4 de 5,56×45 mm. Versátil para distancias medias.`,
 ak47:`Fusil AK-47 de 7,62×39 mm. Potente y fiable en combate.`,
 mg42:`Ametralladora MG42 de 7,92×57 mm. Gran cadencia, pero pesada.`,
 m24:`Rifle de precisión M24 de 7,62×51 mm. Adecuado para larga distancia.`,
 rocketl:`Lanzacohetes RPG-7. Dispara cohetes contra objetivos resistentes.`,
 helm1:`Casco de protección básico. Reduce parte del daño recibido en la cabeza.`,
 helm2:`Casco reforzado. Ofrece mayor protección para la cabeza.`,
 helm3:`Casco militar pesado. Alta protección para la cabeza.`,
 vest1:`Chaleco antibalas básico. Reduce parte del daño al torso.`,
 vest2:`Chaleco reforzado. Mejora la protección del torso.`,
 vest3:`Chaleco pesado. Alta protección para el torso, con más peso.`
 };
 if(desc[id])return desc[id];
 if(d.ammo)return `Munición para armas compatibles. Cantidad: ${d.amount||1}.`;
 if(d.heal)return `Suministro médico. Recupera ${d.heal} puntos de vida.`;
 if(d.food||d.water)return `Suministro de supervivencia${d.food?`. Hambre: +${d.food}`:''}${d.water?`. Sed: +${d.water}`:''}.`;
 if(d.weapon!==undefined)return 'Arma de combate. Puedes equiparla, guardarla o arrojarla.';
 if(d.slot)return 'Equipo de protección. Puedes usarlo para mejorar tu equipamiento.';
 return 'Objeto recogido durante la operación. Revisa su utilidad antes de usarlo.';
}

function openItemActions(i){const it=P.inventory[i];if(!it)return;const d=ITEMS[it.id];const el=$('itemActionButtons');el.innerHTML='';$('itemActionTitle').textContent=d.name;$('itemActionDesc').textContent=itemDescription(it.id,d);const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{ $('itemActionScreen').classList.remove('on');fn() };el.appendChild(b)};if(d.weapon!==undefined){add('EQUIPAR',()=>equipInventoryWeapon(i));add('GUARDAR',()=>{SFX.ui();$('invPanel').classList.remove('on');renderInv()});add('ARROJAR',()=>{P.inventory[i]=null;msg('OBJETO ARROJADO','#ffb060');SFX.ui();renderInv()})}else{if(d.heal||d.food||d.water||d.ammo||d.slot||d.throwable||it.id==='briefcase')add((d.heal||d.food||d.water||d.ammo||d.slot||d.throwable)?'USAR':'VER',()=>useItemAction(i));add('ARROJAR',()=>{if(d.throwable){P.throwables[it.id]=Math.max(0,(P.throwables[it.id]||0)-it.count)}P.inventory[i]=null;msg('OBJETO ARROJADO','#ffb060');SFX.ui();renderInv()})}$('itemActionScreen').classList.add('on')}

function useItemAction(i){const it=P.inventory[i];if(!it)return;const d=ITEMS[it.id];if(d.ammo){P[d.ammo]+=d.amount*it.count;P.inventory[i]=null;msg('MUNICIÓN AÑADIDA','#ffd24a');SFX.pickup();hud(true);renderInv()}else if(d.slot){const old=P.eq[d.slot];P.eq[d.slot]={id:it.id,dur:it.dur!==undefined?it.dur:d.dur};P.inventory[i]=old?{id:old.id,count:1,dur:old.dur}:null;msg('EQUIPADO: '+d.name,'#9fd8ff');SFX.swap();hud(true);renderInv()}else if(d.heal||d.food||d.water){useItem(i)}else if(d.throwable){P.throwables[it.id]=(P.throwables[it.id]||0)+it.count;P.inventory[i]=null;msg('PREPARADO: '+d.name,'#9fd8ff');SFX.pickup();hud(true);renderInv()}else if(it.id==='briefcase'){msg('MALETÍN: SE VENDERÁ AL EXTRAER','#9fd8ff')}}

function equipInventoryWeapon(i){const it=P.inventory[i];if(!it)return;const wi=ITEMS[it.id].weapon;const slots=P.weaponSlots||(P.weaponSlots=[0,-1]);if(slots.includes(wi)){msg('ESA ARMA YA ESTÁ EQUIPADA','#ffb060');return}let slot=slots.indexOf(-1);if(slot<0){msg('DOS ARMAS EQUIPADAS: GUARDA UNA PRIMERO','#ffb060');return}slots[slot]=wi;P.weapons[wi]=true;P.weapon=wi;P.inventory[i]=null;P.reloading=0;P.reloadTotal=0;SFX.swap();hud(true);renderInv();msg('EQUIPADA: '+ITEMS[it.id].name,'#9fd8ff')}

function totalWeaponCount(){let n=(P.weaponSlots||[]).filter(w=>w!==-1&&w!=null).length;for(const it of P.inventory){if(it&&ITEMS[it.id]&&ITEMS[it.id].weapon!==undefined)n+=Math.max(1,it.count||1)}return n}

function openEquippedWeaponActions(slot){const wi=P.weaponSlots[slot];if(wi==null||wi<0)return;const id=WID[wi],el=$('itemActionButtons');el.innerHTML='';$('itemActionTitle').textContent=ITEMS[id].name;const total=totalWeaponCount(),locked=(slot===0&&total<3);$('itemActionDesc').textContent=locked?'Arma principal protegida: solo puedes guardarla o arrojarla cuando tengas 3 armas en total (equipadas y en inventario). Ahora tienes '+total+'.':itemDescription(id,ITEMS[id]);const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{$('itemActionScreen').classList.remove('on');fn()};el.appendChild(b)};if(locked){add('CERRAR',()=>{});}else{add('DESEQUIPAR / GUARDAR',()=>{const idx=P.inventory.findIndex(x=>!x);if(idx<0){msg('INVENTARIO LLENO','#ff6a5a');return}P.inventory[idx]={id,count:1};P.weaponSlots[slot]=-1;if(P.weapon===wi)P.weapon=(P.weaponSlots.find(x=>x>=0)??0);P.weapons[wi]=false;SFX.swap();hud(true);renderInv()});add('ARROJAR',()=>{P.weaponSlots[slot]=-1;P.weapons[wi]=false;if(P.weapon===wi)P.weapon=(P.weaponSlots.find(x=>x>=0)??0);msg('ARMA ARROJADA','#ffb060');SFX.ui();hud(true);renderInv()})}$('itemActionScreen').classList.add('on')}

function renderInv(){grid($('invGrid'),P.inventory,(i)=>openItemActions(i),(i)=>toSafe(i));renderEq();renderWeaponSlots();renderTh();renderSafe();
 const w=weight();$('invInfo').innerHTML='PESO <b>'+w.toFixed(1)+'</b>/'+MAXW+' KG · VALOR <b>$'+Math.round(sum('v'))+'</b> · REVENTA <b>$'+Math.round(sum('v')*RESALE_RATE)+'</b>'}

export function toggleInv(){if(state!=='play')return;const p=$('invPanel');if(p.classList.contains('on'))p.classList.remove('on');else{if(!$('lootPanel').classList.contains('on')){renderInv();p.classList.add('on');set_fireHeld(false);SFX.ui()}}}

export function openLoot(){
 if(state!=='play'||paused())return;
 if(nearAlly){nearAlly.following=true;nearAlly.awake=true;msg('¡ALIADO LIBERADO!','#9fd8ff');SFX.ally();hud(true);updateDailyProgress('allies',1);return}
 if(!nearC)return;
 if(nearC.isSafe){if(!nearC.opened){beginSafeCrack(nearC);return}if(!nearC.loot.length)return;$('lootPanel').firstElementChild.textContent='BOTÍN DE CAJA FUERTE';renderLoot(nearC);$('lootPanel').classList.add('on');set_fireHeld(false);SFX.ui();return}
 if(nearC.cache&&nearC.healAvailable&&!nearC.healUsed){
   nearC.healUsed=true;
   if(P.hp<P.maxHp){
     const heal=30;
     P.hp=Math.min(P.maxHp,P.hp+heal);
     SFX.heal();
     msg('+'+heal+' HP · PUNTO DE CURACIÓN','#7dff8f');
     hud(true);
   }
 }
 if(nearC.cache){nearC.spr=sCacheOpen}
 $('lootPanel').firstElementChild.textContent=nearC.label?nearC.label:nearC.cache?(nearC.outpost&&nearC.outpost.camp?'COFRE DEL CAMPAMENTO':'COFRE DEL PUESTO'):(nearC.perm?'REGISTRAR CONTENEDOR':'SAQUEAR SOLDADO CAÍDO');
 renderLoot(nearC);$('lootPanel').classList.add('on');set_fireHeld(false);SFX.ui()
}

export function renderLoot(c){grid($('lootGrid'),c.loot,i=>{const it=c.loot[i];if(!it)return;
 if(addInv(it.id,it.count)){
  c.loot.splice(i,1);
  SFX.pickup();msg('+ '+ITEMS[it.id].name,'#9fffa0');
  if(!c.loot.length){
   if(c.isSafe){set_SAFE_BOXES(SAFE_BOXES.filter(box=>box!==c));if(nearSafe===c)set_nearSafe(null);}
   else if(!c.perm)corpses.splice(corpses.indexOf(c),1);
   $('lootPanel').classList.remove('on');set_nearC(null);
   $('btnLoot').classList.remove('on','ally');$('btnLoot').textContent='SAQUEAR';
  } else renderLoot(c);
  hud(true)
 }})}
