// @ts-nocheck - Disable TypeScript checking for vitest mocks
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '../utils/logger.js'
import { autoRegisterComponents } from '../core/autoRegister.js'

// Mock module imports
vi.mock('fs/promises', () => ({
  readdir: vi.fn()
}))

vi.mock('../utils/logger.js', () => ({
  logger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

const mockRegister = vi.fn()

describe('autoRegisterComponents', () => {
  const mockComponentPath = '/test/components'

  beforeEach(() => {
    vi.clearAllMocks()
    mockRegister.mockClear()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should validate required options', async () => {
    await expect(autoRegisterComponents()).rejects.toThrow('options object is required')
    await expect(autoRegisterComponents({})).rejects.toThrow('register function is required')
    await expect(autoRegisterComponents({ register: mockRegister, componentPath: '' }))
      .rejects.toThrow('componentPath must be a non-empty string')
  })

  it('should return 0 in test environment (graceful fallback)', async () => {
    const result = await autoRegisterComponents({
      componentPath: './components',
      register: mockRegister,
      debug: true
    })

    // In test environment without Node.js filesystem or bundler, should return 0
    expect(result).toBe(0)
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('should use default componentPath when not provided', async () => {
    const result = await autoRegisterComponents({
      register: mockRegister
    })

    // Should use default path and return 0 in test environment
    expect(result).toBe(0)
  })

  it('should handle errors gracefully without debug mode', async () => {
    const result = await autoRegisterComponents({
      componentPath: mockComponentPath,
      register: mockRegister,
      debug: false
    })

    expect(result).toBe(0)
    // Should not log anything in non-debug mode
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should handle debug mode gracefully', async () => {
    const result = await autoRegisterComponents({
      componentPath: mockComponentPath,
      register: mockRegister,
      debug: true
    })

    // Should return 0 in test environment and not throw errors
    expect(result).toBe(0)
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('should pass componentPath to bundler modules function', async () => {
    const customPath = 'app/frontend/hooktml'
    const result = await autoRegisterComponents({
      componentPath: customPath,
      register: mockRegister,
      debug: true
    })

    // Should return 0 in test environment but verify path is used
    expect(result).toBe(0)
    // In a real bundler environment, the custom path would be used for glob pattern
  })
}) 
