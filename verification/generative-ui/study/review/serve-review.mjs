import{createServer}from'node:http';
import{readFile,writeFile}from'node:fs/promises';
import{resolve,join}from'node:path';
import{fileURLToPath}from'node:url';
import{chromium}from'@playwright/test';
import{assertFixture,assertRuntime}from'../matrix.mjs';
import{restoreRecordedThread}from'../../resume-artifacts/replay-artifact.mjs';
const[packageDirectory,upstream='http://127.0.0.1:5194']=process.argv.slice(2);
if(!packageDirectory)throw new Error('Usage: node --import tsx serve-review.mjs <review-package-directory> [frozen-demo-url]');
const root=resolve(packageDirectory),toolsDirectory=fileURLToPath(new URL('.',import.meta.url)),packet=JSON.parse(await readFile(join(root,'public','manifest.json'),'utf8')),identity=JSON.parse(await readFile(join(root,'private','identity-map.json'),'utf8'));
const browser=await chromium.launch({channel:'chrome',headless:false}),context=await browser.newContext();
let activeToken,preparing=false;
async function prepareItem(token){const item=identity.items[token],page=await context.newPage();try{activeToken=token;await page.goto(`http://127.0.0.1:${server.address().port}/interactive/${token}`);await restoreRecordedThread(page,{variant:item.variant,record:item.record.persisted,expectedSourceVersion:packet.sourceFreeze.fixture.sourceVersion});await page.locator('.travel-travelsurface').first().waitFor({state:'visible',timeout:30000});await page.screenshot({path:join(root,'public','captures',`${token}.png`),fullPage:true});}finally{await page.close();}}
async function verifyFreeze(){
 const[fare,agent]=await Promise.all(['/api/health','/api/agent/health'].map(path=>fetch(upstream+path,{signal:AbortSignal.timeout(5000)})));
 if(!fare.ok||!agent.ok)throw new Error('The frozen local demo is unavailable');
 const health=await fare.json();assertFixture({sourceVersion:health.source_version,rowCount:health.fare_count},packet.sourceFreeze.fixture);assertRuntime(await agent.json(),packet.sourceFreeze.runtime);
}
function send(response,status,body,type='application/json'){response.writeHead(status,{'content-type':type,'cache-control':'no-store'});response.end(type==='application/json'?JSON.stringify(body):body);}
async function nativeHtml(token){
 const item=identity.items[token];if(!item?.record?.persisted)throw new Error('No recorded artifact for this item');
 const response=await fetch(`${upstream}/${item.variant}`);if(!response.ok)throw new Error('Native application unavailable');
 const html=await response.text(),injection=`<script>history.replaceState(null,'','/${item.variant}')</script><style>.travel-variant-nav,.travel-composer-wrap,[aria-label="Retry response"],#root>details{display:none!important}.travel-chat-header a{pointer-events:none}</style>`;
 return html.replace('<head>','<head>'+injection);
}
const server=createServer(async(request,response)=>{
 try{
  const url=new URL(request.url,'http://localhost'),path=url.pathname;if(decodeURIComponent(path).split('/').includes('..')){send(response,404,{error:'Review asset unavailable'});return;}
  if(path==='/review.html'||path==='/'){send(response,200,await readFile(join(toolsDirectory,'review.html'),'utf8'),'text/html');return;}
  if(['/manifest.json','/ratings-template.json'].includes(path)){send(response,200,await readFile(join(root,'public',path.slice(1)),'utf8'),'application/json; charset=utf-8');return;}
  if(path==='/review/form.mjs'||path==='/review/export-validation.mjs'){send(response,200,await readFile(join(toolsDirectory,path.slice('/review/'.length)),'utf8'),'text/javascript');return;}
  if(/^\/captures\/[a-f0-9]{24}\.png$/.test(path)){send(response,200,await readFile(join(root,'public',path.slice(1))),'image/png');return;}
  if(path.startsWith('/activate/')&&request.method==='POST'){
   const token=path.slice('/activate/'.length),item=identity.items[token];if(!item?.record?.persisted){send(response,404,{error:'No usable native artifact was collected'});return;}
   if(preparing){send(response,409,{error:'Another item is restoring'});return;}
   preparing=true;
   try{await verifyFreeze();activeToken=token;if(!url.searchParams.has('reload')){await prepareItem(token)}send(response,200,{ready:true});}finally{preparing=false;}return;
  }
  if(path.startsWith('/interactive/')){const token=path.slice('/interactive/'.length);if(token!==activeToken){send(response,403,{error:'This review item is not active'});return;}send(response,200,await nativeHtml(token),'text/html');return;}
  if(path==='/a'||path==='/b'){if(!activeToken){send(response,403,{error:'No active review item'});return;}send(response,200,await nativeHtml(activeToken),'text/html');return;}
  if(request.method!=='GET'&&request.method!=='HEAD'){send(response,403,{error:'Review replay permits local interaction only; model calls are disabled'});return;}
  if(path.startsWith('/api/')){if(path==='/api/chat'){send(response,403,{error:'Model calls are disabled'});return;}await verifyFreeze();}
  const allowed=['/src/','/node_modules/','/@vite/','/@react-refresh','/@id/','/api/','/favicon.ico'];
  if(!allowed.some(prefix=>path.startsWith(prefix))){send(response,404,{error:'Review asset unavailable'});return;}
  const proxied=await fetch(upstream+request.url,{signal:AbortSignal.timeout(15000)});response.writeHead(proxied.status,{'content-type':proxied.headers.get('content-type')??'application/octet-stream','cache-control':'no-store'});response.end(Buffer.from(await proxied.arrayBuffer()));
 }catch{if(!response.headersSent)send(response,503,{error:'The recorded replay is unavailable or its frozen source changed. Keep unsupported ratings empty.'});else response.end();}
});
await verifyFreeze();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));for(const item of packet.items)if(item.captureAvailable){try{await verifyFreeze();await prepareItem(item.token)}catch{item.captureAvailable=false;item.capture=null;item.artifactAvailable=false;item.status='recorded replay unavailable';}}await writeFile(join(root,'public','manifest.json'),JSON.stringify(packet,null,2));const url=`http://127.0.0.1:${server.address().port}/review.html`;const reviewer=await context.newPage();await reviewer.goto(url);console.log(JSON.stringify({reviewUrl:url,participant:packet.participant,humanRatings:null,modelCalls:'blocked',storage:'isolated browser context and review origin'}));
async function stop(){await browser.close();server.close();}
process.once('SIGINT',()=>void stop());process.once('SIGTERM',()=>void stop());
