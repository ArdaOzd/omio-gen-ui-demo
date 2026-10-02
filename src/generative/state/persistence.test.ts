import { describe,expect,it } from 'vitest'
import { createThreadPersistence,type PersistedThread,type ThreadStorage } from './persistence'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { createUIStateStore } from './ui-state-store'
import { createArtifactStore } from './artifact-store'
import { exportAgentContext } from './snapshot-exporter'
import { ArtifactIdSchema,FareIdSchema,type CoverageRequest,type FareRow } from '../contracts'
const request:CoverageRequest={originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-02',to:'2026-10-02'},modes:['train'],passengers:1}
const row:FareRow={id:FareIdSchema.parse('fare-1'),originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode:'train',carrierId:'test',priceCents:3000,durationMinutes:120,departureMinutes:600,availableSeats:3,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true}
function memory(){const values=new Map<string,unknown>();const storage:ThreadStorage={async read(key){return values.get(key)},async write(key,value){values.set(key,structuredClone(value))}};return{values,storage}}
async function fixture(partial=false){const bridge=createFareDataBridge({maxRows:partial?1:10,pageSource:async input=>({rows:[row,{...row,id:FareIdSchema.parse('fare-2')}],total:2,pages:1,page:input.page,sourceVersion:'v1'})});const manifest=await bridge.load(request,new AbortController().signal);const store=createUIStateStore();const id=ArtifactIdSchema.parse('a');store.initializeMissing(id,{dates:{start:'2026-10-02'},datasetRefs:[manifest.datasetId],selectedFareIds:[row.id]});const record:PersistedThread={schemaVersion:'1.0.0',catalogVersion:'1.0.0',parserVersion:'openui-0.3.0',queryVersion:'1',messages:[{role:'assistant',content:[{type:'text',text:'Synthetic journey'}]}],artifacts:[{variant:'b',source:'root = Summary("Synthetic")',state:store.get(id)}],descriptors:[{datasetId:manifest.datasetId,request,sourceVersion:'v1',complete:manifest.coverage.complete}]};return{bridge,manifest,store,id,record}}
describe('descriptor-only thread persistence',()=>{
 it.each([false,true])('restores messages, compact state, and coverage by reloading descriptors (partial=%s)',async partial=>{
  const item=await fixture(partial);const io=memory();const persistence=createThreadPersistence(io.storage);await persistence.save('thread',item.record);const serialized=JSON.stringify(io.values.get('thread'));expect(serialized).not.toContain('"priceCents":');expect(serialized).not.toContain('availableSeats');expect(serialized).not.toContain('rows')
  const loaded=await persistence.load('thread');if(!loaded)throw new Error('Record not saved');const next=await fixture(partial);const restoredStore=createUIStateStore();const manifests=await persistence.restore(loaded,next.bridge,restoredStore,new AbortController().signal);expect(manifests[0]?.coverage.complete).toBe(!partial);expect(restoredStore.get(item.id).selectedFareIds).toEqual([row.id]);expect(loaded.messages).toEqual(item.record.messages)
 })
 it('restores the last active artifact independently from first registration',async()=>{
  const item=await fixture();const second=ArtifactIdSchema.parse('second');item.store.initializeMissing(second,{filters:{modes:['bus'],carrierIds:[],directOnly:false}});const record={...item.record,activeArtifactId:second,artifacts:[...item.record.artifacts,{variant:'b' as const,source:'root = Summary("Second")',state:item.store.get(second)}]};const io=memory();const persistence=createThreadPersistence(io.storage);await persistence.save('two',record);const loaded=await persistence.load('two');if(!loaded)throw new Error('Missing thread');const store=createUIStateStore();await persistence.restore(loaded,item.bridge,store,new AbortController().signal);const artifacts=createArtifactStore();for(const artifact of loaded.artifacts)artifacts.register(artifact.state.artifactId);if(loaded.activeArtifactId)artifacts.activate(loaded.activeArtifactId);expect(artifacts.getActiveId()).toBe(second);expect(store.get(second).filters.modes).toEqual(['bus']);expect(store.get(item.id).filters.modes).toEqual([]);
 })
 it('rejects nested transport leakage, unsafe records, and incompatible versions without restoring rows',async()=>{
  const io=memory();const persistence=createThreadPersistence(io.storage);const item=await fixture();await expect(persistence.save('unsafe',{...item.record,messages:[{tool:{result:{nested:{rows:[row]}}}}]})).rejects.toThrow(/bulk-data/i)
  io.values.set('future',{...item.record,parserVersion:'future-parser'});expect(await persistence.load('future')).toBeNull()
  io.values.set('corrupt','not-a-thread');expect(await persistence.load('corrupt')).toBeNull()
 })
 it('exports one coherent current revision and allowlisted manifests without rows',async()=>{
  const item=await fixture();item.store.dispatch({kind:'filters',artifactId:item.id,filters:{modes:['train'],carrierIds:[],directOnly:true}})
  const snapshot=exportAgentContext({turnId:'turn-1',activeArtifactId:item.id,artifactIds:[item.id],store:item.store,bridge:item.bridge});expect(snapshot.artifacts[0]?.revision).toBe(1);expect(snapshot.artifacts[0]?.filters.directOnly).toBe(true);expect(snapshot.datasets[0]?.rowCount).toBe(2);expect(JSON.stringify(snapshot)).not.toContain('availableSeats":3')
 })
})
