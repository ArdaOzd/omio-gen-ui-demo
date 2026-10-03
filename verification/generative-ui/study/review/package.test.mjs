import{test}from'node:test'
import assert from'node:assert/strict'
import{buildReviewPackage,validateReviewExport,dimensions}from'./package.mjs'
const runtime={appRevision:'frozen-sha',provider:'signed-in-codex',model:'gpt-6.1-sol',reasoningEffort:'high'},fixture={sourceVersion:'fixture-generation',rowCount:10000000}
const cell=variant=>({id:`local-controls-cold-fixed-${variant}`,scenario:'local-controls',cache:'cold',wording:'fixed',variant,runtime,appRevision:runtime.appRevision,fixture,fixtureValid:true,runtimeValid:true,liveModelAuthorship:true,outcome:'pass',persisted:{messages:[],artifacts:[{variant,source:'captured-native-source',state:{artifactId:'private-id'}}],descriptors:[]},captureAvailable:true})
test('review package blinds cell identity and retains null ratings with stable counterbalanced rounds',()=>{
 const first=buildReviewPackage([cell('a'),cell('b')],{participant:'anonymous-001',families:['local-controls']}),second=buildReviewPackage([cell('a'),cell('b')],{participant:'anonymous-002',families:['local-controls']})
 assert.equal(first.public.items.length,2);assert.deepEqual(first.public,buildReviewPackage([cell('b'),cell('a')],{participant:'anonymous-001',families:['local-controls']}).public)
 assert.equal(first.public.humanRatings,null);assert.deepEqual(first.template.reviews[0].ratings,Object.fromEntries(dimensions.map(key=>[key,null])))
 const tokens=first.public.items.map(item=>item.token);assert.equal(first.private.items[tokens[0]].variant,'a');assert.equal(second.private.items[second.public.items[0].token].variant,'b')
 for(const item of first.public.items){assert.equal(item.variant,undefined);assert.equal(item.cellId,undefined);assert.equal(item.persisted,undefined);assert.equal(item.sceneInputs,undefined)}
})
test('review packet rejects mixed source identity and excluded cells but handles missing pairs explicitly',()=>{
 assert.throws(()=>buildReviewPackage([cell('a'),{...cell('b'),runtime:{...runtime,appRevision:'changed'}}],{participant:'anonymous-001',families:['local-controls']}),/mixed runtime/)
 const packet=buildReviewPackage([cell('a'),{...cell('b'),excludedFromComparison:true}],{participant:'anonymous-001',families:['local-controls']})
 assert.equal(packet.public.items.length,2);assert.equal(packet.public.items[1].artifactAvailable,false);assert.equal(packet.private.skipped.length,1)
})
test('review export requires real reviewer entry and both available review modes',()=>{
 const packet=buildReviewPackage([cell('a'),cell('b')],{participant:'anonymous-001',families:['local-controls']})
 assert.throws(()=>validateReviewExport(packet.template,packet.public),/No reviewer ratings/)
 const entered=structuredClone(packet.template);entered.reviews[0].ratings['visual quality']=4
 assert.throws(()=>validateReviewExport(entered,packet.public),/capture and hands-on/)
 entered.reviews[0].captureReviewed=true;entered.reviews[0].handsOnAttempted=true;entered.reviews[0].notes='Keyboard controls were usable.'
 assert.equal(validateReviewExport(entered,packet.public).reviews.length,1)
 entered.reviews[0].ratings.usability=6;assert.throws(()=>validateReviewExport(entered,packet.public),/between 1 and 5/)
 entered.reviews[0].ratings.usability=null;entered.reviews[0].token='unknown-item';assert.throws(()=>validateReviewExport(entered,packet.public),/Unknown review item/)
})

test('default sampling includes both rounds for all twelve families and keeps failures visible',()=>{const packet=buildReviewPackage([{...cell('a'),outcome:'fail'},cell('b')],{participant:'anonymous-001'});assert.equal(packet.public.items.length,24);assert.equal(packet.public.sampling.families.length,12);assert.equal(packet.public.items.filter(item=>item.status==='recorded completion failed').length,1);assert.equal(packet.public.items.filter(item=>item.status==='not collected').length,22)})
