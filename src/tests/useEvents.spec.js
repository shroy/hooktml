import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useEvents } from '../hooks/useEvents.js'
import { signal } from '../core/signal.js'
import { withHookContext } from '../core/hookContext.js'
import * as hookContext from '../core/hookContext.js'
import { logger } from '../utils/logger.js'

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
    const addEventSpy = vi.spyOn(element, 'addEventListener')

    // Apply event listeners via useEvents
    useEvents(element, {
      click: clickHandler,
      mouseover: mouseoverHandler
    })

    // Verify event listeners were attached (check call count and event names)
    expect(addEventSpy).toHaveBeenCalledTimes(2)
    expect(addEventSpy).toHaveBeenCalledWith('click', expect.any(Function))
    expect(addEventSpy).toHaveBeenCalledWith('mouseover', expect.any(Function))

    // Test functionality by firing events
    element.dispatchEvent(new Event('click'))
    element.dispatchEvent(new Event('mouseover'))

    expect(clickHandler).toHaveBeenCalledTimes(1)
    expect(mouseoverHandler).toHaveBeenCalledTimes(1)

    // Verify handlers receive event and index (index 0 for single element)
    expect(clickHandler).toHaveBeenCalledWith(expect.any(Event), 0)
    expect(mouseoverHandler).toHaveBeenCalledWith(expect.any(Event), 0)
  })

  it('should return a cleanup function that removes event listeners', () => {
    // Setup
    const clickHandler = vi.fn()
    const mouseoverHandler = vi.fn()
    const removeEventSpy = vi.spyOn(element, 'removeEventListener')

    // Apply event listeners via useEvents
    const cleanup = useEvents(element, {
      click: clickHandler,
      mouseover: mouseoverHandler
    })

    // Call cleanup function
    cleanup()

    // Verify event listeners were removed (check call count and event names)
    expect(removeEventSpy).toHaveBeenCalledTimes(2)
    expect(removeEventSpy).toHaveBeenCalledWith('click', expect.any(Function))
    expect(removeEventSpy).toHaveBeenCalledWith('mouseover', expect.any(Function))
  })

  it('should skip non-function handlers with a warning', () => {
    // @ts-ignore - Testing logger methods
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { })
    const addEventSpy = vi.spyOn(element, 'addEventListener')

    // @ts-ignore - Testing invalid handler type
    useEvents(element, {
      click: 'not-a-function'
    })

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not a function'))
    expect(addEventSpy).not.toHaveBeenCalled()

    warnSpy.mockRestore()
    addEventSpy.mockRestore()
  })

  it('should gracefully handle null/undefined elements with warning', () => {
    // @ts-ignore - Testing logger methods
    const warnSpy = vi.spyOn(logger, 'info').mockImplementation(() => { })

    // @ts-ignore - Testing null/undefined element
    const cleanup1 = useEvents(null, { click: vi.fn() })
    // @ts-ignore - Testing null/undefined element  
    const cleanup2 = useEvents(undefined, { click: vi.fn() })

    expect(warnSpy).toHaveBeenCalledWith('[HookTML] useEvents called with null/undefined element, skipping event registration')
    expect(warnSpy).toHaveBeenCalledTimes(2)

    expect(typeof cleanup1).toBe('function')
    expect(typeof cleanup2).toBe('function')
    expect(() => cleanup1()).not.toThrow()
    expect(() => cleanup2()).not.toThrow()

    warnSpy.mockRestore()
  })

  it('should gracefully handle empty arrays with warning', () => {
    // @ts-ignore - Testing logger methods
    const warnSpy = vi.spyOn(logger, 'info').mockImplementation(() => { })

    const cleanup = useEvents([], { click: vi.fn() })

    expect(warnSpy).toHaveBeenCalledWith('[HookTML] useEvents called with empty array, skipping event registration')
    expect(warnSpy).toHaveBeenCalledTimes(1)

    expect(typeof cleanup).toBe('function')
    expect(() => cleanup()).not.toThrow()

    warnSpy.mockRestore()
  })

  it('should throw an error if called with invalid non-EventTarget elements', () => {
    // @ts-ignore - Testing invalid element types
    expect(() => useEvents({}, { click: vi.fn() })).toThrow()
    // @ts-ignore - Testing invalid element types
    expect(() => useEvents('string', { click: vi.fn() })).toThrow()
    // @ts-ignore - Testing invalid element types  
    expect(() => useEvents(123, { click: vi.fn() })).toThrow()
  })

  it('should work with document and window objects', () => {
    // Setup
    const documentHandler = vi.fn()
    const windowHandler = vi.fn()
    const documentAddSpy = vi.spyOn(document, 'addEventListener')
    const windowAddSpy = vi.spyOn(window, 'addEventListener')

    // Apply event listeners to document and window
    useEvents(document, { click: documentHandler })
    useEvents(window, { resize: windowHandler })

    // Verify event listeners were attached
    expect(documentAddSpy).toHaveBeenCalledWith('click', expect.any(Function))
    expect(windowAddSpy).toHaveBeenCalledWith('resize', expect.any(Function))

    // Test functionality
    document.dispatchEvent(new Event('click'))
    window.dispatchEvent(new Event('resize'))

    expect(documentHandler).toHaveBeenCalledWith(expect.any(Event), 0)
    expect(windowHandler).toHaveBeenCalledWith(expect.any(Event), 0)
  })

  it('should work with arrays of elements', () => {
    // Setup
    const buttons = [
      document.createElement('button'),
      document.createElement('button')
    ]
    const clickHandler = vi.fn()
    const mouseoverHandler = vi.fn()
    const addEventSpies = buttons.map(btn => vi.spyOn(btn, 'addEventListener'))

    // Apply event listeners to array of buttons
    useEvents(buttons, {
      click: clickHandler,
      mouseover: mouseoverHandler
    })

    // Verify event listeners were attached to all buttons
    buttons.forEach((btn, index) => {
      expect(addEventSpies[index]).toHaveBeenCalledWith('click', expect.any(Function))
      expect(addEventSpies[index]).toHaveBeenCalledWith('mouseover', expect.any(Function))
    })

    // Test functionality and index passing
    buttons.forEach((btn, index) => {
      btn.dispatchEvent(new Event('click'))
      btn.dispatchEvent(new Event('mouseover'))

      expect(clickHandler).toHaveBeenCalledWith(expect.any(Event), index)
      expect(mouseoverHandler).toHaveBeenCalledWith(expect.any(Event), index)
    })
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
