import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerHook, clearHookRegistry } from '../core/hookRegistry.js'
import { scanDirectives } from '../core/scanDirectives.js'
import { initConfig } from '../core/config.js'
import { lifecycleManager } from '../core/initialization.js'

describe('Directive Hook Teardown', () => {
  let mockConsole
  
  beforeEach(() => {
    // Initialize config with debug mode
    initConfig({ debug: true })
    
    // Mock console methods but allow them to pass through to console.info
    mockConsole = {
      log: vi.spyOn(console, 'log').mockImplementation((...args) => {
        console.info(...args)
      }),
      warn: vi.spyOn(console, 'warn').mockImplementation((...args) => {
        console.info('WARN:', ...args)
      }),
      error: vi.spyOn(console, 'error').mockImplementation((...args) => {
        console.info('ERROR:', ...args)
      })
    }
    
    // Reset document body
    document.body.innerHTML = ''
    
    // Clear hook registry
    clearHookRegistry()
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })
  
  it('should store teardown functions returned by hooks', () => {
    // Create hook that returns a teardown function
    const teardownFn = vi.fn()
    const useTeardown = () => teardownFn
    
    registerHook(useTeardown)
    
    // Add element with directive
    document.body.innerHTML = `
      <div id="test-element" use-teardown></div>
    `
    
    // Get the element
    const element = document.getElementById('test-element')
    if (!element) {
      throw new Error('Test element not found')
    }
    
    // Scan for directives
    scanDirectives()
    
    // Verify teardown is registered
    expect(lifecycleManager.hasRegistration(element)).toBe(true)
  })
  
  it('should run teardown function when element is removed', () => {
    // Create hook that returns a teardown function
    const teardownFn = vi.fn()
    const useTeardown = () => teardownFn
    
    registerHook(useTeardown)
    
    // Add element with directive
    document.body.innerHTML = `
      <div id="test-element" use-teardown></div>
    `
    
    // Scan for directives
    scanDirectives()
    
    // Get the element
    const element = document.getElementById('test-element')
    if (!element) {
      throw new Error('Test element not found')
    }
    
    // Verify teardown is registered before running it
    expect(lifecycleManager.hasRegistration(element)).toBe(true)
    
    // Run teardown manually
    lifecycleManager.executeTeardowns(element)
    
    // Verify teardown was called
    expect(teardownFn).toHaveBeenCalledTimes(1)
    
    // Verify teardown is no longer registered
    expect(lifecycleManager.hasRegistration(element)).toBe(false)
  })
  
  it('should handle multiple teardowns on the same element', () => {
    // Create hooks that return teardown functions
    const teardownA = vi.fn()
    const teardownB = vi.fn()
    const teardownC = vi.fn()
    
    const useHookA = () => teardownA
    
    const useHookB = () => teardownB
    
    const useHookC = () => teardownC
    
    registerHook(useHookA)
    registerHook(useHookB)
    registerHook(useHookC)
    
    // Add element with multiple directives
    document.body.innerHTML = `
      <div id="multi" use-hook-a use-hook-b use-hook-c></div>
    `
    
    // Scan for directives
    scanDirectives()
    
    // Get the element
    const element = document.getElementById('multi')
    if (!element) {
      throw new Error('Test element not found')
    }
    
    // Verify multiple teardowns are registered
    expect(lifecycleManager.hasRegistration(element)).toBe(true)
    
    // Run teardown
    lifecycleManager.executeTeardowns(element)
    
    // Verify all teardowns were called
    expect(teardownA).toHaveBeenCalledTimes(1)
    expect(teardownB).toHaveBeenCalledTimes(1)
    expect(teardownC).toHaveBeenCalledTimes(1)
    
    // Verify teardown is no longer registered
    expect(lifecycleManager.hasRegistration(element)).toBe(false)
  })
  
  it('should not call teardowns more than once', () => {
    // Create hook that returns a teardown function
    const teardownFn = vi.fn()
    const useTeardown = () => teardownFn
    
    registerHook(useTeardown)
    
    // Add element with directive
    document.body.innerHTML = `
      <div id="test-element" use-teardown></div>
    `
    
    // Scan for directives
    scanDirectives()
    
    // Get the element
    const element = document.getElementById('test-element')
    if (!element) {
      throw new Error('Test element not found')
    }
    
    // Run teardown twice
    lifecycleManager.executeTeardowns(element)
    lifecycleManager.executeTeardowns(element)
    
    // Verify teardown was called only once
    expect(teardownFn).toHaveBeenCalledTimes(1)
  })
  
  it('should not interfere with component teardown', () => {
    // Create hook that returns a teardown function
    const directiveTeardownFn = vi.fn()
    function useTeardown() {
      return directiveTeardownFn
    }
    
    // Create component teardown function
    const componentTeardownFn = vi.fn()
    
    registerHook(useTeardown)
    
    // Add element with directive
    document.body.innerHTML = `
      <div id="test-element" use-teardown></div>
    `
    
    // Get the element
    const element = document.getElementById('test-element')
    if (!element) {
      throw new Error('Test element not found')
    }
    
    // Scan for directives first
    scanDirectives()
    
    // Then store component teardown
    lifecycleManager.registerComponent(element, componentTeardownFn)
    
    // Run directive teardowns only
    lifecycleManager.executeDirectiveTeardowns(element)
    
    // Verify directive teardown was called
    expect(directiveTeardownFn).toHaveBeenCalledTimes(1)
    
    // Verify component teardown was not called
    expect(componentTeardownFn).toHaveBeenCalledTimes(0)
  })
  
  it('should handle teardown errors gracefully', () => {
    // Create hook that throws an error in teardown
    const useErrorTeardown = () => {
      return () => {
        throw new Error('Teardown error')
      }
    }
    
    registerHook(useErrorTeardown)
    
    // Add element with directive
    document.body.innerHTML = `
      <div id="error-element" use-error-teardown></div>
    `
    
    // Scan for directives
    scanDirectives()
    
    // Get the element
    const element = document.getElementById('error-element')
    if (!element) {
      throw new Error('Test element not found')
    }
    
    // Run teardown and expect it not to throw
    expect(() => {
      lifecycleManager.executeTeardowns(element)
    }).not.toThrow()
    
    // Verify error was logged
    expect(mockConsole.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in directive teardown:'),
      expect.any(Error)
    )
  })
}) 
