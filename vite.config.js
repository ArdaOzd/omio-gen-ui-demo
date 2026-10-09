import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { aui } from '@assistant-ui/vite'
const proxy={
 '/api/chat':{target:process.env.OMIO_AGENT_URL||`http://127.0.0.1:${process.env.AGENT_PORT||8010}`,changeOrigin:true},
 '/api/agent':{target:process.env.OMIO_AGENT_URL||`http://127.0.0.1:${process.env.AGENT_PORT||8010}`,changeOrigin:true},
 '/api':{target:process.env.OMIO_API_URL||`http://127.0.0.1:${process.env.API_PORT||8000}`,changeOrigin:true},
}
export default defineConfig({optimizeDeps:{entries:['index.html']},plugins:[aui({backendless:true}),react(),tailwindcss()],resolve:{alias:{'@':new URL('./src',import.meta.url).pathname}},server:{watch:{ignored:['**/graphify-out/**','**/verification/**','**/benchmarks/**','**/artifacts/browser/**','**/reports/**']},host:'127.0.0.1',port:Number(process.env.WEB_PORT||5173),proxy},preview:{host:'127.0.0.1',port:Number(process.env.WEB_PORT||4173),proxy}})
