import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { aui } from '@assistant-ui/vite'
export default defineConfig({ root: 'verification/generative-ui/presentation/spike', plugins: [aui({backendless:true}),react()], build: { outDir: '../../../../dist/presentation-compat', emptyOutDir: true } })
