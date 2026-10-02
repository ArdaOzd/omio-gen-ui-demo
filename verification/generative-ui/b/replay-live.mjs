import {chromium,expect} from '@playwright/test'
import {readFile,writeFile} from 'node:fs/promises'
const directory='verification/generative-ui/b/live'
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[]
for(let index=0;index<2;index++){
 const captured=JSON.parse(await readFile(`${directory}/case-${index}.json`,'utf8'))
 const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage(),requests=[],errors=[]
 let requestsSeen=0
 await page.route('**/api/chat',async route=>{
  const request=route.request().postDataJSON();requests.push(request)
  const current=request.currentContext.activeArtifactId,original=captured.programs[0].artifactRef
  const recorded=captured.responses[requestsSeen++]??captured.responses.at(-1)
  await route.fulfill({status:200,headers:{'content-type':'text/event-stream','x-vercel-ai-ui-message-stream':'v1'},body:recorded.body.replaceAll(original,current)})
 })
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(`${process.env.OMIO_DEMO_URL??'http://127.0.0.1:5194'}/b`)
 await page.getByRole('textbox',{name:'Message'}).fill(captured.prompt);await page.getByRole('button',{name:'Send message'}).click()
 await expect(page.getByRole('button',{name:/^Select /}).first()).toBeVisible({timeout:30000})
 const before=requests.length
 if(index===0){await page.getByRole('button',{name:'Bus',exact:true}).click();await page.getByRole('button',{name:'Show details',exact:true}).click();await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);await expect(page.getByRole('table').locator('tbody')).toContainText('Bus');await expect(page.getByText('Loaded coverage',{exact:true})).toBeVisible()}
 else{await page.getByLabel('Choose your departure date').fill('2026-10-10');await page.getByRole('combobox',{name:'Sort fare choices'}).selectOption('durationMinutes:asc');await page.getByRole('button',{name:'Show journey timeline',exact:true}).click();await expect(page.getByRole('heading',{name:'Journey timeline',exact:true})).toBeVisible();await expect(page.locator('.travel-fares article').first()).toContainText('2026-10-10')}
 await page.waitForTimeout(500)
 const text=await page.locator('body').innerText(),localClickChatDelta=requests.length-before
 expect(localClickChatDelta).toBe(0);expect(errors).toEqual([]);expect(text).not.toContain('These options could not load');expect(text).not.toContain('This generated view could not be applied')
 await page.screenshot({path:`${directory}/replay-${index}.png`,fullPage:true});await page.getByRole('textbox',{name:'Message'}).fill('Report current state only.');await page.getByRole('button',{name:'Send message'}).click();await expect.poll(()=>requests.length).toBe(before+1)
 const snapshot=requests.at(-1).currentContext.artifacts[0]
 if(index===0){expect(snapshot.filters.modes).toEqual(['bus']);expect(snapshot.runtimeVariables.$show).toBe(true)}
 else{expect(snapshot.dates.start).toBe('2026-10-10');expect(snapshot.sort).toEqual({field:'durationMinutes',direction:'asc'});expect(snapshot.runtimeVariables.$showTimeline).toBe(true)}
 const result={index,classification:'deterministic replay of genuinely model-authored SSE; real Python fare API and browser query worker; follow-up snapshot inspection',passed:true,localClickChatDelta,snapshot,errors,visibleText:text,tableRows:await page.getByRole('table').locator('tbody tr').count(),fareChoices:await page.getByRole('button',{name:/^Select /}).count()};results.push(result)
 await writeFile(`${directory}/replay-${index}.json`,JSON.stringify(result,null,2));await context.close()
 console.log('REPLAY',index,'PASS')
}
await browser.close();await writeFile(`${directory}/replay-results.json`,JSON.stringify({timestamp:new Date().toISOString(),results},null,2))
