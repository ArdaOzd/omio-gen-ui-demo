import { ZodError } from 'zod';
const knownMessages=new Set(['Unknown artifact reference','Unknown dataset reference','Unknown action reference','Unknown selector reference','Unknown partial artifact','Unknown partial dataset','Unknown partial action','Unknown partial selector','Unknown partial component','Unknown partial tree field','Partial tree byte limit','Partial scalar string limit','Partial scalar limit','Partial tree structural limit','Tree byte budget exceeded','TravelSurface root required','Tree budget exceeded','Duplicate node key','Leaf component has children','Model selected an unregistered tool','Unregistered tool']);
export function validationReason(error:unknown):string{
 if(error instanceof Error&&error.cause!==undefined&&error.cause!==error)error=error.cause
 if(error instanceof ZodError){const issue=error.issues[0];if(!issue)return 'ZodError: invalid generated decision';const path=issue.path.slice(0,4).map(part=>String(part).replace(/[^A-Za-z0-9_$]/g,'').slice(0,32)).join('.')||'toolInput';const message=issue.code==='unrecognized_keys'?'Unrecognized fields':issue.message.replace(/\s+/g,' ').slice(0,100);return `ZodError ${issue.code} at ${path}: ${message}`.slice(0,190);}
 if(error instanceof SyntaxError)return 'SyntaxError: malformed JSON tool input';
 if(error instanceof Error&&(/^[A-Z][A-Z0-9_]{1,63}$/.test(error.message)||knownMessages.has(error.message)))return `${error.name}: ${error.message}`.slice(0,190);
 return 'Invalid generated decision; use the registered grammar, schemas and references';
}
