import {
  registerHook,
  registerChainableHook,
  getRegisteredHooks,
  getRegisteredChainableHooks
} from './src/core/hookRegistry.js'
import { useEffect } from './src/core/hookContext.js'
import { useChildren } from './src/hooks/useChildren.js'
import { useEvents } from './src/hooks/useEvents.js'
import { useClasses } from './src/hooks/useClasses.js'
import { useAttributes } from './src/hooks/useAttributes.js'
import { useStyles } from './src/hooks/useStyles.js'
import { with as withEl } from './src/core/with.js'
import { createObserver } from './src/core/observer.js'
import { scanComponents, initializeComponents } from './src/core/scanComponents.js'
import { scanDirectives } from './src/core/scanDirectives.js'
import { getRegisteredComponentNames, registerComponent } from './src/core/registry.js'
import { initConfig, getConfig } from './src/core/config.js'
import { signal } from './src/core/signal.js'
import { computed } from './src/core/computed.js'
import { logger } from './src/utils/logger.js'

/**
 * Observer instance for DOM mutations
 * @type {Object}
 */
const observerRef = {
  current: null
}

/**
 * Starts the HookTML runtime (browser version - no auto-registration)
 * @param {import('./src/core/config.js').HookTMLConfigOptions} [options] - Configuration options
 * @returns {Object} - Runtime object with API methods
 */
const start = (options) => {
  // Configure (browser version ignores componentPath)
  initConfig(options)

  logger.log('Initializing...')

  // Log the resolved configuration
  const { debug, attributePrefix } = getConfig()
  if (attributePrefix) {
    logger.log(`Using attribute prefix: "${attributePrefix}"`)
  }

  // Create and start the observer
  observerRef.current = createObserver()
  observerRef.current.start()

  // Initial scan
  scan()

  // Log completion message
  logger.log('Initialization complete')

  // Return API for runtime management
  return {
    config: getConfig(),
    scan,
    stop: () => observerRef.current?.stop(),
    components: getRegisteredComponentNames,
    hooks: getRegisteredHooks,
    chainableHooks: getRegisteredChainableHooks
  }
}

/**
 * Scans the DOM for new components and hooks and initializes them
 * @returns {Array<Object>} Initialized component instances
 */
const scan = () => {
  // Scan for components
  logger.log('Manual scan triggered')
  const components = scanComponents()
  const instances = initializeComponents(components)

  // Scan for directives
  scanDirectives()

  logger.log(`Manual scan complete, initialized ${instances.length} new component(s)`)
  return instances
}

// Export all functions as named exports
export {
  start,
  scan,
  registerComponent,
  registerHook,
  registerChainableHook,
  useEffect,
  useChildren,
  useEvents,
  useClasses,
  useAttributes,
  useStyles,
  withEl as with,
  signal,
  computed,
  getConfig
}
