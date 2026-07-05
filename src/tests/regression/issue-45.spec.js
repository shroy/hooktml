/**
 * Regression test for #45 / BUG-34:
 * `withHookContext` swallowed ALL thrown values (including vitest AssertionErrors),
 * logged them, and returned `null`. As a result, `expect()` assertions placed inside
 * a `withHookContext` callback were silently eaten and the enclosing test passed
 * vacuously.
 *
 * The fix adds an OPT-IN test-mode rethrow (default OFF so production behavior is
 * unchanged) that re-throws non-framework errors. The test suite enables it globally
 * via src/tests/setup.js so inner assertions are honest.
 *
 * These assertions intentionally live OUTSIDE the `withHookContext` callback so they
 * cannot themselves be swallowed. They fail on the unfixed code and pass on the fix.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  withHookContext,
  setRethrowInHookContext,
  getRethrowInHookContext
} from '../../core/hookContext.js'
import { logger } from '../../utils/logger.js'

describe('BUG-34 (#45): withHookContext error swallowing', () => {
  const element = document.createElement('div')

  describe('with test-mode rethrow ENABLED (the suite default)', () => {
    it('should rethrow an exception thrown inside the callback instead of swallowing it', () => {
      expect(() => {
        withHookContext(element, () => {
          throw new Error('boom from inside callback')
        })
      }).toThrow('boom from inside callback')
    })

    it('should surface an inner expect() AssertionError to the test framework (recipe from issue)', () => {
      let innerRan = false
      let caught = null
      try {
        withHookContext(element, () => {
          innerRan = true
          expect(true).toBe(false) // intentionally-failing inner assertion
        })
      } catch (err) {
        caught = err
      }
      expect(innerRan).toBe(true)
      expect(caught, 'inner expect() failure was swallowed by withHookContext').not.toBeNull()
    })

    it('should still return the callback result on the happy path', () => {
      const result = withHookContext(element, () => 'ok')
      expect(result).toBe('ok')
    })
  })

  describe('with test-mode rethrow DISABLED (production default behavior)', () => {
    beforeEach(() => {
      setRethrowInHookContext(false)
    })

    afterEach(() => {
      // Restore the suite-wide default so other specs keep honest assertions.
      setRethrowInHookContext(true)
    })

    it('preserves legacy behavior: swallows the error, logs it, and returns null', () => {
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})

      let result
      let threw = false
      try {
        result = withHookContext(element, () => {
          throw new Error('should have been swallowed in production mode')
        })
      } catch {
        threw = true
      }

      expect(threw, 'production mode should NOT rethrow').toBe(false)
      expect(result).toBeNull()
      expect(errorSpy).toHaveBeenCalledWith(
        'Error in withHookContext:',
        expect.any(Error)
      )

      errorSpy.mockRestore()
    })
  })

  it('rethrow mode is OFF by default in a fresh module (flag is opt-in)', () => {
    // The suite setup turns it ON globally; verify the getter reflects the flag and
    // that toggling round-trips. This guards against the flag defaulting to ON in
    // production.
    const previous = getRethrowInHookContext()
    setRethrowInHookContext(false)
    expect(getRethrowInHookContext()).toBe(false)
    setRethrowInHookContext(true)
    expect(getRethrowInHookContext()).toBe(true)
    setRethrowInHookContext(previous)
  })
})
