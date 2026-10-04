import { isASTNode,type ActionPlan } from '@openuidev/lang-core'
export function parseAction(value:unknown):ActionPlan{
 if(!value||typeof value!=='object'||!('steps'in value)||!Array.isArray(value.steps)||value.steps.length>8)throw new Error('ACTION_INVALID')
 const steps:ActionPlan['steps']=[]
 for(const step of value.steps){if(!step||typeof step!=='object')throw new Error('ACTION_INVALID')
  if(step.type==='set'&&typeof step.target==='string'&&isASTNode(step.valueAST))steps.push({type:'set',target:step.target,valueAST:step.valueAST})
  else if(step.type==='reset'&&Array.isArray(step.targets)&&step.targets.every((target:unknown)=>typeof target==='string'))steps.push({type:'reset',targets:step.targets})
  else if(step.type==='run'&&typeof step.statementId==='string'&&(step.refType==='query'||step.refType==='mutation'))steps.push({type:'run',statementId:step.statementId,refType:step.refType})
  else throw new Error('ACTION_INVALID')
 }
 return{steps}
}
