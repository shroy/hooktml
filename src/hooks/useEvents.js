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
 * @param {Record<string, (event: Event, index: number) => void | {value: (event: Event, index: number) => void, subscribe: Function}>} eventMap - Object mapping event names to handlers or signals containing handlers
 * @returns {Function} Cleanup function that removes all event listeners
 */
export const useEvents = (elementOrElements, eventMap, deps = []) => {

  if (isNil(elementOrElements)) {
    logger.info('[HookTML] useEvents called with null/undefined element, skipping event registration')
    return () => { } // Return no-op cleanup function
  }

  if (isEmptyArray(elementOrElements)) {
    logger.info('[HookTML] useEvents called with empty array, skipping event registration')
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

  const implicitDeps = Object.values(eventMap).filter(isSignal)
  const allDeps = implicitDeps.concat(deps);

  const currentHandlers = new Map()

  const updateEventListeners = () => {
    currentHandlers.forEach((handler, eventName) => {
      elements.forEach(element => {
        element.removeEventListener(eventName, handler)
      })
    })
    currentHandlers.clear()

    const validHandlers = Object.entries(eventMap).filter(([eventName, handlerOrSignal]) => {
      const handler = isSignal(handlerOrSignal)
        ? handlerOrSignal.value
        : handlerOrSignal

      if (!isFunction(handler)) {
        logger.warn(`Event handler for '${eventName}' is not a function, skipping`)
        return
      }

      return [eventName, handler]
    })

    elements.forEach((element, index) => {
      validHandlers.forEach(([eventName, handler]) => {
        /**
         * @param {Event} event
         */
        const handlerWithIndex = (event) => {
          if (isFunction(handler)) {
            handler(event, index)
          }
        }

        element.addEventListener(eventName, handlerWithIndex)

        currentHandlers.set(eventName, handlerWithIndex)
      })
    })
  }

  updateEventListeners()

  if (isNonEmptyArray(allDeps)) {
    useEffect(() => {
      updateEventListeners()
    }, allDeps)
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
