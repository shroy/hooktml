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
// Aligned with the documented FOUC-prevention rule (README "FOUC Prevention").
const CLOAK_RULE = '[data-hooktml-cloak] { display: none !important; }'

/**
 * Component names for which a duplicate-style injection has already been logged.
 * Used to dedupe the (debug-gated) duplicate notice so expected multi-instance
 * usage does not spam the console.
 * @type {Set<string>}
 */
const loggedDuplicates = new Set()

/**
 * Escapes a string for safe use as a CSS identifier (class name / attribute
 * value), following the CSS.escape algorithm. Component names are normally plain
 * identifiers, but escaping hardens the raw interpolation into the shared sheet.
 *
 * @param {string} value - The identifier to escape
 * @returns {string} The escaped identifier
 */
const escapeCssIdentifier = (value) => {
  const str = String(value)
  const { length } = str
  let result = ''

  for (let i = 0; i < length; i++) {
    const code = str.charCodeAt(i)

    // NULL -> U+FFFD REPLACEMENT CHARACTER
    if (code === 0x0000) {
      result += '�'
      continue
    }

    if (
      // Control characters and DEL, escaped as a code point.
      (code >= 0x0001 && code <= 0x001f) ||
      code === 0x007f ||
      // A leading digit, escaped as a code point.
      (i === 0 && code >= 0x0030 && code <= 0x0039) ||
      // A digit at index 1 preceded by a leading hyphen, escaped as a code point.
      (i === 1 && code >= 0x0030 && code <= 0x0039 && str.charCodeAt(0) === 0x002d)
    ) {
      result += `\\${code.toString(16)} `
      continue
    }

    // A single leading hyphen with nothing after it.
    if (i === 0 && length === 1 && code === 0x002d) {
      result += `\\${str.charAt(i)}`
      continue
    }

    // Identifier-safe characters are emitted as-is.
    if (
      code >= 0x0080 ||
      code === 0x002d || // -
      code === 0x005f || // _
      (code >= 0x0030 && code <= 0x0039) || // 0-9
      (code >= 0x0041 && code <= 0x005a) || // A-Z
      (code >= 0x0061 && code <= 0x007a) // a-z
    ) {
      result += str.charAt(i)
      continue
    }

    // Everything else is backslash-escaped literally.
    result += `\\${str.charAt(i)}`
  }

  return result
}

/**
 * Ensures the shared <style> tag exists and contains the cloak-hiding rule.
 * Safe to call multiple times; the cloak rule is added at most once.
 *
 * @returns {HTMLStyleElement} The shared style element
 */
const getStyleTag = () => {
  const styleTag = document.getElementById(STYLE_TAG_ID)

  if (styleTag instanceof HTMLStyleElement) {
    return styleTag
  }

  // A fresh stylesheet is being created: reset the per-stylesheet duplicate
  // bookkeeping so the dedup notice is scoped to the current sheet.
  loggedDuplicates.clear()

  const initStyleTag = document.createElement('style')
  initStyleTag.id = STYLE_TAG_ID
  initStyleTag.textContent = CLOAK_RULE
  document.head.appendChild(initStyleTag)
  return initStyleTag
}

/**
 * Injects the shared <style> tag and its `[data-hooktml-cloak]` hiding rule.
 * Called unconditionally during start() so cloaked elements are hidden as soon
 * as the runtime starts, even when only style-less components are registered.
 *
 * @returns {void}
 */
export const injectCloakStyles = () => {
  getStyleTag()
}

/**
 * Gets the property for the component selector mode.
 *
 * Defaults to class scoping (`.Name`) to match the documented behaviour and how
 * scanComponents binds components; `data` mode emits `[data-component="Name"]`.
 * The interpolated component name is escaped to keep the raw string safe.
 *
 * @param {Component} component
 * @returns {string} The property string.
 */
const getProperty = (component) => {
  const mode = getConfig().componentSelectorMode
  const name = escapeCssIdentifier(component.name)
  return mode === 'data' ? `[data-component="${name}"]` : `.${name}`
}

/**
 * Checks whether a raw CSS string has balanced curly braces.
 *
 * Component `styles` are a trusted, developer-supplied raw-CSS channel into the
 * shared stylesheet (see README) — this is a lightweight guard, not a sanitizer.
 * Rejecting unbalanced braces early avoids feeding a broken rule to insertRule.
 *
 * @param {string} styles - The raw styles string
 * @returns {boolean} Whether braces are balanced
 */
const hasBalancedBraces = (styles) => {
  let depth = 0
  for (let i = 0; i < styles.length; i++) {
    const ch = styles[i]
    if (ch === '{') {
      depth += 1
    } else if (ch === '}') {
      depth -= 1
      if (depth < 0) return false
    }
  }
  return depth === 0
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

  // `styles` is a trusted, developer-supplied raw-CSS channel into the shared
  // stylesheet (see README). Reject unbalanced braces early with a clear
  // warning rather than feeding a broken rule to insertRule and stranding the
  // cloak. Cloak removal below stays unconditional either way.
  if (!hasBalancedBraces(component.styles)) {
    logger.warn(
      `Invalid styles for component "${component.name}": unbalanced braces in CSS. Styles rejected.`,
      element
    )
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
      // Dedupe by component name and downgrade to a debug-gated log so that
      // expected multi-instance usage does not spam the console.
      if (!loggedDuplicates.has(component.name)) {
        loggedDuplicates.add(component.name)
        logger.log(
          `Duplicate style injection skipped for component "${component.name}". Styles already present in stylesheet.`,
          element
        )
      }
    } else {
      try {
        // insertRule accepts exactly one rule; a multi-rule string (e.g. a media
        // query in `styles`) throws. Never let that throw escape -- it would skip
        // cloak removal and markInitialized in the caller.
        sheet.insertRule(rule, sheet.cssRules.length)
      } catch {
        // Fall back to appending the rule text so multi-rule / CSSOM-rejected but
        // brace-balanced CSS is still parsed leniently by the browser.
        tag.textContent += `\n${rule}`
      }

      logger.log(`Injected styles for component "${component.name}"`)
    }
  }

  // Remove cloak after styles are injected (unconditional).
  removeCloak(element)
}
 