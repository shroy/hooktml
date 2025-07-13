import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useEvents } from '../hooks/useEvents.js'
import { signal } from '../core/signal.js'
import { withHookContext } from '../core/hookContext.js'
import * as hookContext from '../core/hookContext.js'

describe('useEvents', () => {
  let element

  beforeEach(() => {
    // Create a fresh element for each test
    element = document.createElement('div')
    document.body.appendChild(element)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should attach event listeners to the element', () => {
    // Setup
    const clickHandler = vi.fn()
    const mouseoverHandler = vi.fn()

    // Spy on addEventListener
    const addEventSpy = vi.spyOn(element, 'addEventListener')

    // Apply event listeners via useEvents
    useEvents(element, {
      click: clickHandler,
      mouseover: mouseoverHandler
    })

    // Verify event listeners were attached
    expect(addEventSpy).toHaveBeenCalledTimes(2)
    expect(addEventSpy).toHaveBeenCalledWith('click', clickHandler)
    expect(addEventSpy).toHaveBeenCalledWith('mouseover', mouseoverHandler)
  })

  it('should return a cleanup function that removes event listeners', () => {
    // Setup
    const clickHandler = vi.fn()
    const mouseoverHandler = vi.fn()

    // Spy on removeEventListener
    const removeEventSpy = vi.spyOn(element, 'removeEventListener')

    // Apply event listeners and get cleanup function
    const cleanup = useEvents(element, {
      click: clickHandler,
      mouseover: mouseoverHandler
    })

    // Call cleanup function
    cleanup()

    // Verify event listeners were removed
    expect(removeEventSpy).toHaveBeenCalledTimes(2)
    expect(removeEventSpy).toHaveBeenCalledWith('click', clickHandler)
    expect(removeEventSpy).toHaveBeenCalledWith('mouseover', mouseoverHandler)
  })

  it('should skip non-function handlers with a warning', () => {
    // Setup
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })
    const addEventSpy = vi.spyOn(element, 'addEventListener')

    // Apply event listeners with a non-function handler
    useEvents(element, {
      click: () => { },  // Valid
      mouseover: 'not a function'  // Invalid
    })

    // Verify only the valid handler was attached
    expect(addEventSpy).toHaveBeenCalledTimes(1)
    expect(addEventSpy).toHaveBeenCalledWith('click', expect.any(Function))

    // Verify warning was logged
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('mouseover'))
  })

  it('should gracefully handle null/undefined elements with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

    const cleanupNull = useEvents(null, { click: vi.fn() })

    const cleanupUndefined = useEvents(undefined, { click: vi.fn() })

    expect(consoleSpy).toHaveBeenCalledTimes(2)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('useEvents called with null/undefined element'))

    expect(typeof cleanupNull).toBe('function')
    expect(typeof cleanupUndefined).toBe('function')

    expect(() => cleanupNull()).not.toThrow()
    expect(() => cleanupUndefined()).not.toThrow()

    consoleSpy.mockRestore()
  })

  it('should throw an error if called with invalid non-EventTarget elements', () => {
    expect(() => useEvents({}, {})).toThrow()
    expect(() => useEvents('string', {})).toThrow()
    expect(() => useEvents(123, {})).toThrow()
  })

  it('should work with document and window objects', () => {
    // Setup handlers
    const documentHandler = vi.fn()
    const windowHandler = vi.fn()

    // Setup spies
    const documentAddSpy = vi.spyOn(document, 'addEventListener')
    const windowAddSpy = vi.spyOn(window, 'addEventListener')
    const documentRemoveSpy = vi.spyOn(document, 'removeEventListener')
    const windowRemoveSpy = vi.spyOn(window, 'removeEventListener')

    // Test with document
    const documentCleanup = useEvents(document, {
      click: documentHandler
    })

    // Test with window
    const windowCleanup = useEvents(window, {
      resize: windowHandler
    })

    // Verify event listeners were attached
    expect(documentAddSpy).toHaveBeenCalledWith('click', documentHandler)
    expect(windowAddSpy).toHaveBeenCalledWith('resize', windowHandler)

    // Test cleanup functions
    documentCleanup()
    windowCleanup()

    // Verify event listeners were removed
    expect(documentRemoveSpy).toHaveBeenCalledWith('click', documentHandler)
    expect(windowRemoveSpy).toHaveBeenCalledWith('resize', windowHandler)

    // Restore spies
    documentAddSpy.mockRestore()
    windowAddSpy.mockRestore()
    documentRemoveSpy.mockRestore()
    windowRemoveSpy.mockRestore()
  })

  it('should throw an error if eventMap is not a non-empty object', () => {
    expect(() => useEvents(element, null)).toThrow()
    expect(() => useEvents(element, {})).toThrow()
    expect(() => useEvents(element, 'string')).toThrow()
  })

  it('should reactively update event handlers when signal values change', () => {
    // Spy on the effect execution
    const executeEffectSpy = vi.spyOn(hookContext, 'useEffect')

    // Create handlers
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    // Create a signal with the first handler
    const clickHandlerSignal = signal(handler1)

    // Setup spies
    const addEventSpy = vi.spyOn(element, 'addEventListener')
    const removeEventSpy = vi.spyOn(element, 'removeEventListener')

    withHookContext(element, () => {
      // Apply events using signal
      useEvents(element, {
        click: clickHandlerSignal
      })

      // Verify initial handler was attached
      expect(addEventSpy).toHaveBeenCalledWith('click', handler1)

      // Trigger the event and verify handler1 is called
      element.click()
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(0)

      // Reset spies for cleaner assertions
      addEventSpy.mockClear()
      removeEventSpy.mockClear()

      // Change the handler in the signal
      clickHandlerSignal.value = handler2

      // Extract and call the effect callback
      const effectCall = executeEffectSpy.mock.calls[0]
      const effectFn = effectCall[0]
      effectFn()

      // Verify old handler was removed and new one was added
      expect(removeEventSpy).toHaveBeenCalledWith('click', handler1)
      expect(addEventSpy).toHaveBeenCalledWith('click', handler2)

      // Trigger event again and verify handler2 is now called
      element.click()
      expect(handler1).toHaveBeenCalledTimes(1) // Still just once
      expect(handler2).toHaveBeenCalledTimes(1) // Now called
    })
  })

  it('should handle a mix of signal and direct event handlers', () => {
    // Spy on the effect execution
    const executeEffectSpy = vi.spyOn(hookContext, 'useEffect')

    // Create handlers
    const clickHandler = vi.fn()
    const mouseoverHandler = vi.fn()
    const newMouseoverHandler = vi.fn()

    // Create a signal for mouseover
    const mouseoverSignal = signal(mouseoverHandler)

    withHookContext(element, () => {
      // Apply events with a mix of direct and signal handlers
      useEvents(element, {
        click: clickHandler,         // Direct function
        mouseover: mouseoverSignal   // Signal
      })

      // Simulate events and verify initial handlers
      element.click()
      element.dispatchEvent(new MouseEvent('mouseover'))

      expect(clickHandler).toHaveBeenCalledTimes(1)
      expect(mouseoverHandler).toHaveBeenCalledTimes(1)
      expect(newMouseoverHandler).toHaveBeenCalledTimes(0)

      // Change only the signal handler
      mouseoverSignal.value = newMouseoverHandler

      // Extract and call the effect callback
      const effectCall = executeEffectSpy.mock.calls[0]
      const effectFn = effectCall[0]
      effectFn()

      // Simulate events again
      element.click()
      element.dispatchEvent(new MouseEvent('mouseover'))

      // Verify click handler still works, and mouseover changed
      expect(clickHandler).toHaveBeenCalledTimes(2)       // Incremented
      expect(mouseoverHandler).toHaveBeenCalledTimes(1)   // Unchanged
      expect(newMouseoverHandler).toHaveBeenCalledTimes(1) // Now called
    })
  })
}) 
