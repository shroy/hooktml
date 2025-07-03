import { describe, it, expect, beforeEach } from 'vitest'
import { useChildren } from '../hooks/useChildren.js'

describe('useChildren', () => {
  beforeEach(() => {
    // Reset document body before each test
    document.body.innerHTML = ''
  })

  it('should map single elements correctly with both singular and plural keys', () => {
    // Setup
    document.body.innerHTML = `
      <div id="toggle-root" use-toggle>
        <button toggle-button>Toggle</button>
        <div toggle-content>Content</div>
      </div>
    `
    
    const root = document.getElementById('toggle-root')
    if (!root) throw new Error('Test element not found')
    
    const result = useChildren(root, 'toggle')
    
    // Verify we get both singular and plural keys
    expect(result).toHaveProperty('button')
    expect(result).toHaveProperty('buttons')
    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('contents')
    
    // Verify singular keys point to the first (and only) element
    expect(result.button instanceof HTMLElement && result.button.textContent).toBe('Toggle')
    expect(result.content instanceof HTMLElement && result.content.textContent).toBe('Content')
    
    // Verify plural keys are arrays containing the same element
    expect(Array.isArray(result.buttons)).toBe(true)
    expect(Array.isArray(result.contents)).toBe(true)
    expect(result.buttons.length).toBe(1)
    expect(result.contents.length).toBe(1)
    expect(result.buttons[0]).toBe(result.button)
    expect(result.contents[0]).toBe(result.content)
  })

  it('should group multiple elements with both singular and plural keys', () => {
    // Setup - two tabs with same attribute
    document.body.innerHTML = `
      <div id="tabs-root" use-tabs>
        <button tabs-tab>Tab 1</button>
        <button tabs-tab>Tab 2</button>
        <div tabs-panel>Panel 1</div>
        <div tabs-panel>Panel 2</div>
      </div>
    `
    
    const root = document.getElementById('tabs-root')
    if (!root) throw new Error('Test element not found')
    
    const result = useChildren(root, 'tabs')
    
    // Verify we get both singular and plural keys
    expect(result).toHaveProperty('tab')
    expect(result).toHaveProperty('tabs')
    expect(result).toHaveProperty('panel')
    expect(result).toHaveProperty('panels')
    
    // Verify singular keys point to first element
    expect(result.tab instanceof HTMLElement).toBe(true)
    expect(result.panel instanceof HTMLElement).toBe(true)
    expect(result.tab.textContent).toBe('Tab 1')
    expect(result.panel.textContent).toBe('Panel 1')
    
    // Verify plural keys are arrays with correct length
    expect(Array.isArray(result.tabs)).toBe(true)
    expect(Array.isArray(result.panels)).toBe(true)
    expect(result.tabs.length).toBe(2)
    expect(result.panels.length).toBe(2)
    
    // Verify array content
    expect(result.tabs[0].textContent).toBe('Tab 1')
    expect(result.tabs[1].textContent).toBe('Tab 2')
    expect(result.panels[0].textContent).toBe('Panel 1')
    expect(result.panels[1].textContent).toBe('Panel 2')
    
    // Verify singular keys match first element in plural arrays
    expect(result.tab).toBe(result.tabs[0])
    expect(result.panel).toBe(result.panels[0])
  })

  it('should not select elements from nested hooks', () => {
    // Setup - nested toggle structure
    document.body.innerHTML = `
      <div id="outer-toggle" use-toggle>
        <button toggle-button>Outer Toggle</button>
        <div toggle-content>
          <div id="inner-toggle" use-toggle>
            <button toggle-button>Inner Toggle</button>
            <div toggle-content>Inner Content</div>
          </div>
        </div>
      </div>
    `
    
    const outerToggle = document.getElementById('outer-toggle')
    const innerToggle = document.getElementById('inner-toggle')
    
    if (!outerToggle || !innerToggle) throw new Error('Test elements not found')
    
    // Get children for outer toggle
    const outerResult = useChildren(outerToggle, 'toggle')
    
    // Verify outer toggle has both singular and plural keys
    expect(outerResult.button instanceof HTMLElement).toBe(true)
    expect(outerResult.content instanceof HTMLElement).toBe(true)
    expect(Array.isArray(outerResult.buttons)).toBe(true)
    expect(Array.isArray(outerResult.contents)).toBe(true)
    
    const outerButton = outerResult.button
    const outerContent = outerResult.content
    
    // Only proceed if they are HTMLElements
    if (!(outerButton instanceof HTMLElement) || !(outerContent instanceof HTMLElement)) {
      throw new Error('Expected HTMLElement but got something else')
    }
    
    expect(outerButton.textContent).toBe('Outer Toggle')
    expect(outerContent.querySelector('#inner-toggle')).not.toBeNull()
    
    // Ensure outer doesn't find inner toggle's button and content
    const allButtons = outerToggle.querySelectorAll('[toggle-button]')
    expect(allButtons.length).toBe(2) // There are 2 in the document
    expect(Object.keys(outerResult)).toHaveLength(4) // But only 4 keys (button, buttons, content, contents)
    
    // Get children for inner toggle
    const innerResult = useChildren(innerToggle, 'toggle')
    
    // Verify inner toggle finds its own children with both keys
    expect(innerResult.button instanceof HTMLElement).toBe(true)
    expect(innerResult.content instanceof HTMLElement).toBe(true)
    expect(Array.isArray(innerResult.buttons)).toBe(true)
    expect(Array.isArray(innerResult.contents)).toBe(true)
    
    const innerButton = innerResult.button
    const innerContent = innerResult.content
    
    // Only proceed if they are HTMLElements
    if (!(innerButton instanceof HTMLElement) || !(innerContent instanceof HTMLElement)) {
      throw new Error('Expected HTMLElement but got something else')
    }
    
    expect(innerButton.textContent).toBe('Inner Toggle')
    expect(innerContent.textContent).toBe('Inner Content')
  })

  it('should handle deeply nested structures', () => {
    // Setup - multi-level nesting with components
    document.body.innerHTML = `
      <div id="root-menu" use-menu>
        <div menu-title>Root Menu</div>
        <div menu-items>
          <div class="item">
            <div id="submenu-1" use-menu>
              <div menu-title>Submenu 1</div>
              <div menu-items>
                <div class="item">Item 1.1</div>
                <div class="item">
                  <div id="submenu-1-1" use-menu>
                    <div menu-title>Submenu 1.1</div>
                    <div menu-items>
                      <div class="item">Item 1.1.1</div>
                      <div class="item">Item 1.1.2</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="item">Item 2</div>
        </div>
      </div>
    `
    
    // Get elements
    const rootMenu = document.getElementById('root-menu')
    const submenu1 = document.getElementById('submenu-1')
    const submenu11 = document.getElementById('submenu-1-1')
    
    if (!rootMenu || !submenu1 || !submenu11) throw new Error('Test elements not found')
    
    // Get children for each level
    const rootChildren = useChildren(rootMenu, 'menu')
    const submenu1Children = useChildren(submenu1, 'menu')
    const submenu11Children = useChildren(submenu11, 'menu')
    
    // Verify root menu has both singular and plural keys
    expect(rootChildren.title instanceof HTMLElement).toBe(true)
    expect(submenu1Children.title instanceof HTMLElement).toBe(true)
    expect(submenu11Children.title instanceof HTMLElement).toBe(true)
    
    // Only proceed if they are HTMLElements
    if (!(rootChildren.title instanceof HTMLElement) || 
        !(submenu1Children.title instanceof HTMLElement) || 
        !(submenu11Children.title instanceof HTMLElement)) {
      throw new Error('Expected HTMLElement but got something else')
    }
    
    expect(rootChildren.title.textContent).toBe('Root Menu')
    expect(submenu1Children.title.textContent).toBe('Submenu 1')
    expect(submenu11Children.title.textContent).toBe('Submenu 1.1')
    
    // Count all menu-title elements in the document
    const allTitles = document.querySelectorAll('[menu-title]')
    expect(allTitles.length).toBe(3) // There are 3 in the document
    
    // But each level only gets its own - now 4 keys each (title, titles, items, itemsPlural)
    expect(Object.keys(rootChildren)).toHaveLength(4)
    expect(Object.keys(submenu1Children)).toHaveLength(4)
    expect(Object.keys(submenu11Children)).toHaveLength(4)
  })

  it('should handle kebab-case to camelCase conversion correctly', () => {
    // Setup - element with kebab-case attributes
    document.body.innerHTML = `
      <div id="form-root" use-form>
        <input form-first-name value="John">
        <input form-last-name value="Doe">
        <input form-email-address value="john@example.com">
      </div>
    `
    
    const root = document.getElementById('form-root')
    if (!root) throw new Error('Test element not found')
    
    const result = useChildren(root, 'form')
    
    // Verify kebab-case converted to camelCase correctly for both singular and plural
    expect(result).toHaveProperty('firstName')
    expect(result).toHaveProperty('firstNames')
    expect(result).toHaveProperty('lastName')
    expect(result).toHaveProperty('lastNames')
    expect(result).toHaveProperty('emailAddress')
    expect(result).toHaveProperty('emailAddresses')
    
    // Verify singular values - check that they're input elements
    expect(result.firstName instanceof HTMLInputElement).toBe(true)
    expect(result.lastName instanceof HTMLInputElement).toBe(true)
    expect(result.emailAddress instanceof HTMLInputElement).toBe(true)
    
    // Verify plural values are arrays
    expect(Array.isArray(result.firstNames)).toBe(true)
    expect(Array.isArray(result.lastNames)).toBe(true)
    expect(Array.isArray(result.emailAddresses)).toBe(true)
    
    // Only proceed if they are HTMLInputElements
    if (!(result.firstName instanceof HTMLInputElement) || 
        !(result.lastName instanceof HTMLInputElement) || 
        !(result.emailAddress instanceof HTMLInputElement)) {
      throw new Error('Expected HTMLInputElement but got something else')
    }
    
    expect(result.firstName.value).toBe('John')
    expect(result.lastName.value).toBe('Doe')
    expect(result.emailAddress.value).toBe('john@example.com')
    
    // Verify consistency between singular and plural
    expect(result.firstName).toBe(result.firstNames[0])
    expect(result.lastName).toBe(result.lastNames[0])
    expect(result.emailAddress).toBe(result.emailAddresses[0])
  })

  it('should throw an error with invalid arguments', () => {
    // Setup
    const div = document.createElement('div')
    
    // Test with non-HTMLElement - using Function arguments to bypass type checking
    expect(() => Function.prototype.apply.call(useChildren, null, [null, 'toggle'])).toThrow()
    expect(() => Function.prototype.apply.call(useChildren, null, [{}, 'toggle'])).toThrow()
    
    // Test with invalid prefix
    expect(() => Function.prototype.apply.call(useChildren, null, [div, null])).toThrow()
    expect(() => useChildren(div, '')).toThrow()
    expect(() => Function.prototype.apply.call(useChildren, null, [div, 123])).toThrow()
  })
}) 
 