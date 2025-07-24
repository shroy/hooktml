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

  describe('Array Support', () => {
    let elements

    beforeEach(() => {
      elements = [
        document.createElement('div'),
        document.createElement('div'),
        document.createElement('div')
      ]

      elements.forEach((el, index) => {
        el.setAttribute('data-index', index.toString())
        el.setAttribute('data-type', ['primary', 'secondary', 'tertiary'][index])
        el.setAttribute('data-value', `value-${index}`)
      })
    })

    it('should handle array of elements with function conditions', () => {
      useAttributes(elements, {
        'data-id': (el) => `element-${el.dataset.index}`,
        'aria-label': (el) => `${el.dataset.type} button`,
        'data-active': (el) => el.dataset.index === '1' ? 'true' : 'false'
      })

      expect(elements[0].getAttribute('data-id')).toBe('element-0')
      expect(elements[0].getAttribute('aria-label')).toBe('primary button')
      expect(elements[0].getAttribute('data-active')).toBe('false')

      expect(elements[1].getAttribute('data-id')).toBe('element-1')
      expect(elements[1].getAttribute('aria-label')).toBe('secondary button')
      expect(elements[1].getAttribute('data-active')).toBe('true')

      expect(elements[2].getAttribute('data-id')).toBe('element-2')
      expect(elements[2].getAttribute('aria-label')).toBe('tertiary button')
      expect(elements[2].getAttribute('data-active')).toBe('false')
    })

    it('should handle mixed function, signal, and direct value conditions', () => {
      const globalRole = { value: 'button', subscribe: () => { } }

      useAttributes(elements, {
        'data-id': (el) => `element-${el.dataset.index}`,
        'role': globalRole,
        'data-static': 'static-value'
      })

      elements.forEach((el, index) => {
        expect(el.getAttribute('data-id')).toBe(`element-${index}`)
        expect(el.getAttribute('role')).toBe('button')
        expect(el.getAttribute('data-static')).toBe('static-value')
      })
    })

    it('should handle null values to remove attributes', () => {
      elements.forEach(el => {
        el.setAttribute('data-remove', 'will-be-removed')
        el.setAttribute('data-keep', 'will-be-kept')
      })

      useAttributes(elements, {
        'data-remove': (el) => el.dataset.index === '1' ? null : 'kept',
        'data-keep': 'updated',
        'data-new': (el) => `new-${el.dataset.index}`
      })

      expect(elements[0].getAttribute('data-remove')).toBe('kept')
      expect(elements[0].getAttribute('data-keep')).toBe('updated')
      expect(elements[0].getAttribute('data-new')).toBe('new-0')

      expect(elements[1].hasAttribute('data-remove')).toBe(false)
      expect(elements[1].getAttribute('data-keep')).toBe('updated')
      expect(elements[1].getAttribute('data-new')).toBe('new-1')

      expect(elements[2].getAttribute('data-remove')).toBe('kept')
      expect(elements[2].getAttribute('data-keep')).toBe('updated')
      expect(elements[2].getAttribute('data-new')).toBe('new-2')
    })

    it('should cleanup attributes correctly for each element', () => {
      elements.forEach(el => {
        el.setAttribute('data-original', 'original-value')
        el.setAttribute('data-untouched', 'untouched')
      })

      const cleanup = useAttributes(elements, {
        'data-original': (el) => `modified-${el.dataset.index}`,
        'data-new': (el) => `new-${el.dataset.index}`
      })

      elements.forEach((el, index) => {
        expect(el.getAttribute('data-original')).toBe(`modified-${index}`)
        expect(el.getAttribute('data-new')).toBe(`new-${index}`)
        expect(el.getAttribute('data-untouched')).toBe('untouched')
      })

      cleanup()

      elements.forEach(el => {
        expect(el.getAttribute('data-original')).toBe('original-value') // Restored
        expect(el.hasAttribute('data-new')).toBe(false) // Removed
        expect(el.getAttribute('data-untouched')).toBe('untouched') // Unchanged
      })
    })

    it('should handle single element passed as array', () => {
      const singleElementArray = [elements[0]]

      useAttributes(singleElementArray, {
        'data-test': 'test-value',
        'aria-label': (el) => `element-${el.dataset.index}`
      })

      expect(elements[0].getAttribute('data-test')).toBe('test-value')
      expect(elements[0].getAttribute('aria-label')).toBe('element-0')
      expect(elements[1].hasAttribute('data-test')).toBe(false)
      expect(elements[2].hasAttribute('data-test')).toBe(false)
    })

    it('should maintain backward compatibility with single elements', () => {
      useAttributes(elements[0], {
        'data-test': 'single-value',
        'aria-label': 'single-label'
      })

      expect(elements[0].getAttribute('data-test')).toBe('single-value')
      expect(elements[0].getAttribute('aria-label')).toBe('single-label')
      expect(elements[1].hasAttribute('data-test')).toBe(false)
      expect(elements[2].hasAttribute('data-test')).toBe(false)
    })

    it('should handle null/undefined in array gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

      const cleanupNull = useAttributes(null, { 'data-test': 'test' })
      const cleanupUndefined = useAttributes(undefined, { 'data-test': 'test' })

      expect(consoleSpy).toHaveBeenCalledTimes(2)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('useAttributes called with null/undefined element'))

      expect(typeof cleanupNull).toBe('function')
      expect(typeof cleanupUndefined).toBe('function')

      expect(() => cleanupNull()).not.toThrow()
      expect(() => cleanupUndefined()).not.toThrow()

      consoleSpy.mockRestore()
    })

    it('should throw error for invalid elements in array', () => {
      const invalidArray = [elements[0], 'not-an-element', elements[1]]

      expect(() => useAttributes(invalidArray, { 'data-test': 'test' })).toThrow('[HookTML] useAttributes requires HTMLElement(s) as first argument')
    })

    it('should handle complex function conditions with conditional logic', () => {
      useAttributes(elements, {
        'data-computed': (el) => {
          const index = parseInt(el.dataset.index)
          return index % 2 === 0 ? 'even' : 'odd'
        },
        'aria-selected': (el) => el.dataset.type === 'secondary' ? 'true' : 'false',
        'data-priority': (el) => {
          const priorities = { primary: 'high', secondary: 'medium', tertiary: 'low' }
          return priorities[el.dataset.type]
        }
      })

      expect(elements[0].getAttribute('data-computed')).toBe('even')
      expect(elements[0].getAttribute('aria-selected')).toBe('false')
      expect(elements[0].getAttribute('data-priority')).toBe('high')

      expect(elements[1].getAttribute('data-computed')).toBe('odd')
      expect(elements[1].getAttribute('aria-selected')).toBe('true')
      expect(elements[1].getAttribute('data-priority')).toBe('medium')

      expect(elements[2].getAttribute('data-computed')).toBe('even')
      expect(elements[2].getAttribute('aria-selected')).toBe('false')
      expect(elements[2].getAttribute('data-priority')).toBe('low')
    })

    it('should handle functions returning null to remove attributes', () => {
      elements.forEach(el => {
        el.setAttribute('data-conditional', 'initial')
      })

      useAttributes(elements, {
        'data-conditional': (el) => {
          const index = parseInt(el.dataset.index)
          return index === 1 ? null : `value-${index}`
        }
      })

      expect(elements[0].getAttribute('data-conditional')).toBe('value-0')
      expect(elements[1].hasAttribute('data-conditional')).toBe(false)
      expect(elements[2].getAttribute('data-conditional')).toBe('value-2')
    })
  })
}) 
