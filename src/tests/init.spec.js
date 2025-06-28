import { describe, it, expect, beforeEach, vi } from 'vitest'
import { init } from '../index.js'

describe('init', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('should initialize components when called', () => {
    document.body.innerHTML = `
      <div class='TestComponent'>Test Content</div>
      <div use-another-component>Another Component</div>
    `

    const initSpy = vi.spyOn(init, 'manualScan')
    
    init()
    
    expect(initSpy).toHaveBeenCalled()
  })

  it('should not throw when called multiple times', () => {
    document.body.innerHTML = '<div class="TestComponent">Test</div>'
    
    expect(() => {
      init()
      init()
      init()
    }).not.toThrow()
  })

  it('should work with empty document', () => {
    expect(() => init()).not.toThrow()
  })

  it('should be callable as a function', () => {
    const initSpy = vi.spyOn(init, 'manualScan').mockImplementation(() => [])
    
    init()
    
    expect(initSpy).toHaveBeenCalled()
  })
}) 
