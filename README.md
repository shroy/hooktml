<p align="center">
  <img src="https://raw.githubusercontent.com/shroy/hooktml/main/assets/logo.png" width="500" alt="HookTML logo" />
</p>

**HTML-first behavior with functional hooks: declarative, composable, and lightweight.**

HookTML is a JavaScript library that lets you add interactive behavior to HTML without sacrificing control over your markup. It combines:

- **HTML-first development** - Your markup stays in charge, not JavaScript templates
- **Functional composition** - Use React-style hooks to share and reuse behavior
- **Minimal abstraction** - Work directly with the real DOM, not a virtual one

## Why HookTML?

- 🔍 **Zero rendering system** - Works directly with your HTML, no templating required
- 🧩 **Composable hooks** - Mix and match behavior with functional hooks
- 🔌 **Declarative attributes** - Control behavior directly from your markup
- ⚡ **Reactive computed signals** - Automatically derived values that update when dependencies change
- 🧹 **Automatic cleanup** - No manual lifecycle management
- 🚀 **Progressive enhancement** - Perfect for server-rendered apps

## 🚀 Try It Live

See HookTML in action with these interactive examples:

- **[Currency Converter](https://codepen.io/shroy/pen/bNVbjVP)** - Real-time reactive updates with signals
- **[Todo App](https://codepen.io/...)** - Component communication and state management  
- **[Modal Dialog](https://codepen.io/...)** - Advanced patterns with lifecycle hooks
- **[Tabs Component](https://codepen.io/...)** - Child element coordination

*All examples use the CDN - no build step required! Fork and experiment.*

## Quick Example

```html
<section class="Counter">
  <button
    counter-increment
    use-tooltip="Click to increase the count"
  >
    Increment
  </button>
  <strong counter-display>0</strong>
</section>
```

```js
import { signal, useEffect, useEvents } from 'hooktml';

export const Counter = (el, props) => {
  const { increment, display } = props.children;
  const count = signal(0);

  useEffect(() => {
    display.textContent = `${count.value}`;
  }, [count]);

  useEvents(increment, {
    click: () => {
      count.value += 1;
    }
  });

  return () => count.destroy();
};
```

HookTML gives you a simple way to organize UI behavior without the complexity of modern frameworks or the limitations of vanilla JavaScript.

> For developers familiar with other libraries: If you love how Stimulus keeps things close to the markup, but miss how React lets you compose and reuse behavior, HookTML bridges the gap.

---

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Core Concepts](#core-concepts)
3. [Hooks](#hooks)
4. [Components](#components)
5. [Styling](#styling)
6. [API Reference](#api-reference)
7. [Advanced Patterns](#advanced-patterns)
8. [Examples & Recipes](#examples--recipes)
9. [Integration](#integration)
10. [Philosophy & Limitations](#philosophy--limitations)

---

## Installation & Setup

You can use HookTML directly in the browser via `<script type="module">` or install it with your preferred package manager.

### Using via CDN

```html
<script type="module">
  import HookTML from 'https://unpkg.com/hooktml';
  HookTML.start();
</script>
```

### Using via Script Tag

For projects that don't use ES modules, you can include HookTML as a global script:

```html
<script src="https://unpkg.com/hooktml@latest/dist/hooktml.min.js"></script>
<script>
  // HookTML is now available globally
  HookTML.start();
</script>
```

You can also download and host the file locally:

```html
<script src="./js/hooktml.min.js"></script>
<script>
  // Destructure what you need from HookTML
  const { start, signal, useEffect, registerComponent, useEvents } = HookTML;
  
  // Register a custom component
  function MyCounter(el, props) {
    const { increment, display } = props.children;
    const count = signal(0);
    
    useEffect(() => {
      display.textContent = count.value;
    }, [count]);
    
    useEvents(increment, {
      click: () => count.value = count.value + 1
    });
  }
  
  registerComponent(MyCounter);
  
  // Start the runtime
  start();
</script>
```

### Using npm/yarn

```bash
npm install hooktml
# or
yarn add hooktml
```

```js
import HookTML from 'hooktml';
HookTML.start();
```

### Basic Configuration

```js
HookTML.start({
  componentPath: "/js/components",         // optional folder to auto-register components (Node.js only)
  debug: false,                           // optional debug logs
  attributePrefix: "data"                 // optional prefix for all attributes
});
```

**Note**: The `componentPath` option only works in Node.js environments (SSR, build scripts). For browser environments, manually register components using `HookTML.registerComponent()`.

The `attributePrefix` option allows you to namespace all HookTML attributes. When set, all hooks, components, and props will be prefixed with the specified value. For example, with `attributePrefix: "data"`:

```html
<div data-use-component="Dialog">
  <button data-dialog-close>Close</button>
</div>
```

This is particularly useful when integrating with frameworks that have specific conventions for custom attributes.

---

## Core Concepts

HookTML uses a simple mental model built around three key concepts:

### The HTML-first Approach

With HookTML, your HTML remains the source of truth. Instead of generating markup from JavaScript, you enhance existing HTML with behaviors. This keeps your DOM clean, semantic, and accessible by default.

### Hooks as the Building Blocks

Hooks are reusable behaviors that can be applied directly to any element using `use-*` attributes:

```html
<button use-tooltip="Click me">Save</button>
```

This declarative approach means behaviors are visible right in your markup - no hidden JavaScript wiring.

### Components as Organizational Units

When elements need to work together or share state, components let you group related behaviors:

```html
<section class="Dialog">
  <header dialog-header>Title</header>
  <button dialog-close>×</button>
</section>
```

Or alternatively using the attribute syntax:

```html
<section use-component="Dialog">
  <header dialog-header>Title</header>
  <button dialog-close>×</button>
</section>
```

Components automatically locate and interact with their children elements.

### When to Use Hooks vs. Components

- **Use hooks directly** for simple, isolated behaviors (tooltips, focus handling, analytics)
- **Create components** when multiple elements need to interact or share state (tabs, forms, modals)

### The Declarative HTML Philosophy

HookTML embraces attributes as the way to connect markup to behavior:
- `use-*` attributes apply hooks to elements
- Component-prefixed attributes identify children (`dialog-header`)
- State is reflected with attributes rather than classes (`dialog-open="true"`)

This makes your UI's behavior visible and inspectable directly in the HTML.

---

## Hooks

Hooks are reusable behaviors applied to individual elements using `use-*` attributes.

### What Are Hooks and Why Use Them

Hooks encapsulate self-contained behaviors like tooltips, analytics tracking, or form validation. They:

- Keep behavior close to the elements they affect
- Can be composed (multiple hooks on one element)
- Clean up automatically when elements are removed

### Using Built-in Hooks with `use-*` Attributes

Any attribute starting with `use-` automatically invokes a matching hook function:

```html
<button use-tooltip="Click to save">Save</button>
```

This calls `useTooltip(el, props)` and passes `"Click to save"` as `props.value`.

You can also pass additional props using matching custom attributes:

```html
<button
  use-tooltip="Click to save"
  tooltip-placement="top"
  tooltip-color="blue"
>
  Save
</button>
```

This becomes:

```js
props = {
  value: "Click to save",
  placement: "top",
  color: "blue"
};
```

Values are automatically coerced:

```html
<button use-tooltip>                   <!-- props = {} -->
<button use-tooltip="">                <!-- props = {} -->
<button use-tooltip="Hello world">     <!-- props = { value: "Hello world" } -->
<button use-tooltip="42">              <!-- props = { value: 42 } -->
<button use-tooltip="true">            <!-- props = { value: true } -->
<button use-tooltip="false">           <!-- props = { value: false } -->
<button use-tooltip="null">            <!-- props = { value: null } -->
```

### Accessing Children in Hooks

Hooks can also manage groups of related elements using the `useChildren` helper:

```html
<div use-toggle>
  <button toggle-button>Toggle</button>
  <div toggle-content hidden>Hidden content</div>
</div>
```

```js
export const useToggle = (el, props) => {
  // Query for elements with toggle-* attributes
  const children = useChildren(el, "toggle");
  const { button, content } = children;
  
  useEvents(button, {
    click: () => {
      content.toggleAttribute("hidden");
    }
  });
};
```

The `useChildren` helper provides consistent access to child elements through both singular and plural keys:

- **Single element**: `{ button: HTMLElement, buttons: [HTMLElement] }`
- **Multiple elements**: `{ button: HTMLElement, buttons: [HTMLElement, HTMLElement] }`

This means you can always choose the access pattern that fits your needs:
- Use singular keys (`button`) when you need the first element
- Use plural keys (`buttons`) when you need to work with all elements

```js
// Always available - no conditional checks needed
const { button, buttons, content, contents } = useChildren(el, "toggle");

// Work with the first element
button.focus();

// Work with all elements
buttons.forEach(btn => btn.disabled = true);
```

This pattern lets hooks manage their own scoped child elements, similar to how components work, but with a more focused behavior that can be attached directly to elements.

### Creating Custom Hooks

A custom hook is a function that receives an element and props:

```js
(el: HTMLElement, props: object) => (() => void)?
```

You can use any native DOM APIs, other hooks, or internal helpers:

```js
export const useFocusRing = (el, props) => {
  useEvents(el, {
    focus: () => el.classList.add("has-focus"),
    blur: () => el.classList.remove("has-focus")
  });
  
  // Optional cleanup function
  return () => {
    el.classList.remove("has-focus");
  };
};
```

HookTML will automatically run this if you write:

```html
<input use-focus-ring />
```

### Composing Multiple Hooks

You can attach multiple hooks to a single element:

```html
<button
  use-tooltip="Click to submit"
  use-analytics="form-submit"
  use-focus-ring
>
  Submit
</button>
```

Each hook is initialized independently and receives its own `props`, scoped by its prefix:

```js
useTooltip(el, { value: "Click to submit" })
useAnalytics(el, { value: "form-submit" })
useFocusRing(el, {}) // — no props
```

### Hook Lifecycle

Hooks are:
1. Initialized when the element appears in the DOM
2. Updated if their attributes change
3. Cleaned up when the element is removed

If a hook returns a function, it will be called during cleanup:

```js
return () => {
  // Clean up resources, event listeners, etc.
};
```

---

## Components

Components are functions that group hooks and behaviors to coordinate multiple elements.

### What Are Components

Components organize related elements and their behaviors. They:
- Find and interact with child elements
- Manage shared state
- Coordinate behavior between elements
- Provide a common cleanup function

### Components vs. Hooks: Key Differences

While both components and hooks can group behavior, they differ in important ways:

1. **Automatic Binding**:
   - Components are automatically bound to elements with matching class names (`class="Dialog"`) or use-component attributes (`use-component="Dialog"`)
   - Hooks must be explicitly attached with `use-*` attributes

2. **Child Element Access**:
   - Components automatically collect all children with matching prefixed attributes (`dialog-header`) into `props.children`
   - Hooks must explicitly call `useChildren()` to access child elements

3. **Purpose**:
   - Components are designed for organizing larger UI sections and coordinating multiple elements
   - Hooks are designed for reusable, composable behaviors that can be mixed and matched

4. **Scope**:
   - Components typically define the scope boundary for a set of related elements
   - Hooks typically enhance individual elements or small groups of elements within a component

Think of components as containers that provide structure and coordination, while hooks provide specific behaviors that can be composed together.

### Creating and Registering Components

Components are bound to elements using either a class name or a `use-component` attribute:

```html
<section class="Counter"></section>
<!-- or -->
<section use-component="Counter"></section>
```

Both approaches bind the `Counter` function to the element.

You can register components manually (recommended for browser environments):

```js
import { registerComponent } from 'hooktml';
registerComponent(Counter);
```

Or let HookTML auto-register them from a directory:

```js
HookTML.start({
  componentPath: "/js/components"
});
```

**Auto-registration Environment Support:**

HookTML's auto-registration feature works differently depending on your environment:

- **Node.js environments** (server-side, build scripts): Uses filesystem scanning to find and register components automatically
- **Bundler environments** (Vite, Webpack with glob support): Uses bundler-provided glob imports for component discovery
- **Browser environments** (without bundler features): Falls back gracefully, requiring manual component registration

This conditional approach ensures HookTML remains zero-dependency while providing convenience when bundler features are available. If auto-registration isn't supported in your environment, simply register components manually using `registerComponent()`.

### Accessing Children Elements

Child elements are auto-bound using lowercase attributes prefixed with the component name:

```html
<section class="Dialog">
  <header dialog-header>Title</header>
  <div dialog-body>Content</div>
  <footer dialog-footer>Actions</footer>
</section>
```

In the component function:

```js
export const Dialog = (el, props) => {
  const { header, body, footer } = props.children;
  
  // Now you can work with these DOM elements
  header.classList.add('text-lg');
};
```

Children are matched based on attribute—not tag, class, or ID—and returned as actual DOM elements. They return both singular and plural keys, regardless of how many elements are found.

```js
const { items, item } = props.children;
// items returns an array of all matching elements
items.forEach(item => item.classList.add('list-item'));

// item returns the first matching element
item.focus();
```

### Component Props and Attributes

To pass props into a component, use custom attributes prefixed with the component name:

```html
<section
  class="Modal"
  modal-open="true"
  modal-size="lg"
></section>
```

Which becomes:

```js
props = {
  open: true,
  size: "lg"
};
```

### Component Lifecycle

Components follow the same lifecycle as hooks:
1. Initialized when the element appears
2. Updated if their attributes change
3. Cleaned up when removed

Components can return a simple cleanup function:

```js
return () => {
  // Clean up resources
};
```

Or a more complex object with context:

```js
return {
  cleanup: () => {
    // Clean up resources
  },
  context: {
    // Methods and data to expose to other components
    open, close, isOpen
  }
};
```

---

## Styling

HookTML encourages writing CSS that mirrors your component structure, using attribute selectors for state.

### Component Styles

You can attach styles directly to a component using `Component.styles`. These are injected once into a global `<style>` tag and scoped by the component's class:

```js
export const Dialog = (el, props) => {
  if (props.size) el.setAttribute("dialog-size", props.size);
  if (props.error) el.setAttribute("dialog-error", "");
};

Dialog.styles = `
  padding: 1rem;
  border: 1px solid #ccc;

  & .Header {
    font-weight: bold;
  }

  &[dialog-size="sm"] {
    max-width: 300px;
  }

  &[dialog-size="lg"] {
    max-width: 800px;
  }

  &[dialog-error] {
    border-color: red;
  }
`;
```

While `Component.styles` is convenient for co-locating styles with behavior, it's completely optional. Since HookTML uses class names for components by default, you can simply write standard CSS in separate files:

```css
/* styles.css */
.Dialog {
  padding: 1rem;
  border: 1px solid #ccc;
}

.Dialog .Header {
  font-weight: bold;
}

.Dialog[dialog-size="sm"] {
  max-width: 300px;
}

.Dialog[dialog-size="lg"] {
  max-width: 800px;
}

.Dialog[dialog-error] {
  border-color: red;
}
```

This flexibility allows you to use whatever CSS organization approach works best for your project, including CSS preprocessors, CSS modules, or utility class systems.

### Attribute-Based Styling

Rather than toggling classes, we recommend using attributes to reflect state and variants:

```js
el.setAttribute("button-loading", "");
```

```css
.Button[button-loading] {
  opacity: 0.5;
  pointer-events: none;
}
```

This is easier to debug in DevTools and avoids class name drift.

### Declarative Styling Hooks

HookTML also provides specialized hooks for applying styles declaratively in your JavaScript:

```js
// Apply classes conditionally
useClasses(button, {
  'is-active': isActive,
  'is-disabled': isDisabled
});

// Set inline styles
useStyles(modal, {
  maxHeight: `${window.innerHeight * 0.8}px`,
  zIndex: 100
});

// Set attributes (good for both styling and ARIA)
useAttributes(toggle, {
  'aria-expanded': isOpen,
  'data-state': isOpen ? 'expanded' : 'collapsed'
});
```

#### Array Support

All styling hooks also support arrays of elements with per-element logic using functions:

```js
// Apply different styles to each element
useClasses(tabButtons, {
  active: (btn) => selectedTab.value === btn.dataset.id,
  disabled: isGloballyDisabled  // Mix with direct values/signals
});

useStyles(cardElements, {
  backgroundColor: (card) => card.dataset.theme,
  transform: (card) => `scale(${card.dataset.scale || 1})`
});

useAttributes(menuItems, {
  'aria-selected': (item) => activeItem.value === item.dataset.id ? 'true' : 'false',
  'tabindex': (item) => item.dataset.disabled ? '-1' : '0'
});

// Events work with arrays too (handlers receive event object)
useEvents([button1, button2], {
  click: (event) => handleClick(event.target.dataset.action)
});

useEvents(document, {
  keydown: (event) => event.key === 'Escape' && closeModal()
});
```

These hooks make your styling logic more readable and maintainable, whether working with single elements or multiple elements. See the [API Reference](#api-reference) section for complete details on these utility hooks.

### FOUC Prevention

HookTML automatically hides elements with `data-hooktml-cloak` until they're initialized:

```html
<section class="Dialog" data-hooktml-cloak></section>
```

```css
[data-hooktml-cloak] {
  display: none !important;
}
```

The `data-hooktml-cloak` attribute is removed automatically once behavior is ready.

---

## API Reference

### Core Functions

| Function | Description |
|----------|-------------|
| `start(options)` | Initialize the library with optional configuration |
| `registerComponent(Component)` | Register a component function |
| `registerHook(useHook)` | Register a hook function |
| `registerChainableHook(useHook)` | Register a hook for use with the `with()` chainable API |
| `signal(initialValue)` | Create a reactive value |
| `computed(computeFn)` | Create a computed signal that automatically updates when dependencies change |
| `useEffect(callback, deps)` | Run code when dependencies change |

### Utility Hooks

| Hook | Description |
|------|-------------|
| `useEvents(el, eventMap)` | Bind multiple events declaratively. Supports arrays of elements and EventTargets (HTMLElement, Document, Window) |
| `useStyles(el, styleObject)` | Apply inline styles. Supports arrays with per-element functions |
| `useAttributes(el, attrMap)` | Set DOM attributes. Supports arrays with per-element functions |
| `useClasses(el, classMap)` | Toggle class names based on conditions. Supports arrays with per-element functions |
| `useChildren(el, prefix)` | Query child elements with a specific prefix, returning both singular and plural keys for consistent access |

### Component Return Values

Components can return:

```js
// Simple cleanup function
return () => { ... };

// Or object with context and cleanup
return {
  cleanup: () => { ... },
  context: { ... }
};
```

### Chainable API

HookTML provides a chainable API for composing behaviors:

```js
with(el)
  .useEvents({ click: onClick })
  .useClasses({ active: isActive })
  .useAttributes({ "aria-expanded": isOpen })
  .cleanup();
```

### Chainable Hooks

For more readable, declarative code, use the `with()` helper:

```js
export const useTooltip = (el, { value }) => {
  const show = () => { /* ... */ };
  const hide = () => { /* ... */ };

  return with(el)
    .useEvents({ mouseenter: show, mouseleave: hide })
    .useAttributes({ "aria-label": value })
    .useClasses({
      "tooltip-visible": true,
      "text-sm": true
    })
    .cleanup();
};
```

#### Creating Your Own Chainable Hooks

You can extend the chainable API with your own hooks, making them available through the `with()` helper:

```js
import { registerChainableHook } from 'hooktml';

// First create your hook function
export const useRipple = (el, options = {}) => {
  // Ripple effect implementation
  const addRipple = (e) => { /* ... */ };
  
  useEvents(el, {
    mousedown: addRipple
  });
};

// Then register it as a chainable hook
registerChainableHook(useRipple);
```

Now you can use it in a chain:

```js
with(button)
  .useEvents({ click: onClick })
  .useRipple({ color: '#fff', duration: 400 })
  .useClasses({ active: isActive });
```

This extensibility allows you to create a fluent, readable API customized for your project's needs.

---

## Advanced Patterns

These patterns help build more sophisticated UIs by connecting components and controlling scope.

### Reactivity with Signals

HookTML includes a tiny, built-in reactive system inspired by signals:

```js
const count = signal(0);

// read
console.log(count.value);

// write
count.value += 1;
```

Use `useEffect()` to react to changes:

```js
useEffect(() => {
  display.textContent = `${count.value}`;
}, [count]);
```

This callback runs anytime `count.value` changes, without re-rendering the component.

#### Why Signals Instead of useState

HookTML deliberately uses signals rather than a React-style `useState` hook. This is a conscious design choice:

1. **No render cycles**: Signals directly update the DOM without requiring re-rendering components
2. **Fine-grained reactivity**: Only the effects that depend on a specific signal are re-run
3. **Explicit updates**: The `.value` property makes it clear when you're reading or writing to reactive state
4. **Primitive-oriented**: Signals work as independent primitives that can be shared easily between hooks and components

While React's `useState` is optimized for component re-rendering, signals are optimized for direct DOM updates, making them a better fit for HookTML's HTML-first approach.

### Computed Signals

Computed signals are reactive values that automatically derive from other signals. They update whenever their dependencies change, eliminating the need for manual synchronization:

```js
const todos = signal([]);

// Computed signals automatically track dependencies
const totalTodos = computed(() => todos.value.length);
const completedTodos = computed(() => todos.value.filter(t => t.completed).length);
const completionPercentage = computed(() => {
  const total = totalTodos.value;
  if (total === 0) return 0;
  return Math.round((completedTodos.value / total) * 100);
});

// Use computed signals just like regular signals
useEffect(() => {
  statusEl.textContent = `${completedTodos.value}/${totalTodos.value} (${completionPercentage.value}%)`;
}, [completionPercentage]);
```

#### Benefits of Computed Signals

1. **Automatic dependency tracking** - No need to manually specify what each computed depends on
2. **Lazy evaluation** - Only recomputes when accessed and dependencies have changed
3. **Efficient updates** - Prevents unnecessary recalculations and cascade updates
4. **Clean separation** - Keeps derived state logic separate from UI updates

#### Advanced Computed Patterns

Computed signals can depend on other computed signals, creating sophisticated reactive chains:

```js
const users = signal([]);
const selectedUserId = signal(null);

// Chain computed signals for complex derivations
const selectedUser = computed(() => 
  users.value.find(u => u.id === selectedUserId.value)
);

const userPermissions = computed(() => 
  selectedUser.value?.permissions || []
);

const canEdit = computed(() => 
  userPermissions.value.includes('edit')
);

const canDelete = computed(() => 
  userPermissions.value.includes('delete') && selectedUser.value?.status === 'active'
);

// UI automatically updates when any dependency changes
useEffect(() => {
  editBtn.disabled = !canEdit.value;
  deleteBtn.disabled = !canDelete.value;
}, [canEdit, canDelete]);
```

#### Computed Signals in Components

Computed signals work seamlessly with HookTML's component model:

```js
export const TodoStats = (el, props) => {
  const { total, completed, percentage } = props.children;
  
  // Computed signals eliminate manual state synchronization
  useEffect(() => {
    total.textContent = totalTodos.value;
    completed.textContent = completedTodos.value;
    percentage.textContent = `${completionPercentage.value}%`;
  }, [totalTodos, completedTodos, completionPercentage]);
};
```

This pattern is especially powerful for complex UIs where multiple components need to react to the same derived data, as computed signals ensure consistency without manual coordination.

### Component Communication

When components need to talk to each other, you can return a `context` object:

```js
export const Dialog = (el, props) => {
  const open = () => el.removeAttribute("hidden");
  const close = () => el.setAttribute("hidden", "");

  return {
    context: { open, close }
  };
};
```

Other components can access this context:

```js
const dialog = el.closest(".Dialog")?.component?.context;
dialog?.open();
```

### Scoped Queries

For more precise child selection, use `useChildren(el, prefix)`:

```js
export const useToggle = (el, props) => {
  const children = useChildren(el, "toggle");
  const { button, content } = children;

  useEvents(button, {
    click: () => {
      content.toggleAttribute("hidden");
    }
  });
};
```

```html
<section use-toggle>
  <button toggle-button>Toggle</button>
  <div toggle-content hidden>Hidden content</div>
</section>
```

The `useChildren` helper always returns both singular and plural keys, regardless of how many elements are found:

```js
// With multiple tabs, you get both access patterns
const children = useChildren(el, "tab");
const { tab, tabs } = children;

// Singular: work with the first tab
tab.setAttribute("aria-selected", "true");

// Plural: work with all tabs
tabs.forEach((tab, index) => {
  tab.setAttribute("tabindex", index === 0 ? "0" : "-1");
});
```

This consistent API eliminates the need for conditional checks and lets you choose the most appropriate access pattern for your use case.

### Chainable Hooks

For more readable, declarative code, use the `with()` helper:

```js
export const useTooltip = (el, { value }) => {
  const show = () => { /* ... */ };
  const hide = () => { /* ... */ };

  return with(el)
    .useEvents({ mouseenter: show, mouseleave: hide })
    .useAttributes({ "aria-label": value })
    .useClasses({
      "tooltip-visible": true,
      "text-sm": true
    })
    .cleanup();
};
```

---

## Examples & Recipes

Here are some common UI patterns implemented with HookTML:

### Tabs Component

```html
<div class="Tabs">
  <div tabs-list role="tablist">
    <button tabs-tab="tab1" aria-selected="true">Tab 1</button>
    <button tabs-tab="tab2">Tab 2</button>
    <button tabs-tab="tab3">Tab 3</button>
  </div>
  
  <div tabs-panel="tab1">Content 1</div>
  <div tabs-panel="tab2" hidden>Content 2</div>
  <div tabs-panel="tab3" hidden>Content 3</div>
</div>
```

```js
export const Tabs = (el, props) => {
  const { list, tabs, panels } = props.children;
  const activeTab = signal('tab1');
  
  // Computed signal for tab state - automatically updates when activeTab changes
  const tabStates = computed(() => 
    tabs.map(tabEl => ({
      element: tabEl,
      id: tabEl.getAttribute('tabs-tab'),
      isActive: tabEl.getAttribute('tabs-tab') === activeTab.value
    }))
  );
  
  useEffect(() => {
    // Update tab selection using computed state
    tabStates.value.forEach(({ element, isActive }) => {
      element.setAttribute('aria-selected', isActive);
    });
    
    // Update panel visibility
    panels.forEach((panelEl) => {
      const panelId = panelEl.getAttribute('tabs-panel');
      panelEl.hidden = panelId !== activeTab.value;
    });
  }, [tabStates]);
  
  // Register click handlers for all tabs
  tabs.forEach((tabEl) => {
    useEvents(tabEl, {
      click: () => {
        const tabId = tabEl.getAttribute('tabs-tab');
        activeTab.value = tabId;
      }
    });
  });
};
```

### Modal Dialog

```html
<div class="Modal" modal-open="false">
  <div modal-backdrop></div>
  <div modal-container role="dialog">
    <header modal-header>Title</header>
    <div modal-body>Content</div>
    <footer modal-footer>
      <button modal-close>Close</button>
    </footer>
  </div>
</div>
```

```js
export const Modal = (el, props) => {
  const { backdrop, container, close } = props.children;
  
  const open = () => {
    el.setAttribute('modal-open', 'true');
    document.body.style.overflow = 'hidden';
  };
  
  const hide = () => {
    el.setAttribute('modal-open', 'false');
    document.body.style.overflow = '';
  };
  
  useEvents(close, { click: hide });
  useEvents(backdrop, { click: hide });
  
  // Handle escape key
  useEvents(document, {
    keydown: (e) => {
      if (e.key === 'Escape' && el.getAttribute('modal-open') === 'true') {
        hide();
      }
    }
  });
  
  return {
    cleanup: () => {
      document.body.style.overflow = '';
    },
    context: { open, hide }
  };
};

Modal.styles = `
  &[modal-open="false"] {
    display: none;
  }
  
  &[modal-open="true"] {
    display: block;
  }
  
  [modal-backdrop] {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
  }
  
  [modal-container] {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 1rem;
    border-radius: 4px;
    max-width: 500px;
    width: 100%;
  }
`;
```

---

## Integration

HookTML works well with server-rendered applications, without conflicting with other libraries.

### Auto Initialization

HookTML scans the DOM when started and observes mutations to initialize new elements:

```js
// On page load
import { start } from 'hooktml';
start();

// No need to reinitialize after DOM updates!
```

**With script tag:**
```html
<script src="https://unpkg.com/hooktml@latest/dist/hooktml.min.js"></script>
<script>
  // On page load
  const { start } = HookTML;
  start();

  // No need to reinitialize after DOM updates!
</script>
```

### Working with Server Frameworks

HookTML pairs well with:

- **Rails with Turbo** - behavior persists through page navigations
- **Laravel** - enhance Blade templates with interactive behavior
- **htmx** - add client behaviors alongside htmx's server interactions
- **Unpoly** - complement Unpoly's layer and form enhancements
- **Any server-rendered HTML** - including PHP, Django, or static sites

### Mutation Observation

HookTML listens to DOM mutations using `MutationObserver`. This ensures behavior is attached automatically when:

* New elements are added (e.g. via AJAX, htmx, or Hotwire)
* Attributes change (e.g. adding/removing `use-*`, `class`, or `data-component`)
* Elements are removed (so cleanup functions run)

There's no need to reinitialize manually after partial DOM updates — HookTML keeps everything in sync.

---

## Philosophy & Limitations

HookTML brings behavior to your HTML in a declarative, composable way — no rendering layers, no virtual DOMs, no framework baggage.

### ✅ Why HookTML Exists

* To **enhance static HTML** with dynamic behavior — without losing control of your markup
* To support **composable, functional hooks** over class-based controllers
* To keep behavior close to structure using **HTML-first conventions**
* To offer **convention over configuration**, inspired by Rails
* To work seamlessly with server-rendered apps, including Rails, Laravel, Hotwire, htmx, WordPress, and more

### ⚠️ What HookTML Is *Not*

* ❌ Not a rendering library — it doesn't manage or diff your DOM
* ❌ Not a reactive framework — signals are minimal and scoped
* ❌ Not designed for large-scale app state or routing
* ❌ Not intended to replace tools like React, Vue, or Svelte — it fills a different niche

### 🧠 Design Tradeoffs

* Behavior is opt-in, bound declaratively via class or attributes
* Components don't re-render — they initialize once and clean up when removed
* Hooks focus on **DOM behavior**, not view logic
* Magic is embraced where it reduces boilerplate (e.g., `use-*`, `with(el)`), but the data flow remains readable and predictable

### Ideal Use Cases

* Progressive enhancement of server-rendered views
* Reusable UI patterns like tooltips, tabs, modals, dropdowns
* Hotwire/htmx projects that need just a touch of JS behavior
* Teams who want the clarity of HTML with the composability of hooks
