import { MH, MW, map } from './core.js';
import { pblk } from './outposts.js';
import { D4, D8 } from './backdrop.js';
import { conquestOn, pathAvoidOwn, sectorOwned, terrOwner } from './conquest.js';

/* ===== NUEVO: BFS para rutas del mapa táctico ===== */
export function findPath(sx,sy,ex,ey){
 let s=[Math.floor(sx),Math.floor(sy)];
 let e=[Math.floor(ex),Math.floor(ey)];
 const walkable=(x,y)=>{
  if(x<0||y<0||x>=MW||y>=MH)return false;
  if(map[y*MW+x]!==0)return false;
  if(pblk[y*MW+x])return false;
  if(pathAvoidOwn&&conquestOn&&sectorOwned(terrOwner[y*MW+x]))return false; // Las tropas enemigas rodean tu territorio.
  return true;
 };
 /* Si el punto cae sobre una casilla bloqueada por un objeto, usar la casilla libre más cercana */
 const nearFree=(c)=>{
  if(walkable(c[0],c[1]))return c;
  let best=null,bd=1e9;
  for(let r=1;r<=4&&!best;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
   if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
   const nx=c[0]+dx,ny=c[1]+dy;
   if(!walkable(nx,ny))continue;
   const d=dx*dx+dy*dy;if(d<bd){bd=d;best=[nx,ny]}
  }
  return best;
 };
 e=nearFree(e);
 if(!e)return null;
 const s0=s;
 if(walkable(s[0],s[1])&&s[0]===e[0]&&s[1]===e[1])return[s];
 const dist=new Int32Array(MW*MH).fill(-1);
 const qi=new Int32Array(MW*MH);
 let qh=0,qt=0;
 dist[e[1]*MW+e[0]]=0;
 qi[qt++]=e[1]*MW+e[0];
 while(qh<qt){
  const c=qi[qh++];
  const cx=c%MW,cy=(c/MW)|0;
  const cd=dist[c];
  if(cd>700)continue;
  for(let d=0;d<4;d++){
   const nx=cx+D4[d][0],ny=cy+D4[d][1];
   if(!walkable(nx,ny))continue;
   const ni=ny*MW+nx;
   if(dist[ni]>=0)continue;
   dist[ni]=cd+1;
   qi[qt++]=ni;
  }
 }
 /* Si el inicio está sobre un objeto o en un bolsillo sellado, tomar la casilla libre CONECTADA más cercana */
 if(!walkable(s[0],s[1])||dist[s[1]*MW+s[0]]<0){
  let best=null,bd=1e9;
  for(let r=1;r<=6;r++){
   for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    const nx=s0[0]+dx,ny=s0[1]+dy;
    if(!walkable(nx,ny)||dist[ny*MW+nx]<0)continue;
    const d=dx*dx+dy*dy;if(d<bd){bd=d;best=[nx,ny]}
   }
   if(best)break;
  }
  if(!best)return null;
  s=best;
 }
 const path=[s];
 let cur=s[1]*MW+s[0];
 while(dist[cur]>0){
  const cx=cur%MW,cy=(cur/MW)|0;
  const cd=dist[cur];
  let found=-1;
  for(let d=0;d<8;d++){
   const nx=cx+D8[d][0],ny=cy+D8[d][1];
   if(nx<0||ny<0||nx>=MW||ny>=MH)continue;
   if(D8[d][0]&&D8[d][1]){
    if(map[cy*MW+cx+D8[d][0]]!==0)continue;
    if(map[(cy+D8[d][1])*MW+cx]!==0)continue;
    if(pblk[cy*MW+cx+D8[d][0]])continue;
    if(pblk[(cy+D8[d][1])*MW+cx])continue;
   }
   const ni=ny*MW+nx;
   if(dist[ni]<0)continue;
   if(dist[ni]<cd){found=ni;break}
  }
  if(found<0)break;
  cur=found;
  path.push([cur%MW,(cur/MW)|0]);
 }
 return path;
}

/* Reduce un camino BFS conservando solo esquinas y extremos (para dibujarlo en el minimapa) */
export function simplifyPath(path){
 if(!path||path.length<=2)return path||[];
 const out=[path[0]];
 let pdx=path[1][0]-path[0][0],pdy=path[1][1]-path[0][1];
 for(let i=1;i<path.length-1;i++){
  const ndx=path[i+1][0]-path[i][0],ndy=path[i+1][1]-path[i][1];
  if(ndx!==pdx||ndy!==pdy){out.push(path[i]);pdx=ndx;pdy=ndy}
 }
 out.push(path[path.length-1]);
 return out;
}
