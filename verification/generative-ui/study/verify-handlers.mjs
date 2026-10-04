import {chromium,expect} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {instrument,interactions,chooseFare,sourceGate} from './run-matrix.mjs';
import {oracleFacts} from './semantic-gates.mjs';
import {stableRef} from '../../../src/generative/data/resource-loader.ts';
import {restoreRecordedThread} from '../resume-artifacts/replay-artifact.mjs';
const base=process.env.OMIO_DEMO_URL??'http://127.0.0.1:5194',output=process.env.OMIO_HANDLER_OUTPUT??`/private/tmp/omio-study-handler-proof-${Date.now()}`;
const health=await(await fetch(base+'/api/agent/health')).json(),fareHealth=await(await fetch(base+'/api/health')).json(),proof=JSON.parse(await readFile(process.env.OMIO_NATIVE_PROOF??'verification/generative-ui/resume-artifacts/final-native-proof/results.json','utf8')),browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
const cases=[...['local-controls','coverage','reload'].map(scenario=>({variant:'a',index:0,scenario})),{variant:'b',index:0,scenario:'mode-selection'},{variant:'b',index:1,scenario:'coverage'},{variant:'b',index:1,scenario:'date-sort-reload'}];
await mkdir(output,{recursive:true});
const saved=(page,variant)=>page.evaluate(variant=>new Promise(resolve=>{const open=indexedDB.open('omio-generative-state',1);open.onsuccess=()=>{const get=open.result.transaction('threads').objectStore('threads').get(`travel-${variant}`);get.onsuccess=()=>resolve(get.result)}}),variant);
try{
 for(const cell of cases){
  const native=proof.results.find(item=>item.variant===cell.variant&&item.index===cell.index&&item.passed&&item.persisted);if(!native)throw new Error('Missing exact recorded native source');
  const context=await browser.newContext(),page=await context.newPage(),recorder={requests:[],sourceVersion:fareHealth.source_version,targetQueryOffset:0};
  await context.addInitScript(instrument);await page.route('**/api/chat',async route=>{recorder.requests.push({blocked:true});await route.abort()});
  recorder.oracle=async(state,date)=>{const query=new URLSearchParams({origin:'london',destination:'paris',departure_date:date,passengers:'1',limit:'100'}),data=await(await fetch(base+'/api/search?'+query)).json();if(data.source_version!==fareHealth.source_version||data.outbound.pages>1)throw new Error('Unexpected source oracle identity or pagination');return{filteredCount:oracleFacts(data.outbound.results.map(row=>({id:row.id,mode:row.mode,carrierId:`carrier-${stableRef(row.company)}`,priceCents:row.price_cents,durationMinutes:row.duration_minutes,direct:true})),{...state.filters,modes:state.modesByLeg['london:paris']??state.filters.modes}).length}};
  const result={...cell,classification:'zero-model native handler verification; exact recorded source; not a machine matrix cell',modelCalls:0,passed:false};
  try{
   await page.goto(base+'/'+cell.variant);await restoreRecordedThread(page,{variant:cell.variant,record:native.persisted,expectedSourceVersion:fareHealth.source_version});const view=page.locator('.travel-travelsurface').last();await view.waitFor();
   if(cell.scenario==='mode-selection'){
    const bus=view.getByRole('button',{name:'Bus',exact:true}).first(),before=await bus.getAttribute('aria-pressed');await bus.focus();await expect(bus).toBeFocused();await bus.press('Enter');await expect(bus).toHaveAttribute('aria-pressed',String(before!=='true'));result.actions={keyboardModeChanged:true,fareSelection:await chooseFare(view)};
   }else if(cell.scenario==='date-sort-reload'){
    await view.locator('input[type=date]').first().fill('2026-10-10');await view.locator('select:has(option[value="durationMinutes:asc"])').first().selectOption('durationMinutes:asc');result.actions={sourceAvailability:await sourceGate(page,recorder,cell,'2026-10-10'),fareSelection:await chooseFare(view)};
    await expect.poll(async()=>{const record=await saved(page,cell.variant);return record.artifacts.at(-1).state.selectedFareIds.length}).toBe(1);const before=await saved(page,cell.variant);await page.reload();recorder.targetQueryOffset=0;await view.waitFor();result.actions.completeReload=await sourceGate(page,recorder,cell,'2026-10-10');expect((await saved(page,cell.variant)).artifacts.map(item=>item.state.selectedFareIds)).toEqual(before.artifacts.map(item=>item.state.selectedFareIds));
    result.actions.partialCoverage=await page.evaluate(async variant=>{const{createFareDataBridge}=await import('/src/generative/data/fare-data-bridge.ts');const{createThreadPersistence}=await import('/src/generative/state/persistence.ts');const persistence=createThreadPersistence(),thread=await persistence.load(`travel-${variant}`),descriptor=thread.descriptors[0],bridge=createFareDataBridge({maxRows:5}),manifest=await bridge.load(descriptor.request,new AbortController().signal);if(manifest.coverage.complete)throw new Error('Expected real partial coverage');descriptor.complete=false;await persistence.save(`travel-${variant}`,thread);return{complete:manifest.coverage.complete,rowCount:manifest.rowCount}},cell.variant);await page.reload();recorder.targetQueryOffset=0;await view.waitFor();result.actions.partialHydration=await sourceGate(page,recorder,cell,'2026-10-10');expect(result.actions.partialHydration.workerRegistrations.some(resource=>resource.rowCount>5)).toBe(true);expect((await saved(page,cell.variant)).artifacts.map(item=>item.state.selectedFareIds)).toEqual(before.artifacts.map(item=>item.state.selectedFareIds));
   }else result.actions=await interactions(page,recorder,cell);
   if(recorder.requests.length)throw new Error('Unexpected blocked model request');result.passed=true;
  }catch(error){result.failure=String(error.stack??error.message??error);}finally{
   result.persisted=await saved(page,cell.variant).catch(()=>null);result.metrics=await page.evaluate(()=>window.__studyMetrics).catch(()=>null);await page.screenshot({path:output+'/'+cell.variant+'-'+cell.scenario+'.png',fullPage:true}).catch(()=>{});await context.close();results.push(result);console.log(JSON.stringify({variant:cell.variant,scenario:cell.scenario,passed:result.passed,failure:result.failure??null}));
  }
 }
}finally{await browser.close();await writeFile(output+'/results.json',JSON.stringify({appRevision:health.appRevision,sourceVersion:fareHealth.source_version,classification:'zero-model native harness verification, not study model authorship',liveModelCalls:0,humanRatings:null,results},null,2));}
if(results.some(result=>!result.passed))process.exitCode=1;
