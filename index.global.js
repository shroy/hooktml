import {
  start,
  scan,
  registerComponent,
  registerHook,
  registerChainableHook,
  useEffect,
  useChildren,
  useEvents,
  useClasses,
  useAttributes,
  useStyles,
  useText,
  with as withEl,
  signal,
  computed,
  getConfig
} from './index.browser.js'

// Create HookTML global namespace (like Vue's approach)
Object.assign(window, {
  HookTML: {
    start,
    scan,
    registerComponent,
    registerHook,
    registerChainableHook,
    useEffect,
    useChildren,
    useEvents,
    useClasses,
    useAttributes,
    useStyles,
    useText,
    with: withEl,
    signal,
    computed,
    getConfig
  }
}) 
