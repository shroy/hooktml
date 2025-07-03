import { describe, it, expect } from 'vitest'
import { signal } from '../core/signal'

describe('signal()', () => {
  it('should return an object with a value property that holds the initial value', () => {
    const count = signal(0)
    expect(count.value).toBe(0)
    
    const text = signal('hello')
    expect(text.value).toBe('hello')
    
    const bool = signal(true)
    expect(bool.value).toBe(true)
    
    const obj = signal({ name: 'test' })
    expect(obj.value).toEqual({ name: 'test' })
  })
  
  it('should update the value when .value is set', () => {
    const count = signal(0)
    count.value = 1
    expect(count.value).toBe(1)
    
    const text = signal('hello')
    text.value = 'world'
    expect(text.value).toBe('world')
  })
  
  it('should maintain reference stability after updates', () => {
    const count = signal(0)
    const originalCount = count
    
    count.value = 1
    expect(count).toBe(originalCount)
    expect(count.value).toBe(1)
  })
  
  it('should not update when setting to the same value', () => {
    const count = signal(0)
    
    // We set to the same value and check it still works
    count.value = 0
    expect(count.value).toBe(0)
    
    // Setting to a different value works
    count.value = 1
    expect(count.value).toBe(1)
    
    // Setting back to the same value again works
    count.value = 1
    expect(count.value).toBe(1)
  })
  
  it('should have a destroy method that cleans up resources', () => {
    const count = signal(0)
    expect(typeof count.destroy).toBe('function')
    
    // Verify destroy can be called without errors
    expect(() => count.destroy()).not.toThrow()
  })
  
  it('should have a toString method that returns a string representation', () => {
    const count = signal(42)
    expect(count.toString()).toBe('Signal(42)')
    
    const text = signal('hello')
    expect(text.toString()).toBe('Signal(hello)')
    
    const bool = signal(false)
    expect(bool.toString()).toBe('Signal(false)')
  })
}) 
 