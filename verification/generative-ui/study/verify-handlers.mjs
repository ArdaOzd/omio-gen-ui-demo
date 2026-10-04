import{chromium}from'@playwright/test';
import{readFile,writeFile,mkdir}from'node:fs/promises';
import{instrument,interactions}from'./run-matrix.mjs';
import{oracleFacts}from'./semantic-gates.mjs';
import{stableRef}from'../../../src/generative/data/resource-loader.ts';
import{restoreRecordedThread}from'../resume-artifacts/replay-artifact.mjs';
const base=process.env.OMIO_DEMO_URL??'http://127.0.0.1:5194',output=process.env.OMIO_HANDLER_OUTPUT??'/private/tmp/omio-study-handler-proof',health=await(await fetch(base+'/api/agent/health')).json(),fareHealth=await(await fetch(base+'/api/health')).json(),proof=JSON.parse(await readFile('verification/generative-ui/resume-artifacts/helper-proof/results.json','utf8')),native=proof.results[0],browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
await mkdir(output,{recursive:true});
try{
 for(const scenario of['local-controls','coverage','reload']){
  const context=await browser.newContext(),page=await context.newPage(),recorder={requests:[],sourceVersion:fareHealth.source_version,targetQueryOffset:0};
  await context.addInitScript(instrument);await page.route('**/api/chat',async route=>{recorder.requests.push({blocked:true});await route.abort()});
  recorder.oracle=async(state,date)=>{const query=new URLSearchParams({origin:'london',destination:'paris',departure_date:date,passengers:'1',limit:'100'}),data=await(await fetch(base+'/api/search?'+query)).json();if(data.source_version!==fareHealth.source_version||data.outbound.pages>1)throw new Error('Unexpected source oracle identity or pagination');return{filteredCount:oracleFacts(data.outbound.results.map(row=>({id:row.id,mode:row.mode,carrierId:`carrier-${stableRef(row.company)}`,priceCents:row.price_cents,durationMinutes:row.duration_minutes,direct:true})),{...state.filters,modes:state.modesByLeg['london:paris']??state.filters.modes}).length}};
  const result={scenario,variant:native.variant,classification:'zero-model native handler verification; exact recorded source; not a machine matrix cell',modelCalls:0,passed:false};
  try{await page.goto(base+'/'+native.variant);await restoreRecordedThread(page,{variant:native.variant,record:native.persisted,expectedSourceVersion:fareHealth.source_version});await page.locator('.travel-travelsurface').last().waitFor();result.actions=await interactions(page,recorder,{scenario,variant:native.variant});if(recorder.requests.length)throw new Error('Unexpected blocked model request');result.passed=true;}catch(error){result.failure=String(error.stack??error.message??error);}finally{result.persisted=await page.evaluate(variant=>new Promise(resolve=>{const open=indexedDB.open('omio-generative-state',1);open.onsuccess=()=>{const get=open.result.transaction('threads').objectStore('threads').get(`travel-${variant}`);get.onsuccess=()=>resolve(get.result)}}),native.variant).catch(()=>null);result.metrics=await page.evaluate(()=>window.__studyMetrics).catch(()=>null);await page.screenshot({path:output+'/'+scenario+'.png',fullPage:true}).catch(()=>{});await context.close();results.push(result);console.log(JSON.stringify({scenario,passed:result.passed,failure:result.failure??null}));}
 }
}finally{await browser.close();await writeFile(output+'/results.json',JSON.stringify({appRevision:health.appRevision,sourceVersion:fareHealth.source_version,classification:'zero-model native harness verification, not study model authorship',liveModelCalls:0,humanRatings:null,results},null,2));}
if(results.some(result=>!result.passed))process.exitCode=1;
