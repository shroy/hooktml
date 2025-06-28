import { getConfig } from './config.js'
import { getRegisteredComponent, getRegisteredComponentNames } from './registry.js'
import { isNotNil, isEmptyArray, isNil, isFunction, isObject } from '../utils/type-guards.js'
import { lifecycleManager, markInitialized } from './initialization.js'
import { extractProps } from '../utils/props.js'
import { withHookContext } from './hookContext.js'
import { injectComponentStyles } from './styleInjection.js'
import { tryCatch } from '../utils/try-catch.js'
import { logger } from '../utils/logger.js'

/**
 * @typedef {Object} FoundComponent
 * @property {HTMLElement} element - The DOM element
 * @property {string} componentName - The name of the component
 */

/**
 * Creates a selector for class-based components
 * @param {string[]} componentNames - The component names to look for
 * @returns {string} CSS selector for class-based components
 */
const createClassSelector = (componentNames) => {
  return componentNames.map(name => `.${name}`).join(', ')
}

/**
 * Creates a selector for use-component based components
 * @param {string[]} componentNames - The component names to look for
 * @param {string|undefined} prefix - The attribute prefix to use
 * @returns {string} CSS selector for use-component based components
 */
const createUseComponentSelector = (componentNames, prefix = '') => {
  return componentNames
    .map(name => `[${prefix}use-component="${name}"]`)
    .join(', ')
}

/**
 * Gets component name from an element
 * @param {HTMLElement} element - DOM element to extract component name from
 * @param {string[]} componentNames - List of valid component names
 * @param {string|undefined} prefix - The attribute prefix to use
 * @returns {string|null} The component name or null if not found
 */
const getComponentNameFromElement = (element, componentNames, prefix = '') => {
  // Check for class name match
  const classList = Array.from(element.classList)
  const classMatch = classList.find(className => componentNames.includes(className))
  
  if (isNotNil(classMatch)) {
    return classMatch
  }
  
  // Check for use-component attribute
  const useComponentAttr = element.getAttribute(`${prefix}use-component`)
  if (isNotNil(useComponentAttr) && componentNames.includes(useComponentAttr)) {
    return useComponentAttr
  }
  
  return null
}

/**
 * Scans the DOM for registered components
 * @returns {FoundComponent[]} Array of found components
 */
export const scanComponents = () => {
  // Keep this original log message for backward compatibility with tests
  logger.log('Scanning for components...')
  
  const componentNames = getRegisteredComponentNames()
  const { formattedPrefix } = getConfig()
  
  // If no components registered, return empty array
  if (!componentNames.length) {
    logger.log('No components registered yet')
    return []
  }
  
  const classSelector = createClassSelector(componentNames)
  const useComponentSelector = createUseComponentSelector(componentNames, formattedPrefix)
  const selector = `${classSelector}, ${useComponentSelector}`
  
  logger.log(`Scanning DOM with selector: "${selector}"`)
  
  // Find all matching elements
  /** @type {HTMLElement[]} */
  const elements = Array.from(document.querySelectorAll(selector))
  
  // Map to component objects
  return elements
    .map(element => {
      const componentName = getComponentNameFromElement(element, componentNames, formattedPrefix)
      return isNotNil(componentName) 
        ? { element, componentName }
        : null
    })
    .filter(isNotNil)
}

/**
 * Initializes components by calling registered component functions on matching DOM elements
 * @param {FoundComponent[]} components - Array of component objects from scanComponents()
 * @returns {Array<Object>} Array of initialized component instances
 */
export const initializeComponents = (components) => {
  if (isNil(components) || isEmptyArray(components)) {
    logger.log('No components to initialize')
    return []
  }
  
  logger.log(`Initializing ${components.length} component(s)...`)
  
  // Initialize each component by calling its registered function
  const instances = components.map(({ element, componentName }) => {
    if (lifecycleManager.isInitialized(element)) {
      logger.log(`Skipping already initialized component: ${componentName}`)
      return null
    }

    const componentFn = getRegisteredComponent(componentName)
    
    if (isNil(componentFn)) {
      logger.warn(`No registered function found for component: ${componentName}`)
      return null
    }
    
    return tryCatch({
      fn: () => {
        logger.log(`Initializing component: ${componentName}`)
        const props = extractProps(element, componentName)
        
        // Run component initialization within a hook context
        const result = withHookContext(element, () => {
          return componentFn(element, props)
        })
      
        // If the hook context returned null due to an error, return null
        if (result === null) {
          return null
        }
      
        // Handle different return types:
        // 1. Function → treat as cleanup
        // 2. Object with { context, cleanup } → assign context to el.component and register cleanup
        if (isFunction(result)) {
        // Original behavior: result is a cleanup function
          lifecycleManager.registerComponent(element, result)
        } else if (isObject(result)) {
        // New behavior: result is an object that may contain context and/or cleanup
          if (isNotNil(result.context)) {
          // Assign context to element.component for external access
          // Use object property assignment to avoid TypeScript errors
            Object.defineProperty(element, 'component', {
              value: result.context,
              writable: true,
              configurable: true
            })
          }
        
          if (isFunction(result.cleanup)) {
          // Register cleanup function if provided
            lifecycleManager.registerComponent(element, result.cleanup)
          }
        }
      
        // Inject component styles and remove cloak
        injectComponentStyles(componentFn, element)
      
        // Mark element as initialized (this will also mark in lifecycleManager)
        markInitialized(element)
      
        return { 
          element, 
          componentName, 
          instance: result 
        }
      },
      onError: (error) => {
        logger.error(`Error initializing component ${componentName}:`, error)
        return null
      }
    })
  }).filter(isNotNil)
  
  logger.log(`Successfully initialized ${instances.length} component(s)`)
  return instances
} 
