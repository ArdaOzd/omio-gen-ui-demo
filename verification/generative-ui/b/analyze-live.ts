import {readFileSync,writeFileSync} from 'node:fs'
import {validateReactiveProgram} from '../../../src/generative/variants/b/query/validate-program'
const programs=[0,1].map(index=>{
 const source=readFileSync(`verification/generative-ui/b/live/program-${index}.openui`,'utf8')
 const result=validateReactiveProgram(source)
 return{index,parserValid:true,variables:result.variables,bindings:result.bindings,dependencies:result.dependencies,queryBindings:result.queryBindings,queryStatements:result.parsed.queryStatements.map(query=>({id:query.statementId,deps:query.deps,argsAST:query.argsAST})),mutationCount:result.parsed.mutationStatements.length}
})
writeFileSync('verification/generative-ui/b/live/authored-graphs.json',JSON.stringify({classification:'AST analysis of two genuine completed Codex programs',programs},null,2)+'\n')
console.log(JSON.stringify(programs.map(({index,variables,dependencies,mutationCount})=>({index,variables,dependencies,mutationCount}))))
