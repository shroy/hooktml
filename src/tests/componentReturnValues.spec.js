import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initializeComponents } from '../core/scanComponents'
import * as registryModule from '../core/registry'
import * as initializationModule from '../core/initialization'

describe('Component Return Values', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('should handle function return as cleanup', () => {
    // Setup
    const element = document.createElement('div')
    const cleanupFn = vi.fn()
    const componentFn = vi.fn().mockReturnValue(cleanupFn)
    
    // Mock the registry module
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    
    // Mock the lifecycle manager
    const registerComponentSpy = vi.spyOn(initializationModule.lifecycleManager, 'registerComponent')
    
    // Run initialization
    const scanResults = [{ element, componentName: 'TestComponent' }]
    initializeComponents(scanResults)
    
    // Verify cleanup function was stored
    expect(registerComponentSpy).toHaveBeenCalledWith(element, cleanupFn)
    
    // Verify element does not have component property
    expect('component' in element).toBe(false)
  })
  
  it('should assign context to element.component for object returns', () => {
    // Setup
    const element = document.createElement('div')
    const context = { publicApi: vi.fn(), state: { count: 0 } }
    const componentFn = vi.fn().mockReturnValue({ context })
    
    // Mock the registry module
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    
    // Run initialization
    const scanResults = [{ element, componentName: 'TestComponent' }]
    initializeComponents(scanResults)
    
    // Use bracket notation to avoid TypeScript errors
    // Verify context was assigned to element.component
    expect(element['component']).toBe(context)
    
    // Verify element.component has the expected API
    expect(element['component'].publicApi).toBeDefined()
    expect(element['component'].state.count).toBe(0)
  })
  
  it('should register cleanup function from object returns', () => {
    // Setup
    const element = document.createElement('div')
    const cleanupFn = vi.fn()
    const componentFn = vi.fn().mockReturnValue({ cleanup: cleanupFn })
    
    // Mock the registry module
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    
    // Mock the lifecycle manager
    const registerComponentSpy = vi.spyOn(initializationModule.lifecycleManager, 'registerComponent')
    
    // Run initialization
    const scanResults = [{ element, componentName: 'TestComponent' }]
    initializeComponents(scanResults)
    
    // Verify cleanup function was stored
    expect(registerComponentSpy).toHaveBeenCalledWith(element, cleanupFn)
    
    // Verify element does not have component property
    expect('component' in element).toBe(false)
  })
  
  it('should handle both context and cleanup in object returns', () => {
    // Setup
    const element = document.createElement('div')
    const context = { publicApi: vi.fn(), state: { count: 0 } }
    const cleanupFn = vi.fn()
    const componentFn = vi.fn().mockReturnValue({ 
      context, 
      cleanup: cleanupFn 
    })
    
    // Mock the registry module
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    
    // Mock the lifecycle manager
    const registerComponentSpy = vi.spyOn(initializationModule.lifecycleManager, 'registerComponent')
    
    // Run initialization
    const scanResults = [{ element, componentName: 'TestComponent' }]
    initializeComponents(scanResults)
    
    // Verify context was assigned to element.component
    expect(element['component']).toBe(context)
    
    // Verify cleanup function was stored
    expect(registerComponentSpy).toHaveBeenCalledWith(element, cleanupFn)
  })
  
  it('should invoke cleanup function during teardown', () => {
    // Setup
    const element = document.createElement('div')
    const cleanupFn = vi.fn()
    const componentFn = vi.fn().mockReturnValue({ cleanup: cleanupFn })
    
    // Mock the registry module
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    
    // Run initialization
    const scanResults = [{ element, componentName: 'TestComponent' }]
    initializeComponents(scanResults)
    
    // Run teardown using the lifecycle manager
    initializationModule.lifecycleManager.executeTeardowns(element)
    
    // Verify cleanup function was called
    expect(cleanupFn).toHaveBeenCalled()
  })
  
  it('should allow accessing component API from outside', () => {
    // Setup
    const element = document.createElement('div')
    const incrementFn = vi.fn()
    const context = { 
      increment: incrementFn,
      getCount: () => 42
    }
    const componentFn = vi.fn().mockReturnValue({ context })
    
    // Mock the registry module
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    
    // Run initialization
    const scanResults = [{ element, componentName: 'TestComponent' }]
    initializeComponents(scanResults)
    
    // Use bracket notation to avoid TypeScript errors
    // Verify API can be accessed from outside
    element['component'].increment()
    expect(incrementFn).toHaveBeenCalled()
    
    // Verify state can be accessed from outside
    expect(element['component'].getCount()).toBe(42)
  })
}) 
