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

  // Track every listener we actually add as an {element, eventName, wrapper}
  // tuple so cleanup removes exactly what was added — one entry per element per
  // event, avoiding the leak from keying by event name alone.
  let currentHandlers = []

  const removeCurrentHandlers = () => {
    currentHandlers.forEach(({ element, eventName, wrapper }) => {
      element.removeEventListener(eventName, wrapper)
    })
    currentHandlers = []
  }

  const updateEventListeners = () => {
    removeCurrentHandlers()

    Object.entries(eventMap).forEach(([eventName, handlerOrSignal]) => {
      const initialHandler = isSignal(handlerOrSignal)
        ? handlerOrSignal.value
        : handlerOrSignal

      if (!isFunction(initialHandler)) {
        logger.warn(`Event handler for '${eventName}' is not a function, skipping`)
        return
      }

      elements.forEach((element, index) => {
        /**
         * Resolve the handler at dispatch time so signal-wrapped handlers fire
         * (the raw signal is never bound) and swaps take effect without re-bind.
         * @param {Event} event
         */
        const wrapper = (event) => {
          const handler = isSignal(handlerOrSignal)
            ? handlerOrSignal.value
            : handlerOrSignal

          if (isFunction(handler)) {
            handler(event, index)
          }
        }

        element.addEventListener(eventName, wrapper)

        currentHandlers.push({ element, eventName, wrapper })
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
    removeCurrentHandlers()
  }
}
