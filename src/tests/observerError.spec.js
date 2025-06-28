import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createObserver } from '../core/observer'
import * as initializationModule from '../core/initialization'
import * as configModule from '../core/config'
import * as hookRegistryModule from '../core/hookRegistry'
import * as registryModule from '../core/registry'

describe('Observer Teardown Error Handling', () => {
  let observer
  let mockMutationObserver
  
  beforeEach(() => {
    // Mock MutationObserver
    mockMutationObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn()
    }
    global.MutationObserver = vi.fn().mockImplementation(callback => {
      mockMutationObserver.callback = callback
      return mockMutationObserver
    })
    
    // Create observer instance
    observer = createObserver()
    
    // Clear mocks
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Mock config to disable debug output
    vi.spyOn(configModule, 'getConfig').mockReturnValue({
      debug: false,
      attributePrefix: '',
      formattedPrefix: ''
    })
  })
  
  it('should continue processing multiple elements when teardown throws an error', () => {
    // Setup - create elements that would be tracked by the observer
    const element1 = document.createElement('div')
    const element2 = document.createElement('div')
    const element3 = document.createElement('div')
    element1.setAttribute('use-test', 'true')
    element2.setAttribute('use-test', 'true')
    element3.setAttribute('use-test', 'true')
    
    // Mock hook registry to make elements trackable
    vi.spyOn(hookRegistryModule, 'getRegisteredHooks').mockReturnValue(new Map([['useTest', vi.fn()]]))
    vi.spyOn(registryModule, 'getRegisteredComponentNames').mockReturnValue([])
    
    // Mock executeTeardowns to throw an error for the second element
    const executeTeardownsSpy = vi.spyOn(initializationModule.lifecycleManager, 'executeTeardowns').mockImplementation((element) => {
      if (element === element2) {
        throw new Error('Teardown error')
      }
      return {
        component: { success: true, error: undefined },
        directives: []
      }
    })
    
    // Start observer
    observer.start()
    
    // Add elements first so they get tracked
    document.body.appendChild(element1)
    document.body.appendChild(element2)
    document.body.appendChild(element3)
    
    const addMutations = [{
      type: 'childList',
      addedNodes: [element1, element2, element3],
      removedNodes: []
    }]
    mockMutationObserver.callback(addMutations)
    
    // Simulate removal of elements
    const removeMutations = [{
      type: 'childList',
      addedNodes: [],
      removedNodes: [element1, element2, element3]
    }]
    
    // This should not throw even though element2's teardown throws
    expect(() => {
      mockMutationObserver.callback(removeMutations)
    }).not.toThrow()
    
    // Verify teardown was called for all elements despite the error
    expect(executeTeardownsSpy).toHaveBeenCalledTimes(3)
    expect(executeTeardownsSpy).toHaveBeenCalledWith(element1)
    expect(executeTeardownsSpy).toHaveBeenCalledWith(element2)
    expect(executeTeardownsSpy).toHaveBeenCalledWith(element3)
  })
  
  it('should handle errors for nested elements', () => {
    // Setup
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)
    parent.setAttribute('use-test', 'true')
    child.setAttribute('use-test', 'true')
    
    // Mock hook registry to make elements trackable
    vi.spyOn(hookRegistryModule, 'getRegisteredHooks').mockReturnValue(new Map([['useTest', vi.fn()]]))
    vi.spyOn(registryModule, 'getRegisteredComponentNames').mockReturnValue([])
    
    // Track teardown calls
    const teardownCalls = []
    
    // Mock executeTeardowns to throw for the parent but still track calls
    vi.spyOn(initializationModule.lifecycleManager, 'executeTeardowns').mockImplementation((element) => {
      teardownCalls.push(element)
      if (element === parent) {
        throw new Error('Parent teardown error')
      }
      return {
        component: { success: true, error: undefined },
        directives: []
      }
    })
    
    // Start observer
    observer.start()
    
    // Add elements first
    document.body.appendChild(parent)
    const addMutations = [{
      type: 'childList',
      addedNodes: [parent],
      removedNodes: []
    }]
    mockMutationObserver.callback(addMutations)
    
    // Simulate removal of parent element
    const removeMutations = [{
      type: 'childList',
      addedNodes: [],
      removedNodes: [parent]
    }]
    
    // Should not throw
    expect(() => {
      mockMutationObserver.callback(removeMutations)
    }).not.toThrow()
    
    // Verify both parent and child teardowns were attempted
    expect(teardownCalls).toContain(parent)
    expect(teardownCalls).toContain(child)
  })
}) 
