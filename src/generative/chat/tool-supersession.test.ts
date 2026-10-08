import {describe,expect,it,vi} from 'vitest'
import {hasLaterAcceptedScene,type ScenePart} from './tool-supersession'

type Claim='all-legs'|ReadonlySet<number>|null
const scene=(toolCallId:string,artifactRef:string,claim:Claim,result:unknown={}):ScenePart=>({type:'tool-call',toolCallId,toolName:'present',args:{artifactRef,claim},result})
const accepted=(part:ScenePart)=>!part.isError&&typeof part.result==='object'&&part.result!==null
const claim=(part:ScenePart):Claim=>(part.args as {claim:Claim}).claim
const overlaps=(current:ScenePart,later:ScenePart)=>{
 const currentClaim=claim(current),laterClaim=claim(later)
 if(currentClaim===null)return laterClaim===null
 if(laterClaim===null)return false
 if(currentClaim==='all-legs'||laterClaim==='all-legs')return true
 return [...currentClaim].some(index=>laterClaim.has(index))
}

describe('accepted scene supersession',()=>{
 it('keeps the legacy latest accepted scene behavior for later parts in one message',()=>{
  const parts=[scene('current','artifact-a',null),{...scene('failed','artifact-a',null),isError:true},scene('replacement','artifact-a',null)]
  expect(hasLaterAcceptedScene(parts,'current','present','artifact-a',accepted)).toBe(true)
  expect(hasLaterAcceptedScene(parts,'replacement','present','artifact-a',accepted)).toBe(false)
 })

 it('scans chronologically flattened parts from later messages',()=>{
  const firstMessage=[scene('current','artifact-a',new Set([0]))]
  const interveningMessage:[ScenePart]=[{type:'text'}]
  const laterMessage=[scene('other-artifact','artifact-b',new Set([0])),scene('replacement','artifact-a',new Set([0]))]
  const parts=[...firstMessage,...interveningMessage,...laterMessage]
  expect(hasLaterAcceptedScene(parts,'current','present','artifact-a',accepted,overlaps)).toBe(true)
 })

 it('does not let a later comparison-only scene hide a booking workflow',()=>{
  const replacement=scene('comparison','artifact-a',null)
  const replaces=vi.fn(overlaps)
  expect(hasLaterAcceptedScene([scene('booking','artifact-a','all-legs'),replacement],'booking','present','artifact-a',accepted,replaces)).toBe(false)
  expect(replaces).toHaveBeenCalledWith(expect.objectContaining({toolCallId:'booking'}),replacement)
 })

 it('supersedes only overlapping booking leg claims',()=>{
  const current=scene('leg-zero','artifact-a',new Set([0]))
  const separate=scene('leg-one','artifact-a',new Set([1]))
  const overlap=scene('all-legs','artifact-a','all-legs')
  expect(hasLaterAcceptedScene([current,separate],'leg-zero','present','artifact-a',accepted,overlaps)).toBe(false)
  expect(hasLaterAcceptedScene([current,separate,overlap],'leg-zero','present','artifact-a',accepted,overlaps)).toBe(true)
 })

 it('preserves legacy replacement when both scenes have no booking owner',()=>{
  expect(hasLaterAcceptedScene([scene('old-summary','artifact-a',null),scene('new-summary','artifact-a',null)],'old-summary','present','artifact-a',accepted,overlaps)).toBe(true)
 })
})
