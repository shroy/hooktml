/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { applyCloak, removeCloak } from '../core/componentLifecycle.js'

describe('componentLifecycle', () => {
  describe('applyCloak', () => {
    it('should apply cloak attribute to element', () => {
      const element = document.createElement('div')
      applyCloak(element)
      expect(element.getAttribute('data-hooktml-cloak')).toBe('')
    })

    it('should throw error for non-element input', () => {
      // @ts-expect-error Testing invalid input
      expect(() => applyCloak(null)).toThrow('[HookTML] applyCloak requires an HTMLElement')
      // @ts-expect-error Testing invalid input
      expect(() => applyCloak(undefined)).toThrow('[HookTML] applyCloak requires an HTMLElement')
      // @ts-expect-error Testing invalid input
      expect(() => applyCloak('div')).toThrow('[HookTML] applyCloak requires an HTMLElement')
    })
  })

  describe('removeCloak', () => {
    it('should remove cloak attribute from element', () => {
      const element = document.createElement('div')
      
      // First apply the cloak
      applyCloak(element)
      expect(element.getAttribute('data-hooktml-cloak')).toBe('')
      
      // Then remove it
      removeCloak(element)
      expect(element.hasAttribute('data-hooktml-cloak')).toBe(false)
    })

    it('should not error if cloak attribute is not present', () => {
      const element = document.createElement('div')
      
      // No cloak applied
      expect(element.hasAttribute('data-hooktml-cloak')).toBe(false)
      
      // Should still work without error
      expect(() => removeCloak(element)).not.toThrow()
      expect(element.hasAttribute('data-hooktml-cloak')).toBe(false)
    })

    it('should throw error for non-element input', () => {
      // @ts-expect-error Testing invalid input
      expect(() => removeCloak(null)).toThrow('[HookTML] removeCloak requires an HTMLElement')
      // @ts-expect-error Testing invalid input
      expect(() => removeCloak(undefined)).toThrow('[HookTML] removeCloak requires an HTMLElement')
      // @ts-expect-error Testing invalid input
      expect(() => removeCloak('div')).toThrow('[HookTML] removeCloak requires an HTMLElement')
    })
  })
}) 
