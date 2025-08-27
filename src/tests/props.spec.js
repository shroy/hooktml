import { test, expect } from 'vitest'
import { extractProps, extractHookProps } from '../utils/props.js'

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

test('should extract hook props with main value and additional props', () => {
  const element = document.createElement('button')
  element.setAttribute('tooltip-placement', 'top')
  element.setAttribute('tooltip-color', 'blue')
  element.setAttribute('tooltip-delay', '1000')
  element.setAttribute('tooltip-enabled', 'true')

  const props = extractHookProps(element, 'useTooltip', 'Click to save')

  expect(props).toEqual({
    value: 'Click to save',
    placement: 'top',
    color: 'blue',
    delay: 1000,
    enabled: true
  })
})

test('should extract hook props with only main value', () => {
  const element = document.createElement('button')

  const props = extractHookProps(element, 'useTooltip', 'Hello World')

  expect(props).toEqual({
    value: 'Hello World'
  })
})

test('should extract hook props with only additional props', () => {
  const element = document.createElement('div')
  element.setAttribute('counter-initial', '42')
  element.setAttribute('counter-step', '5')

  const props = extractHookProps(element, 'useCounter', '')

  expect(props).toEqual({
    initial: 42,
    step: 5
  })
})

test('should handle hook props with no props', () => {
  const element = document.createElement('div')

  const props = extractHookProps(element, 'useFocus', '')

  expect(props).toEqual({})
})

test('should ignore non-matching attributes for hooks', () => {
  const element = document.createElement('button')
  element.setAttribute('data-test', 'test')
  element.setAttribute('class', 'button')
  element.setAttribute('modal-id', 'test-modal') // Different hook prefix
  element.setAttribute('tooltip-placement', 'top')

  const props = extractHookProps(element, 'useTooltip', 'Click me')

  expect(props).toEqual({
    value: 'Click me',
    placement: 'top'
  })
})

test('should handle kebab-case to camelCase conversion for hook props', () => {
  const element = document.createElement('div')
  element.setAttribute('tooltip-max-width', '200')
  element.setAttribute('tooltip-z-index', '1000')
  element.setAttribute('tooltip-show-arrow', 'false')

  const props = extractHookProps(element, 'useTooltip', '')

  expect(props).toEqual({
    maxWidth: 200,
    zIndex: 1000,
    showArrow: false
  })
}) 
