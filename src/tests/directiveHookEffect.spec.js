import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerHook, clearHookRegistry } from '../core/hookRegistry.js'
import { scanDirectives } from '../core/scanDirectives.js'
import { initConfig } from '../core/config.js'
import { useEffect } from '../core/hookContext.js'
import { lifecycleManager } from '../core/initialization.js'
import { runCleanupFunctions } from '../core/hookContext.js'
import { signal } from '../core/signal.js'

describe('Directive Hook useEffect Integration', () => {
  let mockConsole
  
  beforeEach(() => {
    // Initialize config with debug mode
    initConfig({ debug: true })
    
    // Mock console methods
    mockConsole = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    }
    
    // Reset document body
    document.body.innerHTML = ''
    
    // Clear hook registry
    clearHookRegistry()
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })
  
  it('should call useEffect inside directive hooks', () => {
    // Create hook that uses useEffect
    const effectFn = vi.fn()
    
    // Create a directive hook that uses useEffect
    const useToggle = (element) => {
      useEffect(() => {
        effectFn(element)
        
        // Return a teardown function
        return () => {
          // No implementation needed for this test
        }
      }, [])
    }
    
    registerHook(useToggle)
    
    // Add element with directive
    document.body.innerHTML = `
      <button id="test-button" use-toggle></button>
    `
    
    // Get the element
    const buttonElement = document.getElementById('test-button')
    
    // Ensure element exists before proceeding
    expect(buttonElement).not.toBeNull()
    
    // Scan for directives
    scanDirectives()
    
    // Verify effect was called with the correct element
    expect(effectFn).toHaveBeenCalledTimes(1)
    expect(effectFn).toHaveBeenCalledWith(buttonElement)
  })
  
  it('should run teardown functions from useEffect when element is removed', () => {
    // Create teardown function
    const effectTeardownFn = vi.fn()
    
    // Create a directive hook that uses useEffect
    const useCleanupTest = () => {
      useEffect(() => {
        // This is the setup part
        return effectTeardownFn
      }, [])
    }
    
    registerHook(useCleanupTest)
    
    // Add element with directive
    document.body.innerHTML = `
      <div id="parent">
        <div id="test-element" use-cleanup-test></div>
      </div>
    `
    
    // Get the elements
    const testElement = document.getElementById('test-element')
    const parent = document.getElementById('parent')
    
    // Skip test if elements aren't properly created
    if (!testElement || !parent) {
      console.error('Test elements not found')
      return
    }
    
    // Scan for directives
    scanDirectives()
    
    // Simulate removing the element
    parent.removeChild(testElement)
    
    // Run cleanup functions (simulating MutationObserver behavior)
    runCleanupFunctions(testElement)
    
    // Verify teardown was called
    expect(effectTeardownFn).toHaveBeenCalledTimes(1)
  })
  
  it('should support multiple useEffect calls in the same directive hook', () => {
    // Create teardown functions
    const effect1Setup = vi.fn()
    const effect1Teardown = vi.fn()
    const effect2Setup = vi.fn()
    const effect2Teardown = vi.fn()
    
    // Create a directive hook that calls useEffect multiple times
    const useMultipleEffects = (element) => {
      useEffect(() => {
        effect1Setup(element)
        return effect1Teardown
      }, [])
      
      useEffect(() => {
        effect2Setup(element)
        return effect2Teardown
      }, [])
    }
    
    registerHook(useMultipleEffects)
    
    // Add element with directive
    document.body.innerHTML = `
      <div id="test-multi-effect" use-multiple-effects></div>
    `
    
    // Get the element
    const multiEffectElement = document.getElementById('test-multi-effect')
    
    // Skip test if element isn't properly created
    if (!multiEffectElement) {
      console.error('Test element not found')
      return
    }
    
    // Scan for directives
    scanDirectives()
    
    // Verify setup functions were called
    expect(effect1Setup).toHaveBeenCalledWith(multiEffectElement)
    expect(effect2Setup).toHaveBeenCalledWith(multiEffectElement)
    
    // Run cleanup
    runCleanupFunctions(multiEffectElement)
    
    // Verify teardown functions were called
    expect(effect1Teardown).toHaveBeenCalledTimes(1)
    expect(effect2Teardown).toHaveBeenCalledTimes(1)
  })
  
  it('should warn when useEffect is called outside a directive/component context', () => {
    // Call useEffect outside of any context
    useEffect(() => {
      // do nothing
    }, [])
    
    // Verify warning was logged
    expect(mockConsole.warn).toHaveBeenCalledWith(
      expect.stringContaining('[HookTML] useEffect called outside component/directive context')
    )
  })
  
  it('should not interfere with direct teardown functions returned by hooks', () => {
    // Create directive teardown function
    const directiveTeardownFn = vi.fn()
    const effectTeardownFn = vi.fn()
    
    // Create a directive hook that both uses useEffect and returns a teardown
    const useDualTeardown = () => {
      useEffect(() => {
        return effectTeardownFn
      }, [])
      
      // Return a direct teardown function
      return directiveTeardownFn
    }
    
    registerHook(useDualTeardown)
    
    // Add element with directive
    document.body.innerHTML = `
      <div id="test-dual" use-dual-teardown></div>
    `
    
    // Get the element
    const dualElement = document.getElementById('test-dual')
    
    // Skip test if element isn't properly created
    if (!dualElement) {
      console.error('Test element not found')
      return
    }
    
    // Scan for directives
    scanDirectives()
    
    // Run directive teardowns (simulating element removal)
    lifecycleManager.executeDirectiveTeardowns(dualElement)
    
    // Verify directive teardown was called
    expect(directiveTeardownFn).toHaveBeenCalledTimes(1)
    
    // Run effect cleanups
    runCleanupFunctions(dualElement)
    
    // Verify effect teardown was called
    expect(effectTeardownFn).toHaveBeenCalledTimes(1)
  })
  
  it('should preserve hook state when attributes change', () => {
    const counterSignal = signal(0)
    const effectFn = vi.fn()
    
    // Create a directive hook that uses a signal
    const useCounter = () => {
      useEffect(() => {
        effectFn(counterSignal.value)
      }, [counterSignal])
    }
    
    registerHook(useCounter)
    
    // Add element with directive
    document.body.innerHTML = `
      <div id="test-counter" use-counter></div>
    `
    
    const element = document.getElementById('test-counter')
    expect(element).not.toBeNull()
    
    // Initial scan
    scanDirectives()
    expect(effectFn).toHaveBeenCalledWith(0)
    
    // Change signal value
    counterSignal.value = 1
    expect(effectFn).toHaveBeenCalledWith(1)
    
    // Change an unrelated attribute
    element?.setAttribute('data-test', 'value')
    
    // Re-scan directives (simulating mutation observer)
    scanDirectives()
    
    // Effect should not be called again with initial value
    expect(effectFn).toHaveBeenCalledTimes(2)
  })
}) 
