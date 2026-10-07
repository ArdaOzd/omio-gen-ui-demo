import { z } from 'zod';
import { nodePropsSchema,catalogDescriptors } from '../src/generative/catalog/generated/catalog';
import { registeredActions,registeredSelectors,validatePresentTree } from '../src/generative/variants/a/tree';
const scalars=new Map(Object.entries(nodePropsSchema.shape));
const keys=new Set(['$type','$key','children',...scalars.keys()]);
const specifications=z.toJSONSchema(nodePropsSchema).properties??{};
function scalarLimit(key:string):number {
 const field=specifications[key];
 if(field&&typeof field==='object'){if(typeof field.maxLength==='number')return field.maxLength;if(Array.isArray(field.enum))return Math.max(...field.enum.map(value=>typeof value==='string'?value.length:0));}
 return key==='children'?160:key==='$type'?Math.max(...catalogDescriptors.map(component=>component.name.length)):96;
}
const names=new Set<string>(catalogDescriptors.map(descriptor=>descriptor.name));
export function validatePresentPrefix(source:string,scope:{artifactIds:Set<string>;datasetIds:Set<string>}):void {
 if(new TextEncoder().encode(source).length>24_000)throw new Error('Partial tree byte limit');
 let inString=false,escaped=false,start=0,depth=0,nodes=0,key='',previous='',stringIsKey=false;const containers:Array<'object'|'array'>=[];
 for(let index=0;index<source.length;index++){
  const char=source[index];
  if(inString){
   if(index-start>6*(stringIsKey?Math.max(...[...keys].map(key=>key.length)):scalarLimit(key))+1)throw new Error('Partial scalar string limit');
   if(escaped){escaped=false;continue;}
   if(char==='\\'){escaped=true;continue;}
   if(char!=='"')continue;
   inString=false;const value:unknown=JSON.parse(source.slice(start,index+1));if(typeof value!=='string')throw new Error('Invalid scalar');
   previous='"';
   if(stringIsKey){if(!keys.has(value))throw new Error('Unknown partial tree field');key=value;}
   else {
    if(value.length>scalarLimit(key)||scalars.has(key)&&!scalars.get(key)?.safeParse(value).success)throw new Error('Partial scalar limit');
    if(key==='$type'&&!names.has(value))throw new Error('Unknown partial component');
    if(key==='artifactRef'&&!scope.artifactIds.has(value))throw new Error('Unknown partial artifact');
    if(key==='actionRef'&&value&&!registeredActions.has(value))throw new Error('Unknown partial action');
    if(key==='selectorRef'&&value&&!registeredSelectors.has(value))throw new Error('Unknown partial selector');
   }
  }else {
   if(char==='"'){inString=true;start=index;stringIsKey=previous==='{'||previous===','&&containers.at(-1)==='object';}
   else if(char==='{'){containers.push('object');if(++depth>8||++nodes>80)throw new Error('Partial tree structural limit');}
   else if(char==='[')containers.push('array');
   else if(char==='}'){containers.pop();depth--;}
   else if(char===']')containers.pop();
   if(!/\s/.test(char??''))previous=char??'';
  }
 }
 if(depth===0&&!inString){try{validatePresentTree(JSON.parse(source),scope)}catch(error){if(source.trim().endsWith('}'))throw error;}}
}
