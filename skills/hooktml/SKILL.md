# HookTML Usage

## When to use

When writing or modifying code that uses the `hooktml` library — components, hooks, signals, or HTML with `use-*` attributes or component class bindings.

## Instructions

HookTML is NOT React. It enhances existing HTML with behavior — no JSX, no virtual DOM, no re-renders.

### Core rules

1. **Hooks first, components second.** Default to writing hooks. Keep them generalized and reusable. Only create a component when you need very specific coordinated behavior across multiple elements, or when a component is essentially a group of hooks. This keeps HTML lean — unlike React, hooks are the primary unit of abstraction.
2. **Never generate HTML from JS.** Components receive a DOM element (`el`) and attach behavior. They never return markup.
3. **Components and hooks initialize once per element — but the system is fully reactive.** The component/hook function itself never re-runs (no re-renders), but signals + effects provide fine-grained reactivity, and a MutationObserver automatically initializes new elements, updates hooks when attributes change, and runs cleanup when elements are removed.
4. **Use `signal()`, not `useState`.** Signals are standalone reactive primitives. Write with `.value =`, read with `.value`.
5. **Children are attribute-based.** In a component named `Dialog`, child elements have attributes like `dialog-header`, `dialog-close`. Access them via `props.children.header`, `props.children.close`.
6. **Hooks bind via `use-*` attributes.** `use-tooltip="text"` calls `useTooltip(el, { value: "text" })`. Additional props come from matching prefixed attributes (`tooltip-placement="top"` → `props.placement`).

### Patterns

**Component:**
```js
import { signal, useText, useEvents, registerComponent } from 'hooktml';

export const Counter = (el, props) => {
  const { increment, display } = props.children;
  const count = signal(0);

  useText(display, () => `${count.value}`, [count]);
  useEvents(increment, { click: () => count.value += 1 });

  return () => count.destroy();
};

registerComponent(Counter);
```

```html
<section class="Counter">
  <button counter-increment>+</button>
  <span counter-display>0</span>
</section>
```

**Hook:**
```js
import { useEvents, registerHook } from 'hooktml';

export const useCopyToClipboard = (el, props) => {
  useEvents(el, {
    click: () => navigator.clipboard.writeText(props.value || el.textContent)
  });
};

registerHook(useCopyToClipboard);
```

```html
<code use-copy-to-clipboard="secret-text">Click to copy</code>
```

**Signals + computed (inside a hook or component):**
```js
import { signal, computed, useEffect } from 'hooktml';

export const useItemCounter = (el, props) => {
  const items = signal([]);
  const count = computed(() => items.value.length);

  useEffect(() => {
    el.textContent = `${count.value} items`;
  }, [count]);
};
```

Note: `useEffect` only works inside a hook/component context. It will warn and no-op if called at module scope.

**Utility hooks (single or array of elements):**
```js
useClasses(buttons, { active: (btn, i) => i === selected.value }, [selected]);
useAttributes(el, { 'aria-expanded': isOpen });
useStyles(cards, { opacity: (card, i) => i === active.value ? 1 : 0.3 }, [active]);
useText(el, () => `Hello ${name.value}`, [name]);
useEvents(el, { click: handler });
```

**Chainable API:**
```js
import { with as withEl } from 'hooktml';

withEl(el)
  .useEvents({ click: handler })
  .useClasses({ active: isActive })
  .useAttributes({ 'aria-expanded': isOpen });
```

The chain returns itself from every method — there is no `.cleanup()` terminator. Individual hooks handle their own cleanup automatically.

### What NOT to do

- Don't return JSX or HTML strings from components
- Don't use `useState`, `useRef`, `useMemo`, or other React hooks
- Don't expect component functions to re-run
- Don't query children with `querySelector` — use `props.children` or `useChildren(el, prefix)`
- Don't forget to register components/hooks before `start()`
- Don't add signals to deps arrays as `.value` — pass the signal object itself: `[count]` not `[count.value]`
