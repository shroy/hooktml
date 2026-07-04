import { getRegisteredHooks, getRegisteredHook } from './hookRegistry.js'
import { camelToKebab, kebabToCamel } from '../utils/strings.js'
import { isHTMLElement, isNotNil, isNonEmptyString, isEmptyString, isFunction, isEmptyArray } from '../utils/type-guards.js'
import { tryCatch } from '../utils/try-catch.js'
import { coerceValue, extractHookProps } from '../utils/props.js'
import { lifecycleManager } from './initialization.js'
import { withHookContext } from './hookContext.js'
import { logger } from '../utils/logger.js'
import { getConfig } from './config.js'
import { storeHookInstance } from './hookInstanceRegistry.js'

/**
 * Creates a combined selector for all registered hooks
 * @param {string[]} hookNames - Array of hook names in camelCase
 * @param {string|undefined} prefix - Attribute prefix to use
 * @returns {string} A single CSS selector for all hooks
 */
const createHookSelector = (hookNames, prefix = '') => {
  if (!hookNames.length) return ''

  // Convert camelCase hook names to kebab-case attributes with prefix
  const attributeNames = hookNames.map(name => `[${prefix}${camelToKebab(name)}]`)

  // Join with commas to create a single selector
  return attributeNames.join(', ')
}

/**
 * Extracts hook names from element attributes
 * @param {HTMLElement} element - DOM element to extract hook names from
 * @param {string|undefined} prefix - Attribute prefix to use
 * @returns {Array<{name: string, value: string, originalName: string}>} Array of attribute info
 */
const getHookAttributesFromElement = (element, prefix = '') => {
  const attributes = Array.from(element.attributes)
  const usePrefix = `${prefix}use-`
  // The `use-component` attribute is a reserved component-binding, not a hook.
  // Excluding it here prevents a spurious "Unknown hook useComponent" warning.
  const componentAttr = `${prefix}use-component`

  return attributes
    .filter(attr => attr.name.startsWith(usePrefix) && attr.name !== componentAttr)
    .map(attr => ({
      name: attr.name.substring(prefix.length), // Remove prefix for processing
      originalName: attr.name, // Keep original for logging
      value: attr.value
    }))
}

/**
 * Processes a single element, applying all hooks defined on it
 * @param {HTMLElement} element - The DOM element to process
 */
export const processElementHooks = (element) => {
  const { formattedPrefix } = getConfig()
  const hookAttributes = getHookAttributesFromElement(element, formattedPrefix)

  logger.log(`Processing element with ${hookAttributes.length} hook(s):`, element)

  // For each hook attribute, find and call the corresponding function
  hookAttributes.forEach(({ name, originalName, value }) => {
    // Properly capitalize the hook name (e.g., "teardown" -> "useTeardown")
    // Must use exact case to match registered hook
    const hookName = kebabToCamel(name)

    logger.log(`Looking for hook "${hookName}" from attribute "${originalName}"`)

    const hookFn = getRegisteredHook(hookName)

    if (isNotNil(hookFn) && isFunction(hookFn)) {
      logger.log(`Found hook "${hookName}" for element:`, element)

      // Skip if this specific directive has already been initialized on this
      // element. Guarding on directive-initialized state (rather than on the
      // presence of a teardown/instance) means a hook that returns neither a
      // teardown nor a truthy instance still runs exactly once, and other
      // directives on the same element are never skipped wholesale. (#23)
      if (lifecycleManager.isDirectiveInitialized(element, hookName)) {
        logger.log(`Directive "${hookName}" already initialized; skipping`)
        return
      }

      // Mark-before-run: flag the directive as initialized immediately, so a
      // reentrant scan() triggered from within the hook body cannot
      // double-initialize it. Cleared in the error path below so a failed hook
      // can be retried on a later scan. (#25)
      lifecycleManager.markDirectiveInitialized(element, hookName)

      // Extract all props for this hook (including main value and additional props)
      const props = extractHookProps(element, hookName, value)

      if (isNotNil(value)) {
        logger.log(`Passing props to hook "${hookName}":`, props)
      }

      // Call the hook and store any teardown function it returns
      const resultRef = { current: undefined }

      tryCatch({
        fn: () => {
          logger.log(`Calling hook function for "${hookName}" with hook context`)

          // Execute the hook function within a hook context to support useEffect
          resultRef.current = withHookContext(element, () => {
            const instance = hookFn(element, props)
            // Store the hook instance for future reference
            storeHookInstance(element, hookName, instance)
            return instance
          })

          logger.log(`Hook "${hookName}" returned:`, resultRef.current, typeof resultRef.current)
        },
        onError: (error) => {
          logger.error(`Error applying hook "${hookName}":`, error)
          // Roll back the mark-before-run flag so a failed hook can be retried
          // on a later scan. No partial instance can exist here because
          // storeHookInstance only runs after the hook body returns.
          lifecycleManager.clearDirectiveInitialized(element, hookName)
        }
      })

      // If the hook returned a function, store it as a teardown function
      if (isFunction(resultRef.current)) {
        logger.log(`Storing teardown function for hook "${hookName}" on element:`, element)

        lifecycleManager.registerDirective(element, resultRef.current, hookName)

        // Verify teardown was stored
        const verifyTeardowns = lifecycleManager.hasRegistration(element)
        logger.log(`✅ Verified teardown is registered: ${verifyTeardowns}`)
      } else {
        logger.log(`Hook "${hookName}" did not return a teardown function`)
      }
    } else {
      logger.warn(`Unknown hook "${hookName}" requested on element:`, element)
    }
  })
}

/**
 * Scans the DOM for elements with use-* attributes and applies registered hooks
 * @returns {number} The number of processed elements
 */
export const scanDirectives = () => {
  const hooks = getRegisteredHooks()
  const hookNames = Array.from(hooks.keys())
  const { formattedPrefix } = getConfig()

  if (isEmptyArray(hookNames)) {
    logger.log('No hooks registered yet')
    return 0
  }

  // Create a combined selector for all hooks
  const selector = createHookSelector(hookNames, formattedPrefix)

  logger.log(`Scanning DOM for hook directives with selector: "${selector}"`)

  // Find all elements with use-* attributes and ensure they are HTMLElements
  /** @type {HTMLElement[]} */
  const elements = Array.from(document.querySelectorAll(selector))
    .filter(isHTMLElement)

  logger.log(`Found ${elements.length} element(s) with hook directives`)

  // Process each element by applying registered hooks
  elements.forEach(element => processElementHooks(element))

  return elements.length
} 
