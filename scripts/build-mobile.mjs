import {build} from 'esbuild';
import {readFile,writeFile,mkdir,copyFile,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const project=path.join(root,'.sites/riftbound-mobile'),dist=path.join(project,'dist');
await mkdir(path.join(dist,'assets'),{recursive:true});
const result=await build({
  absWorkingDir:root,entryPoints:['src/v2/main.js'],outdir:dist,bundle:true,minify:true,
  entryNames:'assets/game-[hash]',assetNames:'assets/[name]-[hash]',publicPath:'/',
  loader:{'.png':'file','.webp':'file'},format:'iife',target:['chrome100','safari15.4','firefox100'],
  legalComments:'inline',charset:'utf8',metafile:true,
});
const css=await readFile(path.join(root,'src/v2/style.css'),'utf8');
const cssName=`assets/game-${createHash('sha256').update(css).digest('hex').slice(0,10)}.css`;
await writeFile(path.join(dist,cssName),css,'utf8');
const js=Object.entries(result.metafile.outputs).find(([,meta])=>meta.entryPoint)?.[0];
if(!js)throw new Error('Missing mobile entry point');
const scriptPath=path.relative(dist,path.resolve(root,js)).replaceAll('\\','/');
let html=await readFile(path.join(root,'src/v2/index.html'),'utf8');
html=html.replace('<html lang="zh-CN">','<html lang="zh-CN" data-edition="mobile-web">')
 .replace('<title>吞城：裂隙远征 · Riftbound</title>','<title>吞城 · 手机试玩 V8</title><meta name="description" content="手机竖屏全屏试玩：吞噬成长、组装城堡、召唤军团，挑战风铃草甸。"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="吞城">')
 .replace('<!-- APP_STYLE -->',`<link rel="stylesheet" href="/${cssName}">`)
 .replace('<!-- APP_SCRIPT -->',`<script defer src="/${scriptPath}"></script>`);
await writeFile(path.join(dist,'index.html'),html,'utf8');
await copyFile(path.join(root,'THIRD-PARTY-NOTICES.txt'),path.join(dist,'THIRD-PARTY-NOTICES.txt'));
await writeFile(path.join(dist,'_headers'),'/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n','utf8');
await writeFile(path.join(project,'README.md'),'# Riftbound mobile web\n\nBuilt from cedricxugun/rift with `bun run build:mobile`. Static files are tracked in dist; this Site contains no backend, secrets, player records or analytics. Saves stay in the visitor browser. Rebuild in the game repository, then use the Sites source workflow to publish this directory.\n','utf8');
await writeFile(path.join(project,'.gitignore'),'.sites-runtime/\n.sites-checkout/\nnode_modules/\n','utf8');
const assets=Object.entries(result.metafile.outputs).map(([file,meta])=>({path:path.relative(dist,path.resolve(root,file)).replaceAll('\\','/'),bytes:meta.bytes}));
assets.push({path:cssName,bytes:Buffer.byteLength(css)});
// This directory contains only generated, hashed build assets. Keep old source art in assets/.
const assetDir=path.resolve(dist,'assets'),keep=new Set(assets.map(a=>path.resolve(dist,a.path)));
for(const entry of await readdir(assetDir,{withFileTypes:true})){
  const candidate=path.resolve(assetDir,entry.name);
  if(entry.isFile()&&path.dirname(candidate)===assetDir&&/^[\w-]+\.(?:webp|js|css)$/.test(entry.name)&&!keep.has(candidate))await unlink(candidate);
}
await writeFile(path.join(project,'build-info.json'),JSON.stringify({version:'V8',entry:'dist/index.html',build:'bun run build:mobile',assets},null,2)+'\n','utf8');
console.log(JSON.stringify({directory:dist,entryHtmlBytes:Buffer.byteLength(html),assets:assets.length,totalAssetBytes:assets.reduce((n,a)=>n+a.bytes,0),largestAssetBytes:Math.max(...assets.map(a=>a.bytes))},null,2));
