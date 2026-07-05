import { isEmptyString, isFunction, isNil, isNonEmptyObject, isObject } from '../utils/type-guards.js'
import { tryCatchAsync } from '../utils/try-catch.js'
import { logger } from '../utils/logger.js'

/**
 * @typedef {Object} AutoRegisterOptions
 * @property {string} componentPath - Directory path to scan for components.
 *   SECURITY: this is a TRUSTED, arbitrary-code-execution input. Every
 *   component-looking file under this path is `import()`ed, executing its
 *   top-level module code. Only pass directories you fully control; never a
 *   value derived from untrusted/user input.
 * @property {Function} [register] - Function to register components with
 * @property {boolean} [debug=false] - Enable debug logging
 */

/**
 * Determines whether a file's name looks like a HookTML component file and is
 * therefore safe to import.
 *
 * IMPORTANT: `componentPath` is a TRUSTED, arbitrary-code-execution input by
 * design — every file that is imported below has its top-level module code
 * executed for its side effects, and ESM cannot inspect a module's exports
 * without running it. Only point `componentPath` at directories you control.
 *
 * As defense-in-depth we restrict imports to filenames that could actually be
 * a component: conventional PascalCase files (e.g. `Widget.js`) or kebab/snake
 * files (e.g. `todo-list.js`) that {@link getExpectedExportName} maps to a
 * PascalCase name. This skips lowercase single-word files (e.g. `utils.js`,
 * `index.js`) so their arbitrary top-level code is never executed just by
 * being present in the directory (issue #35).
 * @param {string} filePath - Absolute path to a candidate file
 * @param {{ basename: (p: string, ext?: string) => string, extname: (p: string) => string }} path - Node path module
 * @returns {boolean} Whether the file may be imported as a component
 */
const isImportableComponentFile = (filePath, path) => {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.ts')) return false

  const base = path.basename(filePath, path.extname(filePath))
  // PascalCase (starts with an uppercase ASCII letter) or a kebab/snake name.
  return /^[A-Z]/.test(base) || base.includes('-') || base.includes('_')
}

/**
 * Recursively collects all component-looking .js and .ts files from a
 * directory (Node.js only)
 * @param {string} dir - The directory to scan
 * @returns {Promise<string[]>} Array of file paths
 */
export const collectComponentFiles = async (dir) => {
  const { default: fs } = await import('fs/promises')
  const { default: path } = await import('path')

  const entries = await fs.readdir(dir, { withFileTypes: true })

  const files = await Promise.all(entries.map(async (entry) => {
    const res = path.resolve(dir, entry.name)
    return entry.isDirectory() ? await collectComponentFiles(res) : res
  }))

  return files
    .flat()
    .filter(file => isImportableComponentFile(file, path))
}

/**
 * Converts a file path to the expected component name (PascalCase)
 * @param {string} filePath - Path to the component file
 * @returns {Promise<string>} Expected export name in PascalCase
 */
export const getExpectedExportName = async (filePath) => {
  const { default: path } = await import('path')

  // Extract the filename without extension
  const fileName = path.basename(filePath, path.extname(filePath))

  // Convert to PascalCase if needed
  // Simple conversion for common formats
  if (fileName.includes('-') || fileName.includes('_')) {
    return fileName
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
  }

  // Already PascalCase or single word
  return fileName.charAt(0).toUpperCase() + fileName.slice(1)
}

/**
 * Processes a single component file and attempts to register it
 * @param {string} filePath - File path to load
 * @param {Function} register - Registration function
 * @returns {Promise<boolean>} Whether the component was successfully registered
 */
const processComponentFile = async (filePath, register) => {
  return tryCatchAsync({
    fn: async () => {
      const expectedName = await getExpectedExportName(filePath)
      // Convert the absolute filesystem path to a file:// URL before importing.
      // A bare absolute path fails on Windows (drive letter + backslashes) with
      // ERR_UNSUPPORTED_ESM_URL_SCHEME, which would make every file "fail to
      // import" and register 0 components (issue #35).
      const { pathToFileURL } = await import('url')
      const module = await import(/* @vite-ignore */pathToFileURL(filePath).href)

      // Check if module has a default export
      if (isNil(module.default)) {
        logger.info(`Skipping ${filePath}: No default export found`)
        return false
      }

      // Check if export is a function
      if (!isFunction(module.default)) {
        logger.info(`Skipping ${filePath}: Default export is not a function`)
        return false
      }

      // Check if function name matches expected name
      if (module.default.name !== expectedName) {
        logger.info(`Skipping ${filePath}: Function name "${module.default.name}" doesn't match expected "${expectedName}"`)
        return false
      }

      // Register the component
      register(module.default)
      return true
    },
    onError: (error) => {
      logger.warn(`Failed to import ${filePath}: ${error.message}`)
      return false
    }
  })
}

/**
 * Loads and validates components from file paths (Node.js approach)
 * @param {string[]} filePaths - File paths to load
 * @param {Function} register - Registration function
 * @returns {Promise<number>} Number of valid components loaded
 */
export const loadValidComponents = async (filePaths, register) => {
  const results = await Promise.all(
    filePaths.map(filePath => processComponentFile(filePath, register))
  )

  return results.filter(Boolean).length
}

/**
 * Auto-registers components using Node.js filesystem approach
 * @param {AutoRegisterOptions} options - Registration options
 * @returns {Promise<number>} Number of components registered
 */
const autoRegisterWithNodeJS = async (options) => {
  const { componentPath, register, debug } = options

  // Ensure register function is defined
  if (!isFunction(register)) {
    throw new Error('[HookTML] register function is required')
  }

  return tryCatchAsync({
    fn: async () => {
      // Collect component files
      const files = await collectComponentFiles(componentPath)

      if (debug) {
        logger.info(`Found ${files.length} potential component files in ${componentPath}`)
      }

      // Load and register valid components
      const registeredCount = await loadValidComponents(files, register)

      if (debug) {
        logger.info(`Successfully registered ${registeredCount} components from ${componentPath}`)
      }

      return registeredCount
    },
    onError: (error) => {
      logger.error(`Error auto-registering components: ${error.message}`)
      return 0
    }
  })
}

/**
 * Auto-registers components from a directory using available strategies
 * @param {AutoRegisterOptions} options - Options for auto-registration
 * @returns {Promise<number>} Number of components registered
 */
export const autoRegisterComponents = async (options) => {
  // Validate input
  if (isNil(options) || !isObject(options)) {
    throw new Error('[HookTML] autoRegisterComponents: options object is required')
  }

  const { componentPath = './components', register, debug = false } = options

  if (!isFunction(register)) {
    throw new Error('[HookTML] autoRegisterComponents: register function is required')
  }

  if (isEmptyString(componentPath)) {
    throw new Error('[HookTML] autoRegisterComponents: componentPath must be a non-empty string')
  }

  // Strategy 1: Node.js filesystem approach.
  // Guard the bare `process` reference so this does not throw a ReferenceError
  // in a non-Node, non-shimmed browser build (issue #35).
  if (typeof process !== 'undefined' && isNonEmptyObject(process.versions) && process.versions.node) {
    if (debug) {
      logger.info('Using Node.js filesystem auto-registration')
    }

    return await autoRegisterWithNodeJS(options)
  }

  // Strategy 2: Graceful fallback
  if (debug) {
    logger.warn('Auto-registration not supported in this environment. Please register components manually.')
  }

  return 0
}
