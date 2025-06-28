import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signal } from '../core/signal.js'
import { useEffect, withHookContext, runCleanupFunctions } from '../core/hookContext.js'

describe('Signal-based Effect Reactivity', () => {
  let container
  
  // Setup
  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })
  
  // Teardown
  afterEach(() => {
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })
  
  it('should run effect once initially', () => {
    const effectFn = vi.fn()
    const count = signal(0)
    
    withHookContext(container, () => {
      useEffect(effectFn, [count])
    })
    
    expect(effectFn).toHaveBeenCalledTimes(1)
  })
  
  it('should re-run effect when a signal dependency changes', () => {
    const effectFn = vi.fn()
    const count = signal(0)
    
    withHookContext(container, () => {
      useEffect(effectFn, [count])
    })
    
    // Initial run
    expect(effectFn).toHaveBeenCalledTimes(1)
    
    // Update signal value
    count.value = 1
    
    // Effect should run again
    expect(effectFn).toHaveBeenCalledTimes(2)
  })
  
  it('should not re-run effect when setting a signal to the same value', () => {
    const effectFn = vi.fn()
    const count = signal(0)
    
    withHookContext(container, () => {
      useEffect(effectFn, [count])
    })
    
    // Initial run
    expect(effectFn).toHaveBeenCalledTimes(1)
    
    // Update signal with the same value
    count.value = 0
    
    // Effect should NOT run again (still called only once)
    expect(effectFn).toHaveBeenCalledTimes(1)
  })
  
  it('should call teardown function before re-running the effect', () => {
    const teardownFn = vi.fn()
    const count = signal(0)
    
    withHookContext(container, () => {
      useEffect(() => {
        return teardownFn
      }, [count])
    })
    
    // No teardown should have been called yet
    expect(teardownFn).not.toHaveBeenCalled()
    
    // Update signal value
    count.value = 1
    
    // Teardown should be called before re-running the effect
    expect(teardownFn).toHaveBeenCalledTimes(1)
  })
  
  it('should unsubscribe from signals when element is removed', () => {
    const count = signal(0)
    const effectFn = vi.fn()
    
    withHookContext(container, () => {
      useEffect(effectFn, [count])
    })
    
    // Run cleanup on the element
    runCleanupFunctions(container)
    
    // Reset the spy to clear the initial call
    effectFn.mockClear()
    
    // Update signal value
    count.value = 1
    
    // Effect should NOT run again since we've unsubscribed
    expect(effectFn).not.toHaveBeenCalled()
  })
  
  it('should handle multiple signal dependencies', () => {
    const count = signal(0)
    const name = signal('test')
    const effectFn = vi.fn()
    
    withHookContext(container, () => {
      useEffect(effectFn, [count, name])
    })
    
    // Initial run
    expect(effectFn).toHaveBeenCalledTimes(1)
    
    // Update first signal value
    count.value = 1
    expect(effectFn).toHaveBeenCalledTimes(2)
    
    // Update second signal value
    name.value = 'updated'
    expect(effectFn).toHaveBeenCalledTimes(3)
  })
  
  it('should ignore non-signal dependencies', () => {
    const count = signal(0)
    const nonSignal = { value: 42 }
    const effectFn = vi.fn()
    
    withHookContext(container, () => {
      useEffect(effectFn, [count, nonSignal])
    })
    
    // Only signal changes should trigger effect re-runs
    expect(effectFn).toHaveBeenCalledTimes(1)
    
    // Update non-signal value (should not trigger effect)
    nonSignal.value = 100
    expect(effectFn).toHaveBeenCalledTimes(1)
    
    // Update signal value (should trigger effect)
    count.value = 1
    expect(effectFn).toHaveBeenCalledTimes(2)
  })
}) 
