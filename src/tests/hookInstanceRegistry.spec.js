import { describe, it, expect, beforeEach } from 'vitest'
import { getHookInstance, storeHookInstance, clearHookInstances, hasHookInstances } from '../core/hookInstanceRegistry.js'

describe('Hook Instance Registry', () => {
  let element

  beforeEach(() => {
    element = document.createElement('div')
  })

  it('should store and retrieve hook instances', () => {
    const hookName = 'useTest'
    const instance = { value: 42 }

    storeHookInstance(element, hookName, instance)
    const retrieved = getHookInstance(element, hookName)

    expect(retrieved).toBe(instance)
  })

  it('should handle multiple hooks per element', () => {
    const hook1 = 'useFirst'
    const hook2 = 'useSecond'
    const instance1 = { value: 1 }
    const instance2 = { value: 2 }

    storeHookInstance(element, hook1, instance1)
    storeHookInstance(element, hook2, instance2)

    expect(getHookInstance(element, hook1)).toBe(instance1)
    expect(getHookInstance(element, hook2)).toBe(instance2)
  })

  it('should clear all hook instances for an element', () => {
    const hook1 = 'useFirst'
    const hook2 = 'useSecond'
    
    storeHookInstance(element, hook1, { value: 1 })
    storeHookInstance(element, hook2, { value: 2 })
    
    clearHookInstances(element)

    expect(getHookInstance(element, hook1)).toBeUndefined()
    expect(getHookInstance(element, hook2)).toBeUndefined()
  })

  it('should correctly report if element has hook instances', () => {
    expect(hasHookInstances(element)).toBe(false)

    storeHookInstance(element, 'useTest', { value: 42 })
    expect(hasHookInstances(element)).toBe(true)

    clearHookInstances(element)
    expect(hasHookInstances(element)).toBe(false)
  })

  it('should handle invalid inputs gracefully', () => {
    // @ts-ignore - Testing invalid input
    expect(() => storeHookInstance(null, 'useTest', {})).not.toThrow()
    // @ts-ignore - Testing invalid input
    expect(getHookInstance(null, 'useTest')).toBeUndefined()
    // @ts-ignore - Testing invalid input
    expect(hasHookInstances(null)).toBe(false)
  })
}) 
