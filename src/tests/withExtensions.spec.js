/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { with as withEl } from '../core/with.js'

describe('with(el) extensions', () => {
  let element
  
  beforeEach(() => {
    element = document.createElement('div')
  })
  
  it('should have useAttributes and useStyles chainable methods', () => {
    const chain = withEl(element)
    
    expect(typeof chain.useAttributes).toBe('function')
    expect(typeof chain.useStyles).toBe('function')
  })
  
  it('should apply attributes via useAttributes', () => {
    withEl(element).useAttributes({
      'data-test': 'value',
      'aria-hidden': 'true'
    })
    
    expect(element.getAttribute('data-test')).toBe('value')
    expect(element.getAttribute('aria-hidden')).toBe('true')
  })
  
  it('should remove attributes when value is null', () => {
    // Set initial attributes
    element.setAttribute('data-test', 'initial')
    
    withEl(element).useAttributes({
      'data-test': null
    })
    
    expect(element.hasAttribute('data-test')).toBe(false)
  })
  
  it('should apply styles via useStyles', () => {
    withEl(element).useStyles({
      color: 'red',
      fontSize: '16px'
    })
    
    expect(element.style.color).toBe('red')
    expect(element.style.fontSize).toBe('16px')
  })
  
  it('should allow chaining with other hooks', () => {
    const clickHandler = vi.fn()
    
    withEl(element)
      .useAttributes({ 'data-test': 'value' })
      .useStyles({ color: 'red' })
      .useClasses({ active: true })
      .useEvents({ click: clickHandler })
    
    expect(element.getAttribute('data-test')).toBe('value')
    expect(element.style.color).toBe('red')
    expect(element.classList.contains('active')).toBe(true)
    
    // Trigger the click event to make sure the handler was added
    element.click()
    expect(clickHandler).toHaveBeenCalledTimes(1)
  })
}) 
