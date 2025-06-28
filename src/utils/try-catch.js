import { isNotNil } from './type-guards.js'

/**
 * Executes a promise and handles errors with proper type preservation
 * @template T
 * @param {Object} config - The configuration object
 * @param {() => Promise<T>} config.fn - The function to execute 
 * @param {(error: Error) => T} config.onError - Required error handler that returns the same type
 * @param {() => void} [config.onFinally] - Optional finally handler
 * @returns {Promise<T>} - Returns the same type as the fn function
 */
export const tryCatchAsync = async ({ fn, onError, onFinally }) => {
  try {
    return await fn()
  } catch (error) {
    return onError(error)
  } finally {
    if (isNotNil(onFinally)) {
      onFinally()
    }
  }
}

/**
 * Executes a synchronous function and returns a standardized result object
 * @template T
 * @param {Object} config - The configuration object
 * @param {Function} config.fn - The function to execute
 * @param {(error: Error) => T} config.onError - Required error handler that returns the same type
 * @param {() => void} [config.onFinally] - Optional finally handler
 * @returns {T}
 */
export const tryCatch = ({ fn, onError, onFinally }) => {
  try {
    return fn()
  } catch (error) {
    return onError(error)
  } finally {
    if (isNotNil(onFinally)) {
      onFinally()
    }
  }
} 
