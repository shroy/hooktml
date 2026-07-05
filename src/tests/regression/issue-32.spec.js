/**
 * @vitest-environment jsdom
 *
 * Regression test for issue #32 (BUG-21): getConfig() cloned the whole config
 * object on every call (`() => ({ ...config })`), and logger.log/logger.info
 * called getConfig() unconditionally BEFORE the debug gate — so even a
 * suppressed debug line (debug === false) paid for a full config clone. In
 * scan/observer hot paths this is per-element wasted allocation.
 *
 * Correct behavior (asserted here):
 *   (A) getConfig() returns a stable reference (no per-call clone).
 *   (B) a suppressed logger.log does NOT read config via getConfig().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getConfig, isDebug, initConfig } from '../../core/config.js'
import * as configModule from '../../core/config.js'
import { logger } from '../../utils/logger.js'

describe('issue #32: getConfig no longer clones per call; suppressed logs do not clone', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    initConfig({ debug: false })
  })

  it('(A) does not fabricate a brand-new config object on every getConfig() call', () => {
    initConfig({ debug: false })
    const a = getConfig()
    const b = getConfig()
    // Fix exposes a stable/frozen reference; the old `() => ({ ...config })`
    // returned a fresh object each call, so a !== b.
    expect(a).toBe(b)
  })

  it('(B) does NOT read config via getConfig() when a debug line is suppressed', () => {
    initConfig({ debug: false })
    const spy = vi.spyOn(configModule, 'getConfig')
    logger.log('suppressed line')
    const callsForSuppressedLog = spy.mock.calls.length
    spy.mockRestore()
    // Fix: logger reads isDebug() and only touches the config when actually
    // emitting. The old logger.log called getConfig() unconditionally.
    expect(callsForSuppressedLog).toBe(0)
  })

  it('(C) exposes a direct isDebug() reflecting the current config', () => {
    initConfig({ debug: true })
    expect(isDebug()).toBe(true)
    initConfig({ debug: false })
    expect(isDebug()).toBe(false)
  })
})
