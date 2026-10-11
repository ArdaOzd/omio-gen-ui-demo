import { cp, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'vite'

const root = resolve(import.meta.dirname, '..')

await build({ configFile: resolve(root, 'vite.site.config.ts') })
await mkdir(resolve(root, 'site-dist'), { recursive: true })
await cp(resolve(root, 'site', '.nojekyll'), resolve(root, 'site-dist', '.nojekyll'))
await cp(resolve(root, 'site', 'theme.js'), resolve(root, 'site-dist', 'theme.js'))
await cp(resolve(root, 'site', 'assets', 'architecture-system.svg'), resolve(root, 'site-dist', 'assets', 'architecture-system.svg'))
await cp(resolve(root, 'site', 'data'), resolve(root, 'site-dist', 'data'), { recursive: true })
