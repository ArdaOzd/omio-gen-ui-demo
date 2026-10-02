import { evaluate,type ASTNode } from '@openuidev/lang-core'
import { QueryIRSchema,type ArtifactUIState,type QueryIR } from '../../../contracts'
import type { validateReactiveProgram } from './validate-program'
type Program=ReturnType<typeof validateReactiveProgram>
export function evaluateQueryArguments(program:Program,statementId:string,state:ArtifactUIState,variables:Record<string,unknown>):QueryIR{
 const query=program.parsed.queryStatements.find(query=>query.statementId===statementId)
 if(!query?.argsAST)throw new Error('UNKNOWN_QUERY')
 const visiting=new Set<string>()
 const context={getState:(name:string)=>{const binding=program.bindings.find(binding=>binding.variable===name);return binding?state[binding.field]:name in state.runtimeVariables?state.runtimeVariables[name]:variables[name]},resolveRef:(name:string):unknown=>{
  const expression=program.expressions.get(name);if(!expression||visiting.has(name))throw new Error('INVALID_QUERY_REFERENCE');visiting.add(name);try{return evaluateNode(expression)}finally{visiting.delete(name)}
 }}
 const evaluateNode=(node:ASTNode):unknown=>evaluate(node,context)
 return QueryIRSchema.parse(evaluateNode(query.argsAST))
}
export function findQueryStatement(program:Program,input:QueryIR,state:ArtifactUIState,variables:Record<string,unknown>):string{
 const candidates=program.parsed.queryStatements.map(query=>({id:query.statementId,input:evaluateQueryArguments(program,query.statementId,state,variables)}))
 const exact=candidates.find(candidate=>JSON.stringify(candidate.input)===JSON.stringify(input));if(exact)return exact.id
 const shape=(query:QueryIR)=>JSON.stringify({sources:query.sources,project:query.project,groupBy:query.groupBy,metrics:query.metrics,joins:query.joins,limit:query.limit})
 const compatible=candidates.filter(candidate=>shape(candidate.input)===shape(input));if(compatible.length===1)return compatible[0].id
 throw new Error('AMBIGUOUS_QUERY_REFERENCE')
}
