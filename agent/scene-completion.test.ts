import { expect,it } from 'vitest'
import { acceptTurn,spendTool,recordScene,getAcceptedScenes } from './turn-budget'
import { CODEX_DEVELOPER_INSTRUCTIONS } from './codex-provider'
import { ArtifactIdSchema,UIStateRevisionSchema } from '../src/generative/contracts'
import { createUIStateStore } from '../src/generative/state/ui-state-store'
import { createFareDataBridge } from '../src/generative/data/fare-data-bridge'
import { exportAgentContext } from '../src/generative/state/snapshot-exporter'
import type { ChatRequest } from './request-schema'
const artifact=ArtifactIdSchema.parse('completion-artifact'),other=ArtifactIdSchema.parse('other-artifact')
function request():ChatRequest{const store=createUIStateStore();store.initializeMissing(artifact,{});store.initializeMissing(other,{});return{id:crypto.randomUUID(),currentContext:exportAgentContext({turnId:'completion',activeArtifactId:artifact,artifactIds:[artifact,other],store,bridge:createFareDataBridge()}),messages:[{id:'user',role:'user',parts:[{type:'text',text:'Compose both views.'}]}]}}
function ack(input:ChatRequest){const key=acceptTurn(input);spendTool(key,'present');recordScene(key,'scene','present',artifact,UIStateRevisionSchema.parse(0));input.messages.push({id:'assistant',role:'assistant',parts:[{type:'tool-present',toolCallId:'scene',state:'output-available',input:{artifactRef:artifact},output:{}}]});return key}
it('none finalizes fulfilled tool-backed requests, not only text-only requests',()=>{expect(CODEX_DEVELOPER_INSTRUCTIONS).toContain('fulfilled tool-backed');expect(CODEX_DEVELOPER_INSTRUCTIONS).toContain('different requested artifact');expect(CODEX_DEVELOPER_INSTRUCTIONS).toContain('new UI revision')})
it('reports current-turn accepted scenes at the captured UI revision',()=>{const input=request(),key=ack(input);expect(getAcceptedScenes(key,input)).toEqual([{artifactRef:artifact,uiStateRevision:0,toolName:'present'}]);expect(getAcceptedScenes(key,input).some(scene=>scene.artifactRef===other)).toBe(false)})
it('does not finalize a new user turn, changed UI revision, explicit regenerate or real error',()=>{const input=request(),key=ack(input);input.currentContext.artifacts[0]!.revision=UIStateRevisionSchema.parse(1);expect(getAcceptedScenes(key,input)).toEqual([]);input.currentContext.artifacts[0]!.revision=UIStateRevisionSchema.parse(0);input.trigger='regenerate-message';expect(getAcceptedScenes(key,input)).toEqual([]);delete input.trigger;input.messages.at(-1)!.parts[0]!.output={artifactId:artifact,programRevision:0,status:'error'};expect(getAcceptedScenes(key,input)).toEqual([]);input.messages.push({id:'next-user',role:'user',parts:[{type:'text',text:'Compose again.'}]});expect(getAcceptedScenes(acceptTurn(input),input)).toEqual([])})
