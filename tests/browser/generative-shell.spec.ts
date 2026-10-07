import{test,expect}from'@playwright/test';
for(const width of[360,800,1280])test(`native chat welcome supports ${width}px and labeled keyboard controls`,async({page})=>{await page.setViewportSize({width,height:900});await page.goto('/a');await expect(page.getByRole('textbox',{name:'Message'})).toBeVisible();await expect(page.getByRole('button',{name:'Send message'})).toBeVisible();const issues=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,unlabeled:[...document.querySelectorAll('button,input,select,textarea')].filter(element=>{if(element.getAttribute('aria-hidden')==='true'||element.getAttribute('aria-label')||element.getAttribute('aria-labelledby')||element.textContent?.trim())return false;return!((element instanceof HTMLInputElement||element instanceof HTMLSelectElement||element instanceof HTMLTextAreaElement)&&element.labels?.length)}).length}));expect(issues).toEqual({overflow:false,unlabeled:0});await page.getByRole('textbox',{name:'Message'}).focus();await expect(page.getByRole('textbox',{name:'Message'})).toBeFocused();});

test('smart planner opens chat with the prompt and starts one initial submission',async({page})=>{
 const requests:unknown[]=[]
 await page.route('**/api/chat',async route=>{requests.push(route.request().postDataJSON());await route.fulfill({status:200,contentType:'text/event-stream',body:'data: [DONE]\n\n'})})
 await page.setViewportSize({width:360,height:900})
 await page.goto('/')
 await page.getByRole('tab',{name:'Smart planner'}).click()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await expect(page.getByRole('button',{name:'Plan my trip'})).toHaveCSS('width','312px')
 const prompt='Plan a relaxed Prague to Rome train trip with two overnight stops.'
 await page.getByRole('textbox',{name:'Describe your trip'}).fill(prompt)
 await page.getByRole('button',{name:'Plan my trip'}).click()
 await expect(page).toHaveURL(/\/a$/)
 await expect(page.locator('.travel-chat').getByText(prompt,{exact:true})).toBeVisible()
 await expect.poll(()=>requests.length).toBe(1)
 expect(requests[0]).toMatchObject({trigger:'regenerate-message',messages:[{role:'user',parts:[{type:'text',text:prompt}]}]})
})
