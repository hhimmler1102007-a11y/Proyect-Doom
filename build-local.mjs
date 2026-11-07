// Build local equivalente a `vite build` (usa esbuild). Resultado en dist/
import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
import fs from 'fs'; import path from 'path';
const root=process.cwd(), out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
fs.cpSync(path.join(root,'src/assets'),path.join(out,'assets'),{recursive:true});

const urlRe=/new URL\(\s*(['"])\.\.\/assets\/([^'"]+)\1\s*,\s*import\.meta\.url\s*\)\.href/g;
const assetUrls={name:'asset-urls',setup(b){
  b.onLoad({filter:/src[\\/].*\.js$/},async a=>{
    let s=fs.readFileSync(a.path,'utf8');
    s=s.replace(urlRe,(m,q,p)=>JSON.stringify('./assets/'+p));
    return {contents:s,loader:'js'}})}};

await build({
  stdin:{contents:["./src/main.js","./src/iconos-tacticos.js","./src/boot-loader.js","./src/orientation.js"].map(f=>`import '${f}';`).join('\n'),resolveDir:root,sourcefile:'entry.js'},
  bundle:true,format:'esm',target:'es2020',minify:true,outfile:path.join(out,'main.js'),plugins:[assetUrls],logLevel:'warning'});

// CSS: se concatena en el mismo orden del index.html y se reescriben las rutas a ./assets
const css=['base','skin-tactico','boot-screen','armor-icons','bigmap-zoom'].map(n=>fs.readFileSync(`src/styles/${n}.css`,'utf8').replace(/\.\.\/assets\//g,'./assets/')).join('\n');
fs.writeFileSync(path.join(out,'style.css'),css);

let html=fs.readFileSync('index.html','utf8');
html=html.replace(/<link rel="stylesheet" href="\/src\/styles\/[^"]+">\s*/g,'');
html=html.replace('</head>','<link rel="stylesheet" href="./style.css">\n</head>');
html=html.replace(/<script type="module" src="\/src\/[^"]+"><\/script>\s*/g,'');
html=html.replace('</body>','<script type="module" src="./main.js"></script>\n</body>');
html=html.replace(/(src|href)="\/src\/assets\//g,'$1="./assets/');
fs.writeFileSync(path.join(out,'index.html'),html);
console.log('OK');
