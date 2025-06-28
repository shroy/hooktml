import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initializeComponents } from '../core/scanComponents'
import * as registryModule from '../core/registry'
import * as initializationModule from '../core/initialization'

describe('Component Initialization Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })
  
  it('should skip elements that have already been initialized', () => {
    const element = document.createElement('div')
    const componentFn = vi.fn().mockReturnValue({ initialized: true })
    
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    initializationModule.lifecycleManager.markInitialized(element)
    
    const scanResults = [{ element, componentName: 'TestComponent' }]
    const result = initializeComponents(scanResults)
    
    expect(componentFn).not.toHaveBeenCalled()
    expect(result).toHaveLength(0)
  })
  
  it('should mark elements as initialized after successful initialization', () => {
    const element = document.createElement('div')
    const componentFn = vi.fn().mockReturnValue({ initialized: true })
    
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    const markInitializedSpy = vi.spyOn(initializationModule, 'markInitialized')
    
    const scanResults = [{ element, componentName: 'TestComponent' }]
    const result = initializeComponents(scanResults)
    
    expect(componentFn).toHaveBeenCalledWith(element, expect.any(Object))
    expect(markInitializedSpy).toHaveBeenCalledWith(element)
    expect(result).toHaveLength(1)
  })
  
  /**
   * Test re-initialization after teardown
   */
  it('should allow re-initialization after teardown', () => {
    // Setup
    const element = document.createElement('div')
    const componentFn = vi.fn()
      .mockReturnValueOnce({ initialized: true })  // First initialization
      .mockReturnValueOnce({ reinitialized: true }) // Second initialization
    
    // Mock the registry
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    const markInitializedSpy = vi.spyOn(initializationModule, 'markInitialized')
    
    // Create scan results
    const scanResults = [{ element, componentName: 'TestComponent' }]
    
    // First initialization
    const result1 = initializeComponents(scanResults)
    expect(componentFn).toHaveBeenCalledTimes(1)
    expect(markInitializedSpy).toHaveBeenCalledWith(element)
    expect(result1).toHaveLength(1)
    
    // Try to initialize again (should be skipped)
    const result2 = initializeComponents(scanResults)
    expect(componentFn).toHaveBeenCalledTimes(1) // Still only called once
    expect(result2).toHaveLength(0)
    
    // Clear initialization state
    initializationModule.clearInitialized(element)
    
    // Try to initialize again (should work)
    const result3 = initializeComponents(scanResults)
    expect(componentFn).toHaveBeenCalledTimes(2)
    expect(markInitializedSpy).toHaveBeenCalledWith(element)
    expect(result3).toHaveLength(1)
  })
})

/**
 * Tests for component initialization functionality
 */
