import { ArtifactIdSchema,ArtifactUIStateSchema,FareIdSchema,UICommandPatchSchema,type UIStateStore,type UICommand } from '../../contracts'
import type { ProgramBinding } from './query/validate-program'
export function hydrateBindings(store:UIStateStore,bindings:ProgramBinding[],defaults:Record<string,unknown>){
 const result:Record<string,unknown>={}
 for(const [key,value]of Object.entries(defaults))if(value===null||typeof value==='string'||typeof value==='number'||typeof value==='boolean')result[key]=value
 for(const binding of bindings)result[binding.variable]=store.get(ArtifactIdSchema.parse(binding.artifactRef))[binding.field]
 return result
}
export function applyBindingState(raw:Record<string,unknown>,bindings:ProgramBinding[],store:UIStateStore,dispatch:(command:UICommand)=>unknown){
 for(const binding of bindings){const value=raw[binding.variable];const parsed=ArtifactUIStateSchema.shape[binding.field].safeParse(value);if(!parsed.success)continue
  const id=ArtifactIdSchema.parse(binding.artifactRef),current=store.get(id)
  if(JSON.stringify(current[binding.field])===JSON.stringify(parsed.data))continue
  if(binding.field==='selectedFareIds'){
   const ids=ArtifactUIStateSchema.shape.selectedFareIds.parse(value)
   for(const fareId of new Set([...current.selectedFareIds,...ids]))dispatch({kind:'select',artifactId:id,fareId:FareIdSchema.parse(fareId),selected:ids.includes(fareId)})
  }else{const command=UICommandPatchSchema.parse({kind:binding.field,[binding.field]:value});dispatch({...command,artifactId:id,expectedRevision:current.revision})}
 }
}
