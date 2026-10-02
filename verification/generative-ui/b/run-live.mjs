import {chromium} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
const out='verification/generative-ui/b/live';await mkdir(out,{recursive:true})
const prompts=[
 'Load London to Paris for 2026-10-09 through 2026-10-15, one passenger, train bus flight. Compare the modes with minimum prices, fastest durations and counts using your own reactive local query. Give me local mode filters and a Show details action that reveals coverage information, plus a selected-trip summary. Choose a clear arrangement and an actual state/query/conditional-action graph. Finish with a brief explanation.',
 'Load London to Paris for 2026-10-09 through 2026-10-15, one passenger, train bus flight. Make the price calendar the main story: query minimum price and count grouped by serviceDate, let me change the selected date and sort locally, and show fare choices from a second query that depends on those variables. Add an action that toggles a journey timeline. Choose an arrangement materially different from a mode comparison table and finish with a brief explanation.'
]
const browser=await chromium.launch({channel:'chrome',headless:true}),cases=[]
for(let index=0;index<prompts.length;index++){
 const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage(),requests=[],responses=[],errors=[];let inflight=0,last=Date.now();const started=Date.now()
 page.on('request',request=>{if(request.url().endsWith('/api/chat')){requests.push(request.postDataJSON());inflight++;last=Date.now();console.log('REQUEST',index,requests.length)}})
 page.on('response',async response=>{if(response.url().endsWith('/api/chat')){try{responses.push({status:response.status(),body:(await response.body()).toString('utf8')})}finally{inflight--;last=Date.now();console.log('FINISHED',index,response.status(),inflight)}}})
 page.on('requestfailed',request=>{if(request.url().endsWith('/api/chat')){inflight=Math.max(0,inflight-1);last=Date.now()}})
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(`${process.env.OMIO_DEMO_URL??'http://127.0.0.1:5194'}/b`);await page.getByRole('textbox',{name:'Message'}).fill(prompts[index]);await page.getByRole('button',{name:'Send message'}).click()
 const waitComplete=async()=>{const deadline=Date.now()+240000;while(Date.now()<deadline){await page.waitForTimeout(350);if(requests.length&&inflight===0&&Date.now()-last>1800)return true}return false}
 const completed=await waitComplete();const before=requests.length;let localAction
 const bus=page.getByRole('button',{name:'Bus',exact:true}).first();if(await bus.count()){await bus.click();localAction='Bus'}
 const toggle=page.getByRole('button',{name:/show details|show coverage|show (journey )?timeline|toggle timeline/i}).first();if(await toggle.count()){const label=await toggle.innerText();await toggle.click();localAction=(localAction??'')+' + '+label}
 await page.waitForTimeout(900);const localClickChatDelta=requests.length-before
 await page.getByRole('textbox',{name:'Message'}).fill('Briefly state my current date and transport selections and any detail or timeline toggle from the current artifact state. Keep the view as it is; reply only with text.');await page.getByRole('button',{name:'Send message'}).click();const followupCompleted=await waitComplete()
 const programs=[];for(const response of responses)for(const line of response.body.split('\n')){if(!line.startsWith('data: {'))continue;const event=JSON.parse(line.slice(6));if(event.type==='tool-input-available'&&event.toolName==='compose_reactive_scene')programs.push(event.input)}
 const result={index,prompt:prompts[index],liveModelAuthorship:true,model:'gpt-6.1-sol',reasoning:'high',browser:browser.version(),elapsedMs:Date.now()-started,completed,followupCompleted,localAction,localClickChatDelta,requests,responses,programs,errors,visibleText:await page.locator('body').innerText()};cases.push(result)
 await writeFile(`${out}/case-${index}.json`,JSON.stringify(result,null,2));await page.screenshot({path:`${out}/case-${index}.png`,fullPage:true});console.log('RESULT',JSON.stringify({index,completed,followupCompleted,programs:programs.length,requests:requests.length,localClickChatDelta,errors}));await context.close()
}
await writeFile(`${out}/results.json`,JSON.stringify({timestamp:new Date().toISOString(),cases:cases.map(({requests,responses,...rest})=>rest)},null,2));await browser.close()
