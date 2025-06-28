import { describe, it, expect, beforeEach } from 'vitest'
import { useChildren } from '../hooks/useChildren.js'

describe('useChildren', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('should map single elements correctly with both singular and plural keys', () => {
    document.body.innerHTML = `
      <div id="toggle-root" use-toggle>
        <button toggle-button>Toggle</button>
        <div toggle-content>Content</div>
      </div>
    `
    
    const root = document.getElementById('toggle-root')
    if (!root) throw new Error('Test element not found')
    
    const result = useChildren(root, 'toggle')
    
    expect(result).toHaveProperty('button')
    expect(result).toHaveProperty('buttons')
    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('contents')
    
    expect(result.button instanceof HTMLElement && result.button.textContent).toBe('Toggle')
    expect(result.content instanceof HTMLElement && result.content.textContent).toBe('Content')
    
    expect(Array.isArray(result.buttons)).toBe(true)
    expect(Array.isArray(result.contents)).toBe(true)
    expect(result.buttons.length).toBe(1)
    expect(result.contents.length).toBe(1)
    expect(result.buttons[0]).toBe(result.button)
    expect(result.contents[0]).toBe(result.content)
  })

  it('should group multiple elements with both singular and plural keys', () => {
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
    
    expect(result).toHaveProperty('tab')
    expect(result).toHaveProperty('tabs')
    expect(result).toHaveProperty('panel')
    expect(result).toHaveProperty('panels')
    
    expect(result.tab instanceof HTMLElement).toBe(true)
    expect(result.panel instanceof HTMLElement).toBe(true)
    expect(result.tab.textContent).toBe('Tab 1')
    expect(result.panel.textContent).toBe('Panel 1')
    
    expect(Array.isArray(result.tabs)).toBe(true)
    expect(Array.isArray(result.panels)).toBe(true)
    expect(result.tabs.length).toBe(2)
    expect(result.panels.length).toBe(2)
    
    expect(result.tabs[0].textContent).toBe('Tab 1')
    expect(result.tabs[1].textContent).toBe('Tab 2')
    expect(result.panels[0].textContent).toBe('Panel 1')
    expect(result.panels[1].textContent).toBe('Panel 2')
    
    expect(result.tab).toBe(result.tabs[0])
    expect(result.panel).toBe(result.panels[0])
  })

  it('should not select elements from nested hooks', () => {
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
    
    const outerResult = useChildren(outerToggle, 'toggle')
    
    expect(outerResult.button instanceof HTMLElement).toBe(true)
    expect(outerResult.content instanceof HTMLElement).toBe(true)
    expect(Array.isArray(outerResult.buttons)).toBe(true)
    expect(Array.isArray(outerResult.contents)).toBe(true)
    
    const outerButton = outerResult.button
    const outerContent = outerResult.content
    
    if (!(outerButton instanceof HTMLElement) || !(outerContent instanceof HTMLElement)) {
      throw new Error('Expected HTMLElement but got something else')
    }
    
    expect(outerButton.textContent).toBe('Outer Toggle')
    expect(outerContent.querySelector('#inner-toggle')).not.toBeNull()
    
    // Ensure outer doesn't find inner toggle's button and content
    const allButtons = outerToggle.querySelectorAll('[toggle-button]')
    expect(allButtons.length).toBe(2)
    expect(Object.keys(outerResult)).toHaveLength(4)
    
    const innerResult = useChildren(innerToggle, 'toggle')
    
    expect(innerResult.button instanceof HTMLElement).toBe(true)
    expect(innerResult.content instanceof HTMLElement).toBe(true)
    expect(Array.isArray(innerResult.buttons)).toBe(true)
    expect(Array.isArray(innerResult.contents)).toBe(true)
    
    const innerButton = innerResult.button
    const innerContent = innerResult.content
    
    if (!(innerButton instanceof HTMLElement) || !(innerContent instanceof HTMLElement)) {
      throw new Error('Expected HTMLElement but got something else')
    }
    
    expect(innerButton.textContent).toBe('Inner Toggle')
    expect(innerContent.textContent).toBe('Inner Content')
  })

  it('should handle deeply nested structures', () => {
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
    
    const rootMenu = document.getElementById('root-menu')
    const submenu1 = document.getElementById('submenu-1')
    const submenu11 = document.getElementById('submenu-1-1')
    
    if (!rootMenu || !submenu1 || !submenu11) throw new Error('Test elements not found')
    
    const rootChildren = useChildren(rootMenu, 'menu')
    const submenu1Children = useChildren(submenu1, 'menu')
    const submenu11Children = useChildren(submenu11, 'menu')
    
    expect(rootChildren.title instanceof HTMLElement).toBe(true)
    expect(submenu1Children.title instanceof HTMLElement).toBe(true)
    expect(submenu11Children.title instanceof HTMLElement).toBe(true)
    
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
    expect(allTitles.length).toBe(3)
    
    // But each level only gets its own - now 4 keys each (title, titles, items, itemsPlural)
    expect(Object.keys(rootChildren)).toHaveLength(4)
    expect(Object.keys(submenu1Children)).toHaveLength(4)
    expect(Object.keys(submenu11Children)).toHaveLength(4)
  })

  it('should convert kebab-case attributes to camelCase keys', () => {
    document.body.innerHTML = `
      <div id="form-root" use-form>
        <input form-first-name value="John">
        <input form-last-name value="Doe">
        <select form-user-role>
          <option>admin</option>
        </select>
      </div>
    `
    
    const root = document.getElementById('form-root')
    if (!root) throw new Error('Test element not found')
    
    const result = useChildren(root, 'form')
    
    expect(result).toHaveProperty('firstName')
    expect(result).toHaveProperty('firstNames')
    expect(result).toHaveProperty('lastName')
    expect(result).toHaveProperty('lastNames')
    expect(result).toHaveProperty('userRole')
    expect(result).toHaveProperty('userRoles')
    
    if (!(result.firstName instanceof HTMLElement) || !(result.lastName instanceof HTMLElement)) {
      throw new Error('Expected HTMLElement but got something else')
    }
    
    expect(result.firstName.value).toBe('John')
    expect(result.lastName.value).toBe('Doe')
    
    expect(Array.isArray(result.firstNames)).toBe(true)
    expect(Array.isArray(result.lastNames)).toBe(true)
    expect(Array.isArray(result.userRoles)).toBe(true)
    
    expect(result.firstNames.length).toBe(1)
    expect(result.lastNames.length).toBe(1)
    expect(result.userRoles.length).toBe(1)
    
    // Both singular and plural should reference the same elements
    expect(result.firstName).toBe(result.firstNames[0])
    expect(result.lastName).toBe(result.lastNames[0])
    expect(result.userRole).toBe(result.userRoles[0])
  })

  it('should handle invalid inputs gracefully', () => {
    const validElement = document.createElement('div')
    
    // @ts-expect-error Testing invalid input
    expect(() => useChildren(null, 'test')).toThrow()
    expect(() => useChildren(validElement, '')).toThrow()
    expect(() => useChildren(validElement, null)).toThrow()
  })
}) 
 