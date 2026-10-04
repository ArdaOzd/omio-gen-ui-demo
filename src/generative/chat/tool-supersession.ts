export type ScenePart={type:string;toolCallId?:string;toolName?:string;args?:unknown;result?:unknown;isError?:boolean}
export function hasLaterAcceptedScene(parts:readonly ScenePart[],toolCallId:string,toolName:string,artifactRef:string|undefined,accepted:(part:ScenePart)=>boolean):boolean{
 const currentIndex=parts.findIndex(part=>part.type==='tool-call'&&part.toolCallId===toolCallId)
 return currentIndex>=0&&parts.slice(currentIndex+1).some(part=>part.type==='tool-call'&&part.toolName===toolName&&(artifactRef===undefined||typeof part.args==='object'&&part.args!==null&&'artifactRef' in part.args&&part.args.artifactRef===artifactRef)&&accepted(part))
}
