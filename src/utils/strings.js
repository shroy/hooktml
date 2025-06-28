/**
 * Converts a kebab-case string to camelCase
 * @param {string} str - The kebab-case string to convert
 * @returns {string} The camelCase version of the string
 */
export const kebabToCamel = (str) => {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Converts a camelCase string to kebab-case
 * @param {string} str - The camelCase string to convert
 * @returns {string} The kebab-case version of the string
 */
export const camelToKebab = (str) => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * Pluralizes a camelCase string
 * @param {string} str - The camelCase string to pluralize
 * @returns {string} The pluralized form
 */
export const pluralize = (str) => {
  if (/[^aeiou]y$/.test(str)) {
    return str.slice(0, -1) + 'ies'
  }
  if (/(s|x|z|ch|sh)$/.test(str)) {
    return str + 'es'
  }
  return str + 's'
}
