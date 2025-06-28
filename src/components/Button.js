import { registerComponent } from '../core/registry.js'
import { logger } from '../utils/logger.js'

/**
 * @typedef {Object} ButtonOptions
 * @property {string} [variant='default'] - The button variant (default, primary, secondary)
 * @property {string} [size='medium'] - The button size (small, medium, large)
 */

/**
 * Button component implementation
 * @param {HTMLElement} element - The DOM element
 * @param {ButtonOptions} [options={}] - Component options
 * @returns {Object} Component API
 */
const Button = (element, options = {}) => {
  // Extract options with defaults
  const variant = options.variant || 'default'
  const size = options.size || 'medium'
  
  logger.log(`Initializing ${size} ${variant} button`, element)
  
  // Add internal event handling
  const handleClick = () => {
    logger.log('Clicked!')
    element.classList.add('button-clicked')
    
    // Remove the class after animation
    setTimeout(() => {
      element.classList.remove('button-clicked')
    }, 300)
  }
  
  // Set up event listeners
  element.addEventListener('click', handleClick)
  
  // Apply styling based on options
  element.classList.add(`button-${variant}`, `button-${size}`)
  
  // Return component API with methods for interaction
  return {
    element,
    
    // Public methods
    click: () => {
      handleClick()
      element.click()
    },
    
    // Cleanup function (will be used in future lifecycle implementation)
    destroy: () => {
      element.removeEventListener('click', handleClick)
      element.classList.remove(`button-${variant}`, `button-${size}`)
      logger.log('Destroyed')
    }
  }
}

// Register the component with HookTML
// The name will be automatically derived from the function name
registerComponent(Button) 
