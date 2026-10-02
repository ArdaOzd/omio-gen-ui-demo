import { z } from 'zod'
import { LIMITS } from '../../contracts'
import { assertNoBulkData } from '../../contracts/privacy'
import { catalogDescriptors, sharedPropsSchema } from '../../catalog/generated/catalog'
export type PresentNode=z.infer<typeof sharedPropsSchema>&{$type:string;$key?:string;children?:PresentNode[]|string}
const names=new Set<string>(catalogDescriptors.map(d=>d.name));const layouts=new Set<string>(catalogDescriptors.filter(d=>d.children).map(d=>d.name))
export const registeredActions=new Set(['filters','dates','sort','select','stays','activate','retry'])
export const registeredSelectors=new Set(['visibleFares','priceByDay','modeCounts','carrierCounts','cheapestFastest','selectedItinerary','syntheticTotal','coverage','route','timeline'])
const nodeSchema:z.ZodType<PresentNode>=z.lazy(()=>sharedPropsSchema.extend({$type:z.string().refine(name=>names.has(name),'Unregistered component'),$key:z.string().max(96).optional(),children:z.union([z.string().max(160),z.array(nodeSchema).max(LIMITS.treeNodes)]).optional()}))
export function validatePresentTree(input:unknown,scope?:{artifactIds:Set<string>;datasetIds:Set<string>}):PresentNode {
 assertNoBulkData(input)
 if(new TextEncoder().encode(JSON.stringify(input)).length>24_000)throw new Error('Tree byte budget exceeded')
 const root=nodeSchema.parse(input);if(root.$type!=='TravelSurface')throw new Error('TravelSurface root required')
 let count=0;const keys=new Set<string>()
 const visit=(node:PresentNode,depth:number):void=>{
  if(++count>LIMITS.treeNodes||depth>LIMITS.treeDepth)throw new Error('Tree budget exceeded')
  if(scope&&!scope.artifactIds.has(node.artifactRef))throw new Error('Unknown artifact reference')
  if(scope&&node.datasetRef&&!scope.datasetIds.has(node.datasetRef))throw new Error('Unknown dataset reference')
  if(node.actionRef&&!registeredActions.has(node.actionRef))throw new Error('Unknown action reference')
  if(node.selectorRef&&!registeredSelectors.has(node.selectorRef))throw new Error('Unknown selector reference')
  if(node.$key){if(keys.has(node.$key))throw new Error('Duplicate node key');keys.add(node.$key)}
  if(node.children&&!layouts.has(node.$type))throw new Error('Leaf component has children')
  if(Array.isArray(node.children))node.children.forEach(child=>visit(child,depth+1))
 }
 visit(root,1);return root
}
