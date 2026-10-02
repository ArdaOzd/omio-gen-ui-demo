import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from '@playwright/test'
const base=process.env.OMIO_DEMO_URL??'http://127.0.0.1:5194',expectedRevision=process.env.OMIO_APP_REVISION
assert.ok(expectedRevision,'Pin OMIO_APP_REVISION before this one isolated live proof')
const output='verification/generative-ui/a/user-conversation';await mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage()
const requests=[],responses=[],errors=[],timers=new Map();let inflight=0,last=Date.now()
const started=Date.now(),prompt='Plan London → Paris → Barcelona, starting October 9, 2026, with two nights in Paris and four nights in Barcelona. Set the ordered stays to London zero nights, Paris two nights, Barcelona four nights. Load the synthetic fares for each leg. Use the active artifact. Show the full three-city RouteMap and a separate CitySequence with nights, local modes and dates/stays, a compact FarePicker with separate FareCards, and a SyntheticTotal. Finish the itinerary view and briefly tell me what to choose next.'
try{
 const health=await(await context.request.get(`${base}/api/agent/health`)).json(),fixture=await(await context.request.get(`${base}/api/health`)).json();assert.equal(health.appRevision,expectedRevision);assert.equal(health.model,'gpt-6.1-sol');assert.ok(fixture.source_version)
 page.on('request',request=>{if(request.url().endsWith('/api/chat')){requests.push(request.postDataJSON());inflight++;last=Date.now();timers.set(request,setTimeout(()=>void page.close(),180000));console.log('HTTP step',requests.length)}})
 page.on('response',async response=>{if(response.url().endsWith('/api/chat')){try{responses.push({status:response.status(),body:(await response.body()).toString('utf8')})}catch(error){errors.push(String(error))}finally{clearTimeout(timers.get(response.request()));timers.delete(response.request());inflight--;last=Date.now()}}})
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(`${base}/a`);await page.getByRole('textbox',{name:'Message'}).fill(prompt);await page.getByRole('button',{name:'Send message'}).click()
 const deadline=Date.now()+600000;let completed=false
 while(Date.now()<deadline){await page.waitForTimeout(300);if(requests.length&&inflight===0&&Date.now()-last>3000){completed=true;break}}
 assert.equal(completed,true,'One visible turn must finish within the predeclared 600s budget')
 const quietBefore=requests.length;await page.waitForTimeout(6000);assert.equal(requests.length,quietBefore,'Completed turn must remain quiet')
 await page.getByText('Developer conversation diagnostics',{exact:true}).click();await page.getByRole('button',{name:'Refresh diagnostics'}).click();await page.waitForFunction(()=>Boolean(document.querySelector('textarea[aria-label="Conversation diagnostics"]')?.value))
 const diagnostics=JSON.parse(await page.getByRole('textbox',{name:'Conversation diagnostics'}).inputValue()),messages=diagnostics.messages
 const accepted=messages.flatMap(message=>message.parts??[]).filter(part=>part.type==='tool-present'&&part.state==='output-available')
 assert.equal(accepted.length,1,'Do not loop reauthoring the same accepted scene');assert.deepEqual(accepted[0].output,{})
 const receiptIndex=requests.findIndex(request=>request.messages.flatMap(message=>message.parts).some(part=>part.toolCallId===accepted[0].toolCallId&&part.state==='output-available'))
 assert.ok(receiptIndex>=0,'Native empty acknowledgment must reach the continuation request')
 const issued=requests[receiptIndex-1]?.currentContext.artifacts.find(artifact=>artifact.artifactId===accepted[0].input.artifactRef),current=requests[receiptIndex].currentContext.artifacts.find(artifact=>artifact.artifactId===accepted[0].input.artifactRef)
 assert.ok(issued&&current);assert.equal(issued.revision,current.revision,'A issued-scene receipt must refer to the unchanged UI revision')
 const lastEvents=responses.at(-1).body.split('\n').filter(line=>line.startsWith('data: {')).map(line=>JSON.parse(line.slice(6)))
 assert.ok(lastEvents.some(event=>event.type==='text-delta'));assert.ok(!lastEvents.some(event=>event.type==='tool-input-available'),'Last HTTP step must finalize with text, not repeat a scene')
 const state=diagnostics.artifactRecords.find(record=>record.state.artifactId===accepted[0].input.artifactRef).state
 assert.deepEqual(state.stays.map(({cityId,nights})=>({cityId,nights})),[{cityId:'london',nights:0},{cityId:'paris',nights:2},{cityId:'barcelona',nights:4}])
 assert.equal(await page.getByRole('img',{name:'Schematic route: London to Paris to Barcelona'}).count(),1)
 assert.equal(await page.getByRole('list',{name:'Travel stops'}).count(),1);assert.equal(await page.locator('.travel-travelsurface').count(),1)
 assert.equal(errors.length,0);assert.ok(responses.every(response=>response.status===200));assert.equal((await(await context.request.get(`${base}/api/health`)).json()).source_version,fixture.source_version)
 const result={timestamp:new Date().toISOString(),passed:true,classification:'One isolated genuine signed-in Codex turn through native A SDK/browser tools; original user storage untouched.',model:'gpt-6.1-sol',reasoning:'high',appRevision:expectedRevision,fixture,browser:browser.version(),budgets:{perHTTPMs:180000,visibleTurnMs:600000,quietMs:6000},prompt,elapsedMs:Date.now()-started,acceptedScenes:1,nativeEmptyReceiptRecognized:true,finalTextOnly:true,requests,responses,diagnostics,errors,visibleText:await page.locator('.travel-viewport').innerText()}
 await writeFile(`${output}/completion-result.json`,JSON.stringify(result,null,2)+'\n');await page.screenshot({path:`${output}/completion.png`,fullPage:true});console.log(JSON.stringify({passed:true,requests:requests.length,elapsedMs:result.elapsedMs}))
}catch(error){await writeFile(`${output}/completion-failure.json`,JSON.stringify({timestamp:new Date().toISOString(),passed:false,prompt,appRevision:expectedRevision,error:String(error),requests,responses,errors},null,2)+'\n');throw error}finally{for(const timer of timers.values())clearTimeout(timer);await context.close();await browser.close()}
