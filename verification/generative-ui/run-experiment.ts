import { chromium } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
import { assignment,scenarios,withheldPrompt } from '../../src/generative/experiments/scenarios';
const base=process.env.OMIO_DEMO_URL??'http://127.0.0.1:5173';
const participant=process.env.OMIO_PARTICIPANT??'anonymous-demo';
const seed=Number(process.env.OMIO_WITHHELD_SEED??Date.now());
const selected=(process.env.OMIO_SCENARIOS??'cheap-fast,calendar').split(',');
const output=process.env.OMIO_EXPERIMENT_OUTPUT??'verification/generative-ui/experiment/artifacts';
await mkdir(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const reports:unknown[]=[];
for(const variant of assignment(participant))for(const [index,scenario] of scenarios.entries()){
 if(!selected.includes('all')&&!selected.includes(scenario.id))continue;
 const context=await browser.newContext({viewport:{width:1280,height:1000}});await context.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await context.newPage();const requests:unknown[]=[],responses:Array<{status:number;events:unknown[]}>[]=[],errors:string[]=[];let active=0,last=Date.now();const started=Date.now();page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().endsWith('/api/chat')){requests.push(request.postDataJSON());active++;last=Date.now()}});page.on('response',async response=>{if(response.url().endsWith('/api/chat')){try{const body=await response.text();responses.push({status:response.status(),events:body.split('\n').filter(line=>line.startsWith('data: {')).map(line=>JSON.parse(line.slice(6)))});}catch{}finally{active--;last=Date.now()}}});
 await page.goto(`${base}/${variant}`);const prompt=withheldPrompt(index,seed);await page.getByRole('textbox',{name:'Message'}).fill(prompt);await page.getByRole('button',{name:'Send message'}).click();const deadline=Date.now()+180000;while(Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,300));if(requests.length&&active===0&&Date.now()-last>1500)break;}
 const prefix=`${variant}-${scenario.id}`;await page.screenshot({path:`${output}/${prefix}.png`,fullPage:true});await context.tracing.stop({path:`${output}/${prefix}.trace.zip`});const report={participant,variant,order:assignment(participant),scenario:scenario.id,seed,prompt,model:'gpt-6.1-sol',reasoning:'high',liveModelAuthorship:true,cache:'cold browser context; shared backend fixture',elapsedMs:Date.now()-started,completed:active===0,requests,responses,errors,tokenUsage:null,humanRatings:null};reports.push(report);await writeFile(`${output}/${prefix}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({variant,scenario:scenario.id,completed:active===0,requests:requests.length,errors}));await context.close();
}
await writeFile(`${output}/results.json`,JSON.stringify({timestamp:new Date().toISOString(),browser:browser.version(),reports},null,2));await browser.close();
