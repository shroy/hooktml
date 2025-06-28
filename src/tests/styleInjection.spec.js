/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { injectComponentStyles } from '../core/styleInjection.js'
import * as configModule from '../core/config.js'
import * as componentLifecycle from '../core/componentLifecycle.js'

describe('styleInjection', () => {
  let element

  beforeEach(() => {
    // Clear any existing style tags
    document.head.innerHTML = ''
    
    // Create element for testing
    element = document.createElement('div')
    document.body.appendChild(element)
    
    // Mock the config module to control the selector mode
    vi.spyOn(configModule, 'getConfig').mockReturnValue({
      componentSelectorMode: 'class',
      debug: false
    })
    
    // Mock removeCloak to not interfere with style tests
    vi.spyOn(componentLifecycle, 'removeCloak').mockImplementation(() => {})
  })

  afterEach(() => {
    // Clean up after tests
    document.head.innerHTML = ''
    document.body.removeChild(element)
    vi.restoreAllMocks()
  })

  it('should create a style tag with cloak rule on first injection', () => {
    function TestComponent() {}
    TestComponent.styles = 'color: red;'
    
    injectComponentStyles(TestComponent, element)
    
    const styleTag = document.getElementById('__hooktml')
    expect(styleTag).not.toBeNull()
    expect(styleTag).toBeInstanceOf(HTMLStyleElement)
    
    if (styleTag instanceof HTMLStyleElement) {
      expect(styleTag.textContent).toBe('[data-hooktml-cloak] { visibility: hidden; }')
      
      // Check that the component style was added to the stylesheet
      const sheet = styleTag.sheet
      if (sheet) {
        expect(sheet.cssRules.length).toBe(2)
        expect(sheet.cssRules[0].cssText).toBe('[data-hooktml-cloak] {visibility: hidden;}')
        expect(sheet.cssRules[1].cssText).toBe('.TestComponent {color: red;}')
      }
    }
  })

  it('should reuse existing style tag for subsequent injections', () => {
    function Component1() {}
    Component1.styles = 'color: red;'
    
    function Component2() {}
    Component2.styles = 'color: blue;'
    
    injectComponentStyles(Component1, element)
    injectComponentStyles(Component2, element)
    
    const styleTags = document.getElementsByTagName('style')
    expect(styleTags.length).toBe(1)
    
    const styleTag = styleTags[0]
    if (styleTag instanceof HTMLStyleElement && styleTag.sheet) {
      const sheet = styleTag.sheet
      expect(sheet.cssRules.length).toBe(3)  // cloak rule + 2 component rules
      expect(sheet.cssRules[1].cssText).toBe('.Component1 {color: red;}')
      expect(sheet.cssRules[2].cssText).toBe('.Component2 {color: blue;}')
    }
  })

  it('should not inject styles if component has no styles property', () => {
    function EmptyComponent() {}
    
    injectComponentStyles(EmptyComponent, element)
    
    const styleTag = document.getElementById('__hooktml')
    if (styleTag instanceof HTMLStyleElement && styleTag.sheet) {
      expect(styleTag.sheet.cssRules.length).toBe(1) // Only the cloak rule
    }
  })

  it('should not inject styles if component.styles is empty string', () => {
    function EmptyStyleComponent() {}
    EmptyStyleComponent.styles = ''
    
    injectComponentStyles(EmptyStyleComponent, element)
    
    const styleTag = document.getElementById('__hooktml')
    if (styleTag instanceof HTMLStyleElement && styleTag.sheet) {
      expect(styleTag.sheet.cssRules.length).toBe(1) // Only the cloak rule
    }
  })

  it('should not inject duplicate styles', () => {
    function DuplicateComponent() {}
    DuplicateComponent.styles = 'color: red;'
    
    injectComponentStyles(DuplicateComponent, element)
    injectComponentStyles(DuplicateComponent, element) // Try to add again
    
    const styleTag = document.getElementById('__hooktml')
    if (styleTag instanceof HTMLStyleElement && styleTag.sheet) {
      expect(styleTag.sheet.cssRules.length).toBe(2) // cloak rule + 1 component rule (no duplicates)
    }
  })

  it('should handle CSS formatting differences when detecting duplicates', () => {
    // Create a manual stylesheet with a specific rule
    const styleTag = document.createElement('style')
    styleTag.id = '__hooktml'
    styleTag.textContent = '[data-hooktml-cloak] { visibility: hidden; }'
    document.head.appendChild(styleTag)
    
    // Add a rule with spaces after colons
    styleTag.sheet?.insertRule('.FormattingTest { color: red; margin: 10px; }', styleTag.sheet.cssRules.length)
    
    // Now try to inject a component with the same selector but different formatting
    function FormattingTest() {}
    FormattingTest.styles = 'color:red;margin:10px;' // No spaces after colons
    
    injectComponentStyles(FormattingTest, element)
    
    // Check that no duplicate was added
    if (styleTag.sheet) {
      expect(styleTag.sheet.cssRules.length).toBe(2) // cloak rule + 1 component rule (no duplicates)
    }
  })

  it('should use class selector when componentSelectorMode is "class"', () => {
    vi.spyOn(configModule, 'getConfig').mockReturnValue({
      componentSelectorMode: 'class',
      debug: false
    })
    
    function ClassComponent() {}
    ClassComponent.styles = 'color: green;'
    
    injectComponentStyles(ClassComponent, element)
    
    const styleTag = document.getElementById('__hooktml')
    if (styleTag instanceof HTMLStyleElement && styleTag.sheet) {
      expect(styleTag.sheet.cssRules[1].cssText).toBe('.ClassComponent {color: green;}')
    }
  })

  it('should use data-component selector when componentSelectorMode is "data"', () => {
    vi.spyOn(configModule, 'getConfig').mockReturnValue({
      componentSelectorMode: 'data',
      debug: false
    })
    
    function DataComponent() {}
    DataComponent.styles = 'color: purple;'
    
    injectComponentStyles(DataComponent, element)
    
    const styleTag = document.getElementById('__hooktml')
    if (styleTag instanceof HTMLStyleElement && styleTag.sheet) {
      expect(styleTag.sheet.cssRules[1].cssText).toBe('[data-component="DataComponent"] {color: purple;}')
    }
  })

  it('should trim whitespace from component styles', () => {
    function TrimmedComponent() {}
    TrimmedComponent.styles = '   color: orange;   '
    
    injectComponentStyles(TrimmedComponent, element)
    
    const styleTag = document.getElementById('__hooktml')
    if (styleTag instanceof HTMLStyleElement && styleTag.sheet) {
      expect(styleTag.sheet.cssRules[1].cssText).toBe('.TrimmedComponent {color: orange;}')
    }
  })
  
  it('should call removeCloak after injecting styles', () => {
    // Restore the mock to spy on the calls
    vi.spyOn(componentLifecycle, 'removeCloak').mockRestore()
    const removeCloak = vi.spyOn(componentLifecycle, 'removeCloak')
    
    function TestComponent() {}
    TestComponent.styles = 'color: red;'
    
    injectComponentStyles(TestComponent, element)
    
    expect(removeCloak).toHaveBeenCalledTimes(1)
    expect(removeCloak).toHaveBeenCalledWith(element)
  })
}) 
