import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signal } from '../core/signal.js'
import { useEffect, withHookContext } from '../core/hookContext.js'

describe('useEffect Non-Signal Warning', () => {
  let container
  let consoleWarnSpy
  
  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    
    // Spy on console.warn
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  
  afterEach(() => {
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })
  
  it('should NOT warn for empty dependency array', () => {
    withHookContext(container, () => {
      useEffect(() => {}, [])
    })
    
    // Should not warn for empty array
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('useEffect dependency array contains')
    )
  })
  
  it('should NOT warn when all dependencies are signals', () => {
    const count = signal(0)
    const name = signal('test')
    
    withHookContext(container, () => {
      useEffect(() => {}, [count, name])
    })
    
    // Should not warn when all dependencies are signals
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('useEffect dependency array contains')
    )
  })
  
  it('should warn when non-signal dependencies are used', () => {
    const count = signal(0)
    const plainObject = { value: 10 }
    const plainNumber = 42
    
    withHookContext(container, () => {
      useEffect(() => {}, [count, plainObject, plainNumber])
    })
    
    // Should warn about non-signal dependencies
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('useEffect dependency array contains 2 non-signal value(s) that won\'t trigger re-runs')
    )
  })
  
  it('should ignore nil values', () => {
    const count = signal(0)
    
    withHookContext(container, () => {
      useEffect(() => {}, [count, null, undefined])
    })
    
    // Should not count null/undefined as non-signal dependencies
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('useEffect dependency array contains')
    )
  })
  
  it('should include debugging info when debug mode is enabled', () => {
    // Mock getConfig to return debug: true
    vi.mock('../core/config.js', () => ({
      getConfig: () => ({ debug: true })
    }))
    
    const plainObject = { test: 'value' }
    const plainNumber = 42
    
    withHookContext(container, () => {
      useEffect(() => {}, [plainObject, plainNumber])
    })
    
    // Should include non-reactive values in the warning
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Non-reactive values:')
    )
  })
}) 
