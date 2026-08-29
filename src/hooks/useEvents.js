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

  // Maps event names to per-element wrapper functions (parallel to `elements`)
  const currentHandlers = new Map()

  const removeEventListeners = () => {
    currentHandlers.forEach((wrappers, eventName) => {
      elements.forEach((element, index) => {
        element.removeEventListener(eventName, wrappers[index])
      })
    })
    currentHandlers.clear()
  }

  const updateEventListeners = () => {
    removeEventListeners()

    const validHandlers = Object.entries(eventMap)
      .map(([eventName, handlerOrSignal]) => [
        eventName,
        isSignal(handlerOrSignal) ? handlerOrSignal.value : handlerOrSignal
      ])
      .filter(([eventName, handler]) => {
        if (!isFunction(handler)) {
          logger.warn(`Event handler for '${eventName}' is not a function, skipping`)
          return false
        }

        return true
      })

    validHandlers.forEach(([eventName, handler]) => {
      const wrappers = elements.map((element, index) => {
        /**
         * @param {Event} event
         */
        const handlerWithIndex = (event) => {
          handler(event, index)
        }

        element.addEventListener(eventName, handlerWithIndex)

        return handlerWithIndex
      })

      currentHandlers.set(eventName, wrappers)
    })
  }

  updateEventListeners()

  if (isNonEmptyArray(allDeps)) {
    useEffect(() => {
      updateEventListeners()
    }, allDeps)
  }

  return removeEventListeners
} 
