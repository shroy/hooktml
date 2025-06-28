import { describe, it, expect, vi, beforeEach } from 'vitest'
import { manualScan } from '../core/manualScan.js'

describe('manualScan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('should scan and initialize components', () => {
    document.body.innerHTML = `
      <div class="TestComponent">Component content</div>
      <div use-component="AnotherComponent">Another component</div>
    `

    const scanSpy = vi.fn().mockReturnValue([
      { element: document.querySelector('.TestComponent'), componentName: 'TestComponent' }
    ])
    const initializeSpy = vi.fn().mockReturnValue([
      { element: document.querySelector('.TestComponent'), componentName: 'TestComponent', instance: {} }
    ])

    vi.mock('../core/scanComponents', () => ({
      scanComponents: scanSpy,
      initializeComponents: initializeSpy
    }))

    const result = manualScan()

    expect(scanSpy).toHaveBeenCalled()
    expect(initializeSpy).toHaveBeenCalled()
    expect(result).toEqual(expect.any(Array))
  })

  it('should work with empty document', () => {
    const scanSpy = vi.fn().mockReturnValue([])
    const initializeSpy = vi.fn().mockReturnValue([])

    vi.mock('../core/scanComponents', () => ({
      scanComponents: scanSpy,
      initializeComponents: initializeSpy
    }))

    const result = manualScan()

    expect(scanSpy).toHaveBeenCalled()
    expect(initializeSpy).toHaveBeenCalledWith([])
    expect(result).toEqual([])
  })

  it('should return an array', () => {
    const result = manualScan()
    expect(Array.isArray(result)).toBe(true)
  })

  it('should work with selectors', () => {
    document.body.innerHTML = `
      <div class="TestComponent">Component 1</div>
      <div class="AnotherComponent">Component 2</div>
    `

    const result = manualScan('.TestComponent')
    expect(Array.isArray(result)).toBe(true)
  })
}) 
