import { test, expect, describe, beforeEach, vi } from 'vitest'
import { registerComponent } from '../core/registry.js'
import { scanComponents } from '../core/scanComponents.js'
import * as registryModule from '../core/registry'
import * as configModule from '../core/config.js'

// Test with direct component registration (current approach)
test('should find components using class selector', () => {
  // Create test elements
  const div1 = document.createElement('div')
  div1.classList.add('Button')
  const div2 = document.createElement('div')
  div2.classList.add('Button')
  const div3 = document.createElement('div')
  div3.classList.add('Card')
  const div4 = document.createElement('div')
  div4.classList.add('Button')
  
  document.body.appendChild(div1)
  document.body.appendChild(div2)
  document.body.appendChild(div3)
  document.body.appendChild(div4)
  
  // Register components
  function Button() {}
  function Card() {}
  registerComponent(Button)
  registerComponent(Card)
  
  // Execute
  const result = scanComponents()
  
  // Verify
  expect(result).toHaveLength(4)
  expect(result[0].componentName).toBe('Button')
  expect(result[1].componentName).toBe('Button')
  expect(result[2].componentName).toBe('Card')
  expect(result[3].componentName).toBe('Button')
  
  // Cleanup
  document.body.removeChild(div1)
  document.body.removeChild(div2)
  document.body.removeChild(div3)
  document.body.removeChild(div4)
})

// More comprehensive test suite
describe('Component Scanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    
    // Reset modules
    vi.resetModules()
  })
  
  test('should return empty array when no components are registered', () => {
    // Setup
    vi.spyOn(registryModule, 'getRegisteredComponentNames').mockReturnValue([])
    
    // Execute
    const result = scanComponents()
    
    // Verify
    expect(result).toEqual([])
  })
  
  test('should find components using use-component attribute', () => {
    // Setup
    document.body.innerHTML = `
      <div use-component="Button">Click me</div>
      <div use-component="Modal">A modal</div>
      <div use-component="Unknown">Should be ignored</div>
    `
    
    vi.spyOn(registryModule, 'getRegisteredComponentNames').mockReturnValue([
      'Button', 'Modal', 'Tooltip'
    ])
    
    // Execute
    const result = scanComponents()
    
    // Verify
    expect(result).toHaveLength(2)
    expect(result[0].componentName).toBe('Button')
    expect(result[1].componentName).toBe('Modal')
  })
  
  test('should find components using prefixed use-component attribute', () => {
    // Setup
    document.body.innerHTML = `
      <div data-use-component="Button">Click me</div>
      <div data-use-component="Modal">A modal</div>
      <div data-use-component="Unknown">Should be ignored</div>
    `
    
    vi.spyOn(configModule, 'getConfig').mockReturnValue({
      formattedPrefix: 'data-',
      debug: false
    })
    
    vi.spyOn(registryModule, 'getRegisteredComponentNames').mockReturnValue([
      'Button', 'Modal', 'Tooltip'
    ])
    
    // Execute
    const result = scanComponents()
    
    // Verify
    expect(result).toHaveLength(2)
    expect(result[0].componentName).toBe('Button')
    expect(result[1].componentName).toBe('Modal')
  })
}) 
