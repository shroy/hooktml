import { isEmptyString, isFunction, isNil, isNonEmptyObject, isObject } from '../utils/type-guards.js'
import { tryCatchAsync } from '../utils/try-catch.js'
import { logger } from '../utils/logger.js'

/**
 * @typedef {Object} AutoRegisterOptions
 * @property {string} componentPath - Directory path to scan for components
 * @property {Function} [register] - Function to register components with
 * @property {boolean} [debug=false] - Enable debug logging
 */

/**
 * Recursively collects all .js and .ts files from a directory (Node.js only)
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
    .filter(file => file.endsWith('.js') || file.endsWith('.ts'))
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
      const module = await import(/* @vite-ignore */filePath)

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
 * Processes a single module entry from bundler glob imports
 * @param {[string, Function]} moduleEntry - [path, moduleLoader] pair
 * @param {Function} register - Registration function
 * @param {boolean} debug - Enable debug logging
 * @returns {Promise<boolean>} Whether the component was successfully registered
 */
const processBundlerModule = async ([path, moduleLoader], register, debug) => {
  return tryCatchAsync({
    fn: async () => {
      const module = await moduleLoader()

      // Check if module has a default export that's a function
      if (isNil(module.default) || !isFunction(module.default)) {
        if (debug) {
          logger.info(`Skipping ${path}: No valid default export`)
        }
        return false
      }

      // Register the component
      register(module.default)

      if (debug) {
        logger.info(`Registered component: ${module.default.name} from ${path}`)
      }

      return true
    },
    onError: (error) => {
      logger.warn(`Failed to load component from ${path}: ${error.message}`)
      return false
    }
  })
}

/**
 * Gets bundler modules (limited due to static analysis requirements)
 * @param {string} componentPath - Component directory path
 * @param {boolean} debug - Enable debug logging
 * @returns {Record<string, Function>} Module entries from bundler
 */
const getBundlerModules = (componentPath, debug) => {
  if (debug) {
    logger.warn(`Bundler auto-registration cannot dynamically use componentPath "${componentPath}"`)
    logger.info('Bundlers require static import patterns. Use Node.js environment for dynamic paths.')
  }

  return {}
}

/**
 * Auto-registers components using bundler's glob import (Vite, Webpack, etc.)
 * Note: This requires the bundler to be configured with static glob patterns
 * @param {string} componentPath - Component directory path
 * @param {Function} register - Registration function
 * @param {boolean} debug - Enable debug logging
 * @returns {Promise<number>} Number of components registered
 */
const autoRegisterWithBundler = async (componentPath, register, debug) => {
  const modules = getBundlerModules(componentPath, debug)
  const moduleEntries = Object.entries(modules)

  if (debug) {
    logger.info(`Found ${moduleEntries.length} potential component files using bundler`)
  }

  const results = await Promise.all(
    moduleEntries.map(entry => processBundlerModule(entry, register, debug))
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

  // Strategy 1: Node.js filesystem approach
  if (isNonEmptyObject(process.versions) && process.versions.node) {
    if (debug) {
      logger.info('Using Node.js filesystem auto-registration')
    }

    return await autoRegisterWithNodeJS(options)
  }

  // Strategy 2: Bundler approach (Vite, Webpack, etc.)
  // @ts-ignore - import.meta.glob is provided by bundlers like Vite
  if (isFunction(import.meta?.glob)) {
    if (debug) {
      logger.info('Using bundler auto-registration')
    }

    return tryCatchAsync({
      fn: async () => {
        const registeredCount = await autoRegisterWithBundler(componentPath, register, debug)

        if (debug) {
          logger.info(`Successfully registered ${registeredCount} components using bundler`)
        }

        return registeredCount
      },
      onError: (error) => {
        logger.error(`Error auto-registering components with bundler: ${error.message}`)
        return 0
      }
    })
  }

  // Strategy 3: Graceful fallback
  if (debug) {
    logger.warn('Auto-registration not supported in this environment. Please register components manually.')
  }

  return 0
} 
