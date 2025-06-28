/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { StateManager } from '../core/stateManager.js'

describe('StateManager', () => {
  /** @type {StateManager} */
  let manager
  /** @type {HTMLElement} */
  let element

  beforeEach(() => {
    manager = new StateManager()
    element = document.createElement('div')
    document.body.appendChild(element)
  })

  afterEach(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element)
    }
  })

  it('should create an instance', () => {
    expect(manager).toBeInstanceOf(StateManager)
    expect(manager.stateRegistry).toBeInstanceOf(WeakMap)
  })

  describe('Component Initialization', () => {
    it('should mark element as initialized', () => {
      manager.markInitialized(element)
      expect(manager.isInitialized(element)).toBe(true)
    })

    it('should return false for uninitialized element', () => {
      expect(manager.isInitialized(element)).toBe(false)
    })

    it('should throw error for non-HTMLElement in markInitialized', () => {
      // @ts-expect-error Testing invalid input
      expect(() => manager.markInitialized(null))
        .toThrow('[HookTML] markInitialized requires an HTMLElement')
    })

    it('should return false for non-HTMLElement in isInitialized', () => {
      // @ts-expect-error Testing invalid input
      expect(manager.isInitialized(null)).toBe(false)
    })
  })

  describe('Directive Initialization', () => {
    it('should mark directive as initialized', () => {
      manager.markDirectiveInitialized(element, 'test-directive')
      expect(manager.isDirectiveInitialized(element, 'test-directive')).toBe(true)
    })

    it('should not duplicate directive initialization', () => {
      manager.markDirectiveInitialized(element, 'test-directive')
      manager.markDirectiveInitialized(element, 'test-directive')
      expect(manager.getInitializedDirectives(element)).toHaveLength(1)
    })

    it('should track multiple directives', () => {
      manager.markDirectiveInitialized(element, 'directive1')
      manager.markDirectiveInitialized(element, 'directive2')
      
      const directives = manager.getInitializedDirectives(element)
      expect(directives).toHaveLength(2)
      expect(directives).toContain('directive1')
      expect(directives).toContain('directive2')
    })

    it('should return false for uninitialized directive', () => {
      expect(manager.isDirectiveInitialized(element, 'test-directive')).toBe(false)
    })

    it('should throw error for non-HTMLElement in markDirectiveInitialized', () => {
      // @ts-expect-error Testing invalid input
      expect(() => manager.markDirectiveInitialized(null, 'test-directive'))
        .toThrow('[HookTML] markDirectiveInitialized requires an HTMLElement')
    })

    it('should throw error for missing directive name', () => {
      // @ts-expect-error Testing invalid input
      expect(() => manager.markDirectiveInitialized(element, null))
        .toThrow('[HookTML] directiveName is required')
    })

    it('should return false for non-HTMLElement in isDirectiveInitialized', () => {
      // @ts-expect-error Testing invalid input
      expect(manager.isDirectiveInitialized(null, 'test-directive')).toBe(false)
    })

    it('should return empty array for non-HTMLElement in getInitializedDirectives', () => {
      // @ts-expect-error Testing invalid input
      expect(manager.getInitializedDirectives(null)).toEqual([])
    })
  })

  describe('State Cleanup', () => {
    it('should clear all state for an element', () => {
      manager.markInitialized(element)
      manager.markDirectiveInitialized(element, 'test-directive')
      
      manager.clearState(element)
      
      expect(manager.isInitialized(element)).toBe(false)
      expect(manager.isDirectiveInitialized(element, 'test-directive')).toBe(false)
      expect(manager.getInitializedDirectives(element)).toEqual([])
    })

    it('should handle clearing state for non-HTMLElement', () => {
      // @ts-expect-error Testing invalid input
      expect(() => manager.clearState(null)).not.toThrow()
    })

    it('should handle clearing state for element with no state', () => {
      expect(() => manager.clearState(element)).not.toThrow()
    })
  })
}) 
