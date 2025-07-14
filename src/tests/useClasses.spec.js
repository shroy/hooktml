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
    // @ts-expect-error
    expect(() => useClasses(element, null)).toThrow()
    expect(() => useClasses(element, {})).toThrow()
    // @ts-expect-error
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

  describe('Array Support', () => {
    let elements

    beforeEach(() => {
      // Create multiple elements for array testing
      elements = [
        document.createElement('div'),
        document.createElement('div'),
        document.createElement('div')
      ]

      elements.forEach((el, index) => {
        el.setAttribute('data-id', index.toString())
        document.body.appendChild(el)
      })
    })

    it('should handle array of elements with function conditions', () => {
      useClasses(elements, {
        active: (el) => el.dataset.id === '1',
        first: (el) => el.dataset.id === '0',
        even: (el) => parseInt(el.dataset.id) % 2 === 0
      })

      expect(elements[0].classList.contains('active')).toBe(false)
      expect(elements[0].classList.contains('first')).toBe(true)
      expect(elements[0].classList.contains('even')).toBe(true)

      expect(elements[1].classList.contains('active')).toBe(true)
      expect(elements[1].classList.contains('first')).toBe(false)
      expect(elements[1].classList.contains('even')).toBe(false)

      expect(elements[2].classList.contains('active')).toBe(false)
      expect(elements[2].classList.contains('first')).toBe(false)
      expect(elements[2].classList.contains('even')).toBe(true)
    })

    it('should handle mixed function, signal, and boolean conditions', () => {
      const isGloballyDisabled = signal(false)

      withHookContext(elements[0], () => {
        useClasses(elements, {
          active: (el) => el.dataset.id === '1',
          disabled: isGloballyDisabled,
          visible: true
        })

        elements.forEach((el, index) => {
          expect(el.classList.contains('active')).toBe(index === 1)
          expect(el.classList.contains('disabled')).toBe(false)
          expect(el.classList.contains('visible')).toBe(true)
        })

        isGloballyDisabled.value = true

        const executeEffectSpy = vi.spyOn(hookContext, 'useEffect')
        const effectCall = executeEffectSpy.mock.calls[0]
        const effectFn = effectCall[0]
        effectFn()

        elements.forEach((el, index) => {
          expect(el.classList.contains('active')).toBe(index === 1)
          expect(el.classList.contains('disabled')).toBe(true)
          expect(el.classList.contains('visible')).toBe(true)
        })
      })
    })

    it('should cleanup classes correctly for each element', () => {
      const cleanup = useClasses(elements, {
        active: (el) => el.dataset.id === '1',
        test: true
      })

      expect(elements[1].classList.contains('active')).toBe(true)
      elements.forEach(el => {
        expect(el.classList.contains('test')).toBe(true)
      })

      elements.forEach(el => {
        el.classList.add('manual')
      })

      cleanup()

      elements.forEach((el) => {
        expect(el.classList.contains('active')).toBe(false)
        expect(el.classList.contains('test')).toBe(false)
        expect(el.classList.contains('manual')).toBe(true) // Manual class preserved
      })
    })

    it('should handle single element passed as array', () => {
      const singleElementArray = [elements[0]]

      useClasses(singleElementArray, {
        single: true,
        test: (el) => el.dataset.id === '0'
      })

      expect(elements[0].classList.contains('single')).toBe(true)
      expect(elements[0].classList.contains('test')).toBe(true)
      expect(elements[1].classList.contains('single')).toBe(false)
      expect(elements[2].classList.contains('single')).toBe(false)
    })

    it('should maintain backward compatibility with single elements', () => {
      useClasses(elements[0], {
        active: true,
        hidden: false
      })

      expect(elements[0].classList.contains('active')).toBe(true)
      expect(elements[0].classList.contains('hidden')).toBe(false)
      expect(elements[1].classList.contains('active')).toBe(false)
      expect(elements[2].classList.contains('active')).toBe(false)
    })

    it('should handle reactivity with signals in function conditions', () => {
      const selectedId = signal('1')

      withHookContext(elements[0], () => {
        useClasses(elements, {
          selected: (el) => selectedId.value === el.dataset.id,
          static: true
        })

        elements.forEach((el, index) => {
          expect(el.classList.contains('selected')).toBe(index === 1)
          expect(el.classList.contains('static')).toBe(true)
        })

        selectedId.value = '2'

        const executeEffectSpy = vi.spyOn(hookContext, 'useEffect')
        const effectCall = executeEffectSpy.mock.calls[0]
        const effectFn = effectCall[0]
        effectFn()

        elements.forEach((el, index) => {
          expect(el.classList.contains('selected')).toBe(index === 2)
          expect(el.classList.contains('static')).toBe(true)
        })
      })
    })

    it('should handle null/undefined in array gracefully', () => {
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

    it('should throw error for invalid elements in array', () => {
      const invalidArray = [elements[0], 'not-an-element', elements[1]]

      expect(() => useClasses(invalidArray, { 'test': true })).toThrow('[HookTML] useClasses requires HTMLElement(s) as first argument')
    })
  })
}) 
