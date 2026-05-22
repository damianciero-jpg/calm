import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'

const HOST = '127.0.0.1'
const PORT = Number(process.env.PORT ?? 3000)
const providedBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim()
const baseURL = providedBaseURL || `http://${HOST}:${PORT}`
const startupTimeoutMs = 120_000

function isPortOpen(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const socket = net.connect(port, HOST)

    socket.once('connect', () => {
      socket.end()
      resolve(true)
    })

    socket.once('error', () => {
      resolve(false)
    })
  })
}

async function waitForServer(serverProcess: ChildProcess) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < startupTimeoutMs) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Next dev server exited early with code ${serverProcess.exitCode}.`)
    }

    if (await isPortOpen(PORT) && await isAppReady()) {
      return
    }

    await new Promise(resolve => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for ${baseURL}.`)
}

async function isAppReady(): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5_000)

  try {
    const response = await fetch(`${baseURL}/login`, {
      cache: 'no-store',
      redirect: 'manual',
      signal: controller.signal,
    })
    return response.status === 200
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function waitForPortToClose() {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 5_000) {
    if (!(await isPortOpen(PORT))) {
      return
    }

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  throw new Error(`Next dev server did not release ${baseURL}.`)
}

async function stopServer(serverProcess: ChildProcess) {
  if (!serverProcess.pid || serverProcess.exitCode !== null) {
    await waitForPortToClose()
    return
  }

  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/pid', String(serverProcess.pid), '/T', '/F'], {
        stdio: 'ignore',
        timeout: 5_000,
      })
    } catch {
      if (await isPortOpen(PORT)) {
        serverProcess.kill()
      }
    }
    await waitForPortToClose()
    return
  }

  serverProcess.kill('SIGTERM')
  await waitForPortToClose()
}

export default async function globalSetup() {
  if (providedBaseURL) {
    if (!(await isAppReady())) {
      throw new Error(`PLAYWRIGHT_BASE_URL is set, but ${baseURL}/login was not ready.`)
    }
    return
  }

  if (await isPortOpen(PORT)) {
    throw new Error(`${baseURL} is already in use. Stop the stale Next/Node process before running Playwright.`)
  }

  const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
  const server = spawn(process.execPath, [nextBin, 'dev', '--hostname', HOST, '--port', String(PORT)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: 'ignore',
    windowsHide: true,
  })

  await waitForServer(server)

  return async () => {
    await stopServer(server)
  }
}
