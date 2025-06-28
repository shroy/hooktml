import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { signal } from '../core/signal.js'
import { getHookInstance } from '../core/hookInstanceRegistry.js'
import { registerHook, clearHookRegistry } from '../core/hookRegistry.js'
import { processElementHooks } from '../core/scanDirectives.js'
import { createObserver } from '../core/observer.js'

describe('Hook Preservation', () => {
  let element
  let mockHook
  let signalValue = 0
  let observer

  beforeEach(() => {
    // Clear hook registry before each test
    clearHookRegistry()

    // Create test element
    element = document.createElement('div')
    document.body.appendChild(element)

    // Create a mock hook that uses a signal
    mockHook = vi.fn(function useTest() {
      const sig = signal(signalValue)
      return {
        value: () => sig.value,
        setValue: (v) => sig.value = v,
        initialValue: signalValue
      }
    })

    // Register the mock hook
    registerHook(mockHook)

    // Add hook attribute to element
    element.setAttribute('use-test', '')

    // Start observer
    observer = createObserver()
    observer.start()

    // Process hooks
    processElementHooks(element)
  })

  afterEach(() => {
    // Stop observer
    observer.stop()

    // Clean up test element
    element.remove()
  })

  it('should preserve hook state across attribute changes', () => {
    // Get the initial instance
    const instance = getHookInstance(element, 'useTest')
    expect(instance).toBeDefined()
    expect(instance.value()).toBe(0)

    // Modify the signal value
    instance.setValue(42)
    expect(instance.value()).toBe(42)

    // Change the attribute value
    element.setAttribute('use-test', 'new-value')

    // Re-process hooks - should preserve state
    processElementHooks(element)

    // Verify state is preserved
    const sameInstance = getHookInstance(element, 'useTest')
    expect(sameInstance).toBeDefined()
    expect(sameInstance.value()).toBe(42)
  })

  it('should preserve hook state when hook attribute value changes', () => {
    // Get the initial instance
    const instance = getHookInstance(element, 'useTest')
    instance.setValue(42)

    // Change the attribute value
    element.setAttribute('use-test', 'different-value')

    // Re-process hooks - should preserve state
    processElementHooks(element)

    // Verify state is preserved
    const sameInstance = getHookInstance(element, 'useTest')
    expect(sameInstance.value()).toBe(42)
  })

  it('should handle multiple hooks with preserved state', () => {
    // Create and register second hook
    const mockHook2 = vi.fn(function useTest2() {
      const sig = signal(100)
      return {
        value: () => sig.value,
        setValue: (v) => sig.value = v,
        initialValue: 100
      }
    })
    registerHook(mockHook2)

    // Add second hook attribute
    element.setAttribute('use-test2', '')

    // Process hooks
    processElementHooks(element)

    // Get both instances
    const instance1 = getHookInstance(element, 'useTest')
    const instance2 = getHookInstance(element, 'useTest2')

    // Modify both states
    instance1.setValue(42)
    instance2.setValue(200)

    // Change both attribute values
    element.setAttribute('use-test', 'new-value1')
    element.setAttribute('use-test2', 'new-value2')

    // Re-process hooks - should preserve state
    processElementHooks(element)

    // Verify both states are preserved
    const sameInstance1 = getHookInstance(element, 'useTest')
    const sameInstance2 = getHookInstance(element, 'useTest2')
    expect(sameInstance1.value()).toBe(42)
    expect(sameInstance2.value()).toBe(200)
  })

  it('should clean up hook instances when element is removed', async () => {
    // Get the initial instance
    const instance = getHookInstance(element, 'useTest')
    expect(instance).toBeDefined()

    // Remove element
    element.remove()

    // Wait for observer to process the removal
    await new Promise(resolve => setTimeout(resolve, 0))

    // Instance should be cleaned up by observer
    expect(getHookInstance(element, 'useTest')).toBeUndefined()
  })
}) 
