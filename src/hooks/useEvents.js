/**
 * Hook for adding event listeners with automatic cleanup
 * @param {EventTarget|EventTarget[]|null|undefined} elementOrElements - The element(s) to attach events to (HTMLElement, Document, Window, array of these, or null/undefined)
 * @param {Record<string, EventListener|{value: EventListener, subscribe: Function}>} eventMap - Object mapping event names to handlers or signals containing handlers
 * @returns {Function} Cleanup function that removes all event listeners
 */
import { isEventTarget, isEventTargetArray, isNonEmptyObject, isFunction, isSignal, isNil } from '../utils/type-guards.js'
import { useEffect } from '../core/hookContext.js'
import { logger } from '../utils/logger.js'

export const useEvents = (elementOrElements, eventMap) => {
  // Handle null/undefined elements gracefully
  if (isNil(elementOrElements)) {
    logger.warn('[HookTML] useEvents called with null/undefined element, skipping event registration')
    return () => { } // Return no-op cleanup function
  }

  // Validate input - accept single element or array of elements
  const isValidSingle = isEventTarget(elementOrElements)
  const isValidArray = isEventTargetArray(elementOrElements)

  if (!isValidSingle && !isValidArray) {
    throw new Error('[HookTML] useEvents requires an EventTarget or array of EventTargets as first argument')
  }

  // Normalize to array for consistent processing
  const elements = isValidArray ? elementOrElements : [elementOrElements]

  if (!isNonEmptyObject(eventMap)) {
    throw new Error('[HookTML] useEvents requires a non-empty object mapping event names to listeners')
  }

  // Extract signals from eventMap for effect dependencies
  const signalDeps = Object.values(eventMap).filter(isSignal)

  // Store current handlers for cleanup - single Map shared across all elements
  const currentHandlers = new Map()

  // Function to update event listeners based on current handlers
  const updateEventListeners = () => {
    // Remove previous handlers from all elements
    currentHandlers.forEach((handler, eventName) => {
      elements.forEach(element => {
        element.removeEventListener(eventName, handler)
      })
    })
    currentHandlers.clear()

    // Add all event listeners with current values to all elements
    Object.entries(eventMap).forEach(([eventName, handlerOrSignal]) => {
      // Extract the actual handler (either direct or from signal)
      const handler = isSignal(handlerOrSignal)
        ? handlerOrSignal.value
        : handlerOrSignal

      if (!isFunction(handler)) {
        logger.warn(`Event handler for '${eventName}' is not a function, skipping`)
        return
      }

      // Add to all elements
      elements.forEach(element => {
        element.addEventListener(eventName, handler)
      })

      // Store handler once for cleanup
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
      elements.forEach(element => {
        element.removeEventListener(eventName, handler)
      })
    })
    currentHandlers.clear()
  }
} 
