import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: fileURLToPath(new URL('./site', import.meta.url)),
  base: process.env.SITE_BASE ?? '/omio-gen-ui-demo/',
  publicDir: false,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: fileURLToPath(new URL('./site-dist', import.meta.url)),
    emptyOutDir: true,
  },
  preview: {
    host: '127.0.0.1',
    port: Number(process.env.SITE_PORT ?? 4174),
  },
  server: {
    fs: { allow: [projectRoot] },
  },
})
