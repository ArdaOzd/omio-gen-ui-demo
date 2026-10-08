import { z } from 'zod'
import { LIMITS } from '../../contracts'
import { assertNoBulkData } from '../../contracts/privacy'
import { catalogDescriptors, nodePropsSchema } from '../../catalog/generated/catalog'
import { isDatasetBoundComponent, isLegBoundPlannerComponent } from '../../catalog/trip-planning/binding'
export type PresentNode=z.infer<typeof nodePropsSchema>&{$type:string;$key?:string;children?:PresentNode|PresentNode[]|string}
const names=new Set<string>(catalogDescriptors.map(d=>d.name));const layouts=new Set<string>(catalogDescriptors.filter(d=>d.children).map(d=>d.name))
const bookingScopes=new Map<string,'all-legs'|'bound-leg'>()
for(const descriptor of catalogDescriptors)if('bookingOwnership' in descriptor)bookingScopes.set(descriptor.name,descriptor.bookingOwnership.scope)
export type PresentValidationScope={artifactIds:Set<string>;datasetIds:Set<string>;bookingLegIndexesByArtifact?:ReadonlyMap<string,ReadonlySet<number>>;bookingLegIndexByArtifactDataset?:ReadonlyMap<string,ReadonlyMap<string,number>>}
export type PresentArtifactLegScope={artifactId:string;legDatasetIds:ReadonlyArray<ReadonlySet<string>>}
export function createPresentValidationScope(artifacts:readonly PresentArtifactLegScope[],datasetIds:Iterable<string>):PresentValidationScope{
 const bookingLegIndexesByArtifact=new Map<string,ReadonlySet<number>>()
 const bookingLegIndexByArtifactDataset=new Map<string,ReadonlyMap<string,number>>()
 for(const artifact of artifacts){
  bookingLegIndexesByArtifact.set(artifact.artifactId,new Set(artifact.legDatasetIds.map((_,index)=>index)))
  bookingLegIndexByArtifactDataset.set(artifact.artifactId,new Map(artifact.legDatasetIds.flatMap((ids,index)=>[...ids].map(id=>[id,index] as const))))
 }
 return{artifactIds:new Set(artifacts.map(artifact=>artifact.artifactId)),datasetIds:new Set(datasetIds),bookingLegIndexesByArtifact,bookingLegIndexByArtifactDataset}
}
export const registeredActions=new Set(['filters','dates','sort','sortByLeg','calendarDateByLeg','modesByLeg','select','stays','route','activate','retry'])
export const registeredSelectors=new Set(['visibleFares','priceByDay','modeCounts','carrierCounts','cheapestFastest','selectedItinerary','syntheticTotal','coverage','route','timeline','legSchedule'])
const componentKey=z.string().min(1).max(96).regex(/^[a-zA-Z0-9_.:-]+$/)
const nodeSchema:z.ZodType<PresentNode>=z.lazy(()=>nodePropsSchema.extend({$type:z.string().refine(name=>names.has(name),'Unregistered component'),$key:componentKey.optional(),children:z.union([z.string().max(160),nodeSchema,z.array(nodeSchema).max(LIMITS.treeNodes)]).optional()}))
type BookingClaim={artifactRef:string;scope:'all-legs'|'bound-leg';legIndex?:number}
function bookingClaims(root:PresentNode):BookingClaim[]{
 const claims:BookingClaim[]=[]
 const visit=(node:PresentNode):void=>{
  const scope=bookingScopes.get(node.$type)
  if(scope)claims.push({artifactRef:node.artifactRef,scope,...(node.legIndex===undefined?{}:{legIndex:node.legIndex})})
  if(Array.isArray(node.children))node.children.forEach(visit)
  else if(node.children&&typeof node.children!=='string')visit(node.children)
 }
 visit(root);return claims
}
export function presentTreesOverlapForSupersession(current:PresentNode,next:PresentNode):boolean{
 const currentClaims=bookingClaims(current),nextClaims=bookingClaims(next)
 if(!currentClaims.length&&!nextClaims.length)return current.artifactRef===next.artifactRef
 return currentClaims.some(left=>nextClaims.some(right=>left.artifactRef===right.artifactRef&&(left.scope==='all-legs'||right.scope==='all-legs'||left.legIndex===right.legIndex)))
}
function assertBookingOwnership(root:PresentNode,scope?:PresentValidationScope,requireCompleteCoverage=true):void{
 const bookingByArtifact=new Map<string,{allLegs:boolean;legIndexes:Set<number>}>()
 const visit=(node:PresentNode):void=>{
  const bookingScope=bookingScopes.get(node.$type)
  if(bookingScope){
   const owned=bookingByArtifact.get(node.artifactRef)??{allLegs:false,legIndexes:new Set<number>()}
   if(bookingScope==='all-legs'){
    if(node.datasetRef||node.legIndex!==undefined)throw new Error('All-leg booking workflow cannot bind one leg')
    if(owned.allLegs||owned.legIndexes.size)throw new Error('Overlapping booking workflow for one leg')
    owned.allLegs=true
   }else{
    if(node.legIndex===undefined)throw new Error('Leg-bound planner dataset requires legIndex')
    const resolvedLegIndex=node.datasetRef?scope?.bookingLegIndexByArtifactDataset?.get(node.artifactRef)?.get(node.datasetRef):undefined
    if(resolvedLegIndex!==undefined&&resolvedLegIndex!==node.legIndex)throw new Error('Inconsistent booking workflow leg binding')
    if(owned.allLegs||owned.legIndexes.has(node.legIndex))throw new Error('Overlapping booking workflow for one leg')
    owned.legIndexes.add(node.legIndex)
   }
   bookingByArtifact.set(node.artifactRef,owned)
  }
  if(Array.isArray(node.children))node.children.forEach(visit)
  else if(node.children&&typeof node.children!=='string')visit(node.children)
 }
 visit(root)
 if(!requireCompleteCoverage)return
 for(const [artifactId,expectedLegIndexes] of scope?.bookingLegIndexesByArtifact??[]){
  const owned=bookingByArtifact.get(artifactId)
  if(!owned||owned.allLegs||owned.legIndexes.size===0)continue
  if(owned.legIndexes.size!==expectedLegIndexes.size||[...expectedLegIndexes].some(index=>!owned.legIndexes.has(index)))throw new Error('Incomplete booking workflow leg coverage')
 }
}
export function validatePresentTree(input:unknown,scope?:PresentValidationScope):PresentNode {
 assertNoBulkData(input)
 if(new TextEncoder().encode(JSON.stringify(input)).length>24_000)throw new Error('Tree byte budget exceeded')
 const root=nodeSchema.parse(input);if(root.$type!=='TravelSurface')throw new Error('TravelSurface root required')
 let count=0;const keys=new Set<string>()
 const visit=(node:PresentNode,depth:number):void=>{
  if(++count>LIMITS.treeNodes||depth>LIMITS.treeDepth)throw new Error('Tree budget exceeded')
  const legBound=isLegBoundPlannerComponent(node.$type),datasetBound=isDatasetBoundComponent(node.$type)
  if(node.legIndex!==undefined&&!datasetBound)throw new Error('legIndex is only valid for dataset-bound components')
  if(node.datasetRef&&legBound&&node.legIndex===undefined)throw new Error('Leg-bound planner dataset requires legIndex')
  if(scope&&!scope.artifactIds.has(node.artifactRef))throw new Error('Unknown artifact reference')
  if(scope&&node.datasetRef&&!scope.datasetIds.has(node.datasetRef)&&!(datasetBound&&node.legIndex!==undefined))throw new Error('Unknown dataset reference')
  if(node.actionRef&&!registeredActions.has(node.actionRef))throw new Error('Unknown action reference')
  if(node.selectorRef&&!registeredSelectors.has(node.selectorRef))throw new Error('Unknown selector reference')
  if(node.$key){if(keys.has(node.$key))throw new Error('Duplicate node key');keys.add(node.$key)}
  if(node.children&&!layouts.has(node.$type))throw new Error('Leaf component has children')
  if(Array.isArray(node.children))node.children.forEach(child=>visit(child,depth+1));else if(node.children&&typeof node.children!=='string')visit(node.children,depth+1)
 }
 visit(root,1)
 assertBookingOwnership(root,scope)
 return root
}

const shallowNodeSchema=nodePropsSchema.extend({$type:z.string().refine(name=>names.has(name)),$key:componentKey.optional()})
/** Only completed, allowlisted scalar props reach the native renderer. */
export function prunePresentTree(input:unknown,scope?:PresentValidationScope,partialPath?:readonly string[]):PresentNode|undefined {
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
  const legBound=isLegBoundPlannerComponent(node.$type),datasetBound=isDatasetBoundComponent(node.$type)
  if(node.legIndex!==undefined&&!datasetBound||node.datasetRef&&legBound&&node.legIndex===undefined)return undefined
  if(depth===1&&node.$type!=='TravelSurface')return undefined
  if(scope&&(!scope.artifactIds.has(node.artifactRef)||(node.datasetRef&&!scope.datasetIds.has(node.datasetRef)&&!(datasetBound&&node.legIndex!==undefined))))return undefined
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
 const tree=visit(input,1,partialPath)
 if(!tree)return undefined
 try{assertBookingOwnership(tree,scope,false);return tree}catch{return undefined}
}
