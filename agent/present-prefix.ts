import { catalogDescriptors } from '../src/generative/catalog/generated/catalog';
import { registeredActions,registeredSelectors,validatePresentTree } from '../src/generative/variants/a/tree';
const keys=new Set(['$type','$key','artifactRef','datasetRef','actionRef','selectorRef','title','variant','children']);
const names=new Set<string>(catalogDescriptors.map(descriptor=>descriptor.name));
export function validatePresentPrefix(source:string,scope:{artifactIds:Set<string>;datasetIds:Set<string>}):void {
 if(new TextEncoder().encode(source).length>24_000)throw new Error('Partial tree byte limit');
 let inString=false,escaped=false,start=0,depth=0,nodes=0,key='';
 for(let index=0;index<source.length;index++){
  const char=source[index];
  if(inString){
   if(index-start>1000)throw new Error('Partial scalar string limit');
   if(escaped){escaped=false;continue;}
   if(char==='\\'){escaped=true;continue;}
   if(char!=='"')continue;
   inString=false;const value:unknown=JSON.parse(source.slice(start,index+1));if(typeof value!=='string')throw new Error('Invalid scalar');
   let next=index+1;while(/\s/.test(source[next]??'')&&next<source.length)next++;
   if(source[next]===':'){if(!keys.has(value))throw new Error('Unknown partial tree field');key=value;}
   else {
    if(value.length>(['title','children'].includes(key)?160:96))throw new Error('Partial scalar limit');
    if(key==='$type'&&!names.has(value))throw new Error('Unknown partial component');
    if(key==='artifactRef'&&!scope.artifactIds.has(value))throw new Error('Unknown partial artifact');
    if(key==='datasetRef'&&!scope.datasetIds.has(value))throw new Error('Unknown partial dataset');
    if(key==='actionRef'&&!registeredActions.has(value))throw new Error('Unknown partial action');
    if(key==='selectorRef'&&!registeredSelectors.has(value))throw new Error('Unknown partial selector');
   }
  }else if(char==='"'){inString=true;start=index;}
  else if(char==='{'){if(++depth>8||++nodes>80)throw new Error('Partial tree structural limit');}
  else if(char==='}')depth--;
 }
 if(depth===0&&!inString){try{validatePresentTree(JSON.parse(source),scope)}catch(error){if(source.trim().endsWith('}'))throw error;}}
}
