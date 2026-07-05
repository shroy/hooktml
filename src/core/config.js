import { isEmptyString, isNil, isString } from '../utils/type-guards.js'

/**
 * @typedef {'class' | 'data'} ComponentSelectorMode
 */

/**
 * @typedef {Object} HookTMLConfig
 * @property {boolean} [debug=false] - Whether to enable debug logging
 * @property {string} [attributePrefix=''] - Optional prefix for all HookTML attributes
 * @property {string} [componentPath] - Path to scan for auto-registering components
 * @property {ComponentSelectorMode} [componentSelectorMode='class'] - How `Component.styles` are scoped: `'class'` emits `.Name`, `'data'` emits `[data-component="Name"]`
 * @property {string} [formattedPrefix=''] - Internal: attributePrefix formatted with trailing dash
 */

/**
 * @typedef {Object} HookTMLConfigOptions
 * @property {boolean} [debug=false] - Whether debug mode is enabled
 * @property {string} [attributePrefix] - Optional prefix for all HookTML attributes
 * @property {string} [componentPath] - Path to scan for auto-registering components
 * @property {ComponentSelectorMode} [componentSelectorMode] - How `Component.styles` are scoped (`'class'` or `'data'`)
 * @property {string} [formattedPrefix] - Internal: attributePrefix formatted with trailing dash
 */

/**
 * Valid values for componentSelectorMode.
 * @type {ReadonlyArray<ComponentSelectorMode>}
 */
const COMPONENT_SELECTOR_MODES = ['class', 'data']

/**
 * Default configuration
 * @type {HookTMLConfig}
 */
const defaultConfig = {
  componentPath: undefined,
  debug: false,
  attributePrefix: '',
  componentSelectorMode: 'class',
  formattedPrefix: ''
}

/**
 * Current runtime configuration.
 * Frozen so `getConfig()` can hand back a stable reference without cloning
 * on every call (see issue #32).
 * @type {HookTMLConfig}
 */
let config = Object.freeze({ ...defaultConfig })

/**
 * Valid attribute prefixes must be usable inside a CSS attribute selector.
 * They must start with an ASCII letter and contain only word characters
 * (letters, digits, underscore) or dashes. This prevents a CSS-significant
 * prefix (e.g. `'foo]'`) from being spliced into a selector and throwing a
 * SyntaxError inside `querySelectorAll`, which would permanently break DOM
 * scanning / observation (issue #33).
 *
 * A single trailing dash is tolerated because prefixes are commonly written
 * with one (e.g. `'data-'`); the pattern below allows dashes anywhere.
 * @type {RegExp}
 */
const VALID_PREFIX = /^[a-zA-Z][\w-]*$/

/**
 * Format the attribute prefix to ensure it has a trailing dash.
 *
 * Invalid prefixes (non-string, empty, or containing CSS-significant
 * characters) are rejected and fall back to no prefix so a malformed value
 * can never crash selector construction (issue #33).
 * @param {string|undefined} prefix - The raw prefix
 * @returns {string} - The formatted prefix with a trailing dash, or '' if invalid
 */
const formatPrefix = (prefix) => {
  if (isNil(prefix) || !isString(prefix) || isEmptyString(prefix)) return ''

  // Validate against the bare prefix (without any trailing dash) so a lone
  // trailing dash like 'data-' is accepted while CSS-significant characters
  // are not.
  const bare = prefix.endsWith('-') ? prefix.slice(0, -1) : prefix
  if (!VALID_PREFIX.test(bare)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[HookTML] Invalid attributePrefix "${prefix}". ` +
      'Prefixes must start with a letter and contain only letters, digits, ' +
      'underscores or dashes. Falling back to no prefix.'
    )
    return ''
  }

  return prefix.endsWith('-') ? prefix : `${prefix}-`
}

/**
 * Initialize the runtime configuration
 * @param {Partial<HookTMLConfig>} [options] - Configuration options
 */
export const initConfig = (options = {}) => {
  const normalizedOptions = { ...options }

  if ('attributePrefix' in normalizedOptions) {
    normalizedOptions.formattedPrefix = formatPrefix(normalizedOptions.attributePrefix)
  }

  if (
    'componentSelectorMode' in normalizedOptions &&
    !COMPONENT_SELECTOR_MODES.includes(normalizedOptions.componentSelectorMode)
  ) {
    // Reject invalid values with a clear warning and fall back to the default.
    // Uses console directly to avoid a circular import with the logger module.
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(
        `[HookTML] Invalid componentSelectorMode "${normalizedOptions.componentSelectorMode}". ` +
        `Expected one of ${COMPONENT_SELECTOR_MODES.map((m) => `"${m}"`).join(', ')}. ` +
        `Falling back to "${defaultConfig.componentSelectorMode}".`
      )
    }
    delete normalizedOptions.componentSelectorMode
  }

  config = Object.freeze({ ...defaultConfig, ...normalizedOptions })
}

/**
 * Get the current runtime configuration.
 * Returns a stable, frozen reference — callers must not mutate it. This avoids
 * allocating a fresh clone on every call (issue #32).
 * @returns {HookTMLConfig}
 */
export const getConfig = () => config

/**
 * Read the `debug` flag directly without materialising the whole config.
 * Used by the logger to gate suppressed log lines without cloning (issue #32).
 * @returns {boolean}
 */
export const isDebug = () => config.debug
