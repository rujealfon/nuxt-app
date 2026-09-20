#!/usr/bin/env node
import { execSync } from 'node:child_process'

// Safety net for dev servers that escaped the process tree (Nuxt can be
// reparented and keep holding its port). Mirrors appPorts in packages/config.
const PORTS = [3000, 3001, 3002, 3003]

function listeners(port) {
  try {
    return execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
  }
  catch {
    // Nothing listening.
    return []
  }
}

function signal(pids, name) {
  for (const { pid, port } of pids) {
    console.log(`Sending ${name} to listener on :${port} (pid ${pid})`)
    try {
      process.kill(pid, name)
    }
    catch {
      // Already gone.
    }
  }
}

// Try to let them shut down cleanly first.
const target = new Map()
for (const port of PORTS) {
  for (const pid of listeners(port)) {
    target.set(Number(pid), port)
  }
}

if (!target.size) {
  console.log('No dev listeners found.')
  process.exit(0)
}

signal([...target].map(([pid, port]) => ({ pid, port })), 'SIGTERM')

// Give processes a moment to exit, then force-kill any survivors.
await new Promise(resolve => setTimeout(resolve, 1000))

const survivors = []
for (const port of PORTS) {
  for (const pid of listeners(port)) {
    survivors.push({ pid: Number(pid), port })
  }
}

if (survivors.length) {
  signal(survivors, 'SIGKILL')
}
