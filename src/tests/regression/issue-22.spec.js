import { describe, it, expect, beforeEach } from 'vitest'
import { extractChildren } from '../../utils/children.js'
import { initConfig } from '../../core/config.js'

/**
 * Regression: BUG-11 / issue #22 — component-prop children extraction must not
 * abort at the first nested same-name component.
 *
 * On the unfixed code `descendants.some(child => { if (hasSameComponent(...))
 * return true; ... })` short-circuits the ENTIRE document-ordered scan at the
 * first nested component, silently dropping every marker that follows it
 * (including root-level siblings outside the nested component). The fix skips
 * only elements that live inside a nested component (via closest()).
 */
describe('issue #22 — nested component must not abort child extraction', () => {
  beforeEach(() => {
    initConfig({ attributePrefix: '' })
  })

  it('finds a root-level child marker that follows a nested same-name component', () => {
    // <div class="Card"><div class="Card"></div><span card-title></span></div>
    const card = document.createElement('div')
    card.classList.add('Card')

    const nestedCard = document.createElement('div')
    nestedCard.classList.add('Card')
    card.appendChild(nestedCard)

    const title = document.createElement('span')
    title.setAttribute('card-title', '')
    card.appendChild(title)

    const children = extractChildren(card, 'Card')

    expect(children.title).toBe(title)
  })

  it('still excludes markers that live INSIDE the nested component', () => {
    // Outer Card owns `title`; the nested Card owns `body` which must NOT leak up,
    // and a further root-level `footer` after the nested subtree must be found.
    const card = document.createElement('div')
    card.classList.add('Card')

    const title = document.createElement('span')
    title.setAttribute('card-title', '')
    card.appendChild(title)

    const nestedCard = document.createElement('div')
    nestedCard.classList.add('Card')
    card.appendChild(nestedCard)

    const nestedBody = document.createElement('div')
    nestedBody.setAttribute('card-body', '')
    nestedCard.appendChild(nestedBody)

    const footer = document.createElement('div')
    footer.setAttribute('card-footer', '')
    card.appendChild(footer)

    const children = extractChildren(card, 'Card')

    expect(children.title).toBe(title)
    expect(children.footer).toBe(footer)
    // The nested component's own child must not be picked up by the outer.
    expect(children.body).toBeUndefined()
  })
})
