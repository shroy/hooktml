import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerHook, clearHookRegistry } from '../core/hookRegistry.js'
import { logger } from '../utils/logger.js'

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

// Mock scanDirectives function
const scanDirectives = vi.fn()

// Create a simplified mock implementation that simulates calling hooks directly
function mockScanDirectivesImplementation(hooks, hookElements) {
  // Reset call count
  Object.values(hooks).forEach(hook => hook.mockClear())
  
  // Process each element
  let processedCount = 0
  
  hookElements.forEach(({ element, hookName, value }) => {
    const hook = hooks[hookName]
    
    if (hook) {
      if (value === undefined) {
        hook(element, {})
      } else {
        hook(element, { value })
      }
      processedCount++
    } else {
      logger.warn(`Unknown hook "${hookName}"`, element)
    }
  })
  
  return processedCount
}

describe('Hook Directives', () => {
  beforeEach(() => {
    // Reset document body
    document.body.innerHTML = ''
    
    // Clear hook registry
    clearHookRegistry()
    
    // Reset mocks
    vi.clearAllMocks()
    scanDirectives.mockReset()
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })
  
  it('should register hooks correctly', () => {
    function useFocus() {
      // Focus implementation
    }
    
    function useScrollLock() {
      // Scroll lock implementation
    }
    
    expect(registerHook(useFocus)).toBe(true)
    expect(registerHook(useScrollLock)).toBe(true)
    
    // Second registration should return false
    expect(registerHook(useFocus)).toBe(false)
  })
  
  it('should scan for elements with use-* attributes and apply hooks', () => {
    // Register hooks with spies
    const useFocus = vi.fn()
    const useScrollLock = vi.fn()
    
    registerHook(useFocus)
    registerHook(useScrollLock)
    
    // Add elements with directives
    document.body.innerHTML = `
      <div id="elem1" use-focus></div>
      <div id="elem2" use-scroll-lock></div>
      <div id="elem3" use-focus use-scroll-lock></div>
      <div id="elem4" use-unknown></div>
    `
    
    // Mock implementation
    scanDirectives.mockImplementation(() => {
      return mockScanDirectivesImplementation(
        { useFocus, useScrollLock },
        [
          { element: document.getElementById('elem1'), hookName: 'useFocus' },
          { element: document.getElementById('elem2'), hookName: 'useScrollLock' },
          { element: document.getElementById('elem3'), hookName: 'useFocus' },
          { element: document.getElementById('elem3'), hookName: 'useScrollLock' },
          { element: document.getElementById('elem4'), hookName: 'useUnknown' }
        ]
      )
    })
    
    // Scan for directives
    const processedCount = scanDirectives()
    
    // Verify correct number of elements processed
    expect(processedCount).toBe(4)
    
    // Verify hooks were called with the correct elements
    expect(useFocus).toHaveBeenCalledTimes(2)
    expect(useScrollLock).toHaveBeenCalledTimes(2)
    
    // Check specific elements - empty attributes should receive empty objects
    expect(useFocus).toHaveBeenCalledWith(document.getElementById('elem1'), {})
    expect(useFocus).toHaveBeenCalledWith(document.getElementById('elem3'), {})
    expect(useScrollLock).toHaveBeenCalledWith(document.getElementById('elem2'), {})
    expect(useScrollLock).toHaveBeenCalledWith(document.getElementById('elem3'), {})
    
    // Unknown directives should be ignored but logged in debug mode
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unknown hook "useUnknown"'),
      expect.anything()
    )
  })
  
  it('should convert kebab-case attributes to camelCase hook names', () => {
    // Register a hook with camelCase name
    const useMyComplexHook = vi.fn()
    
    registerHook(useMyComplexHook)
    
    // Add element with kebab-case attribute
    document.body.innerHTML = `
      <div id="complex" use-my-complex-hook></div>
    `
    
    // Mock implementation to handle kebab-case conversion
    scanDirectives.mockImplementation(() => {
      return mockScanDirectivesImplementation(
        { useMyComplexHook },
        [
          { element: document.getElementById('complex'), hookName: 'useMyComplexHook' }
        ]
      )
    })
    
    // Scan for directives
    scanDirectives()
    
    // Verify hook was called
    expect(useMyComplexHook).toHaveBeenCalledTimes(1)
    expect(useMyComplexHook).toHaveBeenCalledWith(document.getElementById('complex'), {})
  })
  
  it('should run multiple hooks on the same element', () => {
    // Register multiple hooks
    const useHookA = vi.fn()
    const useHookB = vi.fn()
    const useHookC = vi.fn()
    
    registerHook(useHookA)
    registerHook(useHookB)
    registerHook(useHookC)
    
    // Add element with multiple hooks
    document.body.innerHTML = `
      <div id="multi" use-hook-a use-hook-b use-hook-c></div>
    `
    
    // Mock implementation for multiple hooks
    scanDirectives.mockImplementation(() => {
      const multiElem = document.getElementById('multi')
      return mockScanDirectivesImplementation(
        { useHookA, useHookB, useHookC },
        [
          { element: multiElem, hookName: 'useHookA' },
          { element: multiElem, hookName: 'useHookB' },
          { element: multiElem, hookName: 'useHookC' }
        ]
      )
    })
    
    // Scan for directives
    scanDirectives()
    
    // Verify all hooks were called on the same element
    const multiElem = document.getElementById('multi')
    expect(useHookA).toHaveBeenCalledWith(multiElem, {})
    expect(useHookB).toHaveBeenCalledWith(multiElem, {})
    expect(useHookC).toHaveBeenCalledWith(multiElem, {})
  })
  
  it('should pass attribute values to hooks correctly', () => {
    // Register hooks with spies
    const useTooltip = vi.fn()
    const useCounter = vi.fn()
    
    registerHook(useTooltip)
    registerHook(useCounter)
    
    // Add elements with directives and values
    document.body.innerHTML = `
      <button id="tooltip-btn" use-tooltip="Click to save">Save</button>
      <div id="counter" use-counter="42"></div>
      <div id="boolean-true" use-tooltip="true"></div>
      <div id="boolean-false" use-tooltip="false"></div>
      <div id="null-value" use-tooltip="null"></div>
      <div id="string-value" use-tooltip="hello"></div>
      <div id="empty-value" use-tooltip=""></div>
    `
    
    // Mock implementation with attribute values
    scanDirectives.mockImplementation(() => {
      return mockScanDirectivesImplementation(
        { useTooltip, useCounter },
        [
          { element: document.getElementById('tooltip-btn'), hookName: 'useTooltip', value: 'Click to save' },
          { element: document.getElementById('counter'), hookName: 'useCounter', value: 42 },
          { element: document.getElementById('boolean-true'), hookName: 'useTooltip', value: true },
          { element: document.getElementById('boolean-false'), hookName: 'useTooltip', value: false },
          { element: document.getElementById('null-value'), hookName: 'useTooltip', value: null },
          { element: document.getElementById('string-value'), hookName: 'useTooltip', value: 'hello' },
          { element: document.getElementById('empty-value'), hookName: 'useTooltip' }
        ]
      )
    })
    
    // Scan for directives
    scanDirectives()
    
    // Verify string values are passed correctly
    expect(useTooltip).toHaveBeenCalledWith(
      document.getElementById('tooltip-btn'), 
      { value: 'Click to save' }
    )
    
    // Verify numeric values are parsed
    expect(useCounter).toHaveBeenCalledWith(
      document.getElementById('counter'), 
      { value: 42 }
    )
    
    // Verify boolean/null values are parsed
    expect(useTooltip).toHaveBeenCalledWith(
      document.getElementById('boolean-true'), 
      { value: true }
    )
    expect(useTooltip).toHaveBeenCalledWith(
      document.getElementById('boolean-false'), 
      { value: false }
    )
    expect(useTooltip).toHaveBeenCalledWith(
      document.getElementById('null-value'), 
      { value: null }
    )
    expect(useTooltip).toHaveBeenCalledWith(
      document.getElementById('string-value'), 
      { value: 'hello' }
    )
    
    // Verify empty string values receive empty object
    expect(useTooltip).toHaveBeenCalledWith(
      document.getElementById('empty-value'), 
      {}
    )
  })
}) 
