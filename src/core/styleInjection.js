/**
 * Core style injection system for HookTML
 * Manages a single shared <style> tag in the document head
*/

import { isEmptyString, isNotNil, isString, isHTMLElement, isNil } from '../utils/type-guards.js'
import { getConfig } from './config.js'
import { removeCloak } from './componentLifecycle.js'
import { logger } from '../utils/logger.js'

/**
 * @typedef {Function & { styles?: string, name: string }} Component
 */

const STYLE_TAG_ID = '__hooktml'
const CLOAK_RULE = '[data-hooktml-cloak] { visibility: hidden; }'

/**
 * Creates the <style> tag and injects the cloak rule if not already present.
 * 
 * @returns {HTMLStyleElement} The shared style element
 */
const getStyleTag = () => {
  const styleTag = document.getElementById(STYLE_TAG_ID)
  
  if (styleTag instanceof HTMLStyleElement) {
    return styleTag
  }
  
  const initStyleTag = document.createElement('style')
  initStyleTag.id = STYLE_TAG_ID
  initStyleTag.textContent = CLOAK_RULE
  document.head.appendChild(initStyleTag)
  return initStyleTag
}

/**
 * Gets the property for the component selector mode.
 * 
 * @param {Component} component
 * @returns {string} The property string.
 */
const getProperty = (component) => {
  const mode = getConfig().componentSelectorMode
  return mode === 'class' ? `.${component.name}` : `[data-component="${component.name}"]`
}

/**
 * Minifies CSS by removing all unnecessary whitespace.
 * This is more robust than trying to normalize with regex patterns.
 * 
 * @param {string} css - The CSS content to minify
 * @returns {string} Minified CSS
 */
const minifyCss = (css) => {
  if (!css) return ''
  
  return css
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove whitespace around punctuation
    .replace(/\s*([{};:,])\s*/g, '$1')
    // Replace multiple whitespace with single space
    .replace(/\s+/g, ' ')
    // Remove whitespace at beginning and end
    .trim()
}

/**
 * Extracts the key parts of a CSS rule for comparison.
 * This creates a simplified representation that ignores formatting.
 * 
 * @param {string} rule - The CSS rule text
 * @returns {string} A normalized version for comparison
 */
const getComparisonKey = (rule) => {
  return minifyCss(rule)
}

/**
 * Converts a component to a valid CSS rule.
 * 
 * @param {Component} component
 * @returns {string} The CSS rule string.
 */
const toCssRule = (component) => {
  const styles = component.styles?.trim() ?? ''
  const property = getProperty(component)
  
  return `${property} { ${styles} }`
}

/**
 * Checks if a rule already exists in the stylesheet by comparing minified versions.
 * 
 * @param {CSSStyleSheet} sheet
 * @param {string} ruleText
 * @returns {boolean}
 */
const ruleExists = (sheet, ruleText) => {
  const newRuleKey = getComparisonKey(ruleText)
  
  return Array.from(sheet.cssRules).some(rule => {
    const existingRuleKey = getComparisonKey(rule.cssText)
    return existingRuleKey === newRuleKey
  })
}

/**
 * Injects styles from a component's static styles property
 * Only injects once per component
 * 
 * @param {Component} component - The component function
 * @param {HTMLElement} element - The component's root element
 * @returns {void}
 */
export const injectComponentStyles = (component, element) => {
  const { debug } = getConfig()
  
  if (!isHTMLElement(element)) {
    throw new Error('[HookTML] injectComponentStyles requires an HTMLElement as second argument')
  }

  // Check if styles property exists but is not a string
  if (isNotNil(component.styles) && !isString(component.styles)) {
    if (debug) {
      logger.warn(
        `Component "${component.name}" has non-string styles property (type: ${typeof component.styles}). Styles must be a string.`, 
        component
      )
    }
    removeCloak(element)
    return
  }

  // If styles is null/undefined or empty string, just remove cloak and return
  if (isNil(component.styles) || isEmptyString(component.styles)) {
    removeCloak(element)
    return
  }

  // Get or create the style tag first to ensure it exists
  const tag = getStyleTag()
  const sheet = tag.sheet
  const rule = toCssRule(component)

  if (isNotNil(sheet)) {
    // Check if rule already exists
    const isDuplicate = ruleExists(sheet, rule)
    
    if (isDuplicate) {
      logger.warn(
          `Duplicate style injection skipped for component "${component.name}". Styles already present in stylesheet.`,
          element
      )
    } else {
      // Add the rule to the stylesheet
      sheet.insertRule(rule, sheet.cssRules.length)
      
      logger.log(`Injected styles for component "${component.name}"`)
    }
  }
  
  // Remove cloak after styles are injected
  removeCloak(element)
} 
 