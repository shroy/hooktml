/**
 * Core React-like hooks for HookTML components
 */
import { useEffect } from '../core/hookContext.js'
import { useChildren } from './useChildren.js'
import { useEvents } from './useEvents.js'
import { useClasses } from './useClasses.js'
import { useAttributes } from './useAttributes.js'
import { useStyles } from './useStyles.js'
import { useText } from './useText.js'

// Export the core hooks
export {
  useEffect,
  useChildren,
  useEvents,
  useClasses,
  useAttributes,
  useStyles,
  useText
}
