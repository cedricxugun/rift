import { createServer } from 'node:http';
import { readFile, access } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';

const port = Number(process.env.POCKET_CITADEL_PORT || 4177);
const lan=process.argv.includes('--lan');
createServer(async (req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  try {
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/health'){
      const {version}=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
      const ready=await Promise.all(['Riftbound.html','iPhone-Demo.html'].map(file=>access(new URL(`../${file}`,import.meta.url)))).then(()=>true,()=>false);
      const body=JSON.stringify({app:'riftbound',version,ready});
      res.writeHead(ready?200:503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(body);return;
    }
    const file=/^\/(iphone|iPhone-Demo)\.html$/.test(pathname)?'iPhone-Demo.html':'Riftbound.html';
    const html = await readFile(new URL(`../${file}`, import.meta.url));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html);
  } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Run bun run build first.');
  }
}).listen(port, lan?'0.0.0.0':'127.0.0.1', () => {
  console.log(`Local: http://127.0.0.1:${port}/iphone.html`);
  if(lan)for(const entries of Object.values(networkInterfaces()))for(const entry of entries||[])if(entry.family==='IPv4'&&!entry.internal)console.log(`iPhone (same Wi-Fi): http://${entry.address}:${port}`);
});
