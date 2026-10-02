import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
const base=process.env.A_PROOF_URL??'http://127.0.0.1:5181'
const output=process.env.A_PROOF_OUTPUT??'verification/generative-ui/a/browser-proof'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
const results=[]
try{
 for(const test of [{scene:0,width:1280,theme:'blue'},{scene:1,width:1280,theme:'blue'},{scene:2,width:1280,theme:'blue'},{scene:0,width:360,theme:'blue'},{scene:0,width:360,theme:'sand'}]){
  const page=await browser.newPage({viewport:{width:test.width,height:950},reducedMotion:'reduce'});const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto(`${base}/?scene=${test.scene}&theme=${test.theme}`)
  await page.getByRole('textbox',{name:'Message'}).fill('Show options');await page.getByRole('button',{name:'Send message'}).click()
  const bus=page.getByRole('button',{name:'Bus',exact:true});await bus.waitFor();await bus.focus();await page.keyboard.press('Enter');await bus.waitFor()
  assert.equal(await bus.getAttribute('aria-pressed'),'true')
  assert.equal(await page.getByText('After the view. Your changes are current.').count(),0,'partial controls must work before completion')
  if(test.scene===0){await page.getByText('Flixbus',{exact:true}).waitFor();assert.equal(await page.getByText('Eurostar',{exact:true}).count(),0)}
  await page.screenshot({path:`${output}/${test.scene}-${test.width}-${test.theme}-partial.png`,fullPage:true})
  await page.getByRole('button',{name:'Resume stream'}).click();await page.getByText('After the view. Your changes are current.').waitFor()
  assert.equal(await bus.getAttribute('aria-pressed'),'true','stream completion must preserve newer action')
  await page.getByRole('button',{name:'Inspect evidence'}).click();const evidence=JSON.parse(await page.locator('#evidence').textContent())
  assert.equal(evidence.requests.length,2);assert.deepEqual(evidence.requests[1].currentContext.artifacts[0].filters.modes,['bus'])
  const serialized=JSON.stringify(evidence.requests);assert.ok(!serialized.includes('private-fare-sentinel-4c917d'));assert.ok(!serialized.includes('"rows":'));assert.ok(!serialized.includes('"fares":'))
  assert.equal(errors.length,0);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false)
  await page.screenshot({path:`${output}/${test.scene}-${test.width}-${test.theme}.png`,fullPage:true})
  results.push({...test,browser:browser.version(),partialControls:true,currentStatePreserved:true,continuationPosts:2,latestSnapshot:true,keyboard:true,reducedMotion:true,horizontalOverflow:false,pageErrors:errors})
  await page.close()
 }
 await writeFile(`${output}/result.json`,JSON.stringify({timestamp:new Date().toISOString(),kind:'deterministic-native-runtime-proof',liveModelAuthorship:false,results},null,2)+'\n')
 console.log(JSON.stringify({status:'pass',cases:results.length,browser:browser.version(),output}))
}finally{await browser.close()}
