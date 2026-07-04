import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Regression for issue #16 (BUG-5): the published package must import cleanly
// under native Node ESM. `src/hooks/useText.js` previously used extensionless
// relative imports, which native Node ESM cannot resolve, so `import('hooktml')`
// crashed with ERR_MODULE_NOT_FOUND. The import is run in a Node subprocess so
// vitest's own (extensionless-tolerant) resolver cannot mask the defect.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../../')

describe('issue #16 — native ESM import of the package entry', () => {
  it('imports index.js under native Node ESM without ERR_MODULE_NOT_FOUND', () => {
    let output
    let failure = null
    try {
      output = execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          "const m = await import('./index.js'); process.stdout.write(typeof m.useText)"
        ],
        { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      )
    } catch (err) {
      failure = String(err.stderr || err.message || err)
    }

    expect(failure, `native ESM import failed:\n${failure}`).toBeNull()
    expect(output).toBe('function')
  })
})
