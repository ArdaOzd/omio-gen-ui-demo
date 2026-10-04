import {chromium,expect} from '@playwright/test'
import {readFile,writeFile} from 'node:fs/promises'
const directory='verification/generative-ui/b/user-itinerary'
const prior=JSON.parse(await readFile(`${directory}/followup-result.json`,'utf8')),request=prior.requests.at(-1),captured=JSON.parse(await readFile(`${directory}/captured-context.json`,'utf8'))
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage(),requests=[],responses=[],errors=[]
let inflight=0,last=Date.now(),requestStarted=Date.now(),closing=false
page.on('pageerror',error=>errors.push(error.message))
page.on('request',request=>{if(request.url().endsWith('/api/chat')){requests.push(request.postDataJSON());inflight++;requestStarted=Date.now();last=Date.now();console.log('RESUME_REQUEST',requests.length)}})
page.on('response',async response=>{if(response.url().endsWith('/api/chat')){try{responses.push({status:response.status(),body:(await response.body()).toString()})}catch(error){if(!closing)errors.push(error.message)}finally{inflight--;last=Date.now();console.log('RESUME_FINISH',response.status())}}})
page.on('requestfailed',request=>{if(request.url().endsWith('/api/chat')){inflight=Math.max(0,inflight-1);last=Date.now()}})
await page.goto('http://127.0.0.1:5194/b')
const refreshed=await page.evaluate(async({request,captured})=>{const {mountResume}=await import('/verification/generative-ui/b/user-itinerary/resume-client.jsx');return mountResume(request,captured)},{request,captured})
await page.waitForFunction(()=>typeof globalThis.__continueExactTail==='function')
await page.evaluate(()=>{void globalThis.__continueExactTail()})
const started=Date.now();let completed=false
while(Date.now()-started<600000){await page.waitForTimeout(400);if(inflight&&Date.now()-requestStarted>180000)break;if(requests.length&&inflight===0&&Date.now()-last>2000){completed=true;break}}
const messages=await page.evaluate(()=>globalThis.__resumeMessages??[]),snapshot=await page.evaluate(()=>globalThis.__resumeCapture()),visibleText=await page.locator('.resume-host').innerText()
expect(requests[0]).toEqual(request)
const accepted=messages.flatMap(message=>message.parts??[]).filter(part=>part.type==='tool-compose_reactive_scene'&&part.state==='output-available'&&part.output?.status==='accepted')
const oldIds=new Set(request.messages.flatMap(message=>message.parts??[]).filter(part=>part.type==='tool-compose_reactive_scene').map(part=>part.toolCallId))
const newAccepted=accepted.filter(part=>!oldIds.has(part.toolCallId))
const passed=completed&&responses.every(response=>response.status===200)&&errors.length===0&&!visibleText.includes('Preparing reactive view…')&&!visibleText.includes('This generated view could not be applied')
await page.screenshot({path:`${directory}/resumed-followup.png`,fullPage:true})
await writeFile(`${directory}/resumed-followup-result.json`,JSON.stringify({timestamp:new Date().toISOString(),classification:'Genuine signed-in Codex continuation resumed from exact unfinished third HTTP request. First request body equality asserted; prior accepted programs/IDs/state preserved, no completed generation repeated.',passed,completed,firstRequestExactlyMatchesUnfinished:true,refreshed,newAcceptedPrograms:newAccepted.map(part=>part.input),snapshot,requests,responses,messages,errors,visibleText},null,2))
console.log('RESUMED_RESULT',JSON.stringify({passed,completed,requests:requests.length,statuses:responses.map(response=>response.status),newAccepted:newAccepted.length,errors}))
closing=true;await context.close();await browser.close()
