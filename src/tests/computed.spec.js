/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { computed } from '../core/computed.js'
import { signal } from '../core/signal.js'

describe('computed', () => {
  let cleanup

  beforeEach(() => {
    cleanup = []
  })

  afterEach(() => {
    cleanup.forEach(fn => fn?.())
    cleanup = []
  })

  it('should create a computed signal', () => {
    const baseSignal = signal(10)
    const doubled = computed(() => baseSignal.value * 2)
    
    expect(doubled.value).toBe(20)
    
    cleanup.push(() => {
      baseSignal.destroy()
      doubled.destroy()
    })
  })

  it('should update when dependencies change', () => {
    const baseSignal = signal(5)
    const doubled = computed(() => baseSignal.value * 2)
    
    expect(doubled.value).toBe(10)
    
    baseSignal.value = 10
    expect(doubled.value).toBe(20)
    
    cleanup.push(() => {
      baseSignal.destroy()
      doubled.destroy()
    })
  })

  it('should handle multiple dependencies', () => {
    const a = signal(2)
    const b = signal(3)
    const sum = computed(() => a.value + b.value)
    
    expect(sum.value).toBe(5)
    
    a.value = 5
    expect(sum.value).toBe(8)
    
    b.value = 7
    expect(sum.value).toBe(12)
    
    cleanup.push(() => {
      a.destroy()
      b.destroy()
      sum.destroy()
    })
  })

  it('should be read-only', () => {
    const baseSignal = signal(10)
    const doubled = computed(() => baseSignal.value * 2)
    
    expect(() => {
      doubled.value = 100
    }).toThrow('[HookTML] Cannot assign to computed signal. Computed signals are read-only.')
    
    cleanup.push(() => {
      baseSignal.destroy()
      doubled.destroy()
    })
  })

  it('should support subscription to changes', async () => {
    const baseSignal = signal(1)
    const doubled = computed(() => baseSignal.value * 2)
    
    const values = []
    const unsubscribe = doubled.subscribe(value => values.push(value))
    
    expect(doubled.value).toBe(2)
    
    baseSignal.value = 3
    
    // Wait for microtask to complete
    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)))
    
    expect(values).toContain(6)
    
    cleanup.push(() => {
      unsubscribe()
      baseSignal.destroy()
      doubled.destroy()
    })
  })

  it('should detect circular dependencies', () => {
    const a = signal(1)
    const b = computed(() => c.value + 1)
    const c = computed(() => b.value + 1)
    
    expect(() => {
      b.value // This should trigger the circular dependency detection
    }).toThrow('[HookTML] Circular dependency detected in computed signal')
    
    cleanup.push(() => {
      a.destroy()
      b.destroy()
      c.destroy()
    })
  })

  it('should handle errors in compute functions', () => {
    const baseSignal = signal(10)
    const errorComputed = computed(() => {
      if (baseSignal.value > 5) {
        throw new Error('Value too high')
      }
      return baseSignal.value
    })
    
    expect(() => {
      errorComputed.value
    }).toThrow('Value too high')
    
    cleanup.push(() => {
      baseSignal.destroy()
      errorComputed.destroy()
    })
  })

  it('should implement lazy evaluation', () => {
    let computeCount = 0
    const baseSignal = signal(1)
    const lazy = computed(() => {
      computeCount++
      return baseSignal.value * 2
    })
    
    // Should not compute until accessed
    expect(computeCount).toBe(0)
    
    // First access
    expect(lazy.value).toBe(2)
    expect(computeCount).toBe(1)
    
    // Second access should use cached value
    expect(lazy.value).toBe(2)
    expect(computeCount).toBe(1)
    
    // Only compute when dependency changes
    baseSignal.value = 3
    expect(lazy.value).toBe(6)
    expect(computeCount).toBe(2)
    
    cleanup.push(() => {
      baseSignal.destroy()
      lazy.destroy()
    })
  })
}) 
