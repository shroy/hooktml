import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useClasses } from '../hooks/useClasses.js'
import { signal } from '../core/signal.js'
import { withHookContext } from '../core/hookContext.js'
import * as hookContext from '../core/hookContext.js'

describe('useClasses', () => {
  let element

  beforeEach(() => {
    // Create a fresh element for each test
    element = document.createElement('div')
    document.body.appendChild(element)

    // Ensure the element has no classes
    element.className = ''

    // Use fake timers for effect scheduling
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should add classes when their conditions are true', () => {
    // Apply classes
    useClasses(element, {
      active: true,
      hidden: false,
      selected: true
    })

    // Verify classes were added correctly
    expect(element.classList.contains('active')).toBe(true)
    expect(element.classList.contains('hidden')).toBe(false)
    expect(element.classList.contains('selected')).toBe(true)
  })

  it('should return a cleanup function that removes added classes', () => {
    // Apply classes and get cleanup function
    const cleanup = useClasses(element, {
      active: true,
      selected: true
    })

    // Verify classes were initially added
    expect(element.classList.contains('active')).toBe(true)
    expect(element.classList.contains('selected')).toBe(true)

    // Call cleanup function
    cleanup()

    // Verify classes were removed
    expect(element.classList.contains('active')).toBe(false)
    expect(element.classList.contains('selected')).toBe(false)
  })

  it('should only track and remove classes that were actually added', () => {
    // Setup - add some classes directly
    element.classList.add('preexisting')

    // Mock the classList.remove method to check which classes are removed
    const removeSpy = vi.spyOn(element.classList, 'remove')

    // Apply classes with some false conditions
    const cleanup = useClasses(element, {
      active: true,
      hidden: false,  // This won't be added or tracked
      selected: true
    })

    // Call cleanup
    cleanup()

    // Verify only the classes that were added are removed
    expect(removeSpy).toHaveBeenCalledWith('active')
    expect(removeSpy).toHaveBeenCalledWith('selected')
    expect(removeSpy).not.toHaveBeenCalledWith('hidden')

    // The preexisting class should not be removed
    expect(element.classList.contains('preexisting')).toBe(true)
  })

  it('should gracefully handle null/undefined elements with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

    const cleanupNull = useClasses(null, { 'active': true })

    const cleanupUndefined = useClasses(undefined, { 'active': true })

    expect(consoleSpy).toHaveBeenCalledTimes(2)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('useClasses called with null/undefined element'))

    expect(typeof cleanupNull).toBe('function')
    expect(typeof cleanupUndefined).toBe('function')

    expect(() => cleanupNull()).not.toThrow()
    expect(() => cleanupUndefined()).not.toThrow()

    consoleSpy.mockRestore()
  })

  it('should throw an error if called with a non-HTMLElement', () => {
    expect(() => Function.prototype.apply.call(useClasses, null, [{}, {}])).toThrow()
  })

  it('should throw an error if classMap is not a non-empty object', () => {
    expect(() => useClasses(element, null)).toThrow()
    expect(() => useClasses(element, {})).toThrow()
    expect(() => useClasses(element, 'string')).toThrow()
  })

  it('should reactively update classes when signal values change', () => {
    // Spy on the effect execution to see what's happening
    const executeEffectSpy = vi.spyOn(hookContext, 'useEffect')

    // Create signals for class conditions
    const isActive = signal(true)
    const isHidden = signal(false)

    // We need to use withHookContext for useEffect to work
    withHookContext(element, () => {
      // Apply classes using signals
      useClasses(element, {
        active: isActive,
        hidden: isHidden,
        static: true // Regular boolean
      })

      // Verify initial state
      expect(element.classList.contains('active')).toBe(true)
      expect(element.classList.contains('hidden')).toBe(false)
      expect(element.classList.contains('static')).toBe(true)

      // Need to manually change signal values and manually trigger signal subscriptions
      // by running the effect callback rather than relying on timers
      isActive.value = false
      isHidden.value = true

      // Extract and call the effect callback from the second call to useEffect (which should be our subscription)
      const effectCall = executeEffectSpy.mock.calls[0]
      const effectFn = effectCall[0]
      effectFn()

      // Verify classes were updated correctly
      expect(element.classList.contains('active')).toBe(false)
      expect(element.classList.contains('hidden')).toBe(true)
      expect(element.classList.contains('static')).toBe(true) // Unchanged
    })
  })

  it('should handle a mix of signal and boolean conditions', () => {
    // Spy on the effect execution 
    const executeEffectSpy = vi.spyOn(hookContext, 'useEffect')

    // Create a signal for one class
    const isActive = signal(false)

    withHookContext(element, () => {
      // Apply classes with mix of signal and direct boolean
      useClasses(element, {
        active: isActive,  // Signal - initially false
        selected: true,    // Direct boolean
        highlighted: false // Direct boolean
      })

      // Verify initial state
      expect(element.classList.contains('active')).toBe(false)
      expect(element.classList.contains('selected')).toBe(true)
      expect(element.classList.contains('highlighted')).toBe(false)

      // Change signal value
      isActive.value = true

      // Extract and call the effect callback
      const effectCall = executeEffectSpy.mock.calls[0]
      const effectFn = effectCall[0]
      effectFn()

      // Verify only the signal-bound class changed
      expect(element.classList.contains('active')).toBe(true)
      expect(element.classList.contains('selected')).toBe(true)
      expect(element.classList.contains('highlighted')).toBe(false)
    })
  })
}) 
