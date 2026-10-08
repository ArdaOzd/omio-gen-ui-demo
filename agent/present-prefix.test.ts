import { expect,it } from 'vitest';
import { validatePresentPrefix } from './present-prefix';
import { validatePresentTree } from '../src/generative/presentation/tree';
const scope={artifactIds:new Set(['a']),datasetIds:new Set(['d'])};
it('allows a genuinely incomplete but bounded native tree',()=>{expect(()=>validatePresentPrefix('{"$type":"TravelSurface","artifactRef":"a","children":[{"$type":"FareCards","artifactRef":"a","datasetRef":"d"',scope)).not.toThrow()});
it('accepts every prefix of a valid leg-bound planner tree with a rebindable dataset handle',()=>{
 const tree={$type:'TravelSurface',artifactRef:'a',children:[{$type:'FareCalendar',artifactRef:'a',datasetRef:'expired',legIndex:0}]}
 const encoded=JSON.stringify(tree)
 expect(()=>validatePresentTree(tree,scope)).not.toThrow()
 for(let cut=1;cut<=encoded.length;cut++)expect(()=>validatePresentPrefix(encoded.slice(0,cut),scope),`prefix ${cut}`).not.toThrow()
})
it('allows missing booking legs while streaming and requires complete distinct-leg coverage at completion',()=>{
 const bookingScope={...scope,bookingLegIndexesByArtifact:new Map([['a',new Set([0,1])]]),bookingLegIndexByArtifactDataset:new Map([['a',new Map([['d',0],['d2',1]])]])}
 const incomplete={$type:'TravelSurface',artifactRef:'a',children:[{$type:'FareCalendar',artifactRef:'a',datasetRef:'d',legIndex:0}]}
 const encoded=JSON.stringify(incomplete)
 for(let cut=1;cut<encoded.length;cut++)expect(()=>validatePresentPrefix(encoded.slice(0,cut),bookingScope),`prefix ${cut}`).not.toThrow()
 expect(()=>validatePresentPrefix(encoded,bookingScope)).toThrow('Incomplete booking workflow leg coverage')
 const complete={...incomplete,children:[...incomplete.children,{$type:'FareCalendar',artifactRef:'a',datasetRef:'d2',legIndex:1}]}
 expect(()=>validatePresentPrefix(JSON.stringify(complete),bookingScope)).not.toThrow()
})
it('rejects unknown row-shaped aliases before complete props or rendering',()=>{expect(()=>validatePresentPrefix('{"$type":"TravelSurface","artifactRef":"a","payload":[',scope)).toThrow('Unknown partial')});
it('enforces plan depth and node budgets before completion',()=>{expect(()=>validatePresentPrefix('{"children":'.repeat(9),scope)).toThrow('structural');expect(()=>validatePresentPrefix('{'.repeat(81),scope)).toThrow()});

it.each(['x'.repeat(600),'\\'.repeat(600),'é'.repeat(600)])('accepts canonical Callout body through every incremental prefix',body=>{
 const tree={$type:'TravelSurface',artifactRef:'a',children:[{$type:'Callout',artifactRef:'a',title:'Coverage',body}]}
 const encoded=JSON.stringify(tree).replaceAll('é','\\u00e9')
 expect(()=>validatePresentTree(tree,scope)).not.toThrow()
 for(let cut=1;cut<=encoded.length;cut++)expect(()=>validatePresentPrefix(encoded.slice(0,cut),scope),`prefix ${cut}`).not.toThrow()
})
it.each([{body:'x'.repeat(601)},{title:'x'.repeat(161)},{datasetRef:'x'.repeat(97)},{body:'okay',unknown:'not registered'},{body:'okay',rows:[{id:'fare'}]}])('rejects completed scalar bounds or unknown fields without relaxing refs',props=>{
 const encoded=JSON.stringify({$type:'TravelSurface',artifactRef:'a',children:[{$type:'Callout',artifactRef:'a',...props}]})
 expect(()=>validatePresentPrefix(encoded,scope)).toThrow()
})

it.each(['datasetRef','actionRef','selectorRef'])('matches canonical empty optional reference %s',field=>{
 const callout={$type:'Callout',artifactRef:'a',[field]:''}
 const tree={$type:'TravelSurface',artifactRef:'a',children:[callout]}
 const encoded=JSON.stringify(tree)
 expect(()=>validatePresentTree(tree,scope)).not.toThrow()
 for(let cut=1;cut<=encoded.length;cut++)expect(()=>validatePresentPrefix(encoded.slice(0,cut),scope)).not.toThrow()
 expect(()=>validatePresentPrefix(JSON.stringify({...tree,children:[{...callout,[field]:'unknown'}]}),scope)).toThrow(field==='datasetRef'?'Unknown dataset reference':'Unknown partial')
})