describe('Component Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })
  
  /**
   * Test initializing components from scan results
   */
  it('should call the registered component function for each matching element', () => {
    // Setup
    const buttonElement = document.createElement('button')
    const dialogElement = document.createElement('div')
    
    // Mock the component functions
    const buttonFn = vi.fn().mockReturnValue({ initialized: true })
    const dialogFn = vi.fn().mockReturnValue({ initialized: true })
    
    // Mock the registry getRegisteredComponent function
    vi.spyOn(registryModule, 'getRegisteredComponent').mockImplementation((name) => {
      if (name === 'Button') return buttonFn
      if (name === 'Dialog') return dialogFn
      return undefined
    })
    
    // Create scan results
    const scanResults = [
      { element: buttonElement, componentName: 'Button' },
      { element: dialogElement, componentName: 'Dialog' }
    ]
    
    // Execute
    const result = initializeComponents(scanResults)
    
    // Verify functions were called with correct elements
    expect(buttonFn).toHaveBeenCalledTimes(1)
    expect(buttonFn).toHaveBeenCalledWith(buttonElement, expect.any(Object))
    
    expect(dialogFn).toHaveBeenCalledTimes(1)
    expect(dialogFn).toHaveBeenCalledWith(dialogElement, expect.any(Object))
    
    // Verify result contains the instances
    expect(result).toHaveLength(2)
    expect(result[0].element).toBe(buttonElement)
    expect(result[0].componentName).toBe('Button')
    expect(result[0].instance).toEqual({ initialized: true })
    
    expect(result[1].element).toBe(dialogElement)
    expect(result[1].componentName).toBe('Dialog')
    expect(result[1].instance).toEqual({ initialized: true })
  })
  
  /**
   * Test handling of unregistered components
   */
  it('should skip elements with no registered component function', () => {
    // Setup
    const buttonElement = document.createElement('button')
    const unregisteredElement = document.createElement('div')
    
    // Mock the component function
    const buttonFn = vi.fn().mockReturnValue({ initialized: true })
    
    // Mock the registry getRegisteredComponent function
    vi.spyOn(registryModule, 'getRegisteredComponent').mockImplementation((name) => {
      if (name === 'Button') return buttonFn
      return undefined
    })
    
    // Create scan results
    const scanResults = [
      { element: buttonElement, componentName: 'Button' },
      { element: unregisteredElement, componentName: 'Unregistered' }
    ]
    
    // Mock console.warn to avoid cluttering test output
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    // Execute
    const result = initializeComponents(scanResults)
    
    // Verify only registered component was initialized
    expect(buttonFn).toHaveBeenCalledTimes(1)
    expect(buttonFn).toHaveBeenCalledWith(buttonElement, expect.any(Object))
    
    // Verify warning was logged for unregistered component
    expect(consoleWarnSpy).toHaveBeenCalledWith('[HookTML] No registered function found for component: Unregistered')
    
    // Verify result only includes registered component
    expect(result).toHaveLength(1)
    expect(result[0].componentName).toBe('Button')
  })
  
  /**
   * Test handling of component initialization errors
   */
  it('should handle errors during component initialization', () => {
    // Setup
    const element1 = document.createElement('div')
    const element2 = document.createElement('div')
    
    // Mock component functions - one that works, one that throws
    const workingFn = vi.fn().mockReturnValue({ initialized: true })
    const errorFn = vi.fn().mockImplementation(() => {
      throw new Error('Component initialization failed')
    })
    
    // Mock the registry getRegisteredComponent function
    vi.spyOn(registryModule, 'getRegisteredComponent').mockImplementation((name) => {
      if (name === 'Working') return workingFn
      if (name === 'Error') return errorFn
      return undefined
    })
    
    // Create scan results
    const scanResults = [
      { element: element1, componentName: 'Working' },
      { element: element2, componentName: 'Error' }
    ]
    
    // Mock console.error to avoid cluttering test output
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Execute
    const result = initializeComponents(scanResults)
    
    // Verify both functions were called
    expect(workingFn).toHaveBeenCalledTimes(1)
    expect(errorFn).toHaveBeenCalledTimes(1)
    
    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalled()
    
    // Verify only successful component is in result
    expect(result).toHaveLength(1)
    expect(result[0].componentName).toBe('Working')
  })
  
  /**
   * Test handling of empty/invalid input
   */
  it('should handle empty or invalid input', () => {
    // Setup various invalid inputs
    const emptyArray = []
    
    // Execute with various inputs
    const result1 = initializeComponents(emptyArray)
    // @ts-expect-error - Testing invalid input intentionally
    const result2 = initializeComponents(null)
    // @ts-expect-error - Testing invalid input intentionally
    const result3 = initializeComponents(undefined)
    
    // Verify all return empty arrays
    expect(result1).toEqual([])
    expect(result2).toEqual([])
    expect(result3).toEqual([])
  })
  
  /**
   * Test handling of teardown functions
   */
  it('should store teardown functions returned by components', () => {
    // Setup
    const element = document.createElement('div')
    const teardownFn = vi.fn()
    
    // Mock the component function to return a teardown function
    const componentFn = vi.fn().mockReturnValue(teardownFn)
    
    // Mock the registry
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    
    // Spy on the lifecycle manager registration
    const registerComponentSpy = vi.spyOn(initializationModule.lifecycleManager, 'registerComponent')
    
    // Create scan results
    const scanResults = [{ element, componentName: 'TestComponent' }]
    
    // Execute
    const result = initializeComponents(scanResults)
    
    // Verify
    expect(registerComponentSpy).toHaveBeenCalledWith(element, teardownFn)
    expect(result).toHaveLength(1)
    expect(result[0].instance).toBe(teardownFn)
  })
  
  /**
   * Test handling of non-function component returns
   */
  it('should not store non-function component returns as teardown functions', () => {
    // Setup
    const element = document.createElement('div')
    const componentInstance = { some: 'object' }
    
    // Mock the component function to return a non-function
    const componentFn = vi.fn().mockReturnValue(componentInstance)
    
    // Mock the registry
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    
    // Spy on the lifecycle manager registration
    const registerComponentSpy = vi.spyOn(initializationModule.lifecycleManager, 'registerComponent')
    
    // Create scan results
    const scanResults = [{ element, componentName: 'TestComponent' }]
    
    // Execute
    const result = initializeComponents(scanResults)
    
    // Verify
    expect(registerComponentSpy).not.toHaveBeenCalled()
    expect(result).toHaveLength(1)
    expect(result[0].instance).toBe(componentInstance)
  })
}) 
