import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { aui } from '@assistant-ui/vite'
export default defineConfig({ root: 'verification/generative-ui/catalog-stories/spike', plugins: [aui({backendless:true}),react()], build: { outDir: '../../../../dist/catalog-stories', emptyOutDir: true } })
