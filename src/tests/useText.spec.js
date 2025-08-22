/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useText } from '../hooks/useText.js'
import { signal } from '../core/signal.js'
import { withHookContext } from '../core/hookContext.js'
import { logger } from '../utils/logger.js'

describe('useText', () => {
  let element

  beforeEach(() => {
    element = document.createElement('div')
    vi.clearAllMocks()
  })

  it('should set text content on an element', () => {
    withHookContext(element, () => {
      useText(element, () => 'Hello World')
    })

    expect(element.textContent).toBe('Hello World')
  })

  it('should update text content when dependencies change', () => {
    const textSignal = signal('Initial')

    withHookContext(element, () => {
      useText(element, () => textSignal.value, [textSignal])
    })

    expect(element.textContent).toBe('Initial')

    textSignal.value = 'Updated'
    expect(element.textContent).toBe('Updated')
  })

  it('should handle empty string text content', () => {
    element.textContent = 'initial text'

    withHookContext(element, () => {
      useText(element, () => '')
    })

    expect(element.textContent).toBe('')
  })

  it('should handle numeric text content', () => {
    withHookContext(element, () => {
      useText(element, () => String(42))
    })

    expect(element.textContent).toBe('42')
  })

  it('should log info and return early when element is null', () => {
    const logSpy = vi.spyOn(logger, 'info')

    const result = useText(null, () => 'text')

    expect(logSpy).toHaveBeenCalledWith('[HookTML] useText called with null/undefined element, skipping text updates')
    expect(result).toBeUndefined()
  })

  it('should log info and return early when element is undefined', () => {
    const logSpy = vi.spyOn(logger, 'info')

    const result = useText(undefined, () => 'text')

    expect(logSpy).toHaveBeenCalledWith('[HookTML] useText called with null/undefined element, skipping text updates')
    expect(result).toBeUndefined()
  })

  it('should log info and return early when element is not an HTMLElement', () => {
    const logSpy = vi.spyOn(logger, 'info')

    const result = useText('not-an-element', () => 'text')

    expect(logSpy).toHaveBeenCalledWith('[HookTML] useText requires HTMLElement as first argument')
    expect(result).toBeUndefined()
  })

  it('should log info and return early when textFunction is not a function', () => {
    const logSpy = vi.spyOn(logger, 'info')

    const result = useText(element, 'not-a-function')

    expect(logSpy).toHaveBeenCalledWith('[HookTML] useText requires a function as the second argument')
    expect(result).toBeUndefined()
  })

  it('should not modify element when validation fails', () => {
    element.textContent = 'original'

    useText(null, () => 'new text')
    expect(element.textContent).toBe('original')

    useText(element, 'not-a-function')
    expect(element.textContent).toBe('original')
  })

  it('should work with complex text generation logic', () => {
    const data = { count: 5, name: 'items' }

    withHookContext(element, () => {
      useText(element, () => `You have ${data.count} ${data.name}`)
    })

    expect(element.textContent).toBe('You have 5 items')
  })

  it('should update text when multiple dependencies change', () => {
    const name = signal('John')
    const age = signal(25)

    withHookContext(element, () => {
      useText(element, () => `${name.value} is ${age.value} years old`, [name, age])
    })

    expect(element.textContent).toBe('John is 25 years old')

    name.value = 'Jane'
    expect(element.textContent).toBe('Jane is 25 years old')

    age.value = 30
    expect(element.textContent).toBe('Jane is 30 years old')
  })

  it('should work without dependencies array', () => {
    withHookContext(element, () => {
      useText(element, () => 'No deps')
    })

    expect(element.textContent).toBe('No deps')
  })

  it('should work with empty dependencies array', () => {
    const staticText = 'Static text'

    withHookContext(element, () => {
      useText(element, () => staticText, [])
    })

    expect(element.textContent).toBe('Static text')
  })

  it('should overwrite existing text content', () => {
    element.textContent = 'Old content'

    withHookContext(element, () => {
      useText(element, () => 'New content')
    })

    expect(element.textContent).toBe('New content')
  })

  it('should handle text function that returns undefined gracefully', () => {
    withHookContext(element, () => {
      useText(element, () => undefined)
    })

    expect(element.textContent).toBe('')
  })

  it('should handle text function that returns null gracefully', () => {
    withHookContext(element, () => {
      useText(element, () => null)
    })

    expect(element.textContent).toBe('')
  })

  it('should work with different HTML elements', () => {
    const span = document.createElement('span')
    const p = document.createElement('p')
    const h1 = document.createElement('h1')

    withHookContext(span, () => {
      useText(span, () => 'Span text')
    })
    withHookContext(p, () => {
      useText(p, () => 'Paragraph text')
    })
    withHookContext(h1, () => {
      useText(h1, () => 'Heading text')
    })

    expect(span.textContent).toBe('Span text')
    expect(p.textContent).toBe('Paragraph text')
    expect(h1.textContent).toBe('Heading text')
  })
})
