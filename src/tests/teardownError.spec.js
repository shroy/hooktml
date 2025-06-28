import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lifecycleManager } from '../core/initialization.js'
import * as configModule from '../core/config.js'

describe('Teardown Error Handling', () => {
  // Spy on console.error
  let consoleErrorSpy
  
  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  
  it('should clean up element registrations even when teardown throws an error', () => {
    // Setup
    const element = document.createElement('div')
    
    // Create a teardown function that throws an error
    const teardownFn = vi.fn().mockImplementation(() => {
      throw new Error('Teardown error')
    })
    
    // Mock config
    vi.spyOn(configModule, 'getConfig').mockReturnValue({ 
      debug: false 
    })
    
    // Register the teardown function
    lifecycleManager.registerComponent(element, teardownFn)
    
    // Verify element is registered
    expect(lifecycleManager.hasRegistration(element)).toBe(true)
    expect(lifecycleManager.isInitialized(element)).toBe(true)
    
    // Execute teardown with error
    const result = lifecycleManager.executeTeardowns(element)
    
    // Verify teardown was called
    expect(teardownFn).toHaveBeenCalled()
    expect(result.component.success).toBe(false)
    expect(result.component.error).toBeInstanceOf(Error)
    
    // Verify element was cleaned up despite the error
    expect(lifecycleManager.hasRegistration(element)).toBe(false)
    expect(lifecycleManager.isInitialized(element)).toBe(false)
    
    // The logger.error is called, but the actual logging is suppressed by the logger based on debug setting
    expect(consoleErrorSpy).toHaveBeenCalledWith('[HookTML] Error in component teardown:', expect.any(Error))
  })
  
  it('should log errors when in debug mode', () => {
    // Setup
    const element = document.createElement('div')
    
    // Create a teardown function that throws an error
    const teardownFn = vi.fn().mockImplementation(() => {
      throw new Error('Teardown error')
    })
    
    // Mock config with debug mode enabled
    vi.spyOn(configModule, 'getConfig').mockReturnValue({
      debug: true
    })
    
    // Register the teardown function
    lifecycleManager.registerComponent(element, teardownFn)
    
    // Execute teardown with error
    lifecycleManager.executeTeardowns(element)
    
    // Verify error was logged in debug mode
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[HookTML] Error in component teardown:',
      expect.any(Error)
    )
  })
  
  it('should allow re-initialization after teardown failure', () => {
    // Setup
    const element = document.createElement('div')
    
    // Create a teardown function that throws an error
    const teardownFn = vi.fn().mockImplementation(() => {
      throw new Error('Teardown error')
    })
    
    // Mock config
    vi.spyOn(configModule, 'getConfig').mockReturnValue({
      debug: false
    })
    
    // First initialization
    lifecycleManager.registerComponent(element, teardownFn)
    
    // Verify element is registered
    expect(lifecycleManager.isInitialized(element)).toBe(true)
    expect(lifecycleManager.hasRegistration(element)).toBe(true)
    
    // Teardown with error
    lifecycleManager.executeTeardowns(element)
    
    // Verify element was cleaned up
    expect(lifecycleManager.isInitialized(element)).toBe(false)
    expect(lifecycleManager.hasRegistration(element)).toBe(false)
    
    // Should be able to re-initialize
    lifecycleManager.markInitialized(element)
    
    // Verify element is registered again
    expect(lifecycleManager.isInitialized(element)).toBe(true)
  })
}) 
