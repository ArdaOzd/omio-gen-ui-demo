import { chromium } from '@playwright/test'
import { mkdir,writeFile } from 'node:fs/promises'
import { cpus,totalmem,platform,release } from 'node:os'
const output=process.env.OMIO_BENCHMARK_OUTPUT??'benchmarks/query-engine/artifacts'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
const context=await browser.newContext({viewport:{width:1200,height:800}})
await context.tracing.start({screenshots:true,snapshots:true,sources:true})
const page=await context.newPage();const errors:string[]=[]
page.on('pageerror',error=>errors.push(error.message))
const cdp=await browser.newBrowserCDPSession()
const measurements:Array<{timestamp:number;target:string;type:string;usedBytes:number;totalBytes:number}>=[]
let sampleNumber=0
const awaiting=new Map<number,{resolve:(data:{usedSize:number;totalSize:number})=>void;reject:(reason:unknown)=>void}>()
cdp.on('Target.receivedMessageFromTarget',event=>{const message=JSON.parse(event.message);const pending=awaiting.get(message.id);if(pending&&message.result){awaiting.delete(message.id);pending.resolve(message.result)}})
async function sampleHeap(){
 const {targetInfos}=await cdp.send('Target.getTargets')
 for(const target of targetInfos.filter(target=>['worker','page'].includes(target.type)&&target.url.includes('127.0.0.1:5312'))){
  const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:false})
  try{const id=++sampleNumber;const result=await new Promise<{usedSize:number;totalSize:number}>((resolve,reject)=>{awaiting.set(id,{resolve,reject});void cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id,method:'Runtime.getHeapUsage'})}).catch(reject);setTimeout(()=>{if(awaiting.delete(id))resolve({usedSize:0,totalSize:0})},1000)});measurements.push({timestamp:Date.now(),target:target.url,type:target.type,usedBytes:result.usedSize,totalBytes:result.totalSize})}finally{await cdp.send('Target.detachFromTarget',{sessionId})}
 }
}
await page.goto('http://127.0.0.1:5312/benchmarks/query-engine/index.html')
const completion=page.waitForFunction(()=>window.queryBenchmark?.done,{},{timeout:120000})
let done=false;void completion.then(()=>{done=true})
while(!done){await sampleHeap();await new Promise(resolve=>setTimeout(resolve,200))}
const report=await page.evaluate(()=>window.queryBenchmark)
await page.screenshot({path:`${output}/results.png`,fullPage:true})
await context.tracing.stop({path:`${output}/trace.zip`})
await writeFile(`${output}/results.json`,JSON.stringify({...report,browser:browser.version(),runtime:process.version,hardware:{cpu:cpus()[0]?.model,cores:cpus().length,memoryBytes:totalmem(),platform:platform(),release:release()},ports:{vite:5312},errors,memorySamples:measurements},null,2))
await browser.close()
if(report.error||errors.length||report.metrics.some(metric=>metric.workloads.some(workload=>!workload.correct)))process.exitCode=1
console.log(JSON.stringify({done:report.done,error:report.error,errors,metrics:report.metrics,memorySamples:measurements.length},null,2))
