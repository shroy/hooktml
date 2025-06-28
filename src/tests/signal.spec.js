import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { signal } from '../core/signal.js'

describe('signal', () => {
  let cleanup

  beforeEach(() => {
    cleanup = []
  })

  afterEach(() => {
    cleanup.forEach(fn => fn?.())
    cleanup = []
  })

  it('should create a signal with initial value', () => {
    const s = signal(42)
    expect(s.value).toBe(42)
    
    cleanup.push(() => s.destroy())
  })

  it('should update signal value', () => {
    const s = signal(10)
    expect(s.value).toBe(10)
    
    s.value = 20
    expect(s.value).toBe(20)
    
    cleanup.push(() => s.destroy())
  })

  it('should notify subscribers when value changes', () => {
    const s = signal(1)
    const values = []
    
    const unsubscribe = s.subscribe(value => values.push(value))
    
    s.value = 2
    s.value = 3
    
    expect(values).toEqual([2, 3])
    
    cleanup.push(() => {
      unsubscribe()
      s.destroy()
    })
  })

  it('should not notify when setting to same value', () => {
    const s = signal(5)
    const values = []
    
    const unsubscribe = s.subscribe(value => values.push(value))
    
    s.value = 5
    s.value = 5
    
    expect(values).toEqual([])
    
    cleanup.push(() => {
      unsubscribe()
      s.destroy()
    })
  })

  it('should allow multiple subscribers', () => {
    const s = signal(1)
    const values1 = []
    const values2 = []
    
    const unsubscribe1 = s.subscribe(value => values1.push(value))
    const unsubscribe2 = s.subscribe(value => values2.push(value))
    
    s.value = 10
    
    expect(values1).toEqual([10])
    expect(values2).toEqual([10])
    
    cleanup.push(() => {
      unsubscribe1()
      unsubscribe2()
      s.destroy()
    })
  })

  it('should unsubscribe correctly', () => {
    const s = signal(1)
    const values = []
    
    const unsubscribe = s.subscribe(value => values.push(value))
    
    s.value = 2
    unsubscribe()
    s.value = 3
    
    expect(values).toEqual([2])
    
    cleanup.push(() => s.destroy())
  })
}) 
 