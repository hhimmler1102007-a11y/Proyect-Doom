// Iconos de cascos/chalecos (tiers 1-3) y de armas con sprite propio.
// Los sprites se cargan desde src/styles/armor-icons.css; aquí solo se genera el HTML.
export function armorIco(id){
  return /^(helm|vest)[123]$/.test(id||'')?'<i class="armor-ico ai-'+id+'"></i>':'';
}
const WEAPON_SPRITES=['beretta','rifle','ak47','mg42','rocketl'];
export function weaponIco(id){
  return WEAPON_SPRITES.includes(id)?'<i class="weapon-ico wi-'+id+'"></i>':'';
}
