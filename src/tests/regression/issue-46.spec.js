/**
 * Regression test for #46 / BUG-35:
 * No `pull_request`-triggered workflow ran the tests, so a PR that broke the suite
 * passed every required check. The fix adds `.github/workflows/tests.yml` which runs
 * on `pull_request` and executes `yarn vitest run` plus the Node-ESM smoke import.
 *
 * A GitHub Actions trigger graph cannot be exercised inside vitest, so this guard
 * asserts the workflow file's contents statically. It fails on the unfixed tree
 * (file absent) and passes once the workflow is added. `pr-check.yml` is intentionally
 * NOT modified and is not asserted here.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const workflowPath = resolve(here, '../../../.github/workflows/tests.yml')

describe('BUG-35 (#46): PR CI runs the tests', () => {
  it('a tests workflow file exists', () => {
    expect(existsSync(workflowPath), `expected ${workflowPath} to exist`).toBe(true)
  })

  it('is triggered on pull_request', () => {
    const yaml = readFileSync(workflowPath, 'utf8')
    expect(yaml).toMatch(/^on:/m)
    expect(yaml).toMatch(/pull_request:/)
  })

  it('installs dependencies and runs the vitest suite', () => {
    const yaml = readFileSync(workflowPath, 'utf8')
    expect(yaml).toContain('yarn install')
    expect(yaml).toMatch(/yarn vitest run/)
  })

  it('runs the Node-ESM smoke import of the entrypoint', () => {
    const yaml = readFileSync(workflowPath, 'utf8')
    expect(yaml).toContain('--input-type=module')
    expect(yaml).toContain("import('./index.js')")
  })
})
