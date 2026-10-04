import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from '@playwright/test'
const base=process.env.OMIO_STORIES_URL??'http://127.0.0.1:5398',output=new URL('./artifacts/',import.meta.url).pathname
await mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:'chrome',headless:true}),reports=[],failures=[]
async function open(component,variant,state='ready',width=800,theme='blue',recipe=false){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[],network=[],blocked=[]
 page.setDefaultTimeout(15000)
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!request.url().startsWith(base))network.push(request.url())})
 await page.route('**/*',route=>{const url=route.request().url();if(!url.startsWith(base)||new URL(url).pathname==='/api/chat'){blocked.push(url);return route.abort('blockedbyclient')}return route.continue()})
 await page.goto(`${base}/?component=${component}&variant=${variant}&state=${state}&theme=${theme}${recipe?'&recipe=complex':''}`)
 await page.waitForFunction(()=>window.catalogStory!==undefined)
 {await page.getByRole('textbox',{name:'Message'}).fill('Render this deterministic component story');await page.getByRole('button',{name:'Send message'}).click();await page.getByText('Story fixture complete.').waitFor()}
 if(state!=='loading')await page.waitForFunction(()=>{const e=window.catalogStory.evidence();const requests=e.requiresRequest&&e.stage!=='invalid-ref';return (!requests||e.queryCalls.length+e.factsStarted>0)&&e.queriesSettled===e.queryCalls.length&&e.factsSettled===e.factsStarted})
 return {page,errors,network,blocked}
}
async function controls(page,name){
 const sends=await page.evaluate(()=>window.catalogStory.evidence().requests.length)
 const check=async predicate=>page.waitForFunction(predicate)
 switch(name){
 case 'ModeChips':await page.getByRole('button',{name:'Bus',exact:true}).click();await check(()=>window.catalogStory.evidence().current.filters.modes.length===1&&window.catalogStory.evidence().current.filters.modes[0]==='bus');break
 case 'CarrierFilter':await page.getByRole('checkbox').first().check();await check(()=>window.catalogStory.evidence().current.filters.carrierIds.length===1);break
 case 'DirectToggle':await page.getByRole('checkbox').check();await check(()=>window.catalogStory.evidence().current.filters.directOnly);break
 case 'SortSelect':await page.getByRole('combobox').selectOption('durationMinutes:asc');await check(()=>window.catalogStory.evidence().current.sort.field==='durationMinutes'&&window.catalogStory.evidence().current.sort.direction==='asc');break
 case 'PriceRange':await page.getByRole('spinbutton').fill('30');await check(()=>window.catalogStory.evidence().current.filters.maxPriceCents===3000);break
 case 'DurationRange':await page.getByRole('spinbutton').fill('200');await check(()=>window.catalogStory.evidence().current.filters.maxDurationMinutes===200);break
 case 'DateStrip':await page.locator('input[type=date]').fill('2026-10-04');await check(()=>window.catalogStory.evidence().current.dates.start==='2026-10-04'&&!window.catalogStory.evidence().current.dates.end);break
 case 'DateWindow':await page.getByLabel('Window ends').fill('2026-10-05');await check(()=>window.catalogStory.evidence().current.dates.end==='2026-10-05');break
 case 'StayAllocation':await page.getByRole('spinbutton').fill('3');await check(()=>window.catalogStory.evidence().current.stays[0].nights===3);break
 case 'PriceCalendar':await page.locator('.travel-calendar button').nth(1).click();await check(()=>window.catalogStory.evidence().current.dates.start==='2026-10-04');assert.equal(await page.locator('.travel-calendar button').nth(1).getAttribute('aria-pressed'),'true');break
 case 'FarePicker':await page.getByRole('combobox').selectOption('fare-2026-10-03-train');await check(()=>window.catalogStory.evidence().current.selectedFareIds.includes('fare-2026-10-03-train'));break
 case 'DurationPricePlot':await page.getByRole('button',{name:'Train 2h 20m €55.00'}).focus();await page.keyboard.press('Enter');await check(()=>window.catalogStory.evidence().current.selectedFareIds.includes('fare-2026-10-03-train'));break
 default:return false
 }
 const e=await page.evaluate(()=>window.catalogStory.evidence());assert.equal(e.requests.length,sends);assert.deepEqual(e.capture.artifacts[0].selectedFareIds,e.current.selectedFareIds)
 return true
}
async function record(component,variant,state,page,extra={}){
 const evidence=await page.evaluate(()=>window.catalogStory.evidence())
 const context=JSON.stringify(evidence.capture);assert.ok(!context.includes('"availableSeats":'));assert.ok(!context.includes('"rows":'));assert.ok(!context.includes('"rowBuffers":'));assert.ok(!context.includes('fare-2026-10-03-train')||evidence.current.selectedFareIds.length)
 reports.push({component,variant,state,revision:evidence.current.revision,contextBytes:new TextEncoder().encode(context).length,queryCount:evidence.queryCalls.length,localFixtureRequests:evidence.requests.length,...extra})
}
try{
 const inventoryPage=await browser.newPage();await inventoryPage.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort('blockedbyclient'));await inventoryPage.goto(base);await inventoryPage.waitForFunction(()=>window.catalogStory!==undefined);const inventory=await inventoryPage.evaluate(()=>window.catalogStory.evidence().inventory);await inventoryPage.close()
 for(const {name,states} of (process.env.OMIO_STORY_RECIPE_ONLY?[]:inventory).filter(item=>!process.env.OMIO_STORY_NAMES||process.env.OMIO_STORY_NAMES.split(',').includes(item.name)))for(const variant of ['a','b']){
  console.log(`${name}/${variant}/ready`)
  const {page,errors,network,blocked}=await open(name,variant)
  assert.ok(await page.locator('.travel-travelsurface').count(),`${name}/${variant} native artifact missing`);assert.equal(await page.getByRole('status').filter({hasText:/generated view could not be completed/}).count(),0);assert.deepEqual(errors,[],`${name}/${variant} page errors`);assert.deepEqual(network.filter(url=>!blocked.includes(url)),[],`${name}/${variant} unblocked external network`)
  if(name==='Tabs'){const tabs=page.getByRole('tab');await tabs.first().focus();await page.keyboard.press('ArrowRight');assert.equal(await tabs.nth(1).getAttribute('aria-selected'),'true');assert.equal(await tabs.nth(1).evaluate(node=>node===document.activeElement),true)}
  const changed=await controls(page,name)
  const stale=await page.evaluate(()=>window.catalogStory.stale());assert.equal(stale.result.status,'stale');assert.equal(stale.current.sort.field,'durationMinutes')
  await record(name,variant,'ready',page,{staleGuard:'rejected',keyboardTabs:name==='Tabs',localControlVerified:changed,blockedExternalRequests:blocked})
  await page.close()
  console.log(`${name}/${variant}/invalid-ref`)
  const invalid=await open(name,variant,'invalid-ref');assert.ok(await invalid.page.getByRole('alert').count()||await invalid.page.getByRole('status').filter({hasText:/generated view could not be completed/}).count(),`${name}/${variant} invalid-ref has no error`);await record(name,variant,'invalid-ref',invalid.page);await invalid.page.close()
  for(const state of ['loading','partial','empty','error'])if(states[state].applicable&&(name!=='RetryAction'||state==='partial')){
   console.log(`${name}/${variant}/${state}`)
   const fixture=await open(name,variant,state)
   let visible=state==='partial'?await fixture.page.getByText(/Partial ·/).count()>0:state==='error'?await fixture.page.getByRole('alert').count()>0:state==='loading'?await fixture.page.getByRole('status').filter({hasText:/Finding|Comparing|Counting|Loading|Preparing/}).count()>0:await fixture.page.getByRole('status').filter({hasText:/No options|Choose a fare|0 selected|No carriers|Add stops|No travel data/}).count()>0
   if(!visible)failures.push({component:name,variant,state,problem:'No visible component status for this actual local request state'})
   if(state==='loading'&&(await fixture.page.evaluate(()=>window.catalogStory.evidence().requiresRequest))){await fixture.page.evaluate(()=>window.catalogStory.release());await fixture.page.waitForFunction(()=>{const e=window.catalogStory.evidence();return e.queriesSettled===e.queryCalls.length&&e.factsSettled===e.factsStarted});assert.equal(await fixture.page.getByRole('alert').count(),0)}
   await record(name,variant,state,fixture.page,{visibleStatus:visible});await fixture.page.close()
  }
 }
 for(const variant of (process.env.OMIO_STORY_RECIPE_ONLY?[]:['a','b'])){
  console.log(`RetryAction/${variant}/failure-recovery`)
  const fixture=await open('RetryAction',variant,'error'),before=await fixture.page.evaluate(()=>window.catalogStory.evidence())
  await fixture.page.evaluate(()=>window.catalogStory.retryCoverage());await fixture.page.getByRole('alert').waitFor()
  const failed=await fixture.page.evaluate(()=>window.catalogStory.evidence());assert.equal(failed.coverageStatus.status,'error');assert.deepEqual(failed.current.selectedFareIds,before.current.selectedFareIds)
  await fixture.page.getByRole('button',{name:'Refresh this view'}).click();await fixture.page.waitForFunction(()=>window.catalogStory.evidence().coverageStatus?.status==='ready')
  const recovered=await fixture.page.evaluate(()=>window.catalogStory.evidence());assert.equal(recovered.sourceCalls.length,failed.sourceCalls.length+1);assert.equal(recovered.requests.length,before.requests.length);assert.ok(recovered.current.datasetRefs.length>before.current.datasetRefs.length);assert.deepEqual(recovered.current.selectedFareIds,before.current.selectedFareIds)
  await record('RetryAction',variant,'error',fixture.page,{failFirstSucceedSecond:true,noChatOnRetry:true});await fixture.page.close()
  const loading=await open('RetryAction',variant,'loading');await loading.page.evaluate(()=>{void window.catalogStory.retryCoverage()});await loading.page.waitForFunction(()=>window.catalogStory.evidence().coverageStatus?.status==='loading');await loading.page.getByRole('status').filter({hasText:'Coverage loading'}).waitFor();await loading.page.evaluate(()=>window.catalogStory.release());await loading.page.waitForFunction(()=>window.catalogStory.evidence().coverageStatus?.status==='error');await loading.page.getByRole('button',{name:'Refresh this view'}).click();await loading.page.waitForFunction(()=>window.catalogStory.evidence().coverageStatus?.status==='ready');await record('RetryAction',variant,'loading',loading.page,{loadingFailureRetry:true});await loading.page.close()
 }
 for(const variant of ['a','b'])for(const theme of ['blue','sand'])for(const width of [360,800,1280]){
  const fixture=await open('SplitPane',variant,'ready',width,theme,true);await fixture.page.locator('.travel-fare').first().waitFor()
  assert.equal(await fixture.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  const main=await fixture.page.locator('.travel-stack').boundingBox(),summary=await fixture.page.locator('.travel-stickysummary').boundingBox();assert.ok(main&&summary);if(width>700){assert.ok(main.x<summary.x,'Main pane must be left of summary');assert.ok(Math.abs(main.y-summary.y)<5,'Desktop panes must share the same row')}else{assert.ok(summary.y>main.y,'Mobile summary follows main pane')}
  const select=fixture.page.getByRole('button',{name:/Select Train/});await select.focus();await fixture.page.keyboard.press('Enter');assert.equal(await select.evaluate(node=>node===document.activeElement),true);await fixture.page.waitForFunction(()=>window.catalogStory.evidence().current.selectedFareIds.length===1)
  const before=await fixture.page.evaluate(()=>window.catalogStory.evidence().requests.length);await fixture.page.getByRole('button',{name:/Select Train/}).click();await fixture.page.waitForFunction(()=>window.catalogStory.evidence().current.selectedFareIds.length===0);assert.equal(await fixture.page.evaluate(()=>window.catalogStory.evidence().requests.length),before)
  await fixture.page.waitForFunction(()=>{const e=window.catalogStory.evidence();return e.factsSettled===e.factsStarted});const sticky=fixture.page.locator('.travel-stickysummary');assert.equal(await sticky.evaluate(node=>getComputedStyle(node.parentElement).position==='sticky'?'sticky':getComputedStyle(node).position),width<700?'static':'sticky');if(width>700){await fixture.page.evaluate(top=>window.scrollTo(0,top),main.y+80);const box=await sticky.boundingBox();assert.ok(box&&Math.abs(box.y-20)<5,'Summary stays at the sticky top while its main pane scrolls')}
  assert.equal(await fixture.page.evaluate(()=>getComputedStyle(document.querySelector('.travel-app button')).animationName),'none');await fixture.page.screenshot({path:`${output}/complex-recipe-${variant}-${theme}-${width}.png`,fullPage:true});await record('SplitPane',variant,'ready',fixture.page,{recipe:'complex',width,theme,reducedMotion:true,selectedAndDeselected:true,noModelCalls:true});await fixture.page.close()
 }
 await writeFile(new URL(process.env.OMIO_STORY_RECIPE_ONLY?'./result-recipe.json':process.env.OMIO_STORY_NAMES?'./result-selected.json':'./result.json',import.meta.url),JSON.stringify({sourceDirty:execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim()!=='',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),recordedAt:new Date().toISOString(),browser:browser.version(),base,recipeOnly:Boolean(process.env.OMIO_STORY_RECIPE_ONLY),selectedNames:process.env.OMIO_STORY_NAMES?.split(',')??null,classification:'deterministic real-adapter stories; no model authorship or human visual ratings',inventory,reports,failures},null,2)+'\n')
 console.log(JSON.stringify({reports:reports.length,failures}))
 if(failures.length)process.exitCode=1
}finally{await browser.close()}
