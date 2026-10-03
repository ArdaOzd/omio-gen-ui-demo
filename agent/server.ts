import { createServer } from 'node:http';
import { parseChatRequest } from './request-schema';
import { handleChat } from './chat-route';
import { CODEX_MODEL } from './codex-provider';
const port=Number(process.env.AGENT_PORT??8010);
const allowedOrigin='http://127.0.0.1:'+String(process.env.WEB_PORT??5173);
export const server=createServer(async(request,response)=>{
 if(request.headers.origin && request.headers.origin!==allowedOrigin){response.writeHead(403);response.end();return;}
 response.setHeader('Access-Control-Allow-Origin',allowedOrigin);
 if(request.url==='/api/agent/health'){response.setHeader('Content-Type','application/json');response.end(JSON.stringify({status:'ok',service:'omio-generative-agent',model:CODEX_MODEL,provider:'signed-in-codex',schemaVersion:'1.0.0',appRevision:process.env.OMIO_APP_REVISION??'unknown',pid:process.pid}));return;}
 if(request.method!=='POST'||request.url!=='/api/chat'){response.writeHead(404);response.end();return;}
 if(!request.headers['content-type']?.startsWith('application/json')){response.writeHead(415);response.end();return;}
 const controller=new AbortController();response.on('close',()=>controller.abort());
 try{
  let body='';for await(const chunk of request){body+=chunk.toString();if(Buffer.byteLength(body)>120_000)throw new Error('Request exceeds byte budget');}
  await handleChat(parseChatRequest(JSON.parse(body)),response,controller.signal);
 }catch{if(!response.headersSent){response.writeHead(400,{'Content-Type':'application/json'});response.end(JSON.stringify({error:{code:'INVALID_REQUEST',message:'Check the request, current refs, and visible-turn budget.'}}));}else response.end();}
});
server.listen(port,'127.0.0.1',()=>console.info(`Generative agent http://127.0.0.1:${port}`));
process.once('SIGTERM',()=>server.close());process.once('SIGINT',()=>server.close());
