import { createRoot } from 'react-dom/client'
import toolkit from './toolkit'
import { useLocalRuntime, AssistantRuntimeProvider, AuiConfig, Tools, ThreadPrimitive, MessagePrimitive } from '@assistant-ui/react'

function App() {
  const runtime = useLocalRuntime({ async *run() { yield { content: [{ type: 'text', text: 'Compatibility' }] } } }, { initialMessages: [
    { role: 'assistant', content: [{ type: 'text', text: 'Before the view.' }, { type: 'tool-call', toolCallId: 'p1', toolName: 'present', args: { $type: 'TravelSurface', title: 'Travel choices', children: [{ $type: 'FareCard', title: 'Train option' }, { $type: 'FareCard', title: 'Bus option' }] }, result: {} }, { type: 'text', text: 'After the view.' }] },
  ] })
  return <AssistantRuntimeProvider runtime={runtime} config={AuiConfig({tools:Tools({toolkit})})}><ThreadPrimitive.Root><ThreadPrimitive.Messages>{() => <MessagePrimitive.Root><MessagePrimitive.Parts /></MessagePrimitive.Root>}</ThreadPrimitive.Messages></ThreadPrimitive.Root></AssistantRuntimeProvider>
}
const root = document.getElementById('root')
if (root) createRoot(root).render(<App />)
