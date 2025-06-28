import { describe, it, expect, beforeEach, vi } from 'vitest'
import { initializeComponents } from '../core/scanComponents'
import * as registryModule from '../core/registry'
import * as lifecycleModule from '../core/lifecycleManager'

describe('Component Return Values', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('should handle component returning undefined', () => {
    const element = document.createElement('div')
    const componentFn = vi.fn().mockReturnValue(undefined)
    
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    const lifecycleManagerSpy = vi.spyOn(lifecycleModule, 'lifecycleManager', 'get').mockReturnValue({
      registerComponent: vi.fn().mockReturnValue(true),
      markInitialized: vi.fn()
    })
    
    const scanResults = [{ element, componentName: 'TestComponent' }]
    const result = initializeComponents(scanResults)
    
    expect(lifecycleManagerSpy).toHaveBeenCalled()
    expect(element.component).toBeUndefined()
  })

  it('should handle component returning object with API', () => {
    const element = document.createElement('div')
    const context = {
      state: { count: 0 },
      increment: () => context.state.count++,
      getValue: () => context.state.count
    }
    const componentFn = vi.fn().mockReturnValue(context)
    
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    
    const scanResults = [{ element, componentName: 'TestComponent' }]
    const result = initializeComponents(scanResults)
    
    expect(element.component).toBe(context)
    expect(element.component.state.count).toBe(0)
    expect(typeof element.component.increment).toBe('function')
    expect(typeof element.component.getValue).toBe('function')
  })

  it('should handle component returning teardown function', () => {
    const element = document.createElement('div')
    const teardownFn = vi.fn()
    const componentFn = vi.fn().mockReturnValue(teardownFn)
    
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    const lifecycleManagerSpy = vi.spyOn(lifecycleModule, 'lifecycleManager', 'get').mockReturnValue({
      registerComponent: vi.fn().mockReturnValue(true),
      markInitialized: vi.fn()
    })
    
    const scanResults = [{ element, componentName: 'TestComponent' }]
    const result = initializeComponents(scanResults)
    
    expect(lifecycleManagerSpy).toHaveBeenCalled()
    expect(element.component).toBeUndefined()
  })

  it('should handle component returning object and teardown function', () => {
    const element = document.createElement('div')
    const context = {
      state: { value: 'initial' },
      update: (newValue) => context.state.value = newValue,
      destroy: vi.fn()
    }
    const componentFn = vi.fn().mockReturnValue([context, context.destroy])
    
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    const lifecycleManagerSpy = vi.spyOn(lifecycleModule, 'lifecycleManager', 'get').mockReturnValue({
      registerComponent: vi.fn().mockReturnValue(true),
      markInitialized: vi.fn()
    })
    
    const scanResults = [{ element, componentName: 'TestComponent' }]
    const result = initializeComponents(scanResults)
    
    expect(element.component).toBe(context)
    expect(lifecycleManagerSpy).toHaveBeenCalled()
  })

  it('should handle component teardown properly', () => {
    const element = document.createElement('div')
    const teardownFn = vi.fn()
    const componentFn = vi.fn().mockReturnValue(teardownFn)
    
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    
    const scanResults = [{ element, componentName: 'TestComponent' }]
    initializeComponents(scanResults)
    
    expect(teardownFn).not.toHaveBeenCalled()
  })

  it('should expose component API publicly through element.component', () => {
    const element = document.createElement('div')
    const publicAPI = {
      getValue: () => 'test-value',
      setValue: vi.fn(),
      state: { initialized: true }
    }
    const componentFn = vi.fn().mockReturnValue(publicAPI)
    
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)
    
    const scanResults = [{ element, componentName: 'TestComponent' }]
    initializeComponents(scanResults)
    
    expect(element.component.getValue()).toBe('test-value')
    expect(element.component.state.initialized).toBe(true)
  })
}) 
