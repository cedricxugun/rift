import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
const result = await build({
  entryPoints: ['src/v2/main.js'], bundle: true, minify: true, write: false,
  loader: { '.png': 'dataurl', '.webp': 'dataurl' },
  format: 'iife', target: ['chrome100', 'safari15.4', 'firefox100'],
  legalComments: 'inline', charset: 'utf8',
});
const css = await readFile('src/v2/style.css', 'utf8');
const template = await readFile('src/v2/index.html', 'utf8');
const licenses = await Promise.all(['three', 'i18next'].map(async name => `${name}\n${await readFile(`node_modules/${name}/LICENSE`, 'utf8')}`));
const notices = licenses.join('\n\n');
const js = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
const html = template.replace('<!-- APP_STYLE -->', () => `<style>${css}</style>`)
  .replace('<!-- APP_SCRIPT -->', () => `<script>${js}</script>`)
  .replace('<head>', () => `<head>\n<!--\nThird-party notices\n${notices.replaceAll('--', '—')}\n-->`);
await writeFile('dist/index.html', html, 'utf8');
await copyFile('dist/index.html', 'Pocket-Citadel.html');
await copyFile('dist/index.html', 'Riftbound.html');
const previewTemplate=await readFile('src/phone-preview.html','utf8');
const previewStyle=await readFile('src/phone-preview.css','utf8');
const previewKeys=[...previewTemplate.matchAll(/data-copy="([^"]+)"/g)].map(match=>match[1]);
const previewCopy={};
for(const locale of ['zh','en','fr','ja','ru','vi']){
  const {translation}=JSON.parse(await readFile(`src/locales/${locale}.json`,'utf8'));
  previewCopy[locale]=Object.fromEntries(previewKeys.map(key=>[key,translation[key]||key]));
}
const preview=previewTemplate.replace('<!-- PHONE_STYLE -->',()=>`<style>${previewStyle}</style>`)
  .replace('__GAME_DOCUMENT__',()=>JSON.stringify(html).replaceAll('<','\\u003c'))
  .replace('__PREVIEW_COPY__',()=>JSON.stringify(previewCopy).replaceAll('<','\\u003c'));
await writeFile('dist/iphone.html',preview,'utf8');
await writeFile('iPhone-Demo.html',preview,'utf8');
await writeFile('THIRD-PARTY-NOTICES.txt', notices, 'utf8');
console.log(`Offline game ready: Riftbound.html (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB); iPhone-Demo.html includes the interactive phone preview.`);
