import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
const base=process.env.OMIO_EXTENSION_URL??'http://127.0.0.1:5397'
const output=new URL('./artifacts/',import.meta.url).pathname
await mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:'chrome',headless:true})
const reports=[]
try {
 for(const variant of ['a','b']) {
  const page=await browser.newPage({viewport:{width:360,height:900},reducedMotion:'reduce'})
  const errors=[],requests=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('request',request=>{if(request.url().endsWith('/api/chat'))requests.push(request.url())})
  await page.goto(`${base}/?variant=${variant}`)
  if(variant==='a') {
   await page.getByRole('textbox',{name:'Message'}).fill('Show my selection count')
   await page.getByRole('button',{name:'Send message'}).click()
  }
  const count=page.getByRole('status',{name:'Selected fares'})
  await count.waitFor()
  assert.equal(await count.textContent(),'0 selected fares')
  const picker=page.getByRole('combobox',{name:'Choose a synthetic fare'})
  await picker.selectOption('fare-2026-10-09-bus')
  await count.filter({hasText:'1 selected fare'}).waitFor()
  if(variant==='a') {
   await page.getByRole('button',{name:'Resume stream'}).click()
   await page.getByText('After the view. Your changes are current.').waitFor()
   assert.equal(await count.textContent(),'1 selected fare')
  }
  await page.screenshot({path:`${output}/${variant}.png`,fullPage:true})
  await picker.selectOption('')
  await count.filter({hasText:'0 selected fares'}).waitFor()
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
  assert.equal(overflow,false)
  assert.deepEqual(errors,[])
  assert.deepEqual(requests,[])
  reports.push({variant,browser:browser.version(),viewport:360,selectedCount:1,deselectedCount:0,realNativePresent:variant==='a',realOpenUIRenderer:variant==='b',streamPreserved:variant==='a',pageErrors:errors,chatNetworkRequests:requests.length,horizontalOverflow:overflow})
  await page.close()
 }
 await writeFile(new URL('./result.json',import.meta.url),JSON.stringify({recordedAt:new Date().toISOString(),classification:'deterministic real-adapter proof; no live model authorship',reports},null,2)+'\n')
 console.log(JSON.stringify({status:'pass',reports}))
} finally { await browser.close() }
