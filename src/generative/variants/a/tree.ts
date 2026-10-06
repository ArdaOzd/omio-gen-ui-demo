import { z } from 'zod'
import { LIMITS } from '../../contracts'
import { assertNoBulkData } from '../../contracts/privacy'
import { catalogDescriptors, sharedPropsSchema } from '../../catalog/generated/catalog'
export type PresentNode=z.infer<typeof sharedPropsSchema>&{$type:string;$key?:string;children?:PresentNode|PresentNode[]|string}
const names=new Set<string>(catalogDescriptors.map(d=>d.name));const layouts=new Set<string>(catalogDescriptors.filter(d=>d.children).map(d=>d.name))
export const registeredActions=new Set(['filters','dates','sort','sortByLeg','calendarDateByLeg','modesByLeg','select','stays','route','activate','retry'])
export const registeredSelectors=new Set(['visibleFares','priceByDay','modeCounts','carrierCounts','cheapestFastest','selectedItinerary','syntheticTotal','coverage','route','timeline','legSchedule'])
const nodeSchema:z.ZodType<PresentNode>=z.lazy(()=>sharedPropsSchema.extend({$type:z.string().refine(name=>names.has(name),'Unregistered component'),$key:z.string().max(96).optional(),children:z.union([z.string().max(160),nodeSchema,z.array(nodeSchema).max(LIMITS.treeNodes)]).optional()}))
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
  if(Array.isArray(node.children))node.children.forEach(child=>visit(child,depth+1));else if(node.children&&typeof node.children!=='string')visit(node.children,depth+1)
 }
 visit(root,1);return root
}

const shallowNodeSchema=sharedPropsSchema.extend({$type:z.string().refine(name=>names.has(name)),$key:z.string().max(96).optional()})
/** Only completed, allowlisted scalar props reach the native renderer. */
export function prunePresentTree(input:unknown,scope?:{artifactIds:Set<string>;datasetIds:Set<string>},partialPath?:readonly string[]):PresentNode|undefined {
 let remaining=LIMITS.treeNodes;const keys=new Set<string>()
 const visit=(value:unknown,depth:number,path?:readonly string[]):PresentNode|undefined=>{
  if(remaining--<=0||depth>LIMITS.treeDepth||!value||typeof value!=='object'||Array.isArray(value))return undefined
  const {children,...scalar}=value as Record<string,unknown>
  if(path?.length===1&&path[0]&&path[0]!=='children'){
   if(path[0]==='$type'||path[0]==='artifactRef')return undefined
   delete scalar[path[0]]
  }
  const parsed=shallowNodeSchema.safeParse(scalar);if(!parsed.success)return undefined
  const node=parsed.data
  if(depth===1&&node.$type!=='TravelSurface')return undefined
  if(scope&&(!scope.artifactIds.has(node.artifactRef)||(node.datasetRef&&!scope.datasetIds.has(node.datasetRef))))return undefined
  if(node.actionRef&&!registeredActions.has(node.actionRef)||node.selectorRef&&!registeredSelectors.has(node.selectorRef))return undefined
  if(node.$key){if(keys.has(node.$key))return undefined;keys.add(node.$key)}
  if(!layouts.has(node.$type))return node
  const childPath=path?.[0]==='children'?path.slice(1):undefined
  if(typeof children==='string')return {...node,...(children.length<=160&&childPath?.length!==0?{children}:{})}
  if(Array.isArray(children)){
   const accepted:PresentNode[]=[]
   for(let i=0;i<children.length&&remaining>0;i++){
    const child=visit(children[i],depth+1,childPath?.[0]===String(i)?childPath.slice(1):undefined)
    if(child)accepted.push(child)
   }
   return {...node,children:accepted}
  }
  const child=visit(children,depth+1,childPath)
  return child?{...node,children:child}:node
 }
 return visit(input,1,partialPath)
}
