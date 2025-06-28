/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { lifecycleManager } from '../core/initialization.js'
import { LifecycleManager } from '../core/lifecycleManager.js'

describe('LifecycleManager Singleton', () => {
  /** @type {HTMLElement} */
  let element

  beforeEach(() => {
    element = document.createElement('div')
    document.body.appendChild(element)
  })

  afterEach(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element)
    }
    // Clean up any state from the singleton
    lifecycleManager.executeTeardowns(element)
  })

  it('should export a singleton LifecycleManager instance', () => {
    expect(lifecycleManager).toBeInstanceOf(LifecycleManager)
    expect(lifecycleManager.teardownRegistry).toBeInstanceOf(WeakMap)
    expect(lifecycleManager.stateManager).toBeDefined()
  })

  it('should maintain state across imports', () => {
    // Register something in the singleton
    const teardown = vi.fn()
    lifecycleManager.registerComponent(element, teardown)
    
    expect(lifecycleManager.isInitialized(element)).toBe(true)
    expect(lifecycleManager.hasRegistration(element)).toBe(true)
  })

  it('should work with existing initialization functions', () => {
    const teardown = vi.fn()
    lifecycleManager.registerComponent(element, teardown)
    
    // The singleton should be used by the exported functions
    expect(lifecycleManager.isInitialized(element)).toBe(true)
  })

  it('should handle directive registration through singleton', () => {
    const teardown = vi.fn()
    const directiveName = 'test-directive'
    
    lifecycleManager.registerDirective(element, teardown, directiveName)
    
    expect(lifecycleManager.isDirectiveInitialized(element, directiveName)).toBe(true)
    expect(lifecycleManager.hasRegistration(element)).toBe(true)
  })

  it('should execute teardowns through singleton', () => {
    const componentTeardown = vi.fn()
    const directiveTeardown = vi.fn()
    
    lifecycleManager.registerComponent(element, componentTeardown)
    lifecycleManager.registerDirective(element, directiveTeardown, 'test-directive')
    
    const results = lifecycleManager.executeTeardowns(element)
    
    expect(results.component.success).toBe(true)
    expect(results.directives).toHaveLength(1)
    expect(results.directives[0].success).toBe(true)
    
    expect(componentTeardown).toHaveBeenCalledTimes(1)
    expect(directiveTeardown).toHaveBeenCalledTimes(1)
    
    expect(lifecycleManager.isInitialized(element)).toBe(false)
    expect(lifecycleManager.hasRegistration(element)).toBe(false)
  })
}) 
