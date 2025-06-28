import {
  registerHook, 
  registerChainableHook, 
  getRegisteredHooks, 
  getRegisteredChainableHooks 
} from './core/hookRegistry.js'
import { useEffect } from './core/hookContext.js'
import { useChildren } from './hooks/useChildren.js'
import { useEvents } from './hooks/useEvents.js'
import { useClasses } from './hooks/useClasses.js'
import { useAttributes } from './hooks/useAttributes.js'
import { useStyles } from './hooks/useStyles.js'
import { with as withEl } from './core/with.js'
import { createObserver } from './core/observer.js'
import { scanComponents, initializeComponents } from './core/scanComponents.js'
import { scanDirectives } from './core/scanDirectives.js'
import { getRegisteredComponentNames, registerComponent, registerComponentByName } from './core/registry.js'
import { initConfig, getConfig } from './core/config.js'
import { signal } from './core/signal.js'
import { computed } from './core/computed.js'
import { autoRegisterComponents } from './core/autoRegister.js'
import { logger } from './utils/logger.js'

/**
 * Observer instance for DOM mutations
 * @type {Object}
 */
const observerRef = {
  current: null
}

/**
 * HookTML runtime instance
 * @typedef {Object} HookTMLRuntime
 * @property {Object} config - The runtime configuration
 * @property {Array<Object>} components - The initialized component instances
 */

/**
 * Starts the HookTML runtime
 * @param {import('./core/config.js').HookTMLConfigOptions} [options] - Configuration options
 * @returns {Promise<Object>} - Runtime object with API methods
 */
export const start = async (options) => {
  // Configure
  initConfig(options)
  
  logger.log('Initializing...')

  // Log the resolved configuration
  const { componentPath, debug, attributePrefix } = getConfig()
  if (attributePrefix) {
    logger.log(`Using attribute prefix: "${attributePrefix}"`)
  }
  
  // Auto-register components if path is provided
  if (componentPath) {
    logger.log(`Auto-registering components from: "${componentPath}"`)
    await autoRegisterComponents({
      componentPath,
      register: registerComponentByName,
      debug
    })
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
export const scan = () => {
  // Scan for components
  logger.log('Manual scan triggered')
  const components = scanComponents()
  const instances = initializeComponents(components)
  
  // Scan for directives
  scanDirectives()
  
  logger.log(`Manual scan complete, initialized ${instances.length} new component(s)`)
  return instances
}

// Export core API
export { 
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
  computed
}

export const HookTML = {
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
  with: withEl,
  signal,
  computed
}

export { getConfig } 
