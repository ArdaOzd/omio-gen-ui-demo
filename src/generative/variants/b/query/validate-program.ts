import { autoClose,createParser,parseExpression,split,tokenize,walkAST,type ASTNode } from '@openuidev/lang-core'
import { catalogDescriptors } from '../../../catalog/generated/catalog'
import { ArtifactUIStateSchema } from '../../../contracts'
import { assertNoBulkData,hasFareRowFields } from '../../../contracts/privacy'
import { bSchemaLibrary,BindingSchema,type Binding } from './schema'
export type ProgramBinding={variable:string;field:Binding;artifactRef:string}
const names=new Set([...catalogDescriptors.map(d=>d.name),'Query','Mutation','Action','Set','Reset','Run'])
export function validateReactiveProgram(program:string,options:{complete?:boolean;scope?:{artifactId:string;datasetIds:ReadonlySet<string>}}={}) {
 if(typeof program!=='string'||program.length>60000)throw new Error('PROGRAM_SIZE')
 const closed=autoClose(program);if(options.complete!==false&&closed.wasIncomplete)throw new Error('PROGRAM_INCOMPLETE')
 let depth=0;for(const character of closed.text){if('[({'.includes(character)&&++depth>24)throw new Error('PROGRAM_DEPTH');if('])}'.includes(character))depth--}
 const tokens=tokenize(closed.text),statements=split(tokens)
 if(tokens.length>12000||statements.length>120||new Set(statements.map(s=>s.id)).size!==statements.length)throw new Error('PROGRAM_BUDGET')
 // split silently drops malformed lines; account for every non-newline/non-EOF token.
 if(tokens.filter(t=>t.t!==0&&t.t!==13).length!==statements.reduce((n,s)=>n+s.tokens.filter(t=>t.t!==0&&t.t!==13).length+2,0))throw new Error('PROGRAM_SYNTAX')
 const references:Array<{artifact:ASTNode|undefined;dataset?:ASTNode}>=[];const datasetReferences:ASTNode[]=[]
 const bindings:ProgramBinding[]=[];const assignments:ASTNode[]=[];const expressions=new Map<string,ASTNode>();const queryBindings:Array<{kind:string;artifactRef:string;datasetRef?:string;title?:string;queryId:string}>=[];let nodes=0
 for(const statement of statements){const ast=parseExpression(statement.tokens);expressions.set(statement.id,ast)
  walkAST(ast,node=>{if(++nodes>4000)throw new Error('PROGRAM_BUDGET');inspect(node);if(node.k==='Obj')for(const [key,value]of node.entries)if(key==='datasetRef')datasetReferences.push(value);if(node.k==='Comp'&&['Set','Reset'].includes(node.name))assignments.push(node)
   if(node.k==='Comp'&&catalogDescriptors.some(d=>d.name===node.name)){
    const title=node.args[4];if(title?.k==='Str'&&title.v.length>(node.name==='Callout'?600:160))throw new Error('COMPONENT_TITLE_LENGTH')
    references.push({artifact:node.args[0],dataset:node.args[1]})
    const artifact=node.args[0],binding=node.args[8],variable=node.args[7],query=node.args[9]
    if(query?.k==='Ref'&&artifact?.k==='Str')queryBindings.push({kind:node.name,artifactRef:artifact.v,datasetRef:node.args[1]?.k==='Str'?node.args[1].v:undefined,title:node.args[4]?.k==='Str'?node.args[4].v:undefined,queryId:query.n})
    if(binding&&binding.k!=='Null'){
     if(binding.k!=='Str'||!BindingSchema.safeParse(binding.v).success||variable?.k!=='StateRef'||artifact?.k!=='Str')throw new Error('INVALID_BINDING')
     bindings.push({variable:variable.n,field:BindingSchema.parse(binding.v),artifactRef:artifact.v})
    }
   }
  })
 }
 const parsed=createParser(bSchemaLibrary.toJSONSchema(),bSchemaLibrary.root).parse(program)
 if(options.complete!==false&&(parsed.meta.incomplete||parsed.meta.unresolved.length||parsed.meta.errors.length||!parsed.root))throw new Error('PROGRAM_INVALID')
 if(parsed.queryStatements.length>6||parsed.mutationStatements.length>4)throw new Error('PROGRAM_TOOL_BUDGET')
 for(const query of parsed.queryStatements){if(query.toolAST?.k!=='Str'||query.toolAST.v!=='local_query'||query.refreshAST)throw new Error('QUERY_TOOL_NOT_ALLOWED')}
 for(const mutation of parsed.mutationStatements){if(mutation.toolAST?.k!=='Str'||mutation.toolAST.v!=='patch_artifact_state')throw new Error('MUTATION_TOOL_NOT_ALLOWED')}
 if(options.scope){
  const scope=options.scope
  const resolve=(node:ASTNode|undefined,seen=new Set<string>()):unknown=>{if(node?.k==='Str')return node.v;if(node?.k==='StateRef')return parsed.stateDeclarations[node.n];if(node?.k==='Ref'&&!seen.has(node.n)){seen.add(node.n);return resolve(expressions.get(node.n),seen)}return undefined}
  for(const reference of references){if(resolve(reference.artifact)!==scope.artifactId)throw new Error('UNKNOWN_ARTIFACT_REFERENCE');if(reference.dataset&&reference.dataset.k!=='Null'&&!scope.datasetIds.has(String(resolve(reference.dataset))))throw new Error('UNKNOWN_DATASET_REFERENCE')}
  for(const reference of datasetReferences)if(!scope.datasetIds.has(String(resolve(reference))))throw new Error('UNKNOWN_DATASET_REFERENCE')
 }
 const variables=Object.keys(parsed.stateDeclarations);if(variables.length>16)throw new Error('VARIABLE_BUDGET')
 for(const [variable,value]of Object.entries(parsed.stateDeclarations)){
  if(!/^\$[A-Za-z][A-Za-z0-9_]{0,39}$/.test(variable))throw new Error('VARIABLE_NAME')
  const binding=bindings.find(b=>b.variable===variable)
  if(binding){if(!ArtifactUIStateSchema.shape[binding.field].safeParse(value).success)throw new Error('VARIABLE_BINDING_TYPE')}
  else if(!(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)||typeof value==='string'&&value.length<=160))throw new Error('VARIABLE_TYPE')
 }
 for(const assignment of assignments){if(assignment.k!=='Comp')continue;const target=assignment.args[0];if(target?.k!=='StateRef'||!variables.includes(target.n))throw new Error('UNKNOWN_VARIABLE');if(assignment.name==='Set'&&assignment.args[1])walkAST(assignment.args[1],node=>{if(node.k==='Ref'||node.k==='RuntimeRef'||node.k==='Comp'||node.k==='Member'&&node.field==='rows')throw new Error('VARIABLE_QUERY_CAPTURE')})}
 assertNoBulkData(parsed.stateDeclarations)
 return {parsed,bindings,expressions,queryBindings,variables:Object.keys(parsed.stateDeclarations),dependencies:parsed.queryStatements.map(q=>({id:q.statementId,deps:q.deps}))}
}
function inspect(node:ASTNode){
 if(node.k==='Obj'&&hasFareRowFields(node.entries.map(([key])=>key)))throw new Error('FORBIDDEN_FARE_LITERAL')
 if(node.k==='Comp'&&!names.has(node.name))throw new Error('UNKNOWN_COMPONENT')
 if(node.k==='Arr'&&node.els.length>80)throw new Error('ARRAY_BUDGET')
 if(node.k==='Obj'&&node.entries.some(([key])=>['rows','fares','sql','url','javascript','__proto__','constructor','prototype'].includes(key)))throw new Error('FORBIDDEN_LITERAL')
 if(node.k==='Member'&&['__proto__','constructor','prototype'].includes(node.field))throw new Error('FORBIDDEN_MEMBER')
 if(node.k==='Str'&&(node.v.length>600||/^https?:|javascript:|SELECT\s/i.test(node.v)))throw new Error('FORBIDDEN_TEXT')
}
