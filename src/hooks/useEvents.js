import {
  isEventTarget,
  isEventTargetArray,
  isNonEmptyObject,
  isFunction,
  isSignal,
  isNil,
  isEmptyArray,
  isNonEmptyArray
} from '../utils/type-guards.js'
import { useEffect } from '../core/hookContext.js'
import { logger } from '../utils/logger.js'

/**
 * Hook for adding event listeners with automatic cleanup
 * @param {EventTarget|EventTarget[]|null|undefined} elementOrElements - The element(s) to attach events to (HTMLElement, Document, Window, array of these, or null/undefined)
 * @param {Record<string, EventListener|{value: EventListener, subscribe: Function}>} eventMap - Object mapping event names to handlers or signals containing handlers
 * @returns {Function} Cleanup function that removes all event listeners
 */
export const useEvents = (elementOrElements, eventMap) => {

  if (isNil(elementOrElements)) {
    logger.warn('[HookTML] useEvents called with null/undefined element, skipping event registration')
    return () => { } // Return no-op cleanup function
  }

  if (isEmptyArray(elementOrElements)) {
    logger.warn('[HookTML] useEvents called with empty array, skipping event registration')
    return () => { } // Return no-op cleanup function
  }

  const isValidSingle = isEventTarget(elementOrElements)
  const isValidArray = isEventTargetArray(elementOrElements)

  if (!isValidSingle && !isValidArray) {
    throw new Error('[HookTML] useEvents requires an EventTarget or array of EventTargets as first argument')
  }

  const elements = isValidArray ? elementOrElements : [elementOrElements]

  if (!isNonEmptyObject(eventMap)) {
    throw new Error('[HookTML] useEvents requires a non-empty object mapping event names to listeners')
  }

  const signalDeps = Object.values(eventMap).filter(isSignal)

  const currentHandlers = new Map()

  const updateEventListeners = () => {
    currentHandlers.forEach((handler, eventName) => {
      elements.forEach(element => {
        element.removeEventListener(eventName, handler)
      })
    })
    currentHandlers.clear()

    Object.entries(eventMap).forEach(([eventName, handlerOrSignal]) => {
      const handler = isSignal(handlerOrSignal)
        ? handlerOrSignal.value
        : handlerOrSignal

      if (!isFunction(handler)) {
        logger.warn(`Event handler for '${eventName}' is not a function, skipping`)
        return
      }

      elements.forEach(element => {
        element.addEventListener(eventName, handler)
      })

      currentHandlers.set(eventName, handler)
    })
  }

  updateEventListeners()

  if (isNonEmptyArray(signalDeps)) {
    useEffect(() => {
      updateEventListeners()
    }, signalDeps)
  }

  return () => {
    currentHandlers.forEach((handler, eventName) => {
      elements.forEach(element => {
        element.removeEventListener(eventName, handler)
      })
    })
    currentHandlers.clear()
  }
} 
