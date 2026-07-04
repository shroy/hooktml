/**
 * @vitest-environment jsdom
 *
 * Regression: BUG-31 / issue #42
 * Dead outside-context fallbacks; inconsistent no-context behavior.
 *
 * useEffect outside a context used to only warn and return, so the tryCatch
 * onError fallbacks in useAttributes/useStyles were unreachable dead code and
 * no-context behavior diverged (useAttributes/useStyles applied once but lost
 * reactivity; useText did nothing at all).
 *
 * Chosen contract: no-context => apply immediately + subscribe to signal deps
 * manually + return a combined cleanup, uniformly across hooks. useEffect
 * itself now runs its setup immediately outside a context and returns a
 * cleanup that runs teardown + unsubscribes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAttributes } from '../../hooks/useAttributes.js'
import { useStyles } from '../../hooks/useStyles.js'
import { useClasses } from '../../hooks/useClasses.js'
import { useText } from '../../hooks/useText.js'
import { useEffect, getCurrentContext } from '../../core/hookContext.js'
import { signal } from '../../core/signal.js'

describe('issue #42 — uniform no-context behavior for hooks', () => {
  let element

  beforeEach(() => {
    element = document.createElement('div')
    vi.restoreAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('sanity: we are genuinely OUTSIDE any hook context', () => {
    expect(getCurrentContext()).toBeNull()
  })

  it('useEffect outside a context runs its setup immediately', () => {
    const spy = vi.fn()
    useEffect(spy, [])
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('useEffect outside a context stays reactive to signal deps and returns a working cleanup', () => {
    const s = signal(0)
    const spy = vi.fn(() => s.value)
    const cleanup = useEffect(spy, [s])

    expect(spy).toHaveBeenCalledTimes(1)

    s.value = 1
    expect(spy).toHaveBeenCalledTimes(2)

    // Cleanup must unsubscribe so later changes do not re-run the effect.
    expect(typeof cleanup).toBe('function')
    cleanup()
    s.value = 2
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('useAttributes: applies once AND keeps reactivity outside a context', () => {
    const attr = signal('one')
    useAttributes(element, { 'data-x': attr })
    expect(element.getAttribute('data-x')).toBe('one')

    attr.value = 'two'
    expect(element.getAttribute('data-x')).toBe('two')
  })

  it('useStyles: applies once AND keeps reactivity outside a context', () => {
    const color = signal('red')
    useStyles(element, { color })
    expect(element.style.color).toBe('red')

    color.value = 'blue'
    expect(element.style.color).toBe('blue')
  })

  it('useClasses: applies once AND keeps reactivity outside a context', () => {
    const active = signal(true)
    useClasses(element, { 'is-active': active })
    expect(element.classList.contains('is-active')).toBe(true)

    active.value = false
    expect(element.classList.contains('is-active')).toBe(false)
  })

  it('useText: sets text at least once outside a context (no longer diverges)', () => {
    const text = signal('hello')
    useText(element, () => text.value, [text])
    expect(element.textContent).toBe('hello')

    text.value = 'world'
    expect(element.textContent).toBe('world')
  })
})
