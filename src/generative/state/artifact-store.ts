import { ArtifactIdSchema,type ArtifactId } from '../contracts'
export function createArtifactStore(){
 const ids=new Set<ArtifactId>();let active:ArtifactId|undefined;const listeners=new Set<()=>void>()
 return {register(id:ArtifactId){ids.add(id);if(!active)active=id},getActiveId(){return active},getIds(){return [...ids]},activate(id:ArtifactId){const parsed=ArtifactIdSchema.parse(id);if(!ids.has(parsed))throw new Error('Unknown artifact');active=parsed;listeners.forEach(listener=>listener())},remove(id:ArtifactId){ids.delete(id);if(active===id)active=[...ids].at(-1);listeners.forEach(listener=>listener())},subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}}}
}
