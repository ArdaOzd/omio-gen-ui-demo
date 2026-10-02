import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const mode = process.argv[2] === 'preview' ? 'preview' : 'dev'
const databasePath = process.env.OMIO_DATABASE || 'data/omio.sqlite3'
const children = []

function runChecked(command, args) {
  const result = spawnSync(command, args, { cwd: process.cwd(), stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status || 1)
}

async function apiIsReady() {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/health', {
      signal: AbortSignal.timeout(800),
    })
    return response.ok
  } catch {
    return false
  }
}

function start(command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })
  children.push(child)
  return child
}

function stop(exitCode = 0) {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
  process.exit(exitCode)
}

if (!existsSync(databasePath)) {
  console.log('No timetable database found. Generating 1,000,000 synthetic fares...')
  runChecked('python3', [
    '-m',
    'backend.generate_db',
    '--output',
    databasePath,
    '--rows',
    '1000000',
  ])
}

if (mode === 'preview') runChecked('npm', ['run', 'build'])

if (!(await apiIsReady())) {
  const backend = start('python3', ['-m', 'backend.app', '--port', '8000'])
  backend.on('exit', (code) => {
    stop(code || 1)
  })
} else {
  console.log('Using the backend already running on http://127.0.0.1:8000')
}

const frontendScript = mode === 'preview' ? 'frontend:preview' : 'frontend:dev'
const frontend = start('npm', ['run', frontendScript])
frontend.on('exit', (code) => stop(code || 0))

process.once('SIGINT', () => stop(0))
process.once('SIGTERM', () => stop(0))
