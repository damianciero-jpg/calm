import { spawn } from 'node:child_process'

const env = { ...process.env }

delete env.NEXT_ADAPTER_PATH

const child = spawn('npx', ['next', 'build'], {
  env,
  shell: true,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
