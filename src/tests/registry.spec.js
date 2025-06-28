import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  registerComponent, 
  getRegisteredComponentNames,
  getRegisteredComponent,
  clearRegistry 
} from '../core/registry'
import * as configModule from '../core/config.js'

/**
 * Tests for component registry module
 */
describe('Component Registry', () => {
  // Spy on console methods
  let consoleLogSpy
  let consoleWarnSpy
  
  beforeEach(() => {
    vi.clearAllMocks()
    clearRegistry() // Ensure a clean registry for each test
    
    // Mock config to enable debug mode
    vi.spyOn(configModule, 'getConfig').mockReturnValue({ 
      componentSelectorMode: 'class',
      debug: true 
    })
    
    // Set up spies once and reuse them
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  
  /**
   * Test component registration with a named function
   */
  it('should register a component with a named function', () => {
    // Define a component with a properly named function
    function Dialog() {}
    
    // Execute
    const result = registerComponent(Dialog)
    
    // Verify
    expect(result).toBe(true)
    expect(consoleLogSpy).toHaveBeenCalledWith('[HookTML] Registered component: Dialog')
    expect(getRegisteredComponentNames()).toEqual(['Dialog'])
    expect(getRegisteredComponent('Dialog')).toBe(Dialog)
  })
  
  /**
   * Test invalid component registration (not a function)
   */
  it('should reject registrations that are not functions', () => {
    // Execute with invalid inputs (intentionally incorrect types for testing)
    // @ts-expect-error - Testing invalid types intentionally
    const result1 = registerComponent('StringIsNotAFunction')
    // @ts-expect-error - Testing invalid types intentionally
    const result2 = registerComponent({})
    // @ts-expect-error - Testing invalid types intentionally
    const result3 = registerComponent(null)
    // @ts-expect-error - Testing invalid types intentionally
    const result4 = registerComponent(123)
    
    // Verify
    expect(result1).toBe(false)
    expect(result2).toBe(false)
    expect(result3).toBe(false)
    expect(result4).toBe(false)
    expect(consoleWarnSpy).toHaveBeenCalledTimes(4)
    expect(getRegisteredComponentNames()).toEqual([])
  })
  
  /**
   * Test anonymous functions
   */
  it('should reject anonymous and arrow functions', () => {
    // Execute with anonymous functions
    const anonymousResult = registerComponent(function() {})
    const arrowResult = registerComponent(() => {})
    
    // Verify
    expect(anonymousResult).toBe(false) 
    expect(arrowResult).toBe(false)
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2)
    expect(getRegisteredComponentNames()).toEqual([])
  })
  
  /**
   * Test invalid component names
   */
  it('should reject functions with invalid names', () => {
    // Define components with invalid names
    const lowercase = () => {}
    function $Invalid() {}
    
    // Execute
    const result1 = registerComponent(lowercase)
    const result2 = registerComponent($Invalid)
    
    // Verify
    expect(result1).toBe(false)
    expect(result2).toBe(false)
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2)
    expect(getRegisteredComponentNames()).toEqual([])
  })
  
  /**
   * Test duplicate component registration
   */
  it('should not register the same component twice', () => {
    // Define a component
    function Button() {}
    
    // Execute
    const result1 = registerComponent(Button)
    const result2 = registerComponent(Button)
    
    // Verify
    expect(result1).toBe(true)
    expect(result2).toBe(false)
    expect(consoleLogSpy).toHaveBeenCalledTimes(1) // Only logs once
    expect(getRegisteredComponentNames()).toEqual(['Button'])
    expect(getRegisteredComponent('Button')).toBe(Button)
  })
  
  /**
   * Test multiple component registration
   */
  it('should register multiple components', () => {
    // Define components
    function Button() {}
    function Dialog() {}
    function Modal() {}
    
    // Execute
    registerComponent(Button)
    registerComponent(Dialog)
    registerComponent(Modal)
    
    // Verify
    const components = getRegisteredComponentNames()
    expect(components).toHaveLength(3)
    expect(components).toContain('Button')
    expect(components).toContain('Dialog')
    expect(components).toContain('Modal')
    
    // Verify callback retrieval
    expect(getRegisteredComponent('Button')).toBe(Button)
    expect(getRegisteredComponent('Dialog')).toBe(Dialog)
    expect(getRegisteredComponent('Modal')).toBe(Modal)
  })
  
  /**
   * Test clearing the registry
   */
  it('should clear all registered components', () => {
    // Setup
    function Button() {}
    function Dialog() {}
    
    registerComponent(Button)
    registerComponent(Dialog)
    expect(getRegisteredComponentNames()).toHaveLength(2)
    
    // Execute
    clearRegistry()
    
    // Verify
    expect(getRegisteredComponentNames()).toEqual([])
    expect(getRegisteredComponent('Button')).toBeUndefined()
  })
}) 
