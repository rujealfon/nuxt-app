import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import { applyEnvFiles } from '../src/apply-env-files'

const testKey = 'APPLY_ENV_FILES_TEST_KEY'

describe('applyEnvFiles', () => {
  let dir: string

  afterEach(() => {
    delete process.env[testKey]
    if (dir)
      rmSync(dir, { recursive: true, force: true })
  })

  it('loads keys from a file when they are unset', () => {
    dir = mkdtempSync(join(tmpdir(), 'apply-env-files-'))
    const file = join(dir, '.env')
    writeFileSync(file, `${testKey}=from-file\n`)
    delete process.env[testKey]

    applyEnvFiles([file])

    expect(process.env[testKey]).toBe('from-file')
  })

  it('does not override an already-set process env value', () => {
    dir = mkdtempSync(join(tmpdir(), 'apply-env-files-'))
    const file = join(dir, '.env')
    writeFileSync(file, `${testKey}=from-file\n`)
    process.env[testKey] = 'already-set'

    applyEnvFiles([file])

    expect(process.env[testKey]).toBe('already-set')
  })

  it('prefers the first file when both define the same key', () => {
    dir = mkdtempSync(join(tmpdir(), 'apply-env-files-'))
    const root = join(dir, '.env')
    const local = join(dir, 'local.env')
    writeFileSync(root, `${testKey}=from-root\n`)
    writeFileSync(local, `${testKey}=from-local\n`)
    delete process.env[testKey]

    applyEnvFiles([root, local])

    expect(process.env[testKey]).toBe('from-root')
  })

  it('ignores missing files', () => {
    expect(() => applyEnvFiles([join(tmpdir(), 'apply-env-files-missing.env')])).not.toThrow()
  })
})
