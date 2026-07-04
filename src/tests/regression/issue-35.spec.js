import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fileURLToPath } from 'url'
import path from 'path'
import { autoRegisterComponents } from '../../core/autoRegister.js'
import { initConfig } from '../../core/config.js'

/**
 * Regression: issue #35 — auto-register executes arbitrary files under
 * componentPath (import-before-validate / arbitrary-code-execution), plus a
 * Windows absolute-path `import()` bug and an unguarded bare `process`.
 *
 * `processComponentFile` used to `await import(filePath)` before validating
 * the export, so every collected .js/.ts file ran its top-level code merely by
 * being present. Correct behavior: skip files that cannot be valid components
 * (a filename-pattern allowlist) WITHOUT executing them, while still
 * registering a legitimately named component. Assertions live outside any
 * hook context.
 */
const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures-35'
)

beforeEach(() => {
  initConfig({ debug: false })
  delete globalThis.__ISSUE_35_SIDE_EFFECT__
  delete globalThis.__ISSUE_35_WIDGET_LOADED__
})

describe('issue #35: auto-register must not execute non-component files', () => {
  it('does NOT execute a non-component .js file, but still registers a valid component', async () => {
    // Under vitest we run in Node, so autoRegisterComponents takes the Node.js
    // filesystem strategy (import()s collected files).
    expect(process.versions.node).toBeTruthy()

    const registered = []
    const register = vi.fn((component) => registered.push(component))

    const count = await autoRegisterComponents({
      componentPath: fixturesDir,
      register,
      debug: false
    })

    // The malicious lowercase file must NOT run its top-level side effect,
    // because it is skipped by the filename allowlist before import.
    expect(globalThis.__ISSUE_35_SIDE_EFFECT__).toBeUndefined()

    // The valid PascalCase component IS imported and registered.
    expect(globalThis.__ISSUE_35_WIDGET_LOADED__).toBe(true)
    expect(count).toBe(1)
    expect(registered.map((c) => c.name)).toContain('Widget')
  })
})
