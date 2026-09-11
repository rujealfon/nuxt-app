#!/usr/bin/env node
import { execSync } from 'node:child_process'

// Safety net for dev servers that escaped the process tree (Nuxt can be
// reparented and keep holding its port). Mirrors appPorts in packages/config.
const PORTS = [3000, 3001, 3002, 3003]

for (const port of PORTS) {
  let pids = []
  try {
    pids = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
  }
  catch {
    // Nothing listening.
  }

  for (const pid of pids) {
    try {
      process.kill(Number(pid), 'SIGKILL')
      console.log(`Stopped leftover listener on :${port} (pid ${pid})`)
    }
    catch {
      // Already gone.
    }
  }
}
