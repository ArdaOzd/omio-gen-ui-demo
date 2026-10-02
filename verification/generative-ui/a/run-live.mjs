import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out='verification/generative-ui/a/live';await mkdir(out,{recursive:true});
const prompts=[
'Load London to Paris fares for 2026-10-09 through 2026-10-15, all train bus flight modes, one passenger. Make a SplitPane with a Section of DateStrip, ModeChips, SortSelect and FareCards on the left, and StickySummary with CheapestFastest and SyntheticTotal on the right. Explain the tradeoffs after the view. Use the active artifact.',
'For London to Paris on 2026-10-09 through 2026-10-15, one passenger, all train bus flight modes: make the calendar the main story. Put PriceCalendar first, followed by a ResponsiveGrid with mode comparison, duration-price plot and local controls. Keep fare choices in a compact Section below. Explain what I should compare.',
'Load London to Paris for 2026-10-09 through 2026-10-15, one passenger, all modes. Present a journey-story arrangement: RouteMap above, ItineraryTimeline in a Section below, then Inline local controls and a compact FareCards section. Retain a SyntheticTotal. Finish with a concise note that the schedules are synthetic.'
];
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
for(let index=0;index<prompts.length;index++){
 const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage();const requests=[],errors=[];let inflight=0,last=Date.now();const started=Date.now();
 page.on('request',req=>{if(req.url().endsWith('/api/chat')){requests.push(req.postDataJSON());inflight++;last=Date.now();console.log('REQUEST',index,requests.length)}});
 page.on('response',async res=>{if(res.url().endsWith('/api/chat')){console.log('HTTP',index,res.status());try{await res.finished()}finally{inflight--;last=Date.now();}}});
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${process.env.OMIO_DEMO_URL??'http://127.0.0.1:5173'}/a`);await page.getByRole('textbox',{name:'Message'}).waitFor();await page.getByRole('textbox',{name:'Message'}).fill(prompts[index]);await page.getByRole('button',{name:'Send message'}).click();
 const deadline=Date.now()+160000;while(Date.now()<deadline){await new Promise(r=>setTimeout(r,350));if(requests.length&&inflight===0&&Date.now()-last>1800)break;}
 const body=await page.locator('body').innerText();const trees=[];for(const req of requests)for(const message of req.messages??[])for(const part of message.parts??[])if(part.type==='tool-present'&&part.input)trees.push(part.input);
 const tree=trees.at(-1);const types=[];function walk(node){if(node?.$type)types.push(node.$type);const children=Array.isArray(node?.children)?node.children:node?.children&&typeof node.children==='object'?[node.children]:[];children.forEach(walk)}if(tree)walk(tree);
 const before=requests.length;const bus=page.getByRole('button',{name:'Bus',exact:true}).first();if(await bus.count()){await bus.click();await new Promise(r=>setTimeout(r,800));}
 const result={index,prompt:prompts[index],liveModelAuthorship:true,model:'gpt-6.1-sol',reasoning:'high',browser:browser.version(),requests:requests.length,localClickChatDelta:requests.length-before,elapsedMs:Date.now()-started,errors,completed:inflight===0,tree,componentTypes:types,visibleText:body.slice(-12000)};results.push(result);await writeFile(`${out}/case-${index}.json`,JSON.stringify(result,null,2));await page.screenshot({path:`${out}/case-${index}.png`,fullPage:true});console.log('RESULT',JSON.stringify({index,requests:result.requests,completed:result.completed,types,errors,localClickChatDelta:result.localClickChatDelta}));await context.close();
}
await writeFile(`${out}/results.json`,JSON.stringify({timestamp:new Date().toISOString(),cases:results},null,2));await browser.close();
