import{test}from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{chromium}from'@playwright/test';
import{taskDOM,assertRecoveryHealthy,recoveryAttempt}from'./run-matrix.mjs';
test('browser geometry measures associated filter/result regions with real catalog CSS',async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1280,height:1000}}),css=await readFile(new URL('../../../src/generative/catalog/tokens.css',import.meta.url),'utf8');
 const comparison='<table><tbody><tr><td>Train</td></tr><tr><td>Bus</td></tr></tbody></table>',calendar='<div class="travel-calendar"><button>October 9</button></div>',offers='<div class="travel-fares"><article>Local fare</article></div>',modes='<fieldset><div class="travel-chips"><button>Bus</button></div></fieldset>',dates='<fieldset><label class="travel-field">Start<input type="date"></label><label class="travel-field">End<input type="date"></label></fieldset>';
 const check=async html=>{await page.setContent(`<style>${css}</style><main class="travel-app"><section class="travel-travelsurface">${html}</section></main>`);return taskDOM(page.locator('.travel-travelsurface'))};
 try{
  assert.equal((await check(`${comparison}<section class="travel-layout travel-splitpane"><section class="travel-layout travel-stack">${calendar}${offers}</section><section class="travel-layout travel-section">${modes}</section></section>`)).filtersBesideResults,true,'Comparison above the columns must not replace the associated offers region');
  assert.equal((await check(`<section class="travel-layout travel-splitpane"><section class="travel-layout travel-stack">${comparison}${calendar}${offers}</section><section class="travel-layout travel-section">${dates}<div style="height:240px"></div>${modes}</section></section>`)).filtersBesideResults,true,'Controls below a short table remain beside the whole results column');
  assert.equal((await check(`<section class="travel-layout travel-splitpane"><section>${offers}</section><section>${dates}</section></section>`)).filtersBesideResults,true,'Date controls are filters');
  assert.equal((await check(`<section class="travel-layout travel-stack">${dates}${modes}${comparison}${calendar}${offers}</section>`)).filtersBesideResults,false,'A vertically stacked arrangement must fail');
  assert.equal((await check(`<section class="travel-layout travel-splitpane"><section hidden>${offers}</section><section>${dates}</section></section>`)).filtersBesideResults,false,'Hidden results cannot establish adjacency');
 }finally{await browser.close()}
});

test('recovery terminal gate preserves historical failures and rejects a current failed or unacknowledged view',async()=>{
 const source='root = TravelSurface("art")',artifact={variant:'b',source,state:{artifactId:'art'}},accepted={type:'tool-compose_reactive_scene',state:'output-available',input:{artifactRef:'art',program:source},output:{status:'accepted',artifactId:'art'}},failed={...accepted,state:'output-error',output:undefined},record={activeArtifactId:'art',artifacts:[artifact],messages:[{role:'assistant',id:'old',parts:[failed,failed]},{role:'assistant',id:'new',parts:[failed,accepted]}]};
 assert.equal(recoveryAttempt(record).historicalFailuresPreserved,2);
 assert.throws(()=>recoveryAttempt({...record,messages:[...record.messages,{role:'assistant',id:'current-failed',parts:[failed]}]}),/terminal scene attempt/);
 assert.throws(()=>recoveryAttempt({...record,messages:[{role:'assistant',id:'no-ack',parts:[]}]}),/acknowledgement/);
 assert.throws(()=>recoveryAttempt({...record,artifacts:[{...artifact,source:'root = Unknown("art")'}]}),/valid accepted/);
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
 try{
  const notice='This generated view could not be completed. Your current travel view remains available.';
  await page.setContent(`<div class="travel-message-assistant"><p>${notice}</p></div><div class="travel-message-assistant"><section class="travel-travelsurface" data-artifact="art">Usable current view</section></div>`);
  assert.equal((await assertRecoveryHealthy(page,record)).historicalFailuresPreserved,2);
  await page.locator('.travel-message-assistant').last().evaluate((element,notice)=>element.insertAdjacentHTML('beforeend',`<p>${notice}</p>`),notice);
  await assert.rejects(()=>assertRecoveryHealthy(page,record));
 }finally{await browser.close()}
});
