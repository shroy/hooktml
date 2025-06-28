/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { injectComponentStyles } from '../core/styleInjection.js'
import * as configModule from '../core/config.js'
import { applyCloak } from '../core/componentLifecycle.js'

describe('Debug Warnings', () => {
  let element
  let consoleWarnSpy
  let consoleLogSpy
  
  beforeEach(() => {
    // Clear any existing style tags
    document.head.innerHTML = ''
    
    // Create a fresh element for each test
    element = document.createElement('div')
    document.body.appendChild(element)
    
    // Apply cloak to start with
    applyCloak(element)
    
    // Set up spies
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })
  
  afterEach(() => {
    // Clean up
    document.body.removeChild(element)
    vi.restoreAllMocks()
  })
  
  describe('Style Injection Warnings', () => {
    it('should warn about non-string styles when debug is enabled', () => {
      // Mock config to enable debug mode
      vi.spyOn(configModule, 'getConfig').mockReturnValue({
        componentSelectorMode: 'class',
        debug: true
      })
      
      // Create a mock component function
      const BadComponent = Object.assign(
        function BadComponent() {}, 
        { styles: { color: 'red' } }  // Object instead of string
      )
      
      // Test with invalid styles
      // @ts-expect-error - Testing with invalid styles property type
      injectComponentStyles(BadComponent, element)
      
      // Should warn about non-string styles
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Component "BadComponent" has non-string styles property'),
        BadComponent
      )
    })
    
    it('should not warn about non-string styles when debug is disabled', () => {
      // Mock config to disable debug mode
      vi.spyOn(configModule, 'getConfig').mockReturnValue({
        componentSelectorMode: 'class',
        debug: false
      })
      
      // Create a mock component function
      const BadComponent = Object.assign(
        function BadComponent() {}, 
        { styles: { color: 'red' } }  // Object instead of string
      )
      
      // Test with invalid styles
      // @ts-expect-error - Testing with invalid styles property type
      injectComponentStyles(BadComponent, element)
      
      // Should not warn when debug is disabled
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Component "BadComponent" has non-string styles property')
      )
    })
    
    it('should warn about duplicate style injections when debug is enabled', () => {
      // Mock config to enable debug mode
      vi.spyOn(configModule, 'getConfig').mockReturnValue({
        componentSelectorMode: 'class',
        debug: true
      })
      
      // Component with styles
      function DuplicateComponent() {}
      DuplicateComponent.styles = 'color: red;'
      
      // First injection should succeed without warnings
      injectComponentStyles(DuplicateComponent, element)
      
      // Reset spy to clearly see next call
      consoleWarnSpy.mockClear()
      
      // Second injection should warn about duplicate
      injectComponentStyles(DuplicateComponent, element)
      
      // Should warn about duplicate injection
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate style injection skipped for component "DuplicateComponent"'),
        element
      )
    })
    
    it('should not warn about duplicate style injections when debug is disabled', () => {
      // Mock config to disable debug mode
      vi.spyOn(configModule, 'getConfig').mockReturnValue({
        componentSelectorMode: 'class',
        debug: false
      })
      
      // Component with styles
      function DuplicateComponent() {}
      DuplicateComponent.styles = 'color: red;'
      
      // Inject twice
      injectComponentStyles(DuplicateComponent, element)
      injectComponentStyles(DuplicateComponent, element)
      
      // Should not warn when debug is disabled
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Duplicate style injection skipped')
      )
    })
    
    it('should log successful style injection when debug is enabled', () => {
      // Mock config to enable debug mode
      vi.spyOn(configModule, 'getConfig').mockReturnValue({
        componentSelectorMode: 'class',
        debug: true
      })
      
      // Component with styles
      function TestComponent() {}
      TestComponent.styles = 'color: blue;'
      
      // Inject styles
      injectComponentStyles(TestComponent, element)
      
      // Should log successful injection
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Injected styles for component "TestComponent"')
      )
    })
  })
}) 
