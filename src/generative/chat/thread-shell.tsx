import { ActionBarPrimitive, ComposerPrimitive, MessagePrimitive, ThreadPrimitive,MessagePartPrimitive,useAuiState } from '@assistant-ui/react'
import { useSyncExternalStore,useContext,useEffect,useRef,useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Textarea } from '@/components/ui/textarea'
import { useTravelServices } from '../catalog/context'
import {CanonicalMessagesContext,completedNarrativeIndices,completedLocalToolIndices} from './narrative-disclosure'
export const assistantWorkingPuns=['oiling the engine','starting the bus','adjusting AC temperature','cabin crew cross check','pilot practicing sexy voice','landing gear check','bargaining with the travel agencies','getting lost in the wild','loading the ropes to the ferry','sobering up the captain','changing left headlight','spinning the wheels','Loading the vagon','making sure the horn works','pinpointing the map','cabin crew take your seats','loading snacks','Downloading movies for in-flight entertainment','bribing the GPS with compliments','teaching the suitcase to behave','convincing the clouds to cooperate','polishing the window seat','checking the captain’s playlist','giving the compass a pep talk','untangling the boarding queue','warming up the ticket printer','negotiating with the luggage carousel','reminding the ferry to float'] as const
const randomPunIndex=()=>Math.floor(Math.random()*assistantWorkingPuns.length)
const partComponents={Text:()=><p style={{whiteSpace:'pre-line'}}><MessagePartPrimitive.Text/><MessagePartPrimitive.InProgress><span> ●</span></MessagePartPrimitive.InProgress></p>,Image:()=><MessagePartPrimitive.Image/>}
function AssistantNarrative(){
 const message=useAuiState(state=>state.message),canonical=useContext(CanonicalMessagesContext).find(raw=>raw.id===message.id)
 const complete=message.status?.type==='complete'
 const hidden=completedNarrativeIndices(canonical,message.parts,complete)
 for(const index of completedLocalToolIndices(canonical,message.parts,complete))hidden.add(index)
 const [stepsOpen,setStepsOpen]=useState(false)
 return <>{hidden.size>0&&<Collapsible open={stepsOpen} onOpenChange={setStepsOpen}><CollapsibleTrigger asChild><Button variant="ghost">Completed steps</Button></CollapsibleTrigger><CollapsibleContent forceMount hidden={!stepsOpen}>{message.parts.map((_,index)=>hidden.has(index)?<MessagePrimitive.PartByIndex key={index} index={index} components={partComponents}/>:null)}</CollapsibleContent></Collapsible>}{message.parts.map((_,index)=>hidden.has(index)?null:<MessagePrimitive.PartByIndex key={index} index={index} components={partComponents}/>)}</>
}
function AssistantWorkingStatus(){
 const running=useAuiState(state=>state.message.status?.type==='running'),[index,setIndex]=useState(()=>running?randomPunIndex():0),wasRunning=useRef(running)
 useEffect(()=>{
  if(!running){wasRunning.current=false;return}
  if(!wasRunning.current){wasRunning.current=true;setIndex(randomPunIndex())}
  const timer=window.setInterval(()=>setIndex(current=>(current+1)%assistantWorkingPuns.length),5000)
  return()=>window.clearInterval(timer)
 },[running])
 return running?<p className="travel-message-thinking">{assistantWorkingPuns[index]}…</p>:null
}
const suggestions=['Show the cheapest and fastest London to Paris options next week.','Compare train and bus visually.','Plan London, Paris, and Barcelona with two and four-night stays.','Show the same options as a timeline.']
function UserMessage(){return <MessagePrimitive.Root className="travel-message travel-message-user"><Card><MessagePrimitive.Parts/></Card></MessagePrimitive.Root>}
function AssistantMessage(){return <MessagePrimitive.Root className="travel-message travel-message-assistant"><AssistantNarrative/><AssistantWorkingStatus/><MessagePrimitive.Error><Alert className="travel-message-error">The assistant could not finish this response. Retry to use your latest changes.</Alert><ActionBarPrimitive.Root><ActionBarPrimitive.Reload asChild><Button variant="outline" aria-label="Retry response">Retry</Button></ActionBarPrimitive.Reload></ActionBarPrimitive.Root></MessagePrimitive.Error></MessagePrimitive.Root>}
export function ThreadShell(){
 const services=useTravelServices();const active=useSyncExternalStore(services.subscribeActive??(()=>()=>{}),services.activeId,services.activeId)
 return <div className="travel-chat"><header className="travel-chat-header"><Button asChild variant="link" className="travel-brand"><a href="/">wayfinder</a></Button><span className="travel-caption">Travel ideas, made yours</span></header><ThreadPrimitive.Root className="travel-thread"><ThreadPrimitive.Viewport className="travel-viewport"><ThreadPrimitive.Empty><Card role="region" aria-label="Travel planning welcome" className="travel-welcome"><p className="travel-caption">MAKE ROOM FOR THE JOURNEY</p><h2>Where will your next<br/>good story begin?</h2><p>Compare your options, explore a different route, or build a few days away. Change any control as you go.</p><div className="travel-suggestions">{suggestions.map(prompt=><ThreadPrimitive.Suggestion key={prompt} prompt={prompt} send asChild><Button variant="outline">{prompt}</Button></ThreadPrimitive.Suggestion>)}</div><p className="travel-caption">All fares and totals are synthetic demo data.</p></Card></ThreadPrimitive.Empty><ThreadPrimitive.Messages>{({message})=>message.role==='user'?<UserMessage/>:<AssistantMessage/>}</ThreadPrimitive.Messages></ThreadPrimitive.Viewport><div className="travel-composer-wrap"><div className="travel-active"><span>{active?`Active travel view · ${active}`:'Your next journey starts here'}</span><span>Synthetic fares</span></div><ComposerPrimitive.Root className="travel-composer"><ComposerPrimitive.Input asChild><Textarea aria-label="Message" placeholder="Ask about a route, a budget, or a few days away…" rows={2}/></ComposerPrimitive.Input><ComposerPrimitive.Send asChild><Button aria-label="Send message">Send</Button></ComposerPrimitive.Send><ComposerPrimitive.Cancel asChild><Button variant="outline" aria-label="Stop response">Stop</Button></ComposerPrimitive.Cancel></ComposerPrimitive.Root></div></ThreadPrimitive.Root></div>
}
