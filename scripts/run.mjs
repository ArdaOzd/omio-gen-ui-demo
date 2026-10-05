import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
const mode = process.argv[2] === 'preview' ? 'preview' : 'dev'
const databasePath = process.env.OMIO_DATABASE || 'data/omio.sqlite3'
const apiPort = Number(process.env.API_PORT || 8000)
const agentPort = Number(process.env.AGENT_PORT || 8010)
const webPort = Number(process.env.WEB_PORT || (mode === 'preview' ? 4173 : 5173))
for (const port of [apiPort, agentPort, webPort]) if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Ports must be integers between 1024 and 65535')
const children = []; let stopping = false
const env = {...process.env, API_PORT:String(apiPort), AGENT_PORT:String(agentPort), WEB_PORT:String(webPort), OMIO_API_URL:`http://127.0.0.1:${apiPort}`, OMIO_AGENT_URL:`http://127.0.0.1:${agentPort}`}
function runChecked(command, args) {
 const result=spawnSync(command,args,{cwd:process.cwd(),env,stdio:'inherit'});if(result.status!==0)process.exit(result.status||1)
}
function stop(code=0) {
 if(stopping)return;stopping=true
 for(const child of children)if(child.exitCode===null)child.kill('SIGTERM')
 setTimeout(()=>{for(const child of children)if(child.exitCode===null)child.kill('SIGKILL');process.exit(code)},500).unref()
}
function start(command,args) {
 const child=spawn(command,args,{cwd:process.cwd(),env,stdio:'inherit'});children.push(child)
 child.on('error',error=>{console.error(error.message);stop(1)})
 child.on('exit',code=>{if(!stopping)stop(code||1)});return child
}
async function waitFor(url, child, service) {
 const deadline=Date.now()+20_000
 while(Date.now()<deadline && child.exitCode===null) {
  try {const response=await fetch(url,{signal:AbortSignal.timeout(600)});if(response.ok){const health=await response.json();if(health.pid===child.pid && health.service===service)return}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100))
 }
 throw new Error(`The owned ${service} process did not become ready at ${url}. Choose unused ports.`)
}
process.once('SIGINT',()=>stop(0));process.once('SIGTERM',()=>stop(0))
try {
 if(!existsSync(databasePath))runChecked('python3',['-m','backend.generate_db','--output',databasePath,'--rows','10000000'])
 if(mode==='preview')runChecked('npm',['run','build'])
 const backend=start('python3',['-m','backend.app','--port',String(apiPort),'--database',databasePath])
 const agent=start(process.execPath,['--import','tsx','agent/server.ts'])
 await Promise.all([waitFor(`http://127.0.0.1:${apiPort}/api/health`,backend,'omio-fare-api'),waitFor(`http://127.0.0.1:${agentPort}/api/agent/health`,agent,'omio-generative-agent')])
 start(process.execPath,['node_modules/vite/bin/vite.js',...(mode==='preview'?['preview']:[]),'--host','127.0.0.1','--port',String(webPort),'--strictPort'])
 console.info(`Travel app http://127.0.0.1:${webPort}, fare API ${apiPort}, agent ${agentPort}`)
}catch(error){console.error(error.message);stop(1)}
