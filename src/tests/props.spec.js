import { test, expect } from 'vitest'
import { extractProps } from '../utils/props.js'

test('should extract and coerce props correctly', () => {
  // Setup
  const element = document.createElement('div')
  element.setAttribute('tooltip-text', 'Hello World')
  element.setAttribute('tooltip-delay', '1000')
  element.setAttribute('tooltip-enabled', 'true')
  element.setAttribute('tooltip-position', 'top')
  element.setAttribute('tooltip-null-value', 'null')
  element.setAttribute('tooltip-disabled', 'false')
  
  // Execute
  const props = extractProps(element, 'Tooltip')
  
  // Verify
  expect(props).toEqual({
    text: 'Hello World',
    delay: 1000,
    enabled: true,
    position: 'top',
    nullValue: null,
    disabled: false
  })
})

test('should handle no props', () => {
  // Setup
  const element = document.createElement('div')
  
  // Execute
  const props = extractProps(element, 'Tooltip')
  
  // Verify
  expect(props).toEqual({})
})

test('should ignore non-matching attributes', () => {
  // Setup
  const element = document.createElement('div')
  element.setAttribute('data-test', 'test')
  element.setAttribute('class', 'tooltip')
  element.setAttribute('tooltip-text', 'Hello')
  
  // Execute
  const props = extractProps(element, 'Tooltip')
  
  // Verify
  expect(props).toEqual({
    text: 'Hello'
  })
}) 
