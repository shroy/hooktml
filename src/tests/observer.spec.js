import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createObserver } from '../core/observer'
import * as initializationModule from '../core/initialization'
import * as hookContextModule from '../core/hookContext'
import * as hookRegistryModule from '../core/hookRegistry'
import * as registryModule from '../core/registry'

/**
 * Tests for DOM observer functionality
 */
describe('DOM Observer', () => {
  let observer
  let mockMutationObserver

  beforeEach(() => {
    // Clear mocks first
    vi.clearAllMocks()

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
  })

  /**
   * Test starting observation
   */
  it('should start observing the DOM', () => {
    observer.start()

    expect(MutationObserver).toHaveBeenCalled()
    expect(mockMutationObserver.observe).toHaveBeenCalledWith(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true
    })
  })

  /**
   * Test stopping observation
   */
  it('should stop observing the DOM', () => {
    observer.start()
    observer.stop()

    expect(mockMutationObserver.disconnect).toHaveBeenCalled()
  })

  /**
   * Test handling removed elements with teardown functions
   */
  it('should run teardown for removed elements', () => {
    // Setup - create elements that would be tracked by the observer
    const element1 = document.createElement('div')
    const element2 = document.createElement('div')
    element1.setAttribute('use-test', 'true')
    element2.setAttribute('use-test', 'true')

    // Mock hook registry to make elements trackable
    vi.spyOn(hookRegistryModule, 'getRegisteredHooks').mockReturnValue(new Map([['useTest', vi.fn()]]))
    vi.spyOn(registryModule, 'getRegisteredComponentNames').mockReturnValue([])

    // Mock lifecycle functions
    const executeTeardownsSpy = vi.spyOn(initializationModule.lifecycleManager, 'executeTeardowns')
    const runCleanupFunctionsSpy = vi.spyOn(hookContextModule, 'runCleanupFunctions')

    // Start observer and add elements to tracking
    observer.start()

    // Simulate the elements being added first (so they get tracked)
    document.body.appendChild(element1)
    document.body.appendChild(element2)

    // Trigger refresh to track the elements
    const addMutations = [{
      type: 'childList',
      addedNodes: [element1, element2],
      removedNodes: []
    }]
    mockMutationObserver.callback(addMutations)

    // Now simulate removal of elements
    const removeMutations = [{
      type: 'childList',
      addedNodes: [],
      removedNodes: [element1, element2]
    }]

    mockMutationObserver.callback(removeMutations)

    // Verify teardown was called for each element
    expect(executeTeardownsSpy).toHaveBeenCalledWith(element1)
    expect(executeTeardownsSpy).toHaveBeenCalledWith(element2)
    expect(runCleanupFunctionsSpy).toHaveBeenCalledWith(element1)
    expect(runCleanupFunctionsSpy).toHaveBeenCalledWith(element2)
  })

  /**
   * Test handling nested elements
   */
  it('should run teardown for nested elements', () => {
    // Setup
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)
    parent.setAttribute('use-test', 'true')
    child.setAttribute('use-test', 'true')

    // Mock hook registry to make elements trackable
    vi.spyOn(hookRegistryModule, 'getRegisteredHooks').mockReturnValue(new Map([['useTest', vi.fn()]]))
    vi.spyOn(registryModule, 'getRegisteredComponentNames').mockReturnValue([])

    // Mock lifecycle functions
    const executeTeardownsSpy = vi.spyOn(initializationModule.lifecycleManager, 'executeTeardowns')

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

    mockMutationObserver.callback(removeMutations)

    // Verify teardown was called for both elements
    expect(executeTeardownsSpy).toHaveBeenCalledWith(parent)
    expect(executeTeardownsSpy).toHaveBeenCalledWith(child)
  })

  /**
   * Test handling non-element nodes
   */
  it('should ignore non-element nodes', () => {
    // Setup
    const textNode = document.createTextNode('Some text')
    const commentNode = document.createComment('A comment')

    // Mock lifecycle functions
    const executeTeardownsSpy = vi.spyOn(initializationModule.lifecycleManager, 'executeTeardowns')

    // Start observer
    observer.start()

    // Simulate removal of non-element nodes
    const mutations = [{
      type: 'childList',
      addedNodes: [],
      removedNodes: [textNode, commentNode]
    }]

    mockMutationObserver.callback(mutations)

    // Verify teardown was never called
    expect(executeTeardownsSpy).not.toHaveBeenCalled()
  })

  /**
   * Test that shows the fix works - element tracking prevents re-processing
   */
  it('should scan on mutations but skip already processed elements (proving the fix works)', () => {
    // Create a test element with a hook attribute
    const testElement = document.createElement('div')
    testElement.setAttribute('use-counter', 'true')

    // Mock the hook function to track how many times it's actually called
    const mockHookFn = vi.fn(() => () => { }) // Returns cleanup function

    // Mock the hook registry to return our mock hook
    vi.spyOn(hookRegistryModule, 'getRegisteredHook')
      .mockImplementation((name) => {
        if (name === 'useCounter') return mockHookFn
        return undefined
      })

    vi.spyOn(hookRegistryModule, 'getRegisteredHooks')
      .mockReturnValue(new Map([['useCounter', mockHookFn]]))

    vi.spyOn(registryModule, 'getRegisteredComponentNames').mockReturnValue([])

    // Start observer
    observer.start()

    // Add element to DOM and trigger tracking
    document.body.appendChild(testElement)
    const addMutation = [{
      type: 'childList',
      addedNodes: [testElement],
      removedNodes: []
    }]
    mockMutationObserver.callback(addMutation)

    // Clear the mock after initial processing
    mockHookFn.mockClear()

    // Simulate multiple DOM mutations (like attribute changes that would trigger infinite loop in old system)
    const mutations = [
      { type: 'attributes', target: testElement, attributeName: 'data-test', addedNodes: [], removedNodes: [] },
      { type: 'attributes', target: testElement, attributeName: 'data-test2', addedNodes: [], removedNodes: [] },
      { type: 'attributes', target: testElement, attributeName: 'data-test3', addedNodes: [], removedNodes: [] }
    ]

    // Process each mutation
    mutations.forEach(mutation => {
      mockMutationObserver.callback([mutation])
    })

    // THE FIX: Even though mutations happened 3 times, the hook was NOT re-applied
    // because the element is already tracked and won't be re-processed
    expect(mockHookFn).toHaveBeenCalledTimes(0) // ← This proves the fix works!

    // In the original bug, mockHookFn would have been called 3 times
    // Now it's called 0 times because the element is already tracked

    // Clean up
    document.body.removeChild(testElement)
  })
}) 
