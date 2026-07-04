import { describe, it, expect } from 'vitest'
import { extractProps, coerceValue } from '../../utils/props.js'
import { initConfig } from '../../core/config.js'

/**
 * Regression: issue #36 — prop coercion mangles string data.
 *
 * `coerceValue` used to call `Number(value)` whenever `isNumeric(value)` was
 * true, and `isNumeric` accepted leading zeros, scientific notation, hex
 * literals and whitespace-padded strings. So `card-id="007"` -> 7,
 * `"1e3"` -> 1000, `"0x10"` -> 16, `" 42 "` -> 42 — IDs, zip codes and
 * versions were silently corrupted with no opt-out.
 *
 * Correct behavior: only plain decimal integers/floats (/^-?\d+(\.\d+)?$/)
 * coerce to Number; everything else is preserved as its original string.
 * Assertions describe the CORRECT behavior.
 */
describe('issue #36: prop coercion must not corrupt string data', () => {
  it('preserves leading-zero IDs, scientific notation, hex, and padded values as strings', () => {
    initConfig()

    const element = document.createElement('div')
    element.setAttribute('card-id', '007')   // zip/id with leading zero
    element.setAttribute('card-ver', '1e3')  // version-like / scientific notation
    element.setAttribute('card-hex', '0x10') // hex literal
    element.setAttribute('card-zip', ' 42 ') // whitespace-padded

    const props = extractProps(element, 'Card')

    expect(props.id).toBe('007')
    expect(props.ver).toBe('1e3')
    expect(props.hex).toBe('0x10')
    expect(props.zip).toBe(' 42 ')
  })

  it('coerceValue leaves non-decimal-integer strings untouched', () => {
    expect(coerceValue('007')).toBe('007')
    expect(coerceValue('1e3')).toBe('1e3')
    expect(coerceValue('0x10')).toBe('0x10')
    expect(coerceValue(' 42 ')).toBe(' 42 ')
    expect(coerceValue('+5')).toBe('+5')
    expect(coerceValue('Infinity')).toBe('Infinity')
  })

  it('still coerces plain decimal integers and floats to numbers', () => {
    expect(coerceValue('42')).toBe(42)
    expect(coerceValue('1000')).toBe(1000)
    expect(coerceValue('-7')).toBe(-7)
    expect(coerceValue('3.14')).toBe(3.14)
    expect(coerceValue('-0.5')).toBe(-0.5)
  })

  it('still coerces boolean and null literals', () => {
    expect(coerceValue('true')).toBe(true)
    expect(coerceValue('false')).toBe(false)
    expect(coerceValue('null')).toBe(null)
  })
})
