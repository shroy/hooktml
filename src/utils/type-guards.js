/**
 * Check if a value is null or undefined.
 *
 * @param {unknown} value - The value to check.
 * @returns {value is null | undefined} Whether or not the value is null or undefined.
 */
export const isNil = value =>
  value === null || typeof value === 'undefined'

/**
 * Check if a value is undefined.
 *
 * @param {unknown} value - The value to check.
 * @returns {value is undefined} Whether or not the value is undefined.
 */
export const isUndefined = value => typeof value === 'undefined'

/**
 * Check if a value is not null or undefined.
 *
 * @template T
 * @param {T} value - The value to check. Can be of any type, except for null or undefined.
 * @returns {value is Exclude<T, null | undefined>} Whether or not the value is not null or undefined.
 */
export const isNotNil = value => !isNil(value)

/**
 * Check if a value is a numeric string.
 *
 * @param {unknown} value - The value to check.
 * @returns {value is string} Whether or not the value is a numeric string.
 */
export const isNumeric = value => typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))

/**
 * Check if a value is a string.
 *
 * @param {unknown} value - The value to check.
 * @returns {value is string} Whether or not the value is a string.
 */
export const isString = value => typeof value === 'string'

/**
 * Check if a value is a non-empty string.
 *
 * @param {unknown} value - The value to check.
 * @returns {value is string} Whether or not the value is a non-empty string.
 */
export const isNonEmptyString = value => isString(value) && value.length > 0

/** 
 * Check if a value is an empty string
 * 
 * @param {unknown} value - The value to check
 * @returns {boolean} Whether or not the value is an empty string
 */
export const isEmptyString = value => isString(value) && value.length === 0

/**
 * Check if a value is an object and has at least one property.
 *
 * @template T
 * @param {T} value - The value to check
 * @returns {value is NonNullable<T> & Record<string, unknown>} Whether or not the value is an object and has at least one property
 */
export const isNonEmptyObject = (value) => {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  )
}

/**
 * Check if a value is a function
 * @param {unknown} value
 * @returns {value is Function} Whether or not the value is a function
 */
export const isFunction = value => typeof value === 'function'

/**
 * Check if a value is an array
 * @template T
 * @param {T} value
 * @returns {value is Array<T>} Whether or not the value is an array
 */
export const isArray = value => Array.isArray(value)

/**
 * Check if a value is an empty array
 * @template T
 * @param {T} value
 * @returns {value is T[]} Whether or not the value is an empty array
 */
export const isEmptyArray = value => isArray(value) && value.length === 0

/**
 * Check if a value is a non-empty array
 * @param {unknown} value
 * @returns {value is Array<unknown>} Whether or not the value is a non-empty array
 */
export const isNonEmptyArray = value => isArray(value) && value.length > 0

/**
 * Check if a value is an HTMLElement
 * @param {unknown} value
 * @returns {value is HTMLElement} Whether or not the value is an HTMLElement
 */
export const isHTMLElement = value => value instanceof HTMLElement

/**
 * Check if a value is a valid event target (HTMLElement, Document, or Window)
 * @param {unknown} value
 * @returns {value is EventTarget} Whether or not the value is a valid event target
 */
export const isEventTarget = value => {
  if (!value || typeof value !== 'object') return false

  if (value instanceof HTMLElement) return true

  if (value === document ||
    ('nodeType' in value && value.nodeType === 9 && 'addEventListener' in value && isFunction(value.addEventListener))) {
    return true
  }

  if (value === window ||
    ('window' in value && value.window === value && 'addEventListener' in value && isFunction(value.addEventListener))) {
    return true
  }

  return false
}

/**
 * Check if a value is an object
 * @param {unknown} value
 * @returns {value is Record<string, unknown>} Whether or not the value is an object
 */
export const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * @template T
 * @typedef {Object} Signal
 * @property {T} value
 * @property {Function} subscribe
 */

/**
 * Determines if an object is a signal (has .value getter/setter and subscribe method)
 * 
 * @template T
 * @param {unknown} obj - The object to check
 * @returns {obj is Signal<T>} - Whether the object is a signal with value property
 */
export const isSignal = (obj) => {
  return isNonEmptyObject(obj) &&
    'value' in obj &&
    'subscribe' in obj &&
    isFunction(obj.subscribe)
}
