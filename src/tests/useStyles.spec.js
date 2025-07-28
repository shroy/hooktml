/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useStyles } from '../hooks/useStyles.js'
import { signal } from '../core/signal.js'
import { withHookContext } from '../core/hookContext.js'
import { logger } from '../utils/logger.js'

describe('useStyles', () => {
  let element

  beforeEach(() => {
    element = document.createElement('div')
  })

  it('should apply styles to an element', () => {
    useStyles(element, {
      color: 'red',
      fontSize: '16px',
      padding: '10px'
    })

    expect(element.style.color).toBe('red')
    expect(element.style.fontSize).toBe('16px')
    expect(element.style.padding).toBe('10px')
  })

  it('should handle kebab-case style properties', () => {
    useStyles(element, {
      'background-color': 'blue',
      fontSize: '16px' // camelCase
    })

    expect(element.style.backgroundColor).toBe('blue')
    expect(element.style.fontSize).toBe('16px')
  })

  it('should restore original styles on cleanup', () => {
    // Set initial styles
    element.style.color = 'blue'
    element.style.fontSize = '12px'

    const cleanup = useStyles(element, {
      color: 'red',
      fontSize: '16px',
      padding: '10px'
    })

    expect(element.style.color).toBe('red')
    expect(element.style.fontSize).toBe('16px')
    expect(element.style.padding).toBe('10px')

    // Run cleanup
    cleanup()

    // Original values should be restored
    expect(element.style.color).toBe('blue')
    expect(element.style.fontSize).toBe('12px')
    expect(element.style.padding).toBe('')
  })

  it('should gracefully handle null/undefined elements with warning', () => {
    // @ts-ignore - Testing logger methods
    const warnSpy = vi.spyOn(logger, 'info').mockImplementation(() => { })

    const cleanupNull = useStyles(null, { color: 'red' })
    const cleanupUndefined = useStyles(undefined, { color: 'red' })

    expect(warnSpy).toHaveBeenCalledTimes(2)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('useStyles called with null/undefined element'))

    expect(typeof cleanupNull).toBe('function')
    expect(typeof cleanupUndefined).toBe('function')
    expect(() => cleanupNull()).not.toThrow()
    expect(() => cleanupUndefined()).not.toThrow()

    warnSpy.mockRestore()
  })

  it('should throw an error if first argument is not an HTMLElement', () => {
    // @ts-expect-error
    expect(() => useStyles({}, {})).toThrow()
    // @ts-expect-error
    expect(() => useStyles('div', {})).toThrow()
  })

  it('should throw an error if second argument is not a non-empty object', () => {
    // @ts-expect-error
    expect(() => useStyles(element, null)).toThrow()
    expect(() => useStyles(element, 'string')).toThrow()
    // @ts-expect-error
    expect(() => useStyles(element, [])).toThrow()
    expect(() => useStyles(element, {})).toThrow()
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
        el.setAttribute('data-id', index.toString())
        el.setAttribute('data-color', ['red', 'green', 'blue'][index])
        el.setAttribute('data-width', `${(index + 1) * 100}px`)
      })
    })

    it('should handle array of elements with function conditions', () => {
      useStyles(elements, {
        backgroundColor: (el) => el.dataset.color,
        width: (el) => el.dataset.width,
        opacity: (el) => el.dataset.id === '1' ? '0.5' : '1'
      })

      expect(elements[0].style.backgroundColor).toBe('red')
      expect(elements[0].style.width).toBe('100px')
      expect(elements[0].style.opacity).toBe('1')

      expect(elements[1].style.backgroundColor).toBe('green')
      expect(elements[1].style.width).toBe('200px')
      expect(elements[1].style.opacity).toBe('0.5')

      expect(elements[2].style.backgroundColor).toBe('blue')
      expect(elements[2].style.width).toBe('300px')
      expect(elements[2].style.opacity).toBe('1')
    })

    it('should handle mixed function, signal, and direct value conditions', () => {
      const globalColor = { value: 'purple', subscribe: () => { } }

      useStyles(elements, {
        backgroundColor: (el) => el.dataset.color,
        borderColor: globalColor,
        padding: '10px'
      })

      elements.forEach((el, index) => {
        expect(el.style.backgroundColor).toBe(['red', 'green', 'blue'][index])
        expect(el.style.borderColor).toBe('purple')
        expect(el.style.padding).toBe('10px')
      })
    })

    it('should handle kebab-case properties with arrays', () => {
      useStyles(elements, {
        'background-color': (el) => el.dataset.color,
        'font-size': '16px'
      })

      elements.forEach((el, index) => {
        expect(el.style.backgroundColor).toBe(['red', 'green', 'blue'][index])
        expect(el.style.fontSize).toBe('16px')
      })
    })

    it('should cleanup styles correctly for each element', () => {
      elements.forEach(el => {
        el.style.color = 'black'
        el.style.margin = '5px'
      })

      const cleanup = useStyles(elements, {
        backgroundColor: (el) => el.dataset.color,
        color: 'white',
        fontSize: '14px'
      })

      elements.forEach((el, index) => {
        expect(el.style.backgroundColor).toBe(['red', 'green', 'blue'][index])
        expect(el.style.color).toBe('white')
        expect(el.style.fontSize).toBe('14px')
      })

      cleanup()

      elements.forEach(el => {
        expect(el.style.backgroundColor).toBe('')
        expect(el.style.color).toBe('black') // Original preserved
        expect(el.style.fontSize).toBe('')
        expect(el.style.margin).toBe('5px') // Untouched style preserved
      })
    })

    it('should handle single element passed as array', () => {
      const singleElementArray = [elements[0]]

      useStyles(singleElementArray, {
        color: 'red',
        fontSize: (el) => el.dataset.id === '0' ? '18px' : '12px'
      })

      expect(elements[0].style.color).toBe('red')
      expect(elements[0].style.fontSize).toBe('18px')
      expect(elements[1].style.color).toBe('')
      expect(elements[2].style.color).toBe('')
    })

    it('should maintain backward compatibility with single elements', () => {
      useStyles(elements[0], {
        color: 'red',
        fontSize: '16px'
      })

      expect(elements[0].style.color).toBe('red')
      expect(elements[0].style.fontSize).toBe('16px')
      expect(elements[1].style.color).toBe('')
      expect(elements[2].style.color).toBe('')
    })

    it('should handle null/undefined in array gracefully', () => {
      // @ts-ignore - Testing logger methods
      const warnSpy = vi.spyOn(logger, 'info').mockImplementation(() => { })

      const cleanupNull = useStyles(null, { color: 'red' })

      const cleanupUndefined = useStyles(undefined, { color: 'red' })

      expect(warnSpy).toHaveBeenCalledTimes(2)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('useStyles called with null/undefined element'))

      expect(typeof cleanupNull).toBe('function')
      expect(typeof cleanupUndefined).toBe('function')

      expect(() => cleanupNull()).not.toThrow()
      expect(() => cleanupUndefined()).not.toThrow()

      warnSpy.mockRestore()
    })

    it('should throw error for invalid elements in array', () => {
      const invalidArray = [elements[0], 'not-an-element', elements[1]]

      expect(() => useStyles(invalidArray, { color: 'red' })).toThrow('[HookTML] useStyles requires HTMLElement(s) as first argument')
    })

    it('should handle complex function conditions with calculations', () => {
      useStyles(elements, {
        width: (el) => `${parseInt(el.dataset.id) * 50 + 100}px`,
        height: (el) => el.dataset.id === '1' ? '200px' : '100px',
        transform: (el) => `translateX(${parseInt(el.dataset.id) * 10}px)`
      })

      expect(elements[0].style.width).toBe('100px')
      expect(elements[0].style.height).toBe('100px')
      expect(elements[0].style.transform).toBe('translateX(0px)')

      expect(elements[1].style.width).toBe('150px')
      expect(elements[1].style.height).toBe('200px')
      expect(elements[1].style.transform).toBe('translateX(10px)')

      expect(elements[2].style.width).toBe('200px')
      expect(elements[2].style.height).toBe('100px')
      expect(elements[2].style.transform).toBe('translateX(20px)')
    })
  })
}) 
