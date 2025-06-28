/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { injectComponentStyles } from '../core/styleInjection.js'
import { applyCloak } from '../core/componentLifecycle.js'
import * as componentLifecycle from '../core/componentLifecycle.js'

describe('Cloak Removal During Style Injection', () => {
  let element
  
  beforeEach(() => {
    // Clear any existing style tags
    document.head.innerHTML = ''
    
    // Create a fresh element for each test
    element = document.createElement('div')
    document.body.appendChild(element)
    
    // Apply cloak to start with
    applyCloak(element)
  })
  
  afterEach(() => {
    // Clean up
    document.body.removeChild(element)
    vi.restoreAllMocks()
  })
  
  it('should remove cloak after injecting styles', () => {
    // Define a component with styles
    function TestComponent() {}
    TestComponent.styles = 'color: red;'
    
    // Verify cloak is applied
    expect(element.hasAttribute('data-hooktml-cloak')).toBe(true)
    
    // Inject styles
    injectComponentStyles(TestComponent, element)
    
    // Verify cloak is removed
    expect(element.hasAttribute('data-hooktml-cloak')).toBe(false)
    
    // Verify style was injected
    const styleTag = document.getElementById('__hooktml')
    expect(styleTag).not.toBeNull()
    
    // Check if styleTag exists and has sheet property
    if (styleTag instanceof HTMLStyleElement && styleTag.sheet) {
      expect(styleTag.sheet.cssRules.length).toBe(2) // Cloak rule + component rule
    } else {
      throw new Error('Style tag or sheet not properly created')
    }
  })
  
  it('should remove cloak immediately if component has no styles', () => {
    // Define a component without styles
    function NoStylesComponent() {}
    
    // Verify cloak is applied
    expect(element.hasAttribute('data-hooktml-cloak')).toBe(true)
    
    // Inject "styles" (none)
    injectComponentStyles(NoStylesComponent, element)
    
    // Verify cloak is removed
    expect(element.hasAttribute('data-hooktml-cloak')).toBe(false)
  })
  
  it('should remove cloak even if component has empty styles', () => {
    // Define a component with empty styles
    function EmptyStylesComponent() {}
    EmptyStylesComponent.styles = ''
    
    // Verify cloak is applied
    expect(element.hasAttribute('data-hooktml-cloak')).toBe(true)
    
    // Inject "styles" (empty)
    injectComponentStyles(EmptyStylesComponent, element)
    
    // Verify cloak is removed
    expect(element.hasAttribute('data-hooktml-cloak')).toBe(false)
  })
  
  it('should not remove cloak prematurely during style injection', () => {
    // Create a spy to track when removeCloak is called
    const removeCloak = vi.spyOn(componentLifecycle, 'removeCloak')
    
    // Define a component with styles
    function TestComponent() {}
    TestComponent.styles = 'color: red;'
    
    // Verify cloak is applied before injection
    expect(element.hasAttribute('data-hooktml-cloak')).toBe(true)
    expect(removeCloak).not.toHaveBeenCalled()
    
    // Inject styles
    injectComponentStyles(TestComponent, element)
    
    // Verify removeCloak was called exactly once
    expect(removeCloak).toHaveBeenCalledTimes(1)
    expect(removeCloak).toHaveBeenCalledWith(element)
  })
  
  it('should throw an error if no element is provided', () => {
    // Define a component with styles
    function TestComponent() {}
    TestComponent.styles = 'color: red;'
    
    // @ts-expect-error Testing invalid input
    expect(() => injectComponentStyles(TestComponent)).toThrow()
    
    // @ts-expect-error Testing invalid input
    expect(() => injectComponentStyles(TestComponent, null)).toThrow()
  })
}) 
