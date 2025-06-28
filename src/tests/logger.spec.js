/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { logger } from '../utils/logger.js'
import * as configModule from '../core/config.js'

describe('logger', () => {
  // Save original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
  }
  
  // Mock getConfig
  const mockGetConfig = vi.fn()
  
  beforeEach(() => {
    // Reset mocks for each test
    console.log = vi.fn()
    console.info = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()
    
    // Mock the config
    vi.spyOn(configModule, 'getConfig').mockImplementation(mockGetConfig)
  })
  
  afterEach(() => {
    // Restore console methods
    console.log = originalConsole.log
    console.info = originalConsole.info
    console.warn = originalConsole.warn
    console.error = originalConsole.error
    
    vi.restoreAllMocks()
  })
  
  describe('when debug is true', () => {
    beforeEach(() => {
      mockGetConfig.mockReturnValue({ debug: true })
    })
    
    it('calls console.log with prefixed message', () => {
      logger.log('test message', 'arg1', 'arg2')
      expect(console.log).toHaveBeenCalledWith('[HookTML] test message', 'arg1', 'arg2')
    })
    
    it('calls console.info with prefixed message', () => {
      logger.info('test info', { data: 'value' })
      expect(console.info).toHaveBeenCalledWith('[HookTML] test info', { data: 'value' })
    })
  })
  
  describe('when debug is false', () => {
    beforeEach(() => {
      mockGetConfig.mockReturnValue({ debug: false })
    })
    
    it('does not call console.log', () => {
      logger.log('test message')
      expect(console.log).not.toHaveBeenCalled()
    })
    
    it('does not call console.info', () => {
      logger.info('test info')
      expect(console.info).not.toHaveBeenCalled()
    })
  })
  
  describe('regardless of debug setting', () => {
    it('always calls console.warn with prefixed message when debug is true', () => {
      mockGetConfig.mockReturnValue({ debug: true })
      logger.warn('test warning', 123)
      expect(console.warn).toHaveBeenCalledWith('[HookTML] test warning', 123)
    })
    
    it('always calls console.warn with prefixed message when debug is false', () => {
      mockGetConfig.mockReturnValue({ debug: false })
      logger.warn('test warning', 123)
      expect(console.warn).toHaveBeenCalledWith('[HookTML] test warning', 123)
    })
    
    it('always calls console.error with prefixed message when debug is true', () => {
      mockGetConfig.mockReturnValue({ debug: true })
      logger.error('test error', new Error('test'))
      expect(console.error).toHaveBeenCalledWith('[HookTML] test error', new Error('test'))
    })
    
    it('always calls console.error with prefixed message when debug is false', () => {
      mockGetConfig.mockReturnValue({ debug: false })
      logger.error('test error', new Error('test'))
      expect(console.error).toHaveBeenCalledWith('[HookTML] test error', new Error('test'))
    })
  })
}) 
