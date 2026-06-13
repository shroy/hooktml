# HookTML — Agent Reference

HookTML is a JavaScript library for adding interactive behavior to HTML without a virtual DOM, templating engine, or rendering system. It looks superficially like React (hooks, signals, `useEffect`) but operates on a fundamentally different model.

## Mental Model

- **HTML is the source of truth.** You never generate markup from JS. You enhance existing HTML with behaviors.
- **Hooks are the primary abstraction.** Default to hooks — keep them generalized and reusable. Only reach for a component when you need coordinated behavior across multiple elements or are grouping several hooks. This is the opposite of React, where components come first.
- **Hooks and components initialize once per element — but the system IS reactive.** The function itself never re-runs (no re-renders), but reactivity comes from two sources: (1) signals + effects for state-driven updates, and (2) a MutationObserver that automatically initializes new elements, re-runs hooks when attributes change, and triggers cleanup when elements are removed.
- **Signals update the DOM directly** via effects — there is no diffing or reconciliation.

## Critical Differences from React

| React | HookTML |
|-------|---------|
| JSX generates DOM | HTML already exists; JS enhances it |
| `useState` triggers re-render | `signal()` triggers subscribed effects only |
| Hooks run every render | Hooks run once at initialization |
| Components are functions that return JSX | Components are functions that receive `(el, props)` and mutate the DOM |
| Children via JSX nesting | Children via prefixed attributes (`dialog-close`, `tabs-panel`) |
| `useEffect` cleanup on every dep change | `useEffect` runs when signal deps change; cleanup on element removal |

## How Components Bind

Components bind to DOM elements in one of two ways:

```html
<!-- By class name (preferred) -->
<section class="Counter">...</section>

<!-- By attribute -->
<section use-component="Counter">...</section>
```

The component function is `(el, props) => cleanup | { cleanup, context }`.

## How Children Work

Child elements are identified by prefixed attributes, not by nesting or selectors:

```html
<section class="Dialog">
  <header dialog-header>Title</header>
  <button dialog-close>×</button>
</section>
```

In JS: `const { header, close } = props.children;`

Both singular and plural keys are always available:
- `props.children.close` → first matching element
- `props.children.closes` → array of all matching elements

## How Hooks Bind

Hooks attach via `use-*` attributes on any element:

```html
<button use-tooltip="Save your work" tooltip-placement="top">Save</button>
```

The hook function is `(el, props) => cleanup?` where props are derived from attributes:
```js
// props = { value: "Save your work", placement: "top" }
```

Hook name maps to function name: `use-focus-ring` → `useFocusRing`.

## Signals (Not useState)

```js
const count = signal(0);

// Read
count.value;

// Write — directly triggers subscribed effects
count.value = 5;

// Derived/computed
const double = computed(() => count.value * 2);
```

Signals are NOT component-scoped. They are standalone reactive primitives that can be created anywhere.

**Important:** `useEffect` only works inside a hook or component context (during initialization). It will warn and no-op if called at module scope. Signals themselves (`signal()`, `computed()`) can be created anywhere.

## Utility Hooks

All utility hooks accept a single element OR an array of elements:

```js
useText(el, () => `Count: ${count.value}`, [count]);
useClasses(el, { active: isActive });
useAttributes(el, { 'aria-expanded': isOpen });
useStyles(el, { opacity: level });
useEvents(el, { click: handler });
useChildren(el, "prefix");
```

When passed an array, value functions receive `(element, index)`.

## Chainable API

```js
import { with as withEl } from 'hooktml';

withEl(el)
  .useEvents({ click: handler })
  .useClasses({ active: isActive })
  .useAttributes({ 'aria-expanded': isOpen });
```

## Registration

```js
import { start, registerComponent, registerHook } from 'hooktml';

registerComponent(MyComponent);  // name derived from function name
registerHook(useMyHook);         // name derived from function name
start();
```

## Common Mistakes

1. **Writing JSX or returning markup.** HookTML components never return HTML. They receive an existing DOM element and attach behavior to it.

2. **Expecting re-renders.** Signal changes only trigger subscribed `useEffect` callbacks and utility hooks with that signal in their deps. The component function itself never re-runs.

3. **Using `useState`.** There is no `useState`. Use `signal()` for reactive state.

4. **Querying children with selectors.** Use `props.children` (in components) or `useChildren(el, prefix)` (in hooks). Children are identified by prefixed attributes, not CSS selectors.

5. **Treating cleanup like React's useEffect cleanup.** Cleanup runs once when the element is removed from the DOM, not on every effect re-run.

6. **Forgetting to register.** Components and hooks must be registered before `start()` is called (or before the element appears in the DOM if using the mutation observer).

## File Structure

```
hooktml/
├── src/core/       — runtime, observer, signals, registry
├── src/hooks/      — useEvents, useClasses, useAttributes, useStyles, useText, useChildren
├── src/utils/      — helpers (props parsing, string utils, type guards)
├── index.js        — Node entry (ESM)
├── index.browser.js — Browser entry (ESM)
├── index.global.js  — Global/IIFE entry (for script tags)
```

## Public Exports

`start`, `scan`, `registerComponent`, `registerHook`, `registerChainableHook`, `signal`, `computed`, `useEffect`, `useChildren`, `useEvents`, `useClasses`, `useAttributes`, `useStyles`, `useText`, `with`, `getConfig`
