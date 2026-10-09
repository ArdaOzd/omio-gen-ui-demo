import { ActionBarPrimitive, ComposerPrimitive, MessagePrimitive, ThreadPrimitive,MessagePartPrimitive,useAuiState } from '@assistant-ui/react'
import { useEffect,useRef,useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
export const assistantWorkingPuns=['oiling the engine','starting the bus','adjusting AC temperature','cabin crew cross check','pilot practicing sexy voice','landing gear check','bargaining with the travel agencies','getting lost in the wild','loading the ropes to the ferry','sobering up the captain','changing left headlight','spinning the wheels','Loading the vagon','making sure the horn works','pinpointing the map','cabin crew take your seats','loading snacks','Downloading movies for in-flight entertainment','bribing the GPS with compliments','teaching the suitcase to behave','convincing the clouds to cooperate','polishing the window seat','checking the captain’s playlist','giving the compass a pep talk','untangling the boarding queue','warming up the ticket printer','negotiating with the luggage carousel','reminding the ferry to float'] as const
const randomPunIndex=()=>Math.floor(Math.random()*assistantWorkingPuns.length)
const partComponents={Text:()=><p style={{whiteSpace:'pre-line'}}><MessagePartPrimitive.Text/><MessagePartPrimitive.InProgress><span> ●</span></MessagePartPrimitive.InProgress></p>,Image:()=><MessagePartPrimitive.Image/>}
function AssistantNarrative(){
 const message=useAuiState(state=>state.message)
 return <>{message.parts.map((_,index)=><MessagePrimitive.PartByIndex key={index} index={index} components={partComponents}/>)}</>
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
const suggestions=[
 {label:'Compare price vs time',prompt:'I’m going from London to Paris on 28 October 2026. Help me choose between saving money and saving time. Show the exact options and make the price-versus-duration tradeoff obvious.'},
 {label:'Filter a direct trip',prompt:'Find me a direct London to Paris trip between 26 October and 1 November 2026 for at most €80. Give me a compact shortlist I can add to my trip, with useful filters close by.'},
 {label:'View a departure board',prompt:'Show me the London to Paris journeys on 8 November 2026 as a visual departure board. Start with simple route orientation, then put the options in chronological departure and arrival order so I can understand the day at a glance. Finish with a small actionable shortlist and help me choose between saving time and saving money.'},
 {label:'Pick one journey',prompt:"My travel date is fixed: Madrid to Paris on 8 November 2026. I don't need a calendar or a trip planner, and I don't want a long list. Give me a compact pick-one selector with a small alternatives table, plus a clear selected-trip summary and synthetic total as I choose."},
] as const
function UserMessage(){return <MessagePrimitive.Root className="travel-message travel-message-user"><Card><MessagePrimitive.Parts/></Card></MessagePrimitive.Root>}
function AssistantMessage(){return <MessagePrimitive.Root className="travel-message travel-message-assistant"><AssistantNarrative/><AssistantWorkingStatus/><MessagePrimitive.Error><Alert className="travel-message-error">The assistant could not finish this response. Retry to use your latest changes.</Alert><ActionBarPrimitive.Root><ActionBarPrimitive.Reload asChild><Button variant="outline" aria-label="Retry response">Retry</Button></ActionBarPrimitive.Reload></ActionBarPrimitive.Root></MessagePrimitive.Error></MessagePrimitive.Root>}
export function ThreadShell(){
 return <div className="travel-chat"><header className="travel-chat-header"><Button asChild variant="link" className="travel-brand"><a href="/">wayfinder</a></Button><span className="travel-caption">Travel ideas, made yours</span></header><ThreadPrimitive.Root className="travel-thread"><ThreadPrimitive.Viewport className="travel-viewport"><ThreadPrimitive.Empty><Card role="region" aria-label="Travel planning welcome" className="travel-welcome"><p className="travel-caption">MAKE ROOM FOR THE JOURNEY</p><h2>Where will your next<br/>good story begin?</h2><p>Compare your options, explore a different route, or build a few days away. Change any control as you go.</p><div className="travel-suggestions">{suggestions.map(({label,prompt})=><ThreadPrimitive.Suggestion key={prompt} prompt={prompt} send asChild><Button variant="outline">{label}</Button></ThreadPrimitive.Suggestion>)}</div><p className="travel-caption">Explore 50 million synthetic fares. All fares and totals are demo data.</p></Card></ThreadPrimitive.Empty><ThreadPrimitive.Messages>{({message})=>message.role==='user'?<UserMessage/>:<AssistantMessage/>}</ThreadPrimitive.Messages></ThreadPrimitive.Viewport><div className="travel-composer-wrap"><ComposerPrimitive.Root className="travel-composer"><ComposerPrimitive.Input asChild><Textarea aria-label="Message" placeholder="Ask about a route, a budget, or a few days away…" rows={2}/></ComposerPrimitive.Input><ComposerPrimitive.Send asChild><Button aria-label="Send message">Send</Button></ComposerPrimitive.Send><ComposerPrimitive.Cancel asChild><Button variant="outline" aria-label="Stop response">Stop</Button></ComposerPrimitive.Cancel></ComposerPrimitive.Root></div></ThreadPrimitive.Root></div>
}
