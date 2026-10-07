import { describe,expect,it } from 'vitest'
import { createThreadPersistence,type PersistedThread,type ThreadStorage } from './persistence'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { createUIStateStore } from './ui-state-store'
import { createArtifactStore } from './artifact-store'
import { exportAgentContext } from './snapshot-exporter'
import { ArtifactIdSchema,FareIdSchema,type CoverageRequest,type FareRow } from '../contracts'
const request:CoverageRequest={originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-02',to:'2026-10-02'},modes:['train'],passengers:1}
const row:FareRow={id:FareIdSchema.parse('fare-1'),originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode:'train',carrierId:'test',carrierName:'Test Rail',priceCents:3000,durationMinutes:120,departureMinutes:600,availableSeats:3,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true}
function memory(){const values=new Map<string,unknown>();const storage:ThreadStorage={async read(key){return values.get(key)},async write(key,value){values.set(key,structuredClone(value))}};return{values,storage}}
async function fixture(partial=false){const bridge=createFareDataBridge({maxRows:partial?1:10,pageSource:async input=>({rows:[row,{...row,id:FareIdSchema.parse('fare-2')}],total:2,pages:1,page:input.page,sourceVersion:'v1'})});const manifest=await bridge.load(request,new AbortController().signal);const store=createUIStateStore();const id=ArtifactIdSchema.parse('a');store.initializeMissing(id,{dates:{start:'2026-10-02'},datasetRefs:[manifest.datasetId],selectedFareIds:[row.id]});const record:PersistedThread={schemaVersion:'1.0.0',catalogVersion:'1.1.0',parserVersion:'native-present-1',queryVersion:'1',messages:[{role:'assistant',content:[{type:'text',text:'Synthetic journey'}]}],artifacts:[{variant:'a',source:'{"$type":"TravelSurface","artifactRef":"a"}',state:store.get(id)}],descriptors:[{datasetId:manifest.datasetId,request,sourceVersion:'v1',complete:manifest.coverage.complete}]};return{bridge,manifest,store,id,record}}
describe('descriptor-only thread persistence',()=>{
 it.each([false,true])('restores messages, compact state, and coverage by reloading descriptors (partial=%s)',async partial=>{
  const item=await fixture(partial);const io=memory();const persistence=createThreadPersistence(io.storage);await persistence.save('thread',item.record);const serialized=JSON.stringify(io.values.get('thread'));expect(serialized).not.toContain('"priceCents":');expect(serialized).not.toContain('availableSeats');expect(serialized).not.toContain('rows')
  const loaded=await persistence.load('thread');if(!loaded)throw new Error('Record not saved');const next=await fixture(partial);const restoredStore=createUIStateStore();const manifests=await persistence.restore(loaded,next.bridge,restoredStore,new AbortController().signal);expect(manifests[0]?.coverage.complete).toBe(!partial);expect(restoredStore.get(item.id).selectedFareIds).toEqual([row.id]);expect(loaded.messages).toEqual(item.record.messages)
 })
 it('restores the last active artifact independently from first registration',async()=>{
  const item=await fixture();const second=ArtifactIdSchema.parse('second');item.store.initializeMissing(second,{filters:{modes:['bus'],carrierIds:[],directOnly:false}});const record={...item.record,activeArtifactId:second,artifacts:[...item.record.artifacts,{variant:'a' as const,source:'{"$type":"TravelSurface","artifactRef":"second"}',state:item.store.get(second)}]};const io=memory();const persistence=createThreadPersistence(io.storage);await persistence.save('two',record);const loaded=await persistence.load('two');if(!loaded)throw new Error('Missing thread');const store=createUIStateStore();await persistence.restore(loaded,item.bridge,store,new AbortController().signal);const artifacts=createArtifactStore();for(const artifact of loaded.artifacts)artifacts.register(artifact.state.artifactId);if(loaded.activeArtifactId)artifacts.activate(loaded.activeArtifactId);expect(artifacts.getActiveId()).toBe(second);expect(store.get(second).filters.modes).toEqual(['bus']);expect(store.get(item.id).filters.modes).toEqual([]);
 })
 it('rejects nested transport leakage, unsafe records, and incompatible versions without restoring rows',async()=>{
  const io=memory();const persistence=createThreadPersistence(io.storage);const item=await fixture();await expect(persistence.save('unsafe',{...item.record,messages:[{tool:{result:{nested:{rows:[row]}}}}]})).rejects.toThrow(/bulk-data/i)
  io.values.set('future',{...item.record,parserVersion:'future-parser'});expect(await persistence.load('future')).toBeNull()
  io.values.set('corrupt','not-a-thread');expect(await persistence.load('corrupt')).toBeNull()
 })
 it('refreshes legacy source descriptors without dropping conversation or unrelated artifact state',async()=>{
  const item=await fixture();item.store.dispatch({kind:'sort',artifactId:item.id,sort:{field:'priceCents',direction:'desc'}});const other=ArtifactIdSchema.parse('unaffected');item.store.initializeMissing(other,{selectedFareIds:[FareIdSchema.parse('other-fare')]});const record:PersistedThread={...item.record,activeArtifactId:item.id,artifacts:[{...item.record.artifacts[0]!,state:item.store.get(item.id)},{variant:'a',source:'Other scene',state:item.store.get(other)}],descriptors:item.record.descriptors.map(descriptor=>({...descriptor,sourceVersion:'sqlite-demo-v1'}))};
  const io=memory(),persistence=createThreadPersistence(io.storage);await persistence.save('legacy',record);const loaded=await persistence.load('legacy');if(!loaded)throw new Error('Missing legacy thread');const fresh=createFareDataBridge({pageSource:async input=>({rows:[{...row,priceCents:4000}],total:1,pages:1,page:input.page,sourceVersion:'sqlite-demo-v2-new-generation'})});const store=createUIStateStore();let cleared=false;await persistence.restore(loaded,fresh,store,new AbortController().signal,value=>{cleared=value});
  expect(store.get(item.id).revision).toBe(item.store.get(item.id).revision+1);expect(store.get(item.id).selectedFareIds).toEqual([]);expect(store.get(item.id).sort.direction).toBe('desc');expect(store.get(item.id).dates).toEqual(item.store.get(item.id).dates);expect(store.get(other).selectedFareIds).toEqual([FareIdSchema.parse('other-fare')]);expect(loaded.messages).toEqual(record.messages);expect(loaded.artifacts[0]?.source).toBe(record.artifacts[0]?.source);expect(loaded.activeArtifactId).toBe(item.id);expect(fresh.getManifest(item.manifest.datasetId).source.sourceVersion).toBe('sqlite-demo-v2-new-generation');expect(cleared).toBe(true);
 })
 it('refuses a stale tab save without overwriting a newer conversation',async()=>{
  const item=await fixture(),io=memory(),first=createThreadPersistence(io.storage),second=createThreadPersistence(io.storage);await first.save('shared',item.record);await second.load('shared');await first.save('shared',{...item.record,messages:[{id:'newer',role:'user',parts:[{type:'text',text:'Newer conversation'}]}]});
  await expect(second.save('shared',item.record)).rejects.toThrow(/another tab/);expect((await first.load('shared'))?.messages).toEqual([{id:'newer',role:'user',parts:[{type:'text',text:'Newer conversation'}]}]);
 })
 it('serializes saves from the same tab while advancing its record revision',async()=>{
  const item=await fixture(),io=memory(),persistence=createThreadPersistence(io.storage);await Promise.all([persistence.save('local',item.record),persistence.save('local',{...item.record,messages:[{id:'latest',role:'user',parts:[]}]})]);const loaded=await persistence.load('local');expect(loaded?.recordRevision).toBe(2);expect(loaded?.messages).toEqual([{id:'latest',role:'user',parts:[]}]);
 })
 it('round-trips complete browser history beyond the compact model-history limit',async()=>{
  const item=await fixture(),io=memory(),persistence=createThreadPersistence(io.storage)
  const messages=Array.from({length:250},(_,index)=>({id:`message-${index}`,role:index%2?'assistant':'user',parts:[{type:'text',text:`Message ${index}`}] }))
  await persistence.save('long-history',{...item.record,messages})
  expect((await persistence.load('long-history'))?.messages).toEqual(messages)
 })
 it('exports one coherent current revision and allowlisted manifests without rows',async()=>{
  const item=await fixture();item.store.dispatch({kind:'filters',artifactId:item.id,filters:{modes:['train'],carrierIds:[],directOnly:true}})
  const snapshot=exportAgentContext({turnId:'turn-1',activeArtifactId:item.id,artifactIds:[item.id],store:item.store,bridge:item.bridge});expect(snapshot.artifacts[0]?.revision).toBe(1);expect(snapshot.artifacts[0]?.filters.directOnly).toBe(true);expect(snapshot.datasets[0]?.rowCount).toBe(2);expect(JSON.stringify(snapshot)).not.toContain('availableSeats":3')
 })
})

it('saves and restores 21 unique descriptors across three valid artifact states',async()=>{
 const makeBridge=()=>createFareDataBridge({pageSource:async input=>({rows:[],total:0,pages:1,page:input.page,sourceVersion:'multi-v1'})})
 const bridge=makeBridge(),store=createUIStateStore(),descriptors:PersistedThread['descriptors']=[],artifacts:PersistedThread['artifacts']=[]
 for(let artifact=0;artifact<3;artifact++){
  const refs=[]
  for(let leg=0;leg<7;leg++){const date=new Date(Date.UTC(2026,9,2+artifact*7+leg)).toISOString().slice(0,10),coverage={...request,dateWindow:{from:date,to:date}},manifest=await bridge.load(coverage,new AbortController().signal);refs.push(manifest.datasetId);descriptors.push({datasetId:manifest.datasetId,request:coverage,sourceVersion:'multi-v1',complete:true})}
  const id=ArtifactIdSchema.parse(`persisted-${artifact}`);store.initializeMissing(id,{datasetRefs:refs});artifacts.push({variant:'a',source:JSON.stringify({$type:'TravelSurface',artifactRef:id}),state:store.get(id)})
 }
 const activeArtifactId=artifacts[2]?.state.artifactId,record:PersistedThread={schemaVersion:'1.0.0',catalogVersion:'1.1.0',parserVersion:'native-present-1',queryVersion:'1',messages:[{id:'saved-user',role:'user',parts:[{type:'text',text:'Keep my three itineraries'}]}],activeArtifactId,artifacts,descriptors},io=memory(),persistence=createThreadPersistence(io.storage)
 await persistence.save('three',record);const loaded=await persistence.load('three');if(!loaded)throw new Error('Missing multi-artifact record')
 const restored=createUIStateStore(),fresh=makeBridge();const manifests=await persistence.restore(loaded,fresh,restored,new AbortController().signal)
 expect(loaded.descriptors).toHaveLength(21);expect(manifests).toHaveLength(21);expect(loaded.messages).toEqual(record.messages);expect(loaded.activeArtifactId).toBe(activeArtifactId)
 for(const artifact of artifacts)expect(restored.get(artifact.state.artifactId)).toEqual(artifact.state)
 expect(JSON.stringify(io.values.get('three'))).not.toContain('"rows":')
})
