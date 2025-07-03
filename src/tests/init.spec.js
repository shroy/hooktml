import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { start } from '../index.js'
import { logger } from '../utils/logger.js'

/**
 * Tests for HookTML initialization
 */
describe('HookTML Initialization', () => {
  // @ts-ignore - Ignore the type checking for spyOn
  const loggerSpy = vi.spyOn(logger, 'log')

  beforeEach(() => {
    loggerSpy.mockClear()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    loggerSpy.mockRestore()
  })

  /**
   * Test that initialization sets up DOM observation properly
   */
  it('should initialize and start DOM observation', async () => {
    const runtime = await start()
    
    expect(loggerSpy).toHaveBeenCalledWith('Initializing...')
    expect(loggerSpy).toHaveBeenCalledWith('Initialization complete')
    expect(runtime).toHaveProperty('config')
  })

  it('should initialize with default configuration', async () => {
    // Create a fresh spy for this test only
    // @ts-ignore - Ignore the type checking for spyOn
    const localLoggerSpy = vi.spyOn(logger, 'log')
    
    const runtime = await start()
    
    expect(runtime.config.debug).toBe(false)
    expect(runtime.config).toHaveProperty('componentPath')
    expect(localLoggerSpy).toHaveBeenCalledWith('Initializing...')
  })
}) 
