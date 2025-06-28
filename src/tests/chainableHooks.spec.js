/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { with as withEl } from '../core/with.js'
import { registerChainableHook, clearChainableHookRegistry } from '../core/hookRegistry.js'
import { isHTMLElement } from '../utils/type-guards.js'

// Create test hooks
const useTestHook = (el, options) => {
  if (!isHTMLElement(el)) {
    throw new Error('useTestHook requires an HTMLElement')
  }
  
  el.dataset.testHook = options?.value || 'default'
  
  return () => {
    delete el.dataset.testHook
  }
}

const useAnotherHook = (el, value) => {
  if (!isHTMLElement(el)) {
    throw new Error('useAnotherHook requires an HTMLElement')
  }
  
  el.setAttribute('data-another-hook', value || '')
  
  return () => {
    el.removeAttribute('data-another-hook')
  }
}

// Invalid hook (doesn't start with 'use')
const invalidHook = (el) => {
  el.dataset.invalid = true
}

describe('Chainable Hooks Registration', () => {
  let element
  
  beforeEach(() => {
    // Create a fresh element for each test
    element = document.createElement('div')
    // Clear the registry before each test
    clearChainableHookRegistry()
  })
  
  afterEach(() => {
    // Clean up the DOM
    if (element?.parentNode) {
      element.parentNode.removeChild(element)
    }
  })
  
  it('should register a valid hook with the use* prefix', () => {
    const result = registerChainableHook(useTestHook)
    expect(result).toBe(true)
  })
  
  it('should reject hooks without the use* prefix', () => {
    // Spy on console.warn to verify warning message
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    const result = registerChainableHook(invalidHook)
    expect(result).toBe(false)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid chainable hook name')
    )
    
    warnSpy.mockRestore()
  })
  
  it('should make registered hooks available on the with(el) chain', () => {
    // Register the test hook
    registerChainableHook(useTestHook)
    
    // Create a chain
    const chain = withEl(element)
    
    // Verify the hook is available as a method
    // @ts-ignore - Dynamic properties aren't typed
    expect(typeof chain.useTestHook).toBe('function')
    
    // Call the hook via the chain
    // @ts-ignore - Dynamic properties aren't typed
    chain.useTestHook({ value: 'test-value' })
    
    // Verify the hook was applied to the element
    expect(element.dataset.testHook).toBe('test-value')
  })
  
  it('should allow chaining multiple hooks including built-in ones', () => {
    // Register the test hooks
    registerChainableHook(useTestHook)
    registerChainableHook(useAnotherHook)
    
    // Apply multiple hooks via chaining
    // Need to define as variable first to apply @ts-ignore properly
    const chain = withEl(element)
    
    // @ts-ignore - Dynamic properties aren't typed
    chain.useTestHook({ value: 'chained' })
      .useClasses({ active: true })
      // @ts-ignore - Dynamic properties aren't typed
      .useAnotherHook('another-value')
      .useEvents({ click: () => {} })
    
    // Verify all hooks were applied
    expect(element.dataset.testHook).toBe('chained')
    expect(element.getAttribute('data-another-hook')).toBe('another-value')
    expect(element.classList.contains('active')).toBe(true)
  })
  
  it('should pass the bound element to the hook function', () => {
    // Create a mock hook to verify parameters
    const mockHook = vi.fn()
    mockHook.mockReturnValue(() => {})
    Object.defineProperty(mockHook, 'name', { value: 'useTestMock' })
    
    // Register the mock hook
    registerChainableHook(mockHook)
    
    // Use the hook via the chain
    // @ts-ignore - Dynamic properties aren't typed
    withEl(element).useTestMock('param1', { key: 'value' })
    
    // Verify the element was passed as first parameter
    expect(mockHook).toHaveBeenCalledWith(element, 'param1', { key: 'value' })
  })
  
  it('should return the chain object for further chaining', () => {
    // Register the test hook
    registerChainableHook(useTestHook)
    
    // Create the chain and capture the result of calling the hook
    const chain = withEl(element)
    // @ts-ignore - Dynamic properties aren't typed
    const result = chain.useTestHook()
    
    // Verify the result is the chain object (chainable)
    expect(result).toBe(chain)
  })
}) 
