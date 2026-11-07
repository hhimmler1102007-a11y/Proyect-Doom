(function(){
/* EXTRACTION DOOM · ICONOS TÁCTICOS v2
   Iconos SVG monocromos por NOMBRE de producto, sin emojis, y tienda agrupada
   en secciones con scroll. Solo pinta y reordena nodos de presentación. */
'use strict';
var S = {
  shotgun:'<g fill="currentColor" stroke="none"><path d="M1.6 9.2h3.2v2.9H2.3z"/><rect x="4.8" y="8.7" width="9.2" height="2.6"/><rect x="14" y="9.1" width="7.6" height="1.2"/><rect x="13.6" y="10.9" width="5.6" height="1.1"/><rect x="14.8" y="11.9" width="3.2" height="1.6"/><path d="M6.6 11.3h1.8l.8 3.6H6.2z"/></g>',
  sniper:'<g fill="currentColor" stroke="none"><path d="M1.6 9.6h4.2v2.8H2.4z"/><rect x="5.8" y="8.8" width="7.2" height="2.8"/><rect x="13" y="9.4" width="8.8" height="1.2"/><rect x="8.2" y="6.4" width="4.6" height="1.7" rx=".6"/><rect x="6.4" y="11.6" width="2" height="3.8"/></g><path d="M12.8 6.9h1.6M6.6 6.9h1.4" stroke-width="1.2"/>',
  bullets:'<g fill="currentColor" stroke="none"><path d="M5.4 19v-6.4a2.7 2.7 0 0 1 5.4 0V19z"/><path d="M11.6 19v-6.4a2.7 2.7 0 0 1 5.4 0V19z"/></g><path d="M3.4 19h18" stroke-width="1.2" opacity=".45"/>',
  shells:'<g fill="currentColor" stroke="none"><rect x="4.6" y="6.8" width="4" height="9.4" rx="1.8"/><rect x="4.6" y="14.4" width="4" height="2.6" rx=".6"/><rect x="10.3" y="6.8" width="4" height="9.4" rx="1.8"/><rect x="10.3" y="14.4" width="4" height="2.6" rx=".6"/><rect x="16" y="6.8" width="4" height="9.4" rx="1.8" opacity=".55"/><rect x="16" y="14.4" width="4" height="2.6" rx=".6" opacity=".55"/></g>',
  rocket:'<path d="M12 3.2c2.4 2.4 3.2 4.8 3.2 7.6V17l-3.2 3.2L8.8 17v-6.2c0-2.8.8-5.2 3.2-7.6z"/><path d="M8.8 15.6l-2.6 2.8M15.2 15.6l2.6 2.8" stroke-width="1.4"/>',
  medkit:'<rect x="3.8" y="6.6" width="16.4" height="13" rx="2"/><path d="M12 10.2v5.8M9.1 13.1h5.8"/><path d="M9 6.6V4.6h6v2"/>',
  bandage:'<circle cx="9.2" cy="13.6" r="4.6"/><path d="M13.8 13.6c0-2.6 2-3.8 3.6-3.8s3 1.2 3 3-1.4 3-3.6 3.4"/><circle cx="9.2" cy="13.6" r="1.2"/>',
  water:'<path d="M9.6 3.4h4.8v2.8l1.6 2.2V19a1.8 1.8 0 0 1-1.8 1.8h-4.4A1.8 1.8 0 0 1 8 19V8.4l1.6-2.2z"/><path d="M8.2 11.4h7.6M9.6 6.2h4.8"/>',
  soda:'<rect x="8" y="4.2" width="8" height="15.6" rx="2.2"/><path d="M9.6 7.6h4.8"/><path d="M10.4 5h2.4" stroke-width="1.2"/>',
  burger:'<path d="M4.4 10.4c0-3.3 3.4-5.6 7.6-5.6s7.6 2.3 7.6 5.6z"/><path d="M4.4 12.2h15.2"/><path d="M5 14.4h14"/><path d="M4.4 16.6c0-1 .8-1.7 1.9-1.7h11.4c1.1 0 1.9.7 1.9 1.7 0 1.5-1.3 2.5-3 2.5H7.4c-1.7 0-3-1-3-2.5z"/>',
  apple:'<path d="M12 7.4c1.7-1.5 4.2-1 5 1.3.9 2.4-.4 6.6-2.5 8.7-1 1-2.5 1-3.5 0-2.1-2.1-3.4-6.3-2.5-8.7.8-2.3 3.3-2.8 5-1.3z"/><path d="M12 7.4c0-1.7.7-2.9 2.2-3.6" stroke-width="1.4"/>',
  can:'<rect x="7.2" y="4.8" width="9.6" height="14.4" rx="1.9"/><path d="M7.2 9h9.6M7.2 15.2h9.6"/>',
  grenade:'<circle cx="12" cy="14.6" r="5"/><path d="M12 9.6V7h3.2M15.2 5.6v3"/><path d="M8.8 11.6a4.4 4.4 0 0 1 3-1.9"/><path d="M17.4 5.2h2"/>',
  smoke:'<rect x="8.2" y="8.4" width="7.6" height="11.2" rx="2.2"/><path d="M9.4 8.4V5.8h5.2v2.6"/><path d="M16.8 7c1.4-.4 2.4-1.4 2.8-2.6M17.6 9.4c1.2-.2 2.2-1 2.6-2" stroke-width="1.2" opacity=".8"/>',
  molotov:'<path d="M10.2 3.6h3.6v3.2l1.8 3V19a1.6 1.6 0 0 1-1.6 1.6h-4A1.6 1.6 0 0 1 8.4 19V9.8l1.8-3z"/><path d="M12 3.6c0-1.2.6-2 1.7-2.4"/><path d="M8.4 12.6h7.2" stroke-width="1.2" opacity=".6"/>',
  briefcase:'<rect x="3.4" y="7.2" width="17.2" height="11.6" rx="2"/><path d="M9 7.2V5h6v2.2M3.4 12.4h17.2"/>',
  lion:'<circle cx="12" cy="13.2" r="4.2"/><path d="M12 5.2l2.2 2h3l-1 3 1.7 2.6-2.7 1.3-.8 3.1H9.6l-.8-3.1L6.1 12.8 7.8 10.2l-1-3h3z"/>',
  eagle:'<path d="M3 8l5 2.5L12 7l4 3.5L21 8l-2 5-3 1 2 4-4-1-2 3-2-3-4 1 2-4-3-1-2-5z"/>',
  bust:'<circle cx="12" cy="8.4" r="3.2"/><path d="M6.4 15.4c0-2.7 2.5-4.6 5.6-4.6s5.6 1.9 5.6 4.6v1.2H6.4z"/><rect x="7.4" y="17.2" width="9.2" height="2.6" rx=".7"/>',
  watch:'<circle cx="12" cy="12.6" r="6.4"/><circle cx="12" cy="12.6" r="4.2" opacity=".55"/><path d="M12 9.8v3l2.2 1.4"/><path d="M12 4.2v2M12 19v2" stroke-width="1.4"/>',
  chalice:'<path d="M7.4 4.4h9.2v5.2a4.6 4.6 0 0 1-9.2 0z"/><path d="M12 14.2v3.4"/><path d="M8.6 19.6h6.8" stroke-width="1.6"/><path d="M9.8 6h4.4" opacity=".6"/>',
  teapot:'<path d="M6 10.2h9.6v4.2a4.8 4.8 0 0 1-4.8 4.8A4.8 4.8 0 0 1 6 14.4z"/><path d="M15.6 11.4l3.6-2.2"/><path d="M8.6 10.2V7.4h4.4v2.8"/><path d="M6 12.2H4.2" stroke-width="1.4"/>',
  ring:'<circle cx="12" cy="15" r="4.6"/><path d="M9.4 10.4L12 4.8l2.6 5.6z"/>',
  cart:'<circle cx="9.4" cy="18.6" r="1.6"/><circle cx="17" cy="18.6" r="1.6"/><path d="M3 4.4h2.4l2.4 9.4h9.6l2-6.6H6.2"/><path d="M6.6 7.2h12.6"/>',
  chart:'<path d="M4 19.4V4.6"/><path d="M4 19.4h16"/><path d="M7.4 16l3.6-5.2 3.2 2.6L20 6"/><path d="M16.4 6H20v3.6"/>',
  map:'<path d="M3.4 6.4l5.6-2.2 6 2.2 5.6-2.2v13.4l-5.6 2.2-6-2.2-5.6 2.2z"/><path d="M9 4.2v13.4M15 6.4v13.4"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 5.5H5v1.5a3 3 0 0 0 3 3M16 5.5h3V7a3 3 0 0 1-3 3"/><path d="M10 15h4l1 4H9l1-4z"/>',
  clipboard:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M9 11h6M9 14h6M9 17h4"/>',
  shield:'<path d="M12 3.4l7.4 2.6v6.2c0 4.2-3 7-7.4 8.4-4.4-1.4-7.4-4.2-7.4-8.4V6z"/><path d="M8.6 11.8l2.4 2.4 4.4-4.8"/>',
  scope:'<circle cx="12" cy="12" r="7.4"/><circle cx="12" cy="12" r="2.8"/><path d="M12 2.6v4M12 17.4v4M2.6 12h4M17.4 12h4"/>',
  knife:'<path d="M4 20l7-7"/><path d="M11 13l6-9 3 3-9 6z"/>',
  fist:'<path d="M7 12V7a2 2 0 0 1 4 0v4M11 10V6a2 2 0 0 1 4 0v5M15 11V8a2 2 0 0 1 4 0v8a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5v-4"/>',
  ghost:'<path d="M6 19v-9a6 6 0 0 1 12 0v9l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 19z"/><circle cx="10" cy="11" r="1"/><circle cx="14" cy="11" r="1"/>',
  cash:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6.4 9v6M17.6 9v6" opacity=".7"/>',
  box:'<path d="M4 8l8-4 8 4v8l-8 4-8-4V8z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
  timer:'<circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l3 2M9 3h6"/>',
  burst:'<path d="M12 3l2 4 4-2-1.5 4.5L21 12l-4.5 2.5L18 19l-4-2-2 4-2-4-4 2 1.5-4.5L3 12l4.5-2.5L6 5l4 2 2-4z"/>',
  blood:'<path d="M9 17.2a2.1 2.1 0 0 0 4.2 0c0-1.7-2.1-4.2-2.1-4.2s-2.1 2.5-2.1 4.2z"/><path d="M15 7.2a2 2 0 0 0 3 0c0-1.2-1.5-3-1.5-3S15 6 15 7.2z"/>',
  medal:'<circle cx="12" cy="15" r="4"/><path d="M8.5 4l2 6M15.5 4l-2 6"/>',
  star:'<path d="M12 4l2.4 5 5.6.8-4 3.9.9 5.3-4.9-2.5-4.9 2.5.9-5.3-4-3.9 5.6-.8L12 4z"/>',
  flag:'<path d="M6 4v16"/><path d="M6 5h11l-2 4 2 4H6"/>',
  diamond:'<path d="M12 4l8 8-8 8-8-8 8-8z"/>'
};
function svg(body){
  return '<svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true" style="width:1em;height:1em;' +
    'vertical-align:-0.14em;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;' +
    'stroke-linejoin:round;display:inline-block">' + body + '</svg>';
}
function svgNode(k){
  var span = document.createElement('span');
  span.innerHTML = svg(S[k] || S.diamond);
  return span.firstChild;
}
var RULES = [
  [/CARTUCHO|PERDIG[OÓ]N/i, 'shells'],
  [/BENELLI|ESCOPETA|PUMP/i, 'shotgun'],
  [/M24|CEBADO|PRECISI[OÓ]N/i, 'sniper'],
  [/COHETE|PG-?\s?7/i, 'rocket'],
  [/BOTIQU|MEDKIT/i, 'medkit'],
  [/VENDA|GASA/i, 'bandage'],
  [/MUNICI|BALAS|CARTUCHER|MM\b|OTAN|MAUSER/i, 'bullets'],
  [/AGUA/i, 'water'],
  [/SODA|REFRESC/i, 'soda'],
  [/HAMBURGUESA|BURGER|COMIDA/i, 'burger'],
  [/FRUTA|MANZANA|NARANJA/i, 'apple'],
  [/ENLATADO|LATA|CONSERVA/i, 'can'],
  [/GRANADA/i, 'grenade'],
  [/HUMO|SMOKE/i, 'smoke'],
  [/MOLOTOV/i, 'molotov'],
  [/MALET[IÍ]N/i, 'briefcase'],
  [/LE[OÓ]N/i, 'lion'],
  [/[AÁ]GUILA/i, 'eagle'],
  [/BUSTO|ESTATUA/i, 'bust'],
  [/RELOJ/i, 'watch'],
  [/C[AÁ]LIZ|COPA/i, 'chalice'],
  [/TETERA/i, 'teapot'],
  [/ANILLO/i, 'ring']
];
var EMO = {
  '\u{1F6D2}':'cart', '\u{1F4C8}':'chart', '\u{1F5FA}':'map', '\u{1F3C6}':'trophy',
  '\u{1F4CB}':'clipboard', '\u{1F6E1}':'shield', '\u{1F3AF}':'scope', '\u{1F52A}':'knife',
  '\u{1F44A}':'fist', '\u{1F47B}':'ghost', '\u{1F4B0}':'cash', '\u{1F4B5}':'cash',
  '\u{1F4B4}':'cash', '\u{1F4E6}':'box', '\u{23F1}':'timer', '\u{1F4A5}':'burst',
  '\u{1FA78}':'blood', '\u{1F3C5}':'medal', '\u{1F396}':'medal', '\u{2B50}':'star',
  '\u{2605}':'star', '\u{1F512}':'shield', '\u{1F525}':'molotov', '\u{1F4A3}':'grenade',
  '\u{1F4A8}':'smoke', '\u{1F4A7}':'water', '\u{1F964}':'soda', '\u{1F354}':'burger',
  '\u{1F34E}':'apple', '\u{1FAD9}':'can', '\u{1F36B}':'can', '\u{271A}':'medkit', '\u{1F4BC}':'briefcase', '\u{1F981}':'lion',
  '\u{1F985}':'eagle', '\u{1F3FA}':'bust', '\u{1F48D}':'ring', '\u{231A}':'watch',
  '\u{1FAD6}':'teapot', '\u{1F680}':'rocket',
  '\u{2691}':'flag', '\u{1F6A9}':'flag'
};
var EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F0FF}]/u;
function iconFor(node, el){
  var name = '';
  if(node){
    var nm = node.querySelector('.nm') || node.querySelector('.mt') || node.querySelector('.t2');
    if(nm) name = nm.textContent || '';
    if(!name){ var ds = node.querySelector('.ds'); if(ds) name = ds.textContent || ''; }
  }
  var cands = [name, el.textContent || '', el.getAttribute('title') || ''];
  for(var i = 0; i < RULES.length; i++){
    for(var c = 0; c < cands.length; c++){
      if(cands[c] && RULES[i][0].test(cands[c])) return RULES[i][1];
    }
  }
  return null;
}
function emojiKey(txt){
  var t = (txt || '').replace(/\uFE0F/g, '').trim(), k;
  for(k in EMO){ if(t === k) return EMO[k]; }
  for(k in EMO){ if(t.indexOf(k) === 0) return EMO[k]; }
  return null;
}
function fragFor(val, body){
  var frag = document.createDocumentFragment(), buf = '';
  function flush(){ if(buf){ frag.appendChild(document.createTextNode(buf)); buf = ''; } }
  for(var ch of val){
    if(ch === '\uFE0F') continue;
    if(EMO[ch]){ flush(); frag.appendChild(svgNode(EMO[ch])); }
    else if(EMOJI_RE.test(ch)){ flush(); frag.appendChild(svgNode(body || 'diamond')); }
    else buf += ch;
  }
  flush();
  return frag;
}
var SEL = '.sym, .nb i, #btnThrow, #thl, .shopCard .ic, .achCard .ic, ' +
          '.achievement-popup .ic, .shopHeader h2, #marketBanner, #bigMapHeader .ttl, ' +
          '.insuranceBox .it, .safeBox h4, .panelTitle i, #menuStats, #selectExtras button, ' +
          '#eqRow .slot span:first-child, #weaponSlotsRow .slot span:first-child, ' +
          '#thRow .slot span:first-child';
