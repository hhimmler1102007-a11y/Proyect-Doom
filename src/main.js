import './game/shop.js';
import './game/core.js';
import './game/state.js';
import './game/pathfinding.js';
import './game/music.js';
import './game/textures.js';
import './game/bigmap.js';
import './game/reset.js';
import './game/outposts.js';
import './game/game.js';
import './game/render.js';
import './game/sprites.js';
import './game/hud.js';
import './game/operations.js';
import './game/inventory.js';
import './game/audio.js';
import './game/ai.js';
import './game/conquest.js';
import './game/worldgen.js';
import './game/input.js';
import './game/combat.js';
import './game/update.js';
import './game/weapon-view.js';
import './game/backdrop.js';
import './game/data.js';

import { MAP_SEED, OUTPOSTS, generateCity, gmap, gmapOrig, map, mapOrig, walkmapOrig } from './game/core.js';
import { DISTRICT_OUTPOSTS, buildFrontCamps, buildOutposts, fortifyOutpost, prepareOutpostGates, set_PRE_FORT_MAP, updateBeacon, walkmap } from './game/outposts.js';
import { computeInteriorProps, computePickupSpots, computeStreetDecor } from './game/worldgen.js';
import { reset } from './game/reset.js';
import { rebuildMinimap, resize, waitForBackdropAssets } from './game/backdrop.js';
import { loop, refreshSelectedMapCard } from './game/game.js';
import { waitForSpriteAssets } from './game/sprites.js';
import { waitForWeaponAssets } from './game/weapon-view.js';

async function initializeGame(){
 generateCity(MAP_SEED);

 buildOutposts();

 updateBeacon();

 for(const op of OUTPOSTS)prepareOutpostGates(op);

 set_PRE_FORT_MAP(new Uint8Array(map));

 for(const op of OUTPOSTS)fortifyOutpost(op);

 mapOrig.set(map);

 DISTRICT_OUTPOSTS.push(...OUTPOSTS);

 buildFrontCamps();

 rebuildMinimap();

 computeInteriorProps(MAP_SEED);

 computePickupSpots(MAP_SEED);

 computeStreetDecor(MAP_SEED);

 gmapOrig.set(gmap);
 walkmapOrig.set(walkmap);

 refreshSelectedMapCard();

 reset();
 await Promise.all([waitForSpriteAssets(),waitForWeaponAssets(),waitForBackdropAssets()]);
 resize();
 requestAnimationFrame(loop);
 window.__EXTRACTION_DOOM_READY__=true;
 window.dispatchEvent(new Event('extractionDoomReady'));
}

initializeGame().catch(err=>{
 console.error('[EXTRACTION DOOM] Error durante la inicialización:',err);
 window.dispatchEvent(new Event('extractionDoomBootError'));
});
