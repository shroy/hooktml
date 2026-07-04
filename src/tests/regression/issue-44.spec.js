import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { extractChildren } from '../../utils/children.js'
import { useChildren } from '../../hooks/useChildren.js'
import { isArray } from '../../utils/type-guards.js'
import { initConfig } from '../../core/config.js'

/**
 * Regression: BUG-33 / issue #44 — pluralization collisions must not drop
 * children, and the two children systems (props-children `extractChildren`
 * and `useChildren`) must agree on singular/plural shape.
 *
 * On the unfixed code `box`/`boxes` markers collide on key `boxes` and the
 * second `box` element is silently dropped by the addPluralizedChild non-array
 * no-op; and `extractChildren` emits only a singular key for a single child
 * while `useChildren` emits both singular and plural.
 */
describe('issue #44 — no dropped children on collision; unified child shape', () => {
  beforeEach(() => {
    initConfig({ attributePrefix: '' })
  })

  afterEach(() => {
    initConfig({ attributePrefix: '' })
  })

  it('(A) does not silently drop a marker child when box/boxes collide', () => {
    const dialog = document.createElement('div')
    dialog.classList.add('Dialog')

    // Document order matters. The single `boxes` element comes FIRST.
    const boxesEl = document.createElement('section')
    boxesEl.setAttribute('dialog-boxes', '')
    dialog.appendChild(boxesEl)

    const box1 = document.createElement('div')
    box1.setAttribute('dialog-box', '')
    dialog.appendChild(box1)

    const box2 = document.createElement('div')
    box2.setAttribute('dialog-box', '')
    dialog.appendChild(box2)

    const children = extractChildren(dialog, 'Dialog')

    const referenced = new Set()
    const collect = (val) => {
      if (isArray(val)) {
        val.forEach(collect)
      } else if (val) {
        referenced.add(val)
      }
    }
    Object.values(children).forEach(collect)

    // Every marker element must be reachable in the result — nothing dropped.
    expect(referenced.has(boxesEl)).toBe(true)
    expect(referenced.has(box1)).toBe(true)
    expect(referenced.has(box2)).toBe(true)
  })

  it('(B) single child has consistent shape across both children systems', () => {
    const hookRoot = document.createElement('div')
    hookRoot.setAttribute('use-widget', '')
    const hookPanel = document.createElement('div')
    hookPanel.setAttribute('widget-panel', '')
    hookRoot.appendChild(hookPanel)

    const viaHook = useChildren(hookRoot, 'widget')
    expect(viaHook).toHaveProperty('panel')
    expect(viaHook).toHaveProperty('panels')

    const comp = document.createElement('div')
    comp.classList.add('Widget')
    const propPanel = document.createElement('div')
    propPanel.setAttribute('widget-panel', '')
    comp.appendChild(propPanel)

    const viaProps = extractChildren(comp, 'Widget')

    // props-children must expose the same singular+plural shape as useChildren.
    expect(viaProps).toHaveProperty('panel')
    expect(viaProps).toHaveProperty('panels')
    expect(viaProps.panel).toBe(propPanel)
    expect(isArray(viaProps.panels)).toBe(true)
    expect(viaProps.panels).toEqual([propPanel])
    expect(Object.keys(viaProps).sort()).toEqual(Object.keys(viaHook).sort())
  })

  it('(C) multiple children keep singular=first and plural=all (parity)', () => {
    const dialog = document.createElement('div')
    dialog.classList.add('Dialog')

    const item1 = document.createElement('div')
    item1.setAttribute('dialog-item', '')
    dialog.appendChild(item1)

    const item2 = document.createElement('div')
    item2.setAttribute('dialog-item', '')
    dialog.appendChild(item2)

    const children = extractChildren(dialog, 'Dialog')

    expect(children.item).toBe(item1)
    expect(isArray(children.items)).toBe(true)
    expect(children.items).toEqual([item1, item2])
  })
})
