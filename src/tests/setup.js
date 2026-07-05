/**
 * Global vitest setup.
 *
 * Enables the opt-in rethrow behavior of `withHookContext` for the whole suite so
 * that `expect()` assertions placed inside a `withHookContext` callback surface to
 * the test framework instead of being silently swallowed (see #45 / BUG-34).
 * Production code keeps the flag OFF; only the test process turns it on here.
 */
import { setRethrowInHookContext } from '../core/hookContext.js'

setRethrowInHookContext(true)
