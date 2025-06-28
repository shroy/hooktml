/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useStyles } from '../hooks/useStyles.js'

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

  it('should throw an error if first argument is not an HTMLElement', () => {
    expect(() => useStyles(null, {})).toThrow()
    expect(() => useStyles({}, {})).toThrow()
    expect(() => useStyles('div', {})).toThrow()
  })

  it('should throw an error if second argument is not a non-empty object', () => {
    expect(() => useStyles(element, null)).toThrow()
    expect(() => useStyles(element, 'string')).toThrow()
    expect(() => useStyles(element, [])).toThrow()
    expect(() => useStyles(element, {})).toThrow()
  })
}) 
