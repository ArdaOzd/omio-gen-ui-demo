import {chromium,expect} from '@playwright/test'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
const directory='verification/generative-ui/b/user-itinerary'
const outputDirectory=process.env.OMIO_PROOF_OUTPUT??directory
await mkdir(outputDirectory,{recursive:true})
const servedAgent=await fetch('http://127.0.0.1:8095/api/agent/health').then(response=>response.json())
if(process.env.OMIO_EXPECT_APP_REVISION&&servedAgent.appRevision!==process.env.OMIO_EXPECT_APP_REVISION)throw new Error(`Expected served revision ${process.env.OMIO_EXPECT_APP_REVISION}, got ${servedAgent.appRevision}`)
const captured=JSON.parse(await readFile(`${directory}/captured-context.json`,'utf8'))
const source=(await readFile(`${directory}/accepted-repair.openui`,'utf8')).trimEnd()
const failed=JSON.parse(await readFile(`${directory}/failed-part.json`,'utf8'));delete failed.rejectedSourceRetained
const browser=await chromium.launch({channel:'chrome',headless:true})
const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage(),requests=[],responses=[],errors=[]
let inflight=0,lastActivity=Date.now(),requestStarted=Date.now(),closing=false
page.on('pageerror',error=>errors.push(error.message))
page.on('request',request=>{if(request.url().endsWith('/api/chat')){requests.push(request.postDataJSON());inflight++;requestStarted=Date.now();lastActivity=Date.now();console.log('CHAT_REQUEST',requests.length)}})
page.on('response',async response=>{if(response.url().endsWith('/api/chat')){try{responses.push({status:response.status(),body:(await response.body()).toString()})}catch(error){if(!closing)errors.push(error.message)}finally{inflight--;lastActivity=Date.now();console.log('CHAT_FINISH',response.status())}}})
page.on('requestfailed',request=>{if(request.url().endsWith('/api/chat')){inflight--;lastActivity=Date.now()}})
await page.goto('http://127.0.0.1:5194/b')
const replay=await page.evaluate(async({captured,source,failed})=>{
 const [{createFareDataBridge},{createThreadPersistence},contracts]=await Promise.all([import('/src/generative/data/fare-data-bridge.ts'),import('/src/generative/state/persistence.ts'),import('/src/generative/contracts/index.ts')])
 const bridge=createFareDataBridge(),manifests=[]
 for(const manifest of captured.manifests){const {complete,truncated,...request}=manifest.coverage;manifests.push(await bridge.load(request,new AbortController().signal))}
 const perLegCounts=[]
 for(const [index,[origin,destination,date]] of [['barcelona','prague','2026-10-03'],['prague','paris','2026-10-05'],['paris','prague','2026-10-10']].entries()){
  const result=await bridge.query({version:1,sources:[{datasetRef:manifests[index].datasetId,alias:'fares'}],where:{all:[{field:'originId',op:'eq',value:origin},{field:'destinationId',op:'eq',value:destination},{field:'serviceDate',op:'eq',value:date}]},groupBy:['mode'],metrics:[{as:'count',op:'count'}],limit:4},new AbortController().signal);perLegCounts.push(result.rows)
 }
 const artifactRef=captured.artifactState.artifactId
 const messages=[{id:'isolated-itinerary-context',role:'user',parts:[{type:'text',text:'Compare train and bus for Barcelona to Prague on October 3, 2026, Prague to Paris on October 5 after two nights, and Paris to Prague on October 10 after five nights.'}]},{id:'captured-repaired-assistant',role:'assistant',parts:[failed,{type:'tool-compose_reactive_scene',toolCallId:'08f3349c-f9a8-43e6-91b6-6b47e1dbd83a',state:'output-available',input:{artifactRef,programRevision:5,program:source},output:{artifactId:artifactRef,programRevision:5,status:'accepted'}}]}]
 await createThreadPersistence().save('travel-b',{schemaVersion:contracts.CONTRACT_VERSION,catalogVersion:contracts.CATALOG_VERSION,activeArtifactId:artifactRef,parserVersion:'openui-0.3.0',queryVersion:'1',messages,artifacts:[{variant:'b',source,state:{...captured.artifactState,sort:{field:'priceCents',direction:'desc'}}}],descriptors:manifests.map(manifest=>{const {complete,truncated,...request}=manifest.coverage;return {datasetId:manifest.datasetId,request,sourceVersion:captured.manifests.find(item=>item.datasetId===manifest.datasetId).sourceVersion,complete:manifest.coverage.complete}})})
 return {manifests:manifests.map(manifest=>({datasetId:manifest.datasetId,rowCount:manifest.rowCount,sourceVersion:manifest.source.sourceVersion,compactSummary:manifest.compactSummary})),perLegCounts}
},{captured,source,failed})
await page.reload();await expect(page.getByRole('heading',{name:'Three-leg train and bus comparison',exact:true})).toBeVisible({timeout:30000})
await expect(page.getByRole('table')).toHaveCount(3)
await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(0)
await expect(page.getByText('No options match. Try another mode, date, or price limit.',{exact:true})).toHaveCount(4)
await expect(page.getByRole('combobox',{name:'Sort available fares'})).toHaveValue('priceCents:desc')
expect(await page.getByText('Preparing reactive view…',{exact:true}).count()).toBe(0)
expect(await page.getByText(/This generated view could not be completed/).count()).toBe(0)
expect(replay.manifests.map(manifest=>manifest.datasetId)).toEqual(captured.manifests.map(manifest=>manifest.datasetId))
expect(replay.manifests[0].rowCount).toBeGreaterThan(0);expect(replay.manifests.slice(1).map(manifest=>manifest.rowCount)).toEqual([0,0]);expect(replay.perLegCounts).toEqual([[],[],[]]);expect(errors).toEqual([])
await page.getByText('Developer conversation diagnostics',{exact:true}).click();await page.getByRole('button',{name:'Refresh diagnostics',exact:true}).click();await expect.poll(async()=>JSON.parse(await page.getByRole('textbox',{name:'Conversation diagnostics'}).inputValue()).artifactRecords[0].state.revision).toBe(replay.manifests[0].sourceVersion==='sqlite-demo-v1'?5:6);const diagnostics=JSON.parse(await page.getByRole('textbox',{name:'Conversation diagnostics'}).inputValue());await page.getByText('Developer conversation diagnostics',{exact:true}).click();const replayText=await page.locator('body').innerText();await page.screenshot({path:`${outputDirectory}/replay.png`,fullPage:true})
await writeFile(`${outputDirectory}/replay-result.json`,JSON.stringify({timestamp:new Date().toISOString(),classification:'Exact accepted user source and failed part restored in isolated browser context; reconstructed itinerary user prompt; real Python fare API and browser query worker. Descending host sort intentionally seeded to check current-state preservation.',passed:true,restoredUIRevision:diagnostics.artifactRecords[0].state.revision,capturedProgramRevision:5,restoredSourceCharacters:diagnostics.artifactRecords[0].source.length,capturedAggregateRows:captured.manifests.map(manifest=>manifest.rowCount),refreshedAggregateRows:replay.manifests.map(manifest=>manifest.rowCount),replay,requests:requests.length,errors,visibleText:replayText},null,2))
console.log('REPLAY_PASS',JSON.stringify({programRevision:5,restoredUIRevision:diagnostics.artifactRecords[0].state.revision}));if(process.env.OMIO_REPLAY_ONLY==='1'){closing=true;await context.close();await browser.close();process.exit(0)}
await page.getByRole('textbox',{name:'Message'}).fill('I will stay 5 days in Paris. Keep Barcelona to Prague on October 3, Prague to Paris on October 5, and Paris to Prague on October 10, 2026. Show train and bus only, with clear per-leg empty results if none exist in the loaded demo. Preserve my current sort.');await page.getByRole('button',{name:'Send message'}).click()
const deadline=Date.now()+600000;let completed=false
while(Date.now()<deadline){await page.waitForTimeout(400);if(inflight&&Date.now()-requestStarted>180000)break;if(requests.length&&inflight===0&&Date.now()-lastActivity>2000){completed=true;break}}
await page.getByText('Developer conversation diagnostics',{exact:true}).click();await page.getByRole('button',{name:'Refresh diagnostics',exact:true}).click();const finalDiagnostics=JSON.parse(await page.getByRole('textbox',{name:'Conversation diagnostics'}).inputValue());await page.getByText('Developer conversation diagnostics',{exact:true}).click()
const visibleText=await page.locator('body').innerText()
const finalStop=responses.at(-1)?.body.includes('\"finishReason\":\"stop\"')===true
const semanticState=finalDiagnostics.artifactRecords.find(record=>record.state.artifactId===captured.artifactState.artifactId)?.state
const semanticPass=semanticState?.sort.direction==='desc'&&semanticState?.dates.start==='2026-10-03'&&semanticState?.stays.some(stay=>stay.cityId==='paris'&&stay.nights===5)
const uiErrors=await page.locator('.travel-tools-error').count()
const passed=completed&&responses.every(response=>response.status===200)&&finalStop&&semanticPass&&uiErrors===0&&!visibleText.includes('Preparing reactive view…')
await page.screenshot({path:`${outputDirectory}/followup.png`,fullPage:true})
await writeFile(`${outputDirectory}/followup-result.json`,JSON.stringify({timestamp:new Date().toISOString(),servedAgent,classification:'Signed-in Codex gpt-6.1-sol/high follow-up attempt to captured accepted-source replay in an isolated browser; no user session changes.',passed,finalStop,semanticPass,uiErrors,transportCompleted:completed,requests,responses,errors,finalDiagnostics,visibleText},null,2))
console.log('FOLLOWUP',JSON.stringify({passed,finalStop,semanticPass,uiErrors,completed,requests:requests.length,statuses:responses.map(response=>response.status),errors,preparing:visibleText.includes('Preparing reactive view…')}))
closing=true;await context.close();await browser.close()