function swap(root){
  var nodes = (root || document).querySelectorAll(SEL);
  for(var i = 0; i < nodes.length; i++){
    var el = nodes[i];
    if(el.querySelector('svg.ico-svg') || el.querySelector('.armor-ico, .weapon-ico')) continue; /* cascos, chalecos y armas con sprite propio */
    var node = el.closest ? el.closest('.shopCard, .slot, .achCard, .achievement-popup, .insuranceBox') : null;
    var body = iconFor(node, el);
    var glyphOnly = el.matches('.sym, .shopCard .ic, .achCard .ic, .achievement-popup .ic');
    if(glyphOnly){
      el.innerHTML = svg(S[body || emojiKey(el.textContent) || 'diamond']);
      continue;
    }
    EMOJI_RE.lastIndex = 0;
    if(!EMOJI_RE.test(el.textContent || '')) continue;
    var fallback = body || 'diamond';
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    var texts = [], n;
    while((n = walker.nextNode())) texts.push(n);
    for(var t = 0; t < texts.length; t++){
      var tn = texts[t];
      EMOJI_RE.lastIndex = 0;
      if(!EMOJI_RE.test(tn.nodeValue)) continue;
      tn.parentNode.replaceChild(fragFor(tn.nodeValue, fallback), tn);
    }
  }
}
function catOf(card){
  var ds = (card.querySelector('.ds') || {}).textContent || '';
  var nm = (card.querySelector('.nm') || {}).textContent || '';
  if(/^ARMADURA|^CASCO|^CHALECO/.test(ds + nm)) return ['ARMADURAS', 2];
  if(/^ARMA\b/.test(ds)) return ['ARMAS', 1];
  if(/por unidad/.test(ds)) return ['MUNICIÓN', 3];
  if(/PS/.test(ds) || /BOTIQU|VENDA/.test(nm)) return ['CURACIÓN', 4];
  if(/ARROJADIZO/.test(ds)) return ['ARROJADIZOS', 5];
  return ['EQUIPO Y BOTÍN', 6];
}
function groupShop(){
  var grid = document.getElementById('shopGrid');
  if(!grid || !grid.children.length) return;
  var cards = [].slice.call(grid.querySelectorAll('.shopCard'));
  if(!cards.length) return;
  var sig = cards.map(function(c){ return (c.querySelector('.nm') || {}).textContent; }).join('|');
  if(grid.dataset.sig === sig && grid.querySelector('.shopSectionHead')) return;
  grid.dataset.sig = sig;
  var buckets = {};
  cards.forEach(function(c){
    var k = catOf(c);
    (buckets[k[1]] = buckets[k[1]] || { name: k[0], items: [] }).items.push(c);
  });
  grid.innerHTML = '';
  Object.keys(buckets).sort(function(a,b){ return a - b; }).forEach(function(k){
    var b = buckets[k];
    var h = document.createElement('div');
    h.className = 'shopSectionHead';
    h.innerHTML = '<span>' + b.name + '</span><b>' + b.items.length + '</b>';
    grid.appendChild(h);
    b.items.forEach(function(c){ grid.appendChild(c); });
  });
}
function boot(){
  swap(document); groupShop();
  var pending = null;
  function tick(){
    if(pending) return;
    pending = setTimeout(function(){ pending = null; swap(document); groupShop(); }, 140);
  }
  var obs = new MutationObserver(tick);
  ['invPanel','lootPanel','shopScreen','shopGrid','menuScreen','operationSelectScreen','top',
   'achScreen','dailyScreen','achGrid','dailyGrid'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) obs.observe(el, { childList: true, subtree: true });
  });
  setInterval(function(){ swap(document); groupShop(); }, 900);
}
window.TacticalIcons = { swap: swap, groupShop: groupShop };
if(window.__NO_AUTO_ICONS) return;
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();

