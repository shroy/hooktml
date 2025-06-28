import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { registerHook, clearHookRegistry } from '../core/hookRegistry.js'
import { signal } from '../core/signal.js'
import { getHookInstance } from '../core/hookInstanceRegistry.js'
import { processElementHooks } from '../core/scanDirectives.js'
import { createObserver } from '../core/observer.js'

describe('Component Hook Preservation', () => {
  let element
  let mockHook
  let signalValue = 0
  let observer

  beforeEach(() => {
    clearHookRegistry()

    element = document.createElement('div')
    document.body.appendChild(element)

    mockHook = vi.fn(function useTest() {
      const sig = signal(signalValue)
      return {
        value: () => sig.value,
        setValue: (v) => sig.value = v,
        initialValue: signalValue
      }
    })

    registerHook(mockHook)
    element.setAttribute('use-test', '')

    observer = createObserver()
    observer.start()
    processElementHooks(element)
  })

  afterEach(() => {
    observer.stop()
    element.remove()
  })

  it('should preserve hook state in component instances', () => {
    const hookInstance = getHookInstance(element, 'useTest')
    expect(hookInstance).toBeDefined()
    expect(hookInstance.value()).toBe(0)

    hookInstance.setValue(42)
    expect(hookInstance.value()).toBe(42)

    // Re-process hooks - should preserve state
    processElementHooks(element)

    // Verify state is preserved
    const sameInstance = getHookInstance(element, 'useTest')
    expect(sameInstance).toBeDefined()
    expect(sameInstance.value()).toBe(42)
  })

  it('should preserve hook state across multiple component instances', () => {
    const element2 = document.createElement('div')
    document.body.appendChild(element2)

    element2.setAttribute('use-test', '')
    element2.setAttribute('use-test2', '')

    const mockHook2 = vi.fn(function useTest2() {
      const sig = signal(100)
      return {
        value: () => sig.value,
        setValue: (v) => sig.value = v,
        initialValue: 100
      }
    })
    registerHook(mockHook2)

    processElementHooks(element)
    processElementHooks(element2)

    const instance1Hook1 = getHookInstance(element, 'useTest')
    const instance2Hook1 = getHookInstance(element2, 'useTest')
    const instance2Hook2 = getHookInstance(element2, 'useTest2')

    instance1Hook1.setValue(42)
    instance2Hook1.setValue(84)
    instance2Hook2.setValue(200)

    // Re-process hooks - should preserve state
    processElementHooks(element)
    processElementHooks(element2)

    // Verify states are preserved
    expect(getHookInstance(element, 'useTest').value()).toBe(42)
    expect(getHookInstance(element2, 'useTest').value()).toBe(84)
    expect(getHookInstance(element2, 'useTest2').value()).toBe(200)

    element2.remove()
  })

  it('should clean up hook instances when component is removed', async () => {
    expect(getHookInstance(element, 'useTest')).toBeDefined()

    element.remove()

    // Wait for observer to process the removal
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(getHookInstance(element, 'useTest')).toBeUndefined()
  })

  it('should preserve hook state during component updates', () => {
    const hookInstance = getHookInstance(element, 'useTest')
    hookInstance.setValue(42)

    element.setAttribute('use-test', 'new-value')

    // Re-process hooks - should preserve state
    processElementHooks(element)

    // Verify state is preserved
    const sameInstance = getHookInstance(element, 'useTest')
    expect(sameInstance.value()).toBe(42)
  })
}) 
