/**
 * Hook for adding event listeners with automatic cleanup
 * @param {HTMLElement} element - The element to attach events to
 * @param {Record<string, EventListener|{value: EventListener, subscribe: Function}>} eventMap - Object mapping event names to handlers or signals containing handlers
 * @returns {Function} Cleanup function that removes all event listeners
 */
import { isHTMLElement, isNonEmptyObject, isFunction, isSignal } from '../utils/type-guards.js'
import { useEffect } from '../core/hookContext.js'
import { logger } from '../utils/logger.js'

export const useEvents = (element, eventMap) => {
  if (!isHTMLElement(element)) {
    throw new Error('[HookTML] useEvents requires an HTMLElement as first argument')
  }

  if (!isNonEmptyObject(eventMap)) {
    throw new Error('[HookTML] useEvents requires a non-empty object mapping event names to listeners')
  }

  // Extract signals from eventMap for effect dependencies
  const signalDeps = Object.values(eventMap).filter(isSignal)

  // Store current handlers for cleanup
  const currentHandlers = new Map()

  // Function to update event listeners based on current handlers
  const updateEventListeners = () => {
    // Remove previous handlers
    currentHandlers.forEach((handler, eventName) => {
      element.removeEventListener(eventName, handler)
    })
    currentHandlers.clear()

    // Add all event listeners with current values
    Object.entries(eventMap).forEach(([eventName, handlerOrSignal]) => {
      // Extract the actual handler (either direct or from signal)
      const handler = isSignal(handlerOrSignal)
        ? handlerOrSignal.value
        : handlerOrSignal

      if (!isFunction(handler)) {
        logger.warn(`Event handler for '${eventName}' is not a function, skipping`)
        return
      }

      element.addEventListener(eventName, handler)
      currentHandlers.set(eventName, handler)
    })
  }

  // Initial setup of event listeners
  updateEventListeners()

  // Set up reactive updates if any signals were provided
  if (signalDeps.length > 0) {
    useEffect(() => {
      updateEventListeners()
    }, signalDeps)
  }

  // Return cleanup function
  return () => {
    currentHandlers.forEach((handler, eventName) => {
      element.removeEventListener(eventName, handler)
    })
    currentHandlers.clear()
  }
} 
