/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LifecycleManager } from '../core/lifecycleManager.js'

describe('LifecycleManager', () => {
  let manager
  let element

  beforeEach(() => {
    manager = new LifecycleManager()
    element = document.createElement('div')
    document.body.appendChild(element)
  })

  afterEach(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element)
    }
  })

  it('should create an instance', () => {
    expect(manager).toBeInstanceOf(LifecycleManager)
    expect(manager.teardownRegistry).toBeInstanceOf(WeakMap)
  })

  describe('Component Registration', () => {
    it('should register a component teardown function', () => {
      const teardown = vi.fn()
      const result = manager.registerComponent(element, teardown)
      expect(result).toBe(true)
      expect(manager.hasRegistration(element)).toBe(true)
    })

    it('should ignore non-function teardowns for components', () => {
      const teardown = /** @ts-expect-error Testing invalid input */ 'not a function'
      const result = manager.registerComponent(element, teardown)
      expect(result).toBe(false)
      expect(manager.hasRegistration(element)).toBe(false)
    })

    it('should throw error for non-HTMLElement in component registration', () => {
      const teardown = vi.fn()
      // @ts-expect-error Testing invalid input
      expect(() => manager.registerComponent(null, teardown))
        .toThrow('[HookTML] registerComponent requires an HTMLElement')
    })
  })

  describe('Directive Registration', () => {
    it('should register a directive teardown function', () => {
      const teardown = vi.fn()
      const result = manager.registerDirective(element, teardown, 'test-directive')
      expect(result).toBe(true)
      expect(manager.hasRegistration(element)).toBe(true)
    })

    it('should accumulate multiple directive teardowns', () => {
      const teardown1 = vi.fn()
      const teardown2 = vi.fn()
      
      const result1 = manager.registerDirective(element, teardown1, 'directive1')
      const result2 = manager.registerDirective(element, teardown2, 'directive2')
      
      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(manager.hasRegistration(element)).toBe(true)
      
      const teardowns = manager.getDirectiveTeardowns(element)
      expect(teardowns).toHaveLength(2)
      expect(teardowns).toContain(teardown1)
      expect(teardowns).toContain(teardown2)
    })

    it('should ignore non-function teardowns for directives', () => {
      const teardown = /** @ts-expect-error Testing invalid input */ 'not a function'
      const result = manager.registerDirective(element, teardown, 'test-directive')
      expect(result).toBe(false)
      expect(manager.hasRegistration(element)).toBe(false)
    })

    it('should throw error for non-HTMLElement in directive registration', () => {
      const teardown = vi.fn()
      // @ts-expect-error Testing invalid input
      expect(() => manager.registerDirective(null, teardown, 'test-directive'))
        .toThrow('[HookTML] registerDirective requires an HTMLElement')
    })
  })

  describe('Teardown Retrieval', () => {
    it('should retrieve component teardown', () => {
      const teardown = vi.fn()
      manager.registerComponent(element, teardown)
      
      const retrieved = manager.getComponentTeardown(element)
      expect(retrieved).toBe(teardown)
    })

    it('should return undefined for non-existent component teardown', () => {
      const retrieved = manager.getComponentTeardown(element)
      expect(retrieved).toBeUndefined()
    })

    it('should retrieve directive teardowns', () => {
      const teardown1 = vi.fn()
      const teardown2 = vi.fn()
      
      manager.registerDirective(element, teardown1, 'directive1')
      manager.registerDirective(element, teardown2, 'directive2')
      
      const teardowns = manager.getDirectiveTeardowns(element)
      expect(teardowns).toHaveLength(2)
      expect(teardowns).toContain(teardown1)
      expect(teardowns).toContain(teardown2)
    })

    it('should return empty array for non-existent directive teardowns', () => {
      const teardowns = manager.getDirectiveTeardowns(element)
      expect(teardowns).toEqual([])
    })

    it('should throw error for non-HTMLElement in component teardown retrieval', () => {
      // @ts-expect-error Testing invalid input
      expect(() => manager.getComponentTeardown(null))
        .toThrow('[HookTML] getComponentTeardown requires an HTMLElement')
    })

    it('should throw error for non-HTMLElement in directive teardown retrieval', () => {
      // @ts-expect-error Testing invalid input
      expect(() => manager.getDirectiveTeardowns(null))
        .toThrow('[HookTML] getDirectiveTeardowns requires an HTMLElement')
    })

    it('should get all teardowns for an element', () => {
      const componentTeardown = vi.fn()
      const directiveTeardown = vi.fn()
      
      manager.registerComponent(element, componentTeardown)
      manager.registerDirective(element, directiveTeardown, 'directive1')
      
      const allTeardowns = manager.getTeardowns(element)
      expect(allTeardowns.component).toBe(componentTeardown)
      expect(allTeardowns.directives).toHaveLength(1)
      expect(allTeardowns.directives[0]).toBe(directiveTeardown)
    })

    it('should return empty results for element with no teardowns', () => {
      const allTeardowns = manager.getTeardowns(element)
      expect(allTeardowns.component).toBeUndefined()
      expect(allTeardowns.directives).toEqual([])
    })
  })

  describe('Registration Status', () => {
    it('should report no registration for unregistered elements', () => {
      expect(manager.hasRegistration(element)).toBe(false)
    })

    it('should report registration for component teardowns', () => {
      manager.registerComponent(element, vi.fn())
      expect(manager.hasRegistration(element)).toBe(true)
    })

    it('should report registration for directive teardowns', () => {
      manager.registerDirective(element, vi.fn(), 'test-directive')
      expect(manager.hasRegistration(element)).toBe(true)
    })

    it('should report registration status correctly for empty directive arrays', () => {
      // Manually set an empty registration with no teardowns
      manager.teardownRegistry.set(element, { component: undefined, directives: [] })
      expect(manager.hasRegistration(element)).toBe(false)
    })

    it('should handle non-HTMLElement in registration check', () => {
      // @ts-expect-error Testing invalid input
      expect(manager.hasRegistration(null)).toBe(false)
    })
  })

  describe('Teardown Execution', () => {
    it('should execute component teardown successfully', () => {
      const teardown = vi.fn()
      manager.registerComponent(element, teardown)
      
      const result = manager.executeComponentTeardown(element)
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(teardown).toHaveBeenCalledTimes(1)
    })

    it('should handle component teardown errors', () => {
      const error = new Error('Teardown failed')
      const teardown = vi.fn().mockImplementation(() => {
        throw error
      })
      manager.registerComponent(element, teardown)
      
      const result = manager.executeComponentTeardown(element)
      expect(result.success).toBe(false)
      expect(result.error).toBe(error)
      expect(teardown).toHaveBeenCalledTimes(1)
    })

    it('should return success false for non-existent component teardown', () => {
      const result = manager.executeComponentTeardown(element)
      expect(result.success).toBe(false)
      expect(result.error).toBeUndefined()
    })

    it('should execute all directive teardowns successfully', () => {
      const teardown1 = vi.fn()
      const teardown2 = vi.fn()
      manager.registerDirective(element, teardown1, 'directive1')
      manager.registerDirective(element, teardown2, 'directive2')
      
      const results = manager.executeDirectiveTeardowns(element)
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
      expect(teardown1).toHaveBeenCalledTimes(1)
      expect(teardown2).toHaveBeenCalledTimes(1)
    })

    it('should handle directive teardown errors', () => {
      const error = new Error('Directive teardown failed')
      const teardown1 = vi.fn()
      const teardown2 = vi.fn().mockImplementation(() => {
        throw error
      })
      manager.registerDirective(element, teardown1, 'directive1')
      manager.registerDirective(element, teardown2, 'directive2')
      
      const results = manager.executeDirectiveTeardowns(element)
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error).toBe(error)
      expect(teardown1).toHaveBeenCalledTimes(1)
      expect(teardown2).toHaveBeenCalledTimes(1)
    })

    it('should return empty array for non-existent directive teardowns', () => {
      const results = manager.executeDirectiveTeardowns(element)
      expect(results).toEqual([])
    })

    it('should execute all teardowns for an element', () => {
      const componentTeardown = vi.fn()
      const directiveTeardown1 = vi.fn()
      const directiveTeardown2 = vi.fn()
      
      manager.registerComponent(element, componentTeardown)
      manager.registerDirective(element, directiveTeardown1, 'directive1')
      manager.registerDirective(element, directiveTeardown2, 'directive2')
      
      const result = manager.executeAllTeardowns(element)
      
      expect(result.component.success).toBe(true)
      expect(result.directives).toHaveLength(2)
      expect(result.directives[0].success).toBe(true)
      expect(result.directives[1].success).toBe(true)
      
      expect(componentTeardown).toHaveBeenCalledTimes(1)
      expect(directiveTeardown1).toHaveBeenCalledTimes(1)
      expect(directiveTeardown2).toHaveBeenCalledTimes(1)
    })

    it('should handle mixed success and failure in all teardowns', () => {
      const componentError = new Error('Component failed')
      const directiveError = new Error('Directive failed')
      
      const componentTeardown = vi.fn().mockImplementation(() => {
        throw componentError
      })
      const directiveTeardown1 = vi.fn()
      const directiveTeardown2 = vi.fn().mockImplementation(() => {
        throw directiveError
      })
      
      manager.registerComponent(element, componentTeardown)
      manager.registerDirective(element, directiveTeardown1, 'directive1')
      manager.registerDirective(element, directiveTeardown2, 'directive2')
      
      const result = manager.executeAllTeardowns(element)
      
      expect(result.component.success).toBe(false)
      expect(result.component.error).toBe(componentError)
      expect(result.directives).toHaveLength(2)
      expect(result.directives[0].success).toBe(true)
      expect(result.directives[1].success).toBe(false)
      expect(result.directives[1].error).toBe(directiveError)
      
      expect(componentTeardown).toHaveBeenCalledTimes(1)
      expect(directiveTeardown1).toHaveBeenCalledTimes(1)
      expect(directiveTeardown2).toHaveBeenCalledTimes(1)
    })

    it('should return appropriate structure for element with no teardowns', () => {
      const result = manager.executeAllTeardowns(element)
      
      expect(result.component.success).toBe(false)
      expect(result.component.error).toBeUndefined()
      expect(result.directives).toEqual([])
    })
  })

  describe('Cleanup', () => {
    it('should clear component registration', () => {
      const teardown = vi.fn()
      manager.registerComponent(element, teardown)
      expect(manager.hasRegistration(element)).toBe(true)
      
      manager.clearComponentRegistration(element)
      expect(manager.hasRegistration(element)).toBe(false)
      expect(manager.getComponentTeardown(element)).toBeUndefined()
    })

    it('should clear directive registrations', () => {
      const teardown1 = vi.fn()
      const teardown2 = vi.fn()
      manager.registerDirective(element, teardown1, 'directive1')
      manager.registerDirective(element, teardown2, 'directive2')
      expect(manager.hasRegistration(element)).toBe(true)
      
      manager.clearDirectiveRegistrations(element)
      expect(manager.hasRegistration(element)).toBe(false)
      expect(manager.getDirectiveTeardowns(element)).toEqual([])
    })

    it('should clear all registrations for an element', () => {
      const componentTeardown = vi.fn()
      const directiveTeardown = vi.fn()
      
      manager.registerComponent(element, componentTeardown)
      manager.registerDirective(element, directiveTeardown, 'directive1')
      expect(manager.hasRegistration(element)).toBe(true)

      manager.clearAllRegistrations(element)
      expect(manager.hasRegistration(element)).toBe(false)
      expect(manager.getComponentTeardown(element)).toBeUndefined()
      expect(manager.getDirectiveTeardowns(element)).toEqual([])
    })

    it('should handle clearing non-existent registrations gracefully', () => {
      expect(manager.hasRegistration(element)).toBe(false)
      
      // These should not throw errors
      manager.clearComponentRegistration(element)
      manager.clearDirectiveRegistrations(element)
      manager.clearAllRegistrations(element)
      
      expect(manager.hasRegistration(element)).toBe(false)
    })
  })
}) 
 