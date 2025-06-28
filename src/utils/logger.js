/**
 * Logger utility for HookTML that respects the debug configuration
 * @module logger
 */

import { getConfig } from '../core/config.js'
import { isFunction } from './type-guards.js'

/**
 * @typedef {Object} Logger
 * @property {Function} log - Log a message (only when debug is true)
 * @property {Function} info - Log an info message (only when debug is true)
 * @property {Function} warn - Log a warning message (always)
 * @property {Function} error - Log an error message (always)
 */

/**
 * Creates a message with the HookTML prefix
 * @param {string} message - The message to prefix
 * @returns {string} The prefixed message
 */
const prefixMessage = (message) => `[HookTML] ${message}`

/**
 * Logger utility that respects the debug config
 * @type {Logger}
 */
export const logger = {
  /**
   * Log a message (only when debug is true)
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  log: (message, ...args) => {
    const { debug } = getConfig()
    if (debug && isFunction(console.log)) {
      console.log(prefixMessage(message), ...args)
    }
  },

  /**
   * Log an info message (only when debug is true)
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  info: (message, ...args) => {
    const { debug } = getConfig()
    if (debug && isFunction(console.info)) {
      console.info(prefixMessage(message), ...args)
    }
  },

  /**
   * Log a warning message (always)
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  warn: (message, ...args) => {
    if (isFunction(console.warn)) {
      console.warn(prefixMessage(message), ...args)
    }
  },

  /**
   * Log an error message (always)
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  error: (message, ...args) => {
    if (isFunction(console.error)) {
      console.error(prefixMessage(message), ...args)
    }
  }
} 
