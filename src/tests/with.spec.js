import { describe, it, expect, vi, beforeEach } from 'vitest'
import { with as withEl } from '../core/with.js'
import * as useEventsModule from '../hooks/useEvents.js'
import * as useClassesModule from '../hooks/useClasses.js'

describe('with(el)', () => {
  let element
  
  beforeEach(() => {
    // Create a fresh element for each test
    element = document.createElement('div')
    document.body.appendChild(element)
    
    // Reset spies/mocks
    vi.restoreAllMocks()
  })
  
  it('should return an object with hook methods', () => {
    const result = withEl(element)
    
    expect(result).toBeTypeOf('object')
    expect(result.useEvents).toBeTypeOf('function')
    expect(result.useClasses).toBeTypeOf('function')
  })
  
  it('should throw an error if called with a non-HTMLElement', () => {
    // Use Function.prototype.apply.call to bypass TypeScript type checking
    // for intentionally incorrect inputs that we want to test
    expect(() => Function.prototype.apply.call(withEl, null, [null])).toThrow()
    expect(() => Function.prototype.apply.call(withEl, null, [{}])).toThrow()
    expect(() => Function.prototype.apply.call(withEl, null, ['div'])).toThrow()
  })
  
  it('should call useEvents with the element and provided event map', () => {
    // Spy on useEvents
    const useEventsSpy = vi.spyOn(useEventsModule, 'useEvents').mockImplementation(() => () => {})
    
    // Test input
    const eventMap = {
      click: () => {},
      mouseover: () => {}
    }
    
    // Call through the with(el) chain
    withEl(element).useEvents(eventMap)
    
    // Verify call
    expect(useEventsSpy).toHaveBeenCalledOnce()
    expect(useEventsSpy).toHaveBeenCalledWith(element, eventMap)
  })
  
  it('should call useClasses with the element and provided class map', () => {
    // Spy on useClasses
    const useClassesSpy = vi.spyOn(useClassesModule, 'useClasses').mockImplementation(() => () => {})
    
    // Test input
    const classMap = {
      active: true,
      hidden: false
    }
    
    // Call through the with(el) chain
    withEl(element).useClasses(classMap)
    
    // Verify call
    expect(useClassesSpy).toHaveBeenCalledOnce()
    expect(useClassesSpy).toHaveBeenCalledWith(element, classMap)
  })
  
  it('should enable method chaining', () => {
    // Spy on both hooks
    const useEventsSpy = vi.spyOn(useEventsModule, 'useEvents').mockImplementation(() => () => {})
    const useClassesSpy = vi.spyOn(useClassesModule, 'useClasses').mockImplementation(() => () => {})
    
    // Call multiple methods in a chain
    withEl(element)
      .useEvents({ click: () => {} })
      .useClasses({ active: true })
    
    // Verify both methods were called once
    expect(useEventsSpy).toHaveBeenCalledOnce()
    expect(useClassesSpy).toHaveBeenCalledOnce()
  })
  
  it('should maintain correct chaining order', () => {
    // Tracking the order of calls
    const calls = []
    
    // Spy on both hooks with side effects to track call order
    vi.spyOn(useEventsModule, 'useEvents').mockImplementation(() => {
      calls.push('useEvents')
      return () => {}
    })
    vi.spyOn(useClassesModule, 'useClasses').mockImplementation(() => {
      calls.push('useClasses')
      return () => {}
    })
    
    // Call in one order
    withEl(element)
      .useEvents({})
      .useClasses({})
    
    expect(calls).toEqual(['useEvents', 'useClasses'])
    
    // Reset and call in the opposite order
    calls.length = 0
    withEl(element)
      .useClasses({})
      .useEvents({})
    
    expect(calls).toEqual(['useClasses', 'useEvents'])
  })
}) 
