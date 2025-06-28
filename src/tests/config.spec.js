import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { start, getConfig } from '../index.js'
import * as loggerModule from '../utils/logger.js'

/**
 * Tests for HookTML configuration
 */
describe('HookTML Configuration', () => {
  // @ts-ignore - Ignore the type checking for spyOn
  const loggerLogSpy = vi.spyOn(loggerModule.logger, 'log')
  // @ts-ignore - Ignore the type checking for spyOn
  const loggerWarnSpy = vi.spyOn(loggerModule.logger, 'warn')

  beforeEach(() => {
    loggerLogSpy.mockClear()
    loggerWarnSpy.mockClear()
  })

  afterEach(() => {
    loggerLogSpy.mockRestore()
    loggerWarnSpy.mockRestore()
  })

  /**
   * Test default configuration
   */
  it('should use default config when none provided', async () => {
    const runtime = await start()
    
    expect(runtime.config.debug).toBe(false)
    expect(runtime.config).toHaveProperty('componentPath')
  })

  /**
   * Test valid configuration options
   */
  it('should apply valid configuration options', async () => {
    const runtime = await start({ debug: true })
    
    expect(runtime.config.debug).toBe(true)
  })

  /**
   * Test that getConfig returns the same config
   */
  it('should make config available via getConfig()', async () => {
    await start({ debug: true })
    
    const config = getConfig()
    
    expect(config.debug).toBe(true)
  })
  
  /**
   * Test attribute prefix with no dash
   */
  it('should format attribute prefix to include dash', async () => {
    const runtime = await start({ attributePrefix: 'hk' })
    
    expect(runtime.config.attributePrefix).toBe('hk')
    expect(runtime.config.formattedPrefix).toBe('hk-')
  })
  
  /**
   * Test attribute prefix with existing dash
   */
  it('should preserve existing dash in attribute prefix', async () => {
    const runtime = await start({ attributePrefix: 'data-' })
    
    expect(runtime.config.attributePrefix).toBe('data-')
    expect(runtime.config.formattedPrefix).toBe('data-')
  })
  
  /**
   * Test empty attribute prefix
   */
  it('should handle empty attribute prefix', async () => {
    const runtime = await start({ attributePrefix: '' })
    
    expect(runtime.config.attributePrefix).toBe('')
    expect(runtime.config.formattedPrefix).toBe('')
  })
}) 
