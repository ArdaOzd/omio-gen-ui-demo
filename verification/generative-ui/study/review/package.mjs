import { createHash } from 'node:crypto';
import{dimensions}from'./export-validation.mjs';
export{dimensions,validateReviewExport}from'./export-validation.mjs';
const tasks={
 'cheap-fast':'Find the cheapest and fastest journeys. Compare how clearly their tradeoffs are presented; operate an available fare selector.',
 'train-bus':'Compare train and bus. Change an available mode control and inspect how the comparison updates.',
 calendar:'Inspect cheapest dates. Choose another covered departure date and inspect its fares.',
 'multi-city':'Inspect the route and stays. Change an available leg control and inspect the selected synthetic total.',
 rearrange:'Inspect the recorded timeline arrangement. Select an available journey and compare its information hierarchy.',
 'text-state':'Read the recorded text-only answer alongside the preserved artifact. Compare the described choices with its current state.',
 'local-controls':'Change mode, covered date and sorting, then select a fare. Check whether each visible view updates locally.',
 coverage:'Move a date outside the original range. Observe loading and availability; then choose another date and inspect the latest result.',
 'stream-edit':'Inspect the recorded final arrangement and preserved filter edit. Operate a local filter; recorded streaming itself is reviewed from the capture.',
 'two-artifacts':'Operate controls in each available artifact. Check whether the other artifact retains its own choices.',
 reload:'Select an available fare or filter, then reload the interactive frame using its Reload button. Inspect which choices remain.',
 recovery:'Inspect the retained useful artifact after recorded cancellation/retry. Operate its controls; this replay does not generate another response.'
};
const same=(a,b,keys)=>keys.every(key=>a?.[key]===b?.[key]);
export function buildReviewPackage(records,{participant,families=Object.keys(tasks)}={}){
 if(!/^anonymous-\d{3,}$/.test(participant??''))throw new Error('Use a stable anonymous participant ID, such as anonymous-001');
 const valid=records.filter(record=>record.excludedFromComparison!==true&&record.runtimeValid===true&&record.fixtureValid!==false&&record.liveModelAuthorship===true);
 if(!valid.length)throw new Error('No verified native study records are available');
 const runtime=valid[0].runtime,fixture=valid[0].fixture;
 for(const record of valid){
  if(!same(record.runtime,runtime,['appRevision','provider','model','reasoningEffort'])||record.appRevision!==runtime.appRevision)throw new Error('Cannot review mixed runtime identities');
  if(!same(record.fixture,fixture,['sourceVersion','rowCount']))throw new Error('Cannot review mixed fixture identities');
 }
 const groups=new Map();
 for(const record of valid){
  if(!['a','b'].includes(record.variant)||!tasks[record.scenario])throw new Error('Unknown native study task or variant');
  const key=[record.scenario,record.cache,record.wording].join(':');
  const pair=groups.get(key)??{};
  if(pair[record.variant])throw new Error('Duplicate study cell in review corpus');
  pair[record.variant]=record;groups.set(key,pair);
 }
 if(!families.length||families.some(family=>!tasks[family])||new Set(families).size!==families.length)throw new Error('Select known unique task families');
 const selectedKeys=families.map(family=>`${family}:cold:fixed`);
 const order=Number(participant.slice(10))%2===1?['a','b']:['b','a'];
 const items=[],privateItems={};let caseNumber=0;
 for(const key of selectedKeys){
  const pair=groups.get(key)??{};
  caseNumber++;
  for(const[round,variant]of order.entries()){
   const record=pair[variant],token=createHash('sha256').update([participant,runtime.appRevision,fixture.sourceVersion,key,round].join('|')).digest('hex').slice(0,24);
   const artifactAvailable=Boolean(record?.persisted?.artifacts?.some(artifact=>typeof artifact.source==='string'&&artifact.source.length&&!artifact.source.startsWith('No scene authored')));
   const captureAvailable=artifactAvailable&&record?.captureAvailable===true;
   items.push({token,caseId:`case-${String(caseNumber).padStart(3,'0')}`,round:round+1,task:tasks[key.split(':')[0]],artifactAvailable,captureAvailable,capture:captureAvailable?`captures/${token}.png`:null,status:record?(record.outcome==='pass'?'recorded':'recorded completion failed'):'not collected',captureKind:'blinded native replay of recorded artifact state',instructions:'Review the capture, then use the local interactive replay. Generation is already recorded; no new model messages are sent. Report missing controls or unavailable data in your notes.'});
   privateItems[token]={variant,cellId:record?.id??null,record:record??null};
  }
 }
 const publicPacket={schemaVersion:1,participant,sourceFreeze:{runtime,fixture},dimensions,sampling:{families,cache:'cold',wording:'fixed',rule:'Predeclared: one cold/fixed cell per family and representation, including failed and missing cells; other machine cells remain in the complete corpus'},scale:{minimum:1,maximum:5,anchors:{1:'Poor',2:'Weak',3:'Acceptable',4:'Good',5:'Excellent'}},humanRatings:null,items};
 return {public:publicPacket,private:{schemaVersion:1,participant,items:privateItems,skipped:records.filter(record=>!valid.includes(record)).map(record=>({cellId:record.id,reason:'Excluded or unverified native evidence'}))},template:{schemaVersion:1,classification:'human-entered ratings',participant,sourceFreeze:publicPacket.sourceFreeze,reviews:items.map(({token})=>({token,captureReviewed:false,handsOnAttempted:false,ratings:Object.fromEntries(dimensions.map(dimension=>[dimension,null])),notes:''}))}};
}
