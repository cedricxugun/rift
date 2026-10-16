import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.POCKET_CITADEL_PORT||4177);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid preview port.');
const origin=`http://127.0.0.1:${port}`,url=origin+'/iphone.html';

async function previewStatus(){
  try{
    const response=await fetch(origin+'/health',{signal:AbortSignal.timeout(1500)});
    if(!response.headers.get('content-type')?.includes('application/json'))return 'occupied';
    const status=await response.json();
    return status.app==='riftbound'?(status.ready?'ready':'missing-build'):'occupied';
  }catch{return 'stopped';}
}

let status=await previewStatus();
if(status==='occupied')throw new Error(`Port ${port} is already in use by another service or an older preview. Close that preview first.`);
if(status==='missing-build')throw new Error('Build the offline game with bun run build first.');
if(status==='stopped'){
  const server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{cwd:root,detached:true,stdio:'ignore',windowsHide:true});
  await new Promise((resolve,reject)=>{server.once('spawn',resolve);server.once('error',reject);});
  server.unref();
  for(let attempt=0;attempt<20;attempt++){
    await new Promise(resolve=>setTimeout(resolve,150));status=await previewStatus();
    if(status!=='stopped')break;
  }
  if(status!=='ready')throw new Error('The local preview could not start. Run bun scripts/serve.mjs to see the error.');
}
console.log(`Preview ready: ${url}`);
if(!process.argv.includes('--no-open')){
  const opener=process.platform==='win32'?spawn('cmd.exe',['/d','/c','start','',url],{detached:true,stdio:'ignore',windowsHide:true}):spawn(process.platform==='darwin'?'open':'xdg-open',[url],{detached:true,stdio:'ignore'});
  opener.on('error',()=>console.log(`Open this address in your browser: ${url}`));opener.unref();
}
