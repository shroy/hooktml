/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAttributes } from '../hooks/useAttributes.js'
import { signal } from '../core/signal.js'
import { withHookContext } from '../core/hookContext.js'
import { isFunction } from '../utils/type-guards.js'

describe('useAttributes', () => {
  let element

  beforeEach(() => {
    element = document.createElement('div')
  })

  it('should set attributes on an element', () => {
    useAttributes(element, {
      'data-test': 'value',
      'aria-hidden': 'true'
    })

    expect(element.getAttribute('data-test')).toBe('value')
    expect(element.getAttribute('aria-hidden')).toBe('true')
  })

  it('should remove attributes when value is null', () => {
    // Set initial attributes
    element.setAttribute('data-test', 'initial')
    element.setAttribute('aria-hidden', 'false')

    useAttributes(element, {
      'data-test': null,
      'aria-hidden': 'true'
    })

    expect(element.hasAttribute('data-test')).toBe(false)
    expect(element.getAttribute('aria-hidden')).toBe('true')
  })

  it('should restore original attributes on cleanup', () => {
    // Set initial attributes
    element.setAttribute('data-test', 'initial')
    element.setAttribute('aria-label', 'old')

    const cleanup = useAttributes(element, {
      'data-test': 'new',
      'aria-label': null,
      'aria-hidden': 'true'
    })

    expect(element.getAttribute('data-test')).toBe('new')
    expect(element.hasAttribute('aria-label')).toBe(false)
    expect(element.getAttribute('aria-hidden')).toBe('true')

    // Run cleanup
    cleanup()

    // Original values should be restored
    expect(element.getAttribute('data-test')).toBe('initial')
    expect(element.getAttribute('aria-label')).toBe('old')
    expect(element.hasAttribute('aria-hidden')).toBe(false)
  })

  it('should gracefully handle null/undefined elements with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

    const cleanupNull = useAttributes(null, { 'data-test': 'value' })

    const cleanupUndefined = useAttributes(undefined, { 'data-test': 'value' })

    expect(consoleSpy).toHaveBeenCalledTimes(2)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('useAttributes called with null/undefined element'))

    expect(typeof cleanupNull).toBe('function')
    expect(typeof cleanupUndefined).toBe('function')

    expect(() => cleanupNull()).not.toThrow()
    expect(() => cleanupUndefined()).not.toThrow()

    consoleSpy.mockRestore()
  })

  it('should throw an error if first argument is not an HTMLElement', () => {
    // @ts-ignore
    expect(() => useAttributes({}, {})).toThrow()
    // @ts-ignore
    expect(() => useAttributes('div', {})).toThrow()
  })

  it('should throw an error if second argument is not a non-empty object', () => {
    // @ts-ignore
    expect(() => useAttributes(element, null)).toThrow()
    // @ts-ignore
    expect(() => useAttributes(element, 'string')).toThrow()
    // @ts-ignore
    expect(() => useAttributes(element, [])).toThrow()
    expect(() => useAttributes(element, {})).toThrow()
  })

  // Reactive tests
  describe('reactive behavior', () => {
    it('should apply signal values initially', () => {
      const titleSignal = signal('Initial Title')

      // Run in a hook context to properly handle signals
      withHookContext(element, () => {
        useAttributes(element, {
          'data-static': 'static-value',
          'aria-label': titleSignal
        })
      })

      expect(element.getAttribute('data-static')).toBe('static-value')
      expect(element.getAttribute('aria-label')).toBe('Initial Title')
    })

    it('should update attributes when signals change', () => {
      const titleSignal = signal('Initial Title')
      const hiddenSignal = signal('false')

      // Run in a hook context to properly handle signals
      withHookContext(element, () => {
        useAttributes(element, {
          'data-title': titleSignal,
          'aria-hidden': hiddenSignal
        })
      })

      expect(element.getAttribute('data-title')).toBe('Initial Title')
      expect(element.getAttribute('aria-hidden')).toBe('false')

      // Change signal values
      titleSignal.value = 'Updated Title'
      hiddenSignal.value = 'true'

      // Attributes should be updated
      expect(element.getAttribute('data-title')).toBe('Updated Title')
      expect(element.getAttribute('aria-hidden')).toBe('true')
    })

    it('should mix static and signal values', () => {
      const dynamicValue = signal('dynamic')

      // Run in a hook context to properly handle signals
      withHookContext(element, () => {
        useAttributes(element, {
          'data-static': 'static',
          'data-dynamic': dynamicValue
        })
      })

      expect(element.getAttribute('data-static')).toBe('static')
      expect(element.getAttribute('data-dynamic')).toBe('dynamic')

      // Change only the dynamic value
      dynamicValue.value = 'changed'

      // Static should remain, dynamic should update
      expect(element.getAttribute('data-static')).toBe('static')
      expect(element.getAttribute('data-dynamic')).toBe('changed')
    })

    it('should remove attributes when signal value becomes null', () => {
      const visibleSignal = signal('visible')

      // Run in a hook context to properly handle signals
      withHookContext(element, () => {
        useAttributes(element, {
          'data-test': visibleSignal
        })
      })

      expect(element.getAttribute('data-test')).toBe('visible')

      // Change to null to remove attribute
      // @ts-ignore - We're testing null assignment even though TypeScript doesn't like it
      visibleSignal.value = null

      expect(element.hasAttribute('data-test')).toBe(false)
    })

    it('should restore original attributes on cleanup of signals', () => {
      // Set initial attributes
      element.setAttribute('data-test', 'initial')

      const dynamicValue = signal('dynamic')
      const visibleSignal = signal('visible')

      /** @type {Function|undefined} */
      let cleanupFn

      // Run in a hook context to properly handle signals
      withHookContext(element, () => {
        cleanupFn = useAttributes(element, {
          'data-test': dynamicValue,
          'data-visible': visibleSignal
        })
      })

      expect(element.getAttribute('data-test')).toBe('dynamic')
      expect(element.getAttribute('data-visible')).toBe('visible')

      // Run cleanup outside the hook context
      if (isFunction(cleanupFn)) {
        cleanupFn()
      }

      // Original value should be restored, new attribute should be removed
      expect(element.getAttribute('data-test')).toBe('initial')
      expect(element.hasAttribute('data-visible')).toBe(false)
    })
  })
}) 
