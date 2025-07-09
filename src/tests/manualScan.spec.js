import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scan } from '../index.js'
import * as scanComponentsModule from '../core/scanComponents.js'
import { logger } from '../utils/logger.js'

describe('scan()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('should call scanComponents and initializeComponents', () => {
    // Setup
    const mockFoundComponents = [{ element: document.createElement('div'), componentName: 'Test' }]
    const mockInitializedComponents = [{ element: document.createElement('div'), componentName: 'Test', instance: {} }]

    // Mock the required functions
    const scanSpy = vi.spyOn(scanComponentsModule, 'scanComponents')
      .mockReturnValue(mockFoundComponents)

    const initializeSpy = vi.spyOn(scanComponentsModule, 'initializeComponents')
      .mockReturnValue(mockInitializedComponents)

    // Execute
    const result = scan()

    // Verify
    expect(scanSpy).toHaveBeenCalledTimes(1)
    expect(initializeSpy).toHaveBeenCalledTimes(1)
    expect(initializeSpy).toHaveBeenCalledWith(mockFoundComponents)
    expect(result).toBe(mockInitializedComponents)
  })

  it('should pass found components to initializeComponents', () => {
    // Setup
    const mockFoundComponents = [
      { element: document.createElement('div'), componentName: 'Component1' },
      { element: document.createElement('div'), componentName: 'Component2' }
    ]

    // Mock the required functions
    vi.spyOn(scanComponentsModule, 'scanComponents')
      .mockReturnValue(mockFoundComponents)

    const initializeSpy = vi.spyOn(scanComponentsModule, 'initializeComponents')
      .mockReturnValue([])

    // Execute
    scan()

    // Verify correct parameters passed
    expect(initializeSpy).toHaveBeenCalledWith(mockFoundComponents)
  })

  it('should log scan results', () => {
    // Setup
    // @ts-ignore - Ignore the type checking for spyOn
    const loggerSpy = vi.spyOn(logger, 'log')

    // Mock functions
    vi.spyOn(scanComponentsModule, 'scanComponents')
      .mockReturnValue([{ element: document.createElement('div'), componentName: 'Test' }])

    vi.spyOn(scanComponentsModule, 'initializeComponents')
      .mockReturnValue([{ element: document.createElement('div'), componentName: 'Test', instance: {} }])

    // Execute
    scan()

    // Verify logging
    expect(loggerSpy).toHaveBeenCalledWith('Manual scan triggered')
    expect(loggerSpy).toHaveBeenCalledWith('Manual scan complete, initialized 1 new component(s)')
  })
}) 
