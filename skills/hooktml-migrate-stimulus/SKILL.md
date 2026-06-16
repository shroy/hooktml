# Migrate Stimulus to HookTML

## When to use

When converting a Stimulus controller to HookTML, or when the user asks to migrate, port, or rewrite Stimulus code to use HookTML.

## Instructions

### Concept mapping

| Stimulus | HookTML |
|----------|---------|
| Controller class | Hook function (prefer) or Component function |
| `targets` | `useChildren(el, prefix)` or `props.children` |
| `values` | `signal()` |
| `classes` | `useClasses(el, classMap, [deps])` |
| `connect()` | The hook/component function body (runs on init) |
| `disconnect()` | The returned cleanup function |
| `this.element` | `el` (first argument) |
| `data-controller="name"` | `use-name` (for hooks) or `class="Name"` (for components) |
| `data-name-target="x"` | `name-x` attribute on the child element |
| `data-action="click->name#method"` | `useEvents(el, { click: handler })` |
| `data-name-value-value="x"` | `signal(x)` initialized from `props.value` |

### Decision: hook or component?

**Default to a hook.** Convert to a hook unless:
- The controller coordinates 3+ distinct child element types that share state
- The controller has complex inter-element communication
- The behavior is specific to one context and unlikely to be reused

Most Stimulus controllers map to hooks because they attach behavior to a single root element with a few targets.

### Migration pattern

**Stimulus controller:**
```js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["output", "button"]
  static values = { count: { type: Number, default: 0 } }

  connect() {
    this.render()
  }

  increment() {
    this.countValue++
    this.render()
  }

  render() {
    this.outputTarget.textContent = this.countValue
  }
}
```

**HookTML hook equivalent:**
```js
import { signal, useText, useEvents, useChildren, registerHook } from 'hooktml'

export const useCounter = (el, props) => {
  const { output, button } = useChildren(el, "counter")
  const count = signal(props.value ?? 0)

  useText(output, () => `${count.value}`, [count])
  useEvents(button, { click: () => count.value++ })

  return () => count.destroy()
}

registerHook(useCounter)
```

**HTML before:**
```html
<div data-controller="counter" data-counter-count-value="0">
  <span data-counter-target="output">0</span>
  <button data-action="click->counter#increment" data-counter-target="button">+</button>
</div>
```

**HTML after:**
```html
<div use-counter="0">
  <span counter-output>0</span>
  <button counter-button>+</button>
</div>
```

### Migration steps

1. Identify targets → these become children accessed via `useChildren(el, prefix)`
2. Identify values → these become `signal()` calls, initialized from `props`
3. Identify actions → these become `useEvents()` calls
4. Identify `connect()` body → this becomes the hook function body
5. Identify `disconnect()` → this becomes the returned cleanup function
6. Remove class structure — flatten into a named arrow function
7. Replace imperative DOM updates (`this.outputTarget.textContent = ...`) with declarative hooks (`useText`, `useClasses`, `useAttributes`)
8. Register with `registerHook(useMyHook)` or `registerComponent(MyComponent)`

### Common pitfalls

- **Don't keep the class.** HookTML hooks are plain functions, not classes.
- **Don't manually update DOM in response to state.** Use `useText`/`useClasses`/`useAttributes` with signal deps instead of imperative `render()` methods.
- **Don't forget to register.** Stimulus auto-discovers controllers; HookTML requires explicit `registerHook()` or `registerComponent()`.
- **Don't use `data-action` syntax.** Replace with `useEvents()` inside the hook.
- **Don't use `export default`.** Use named exports for consistency.
