import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createObserver } from '../../core/observer.js'
import { useChildren } from '../../hooks/useChildren.js'
import { initConfig } from '../../core/config.js'
import { isSignal } from '../../utils/type-guards.js'

/**
 * Regression: BUG-10 / issue #21 — reactive useChildren signals must update
 * when a child is REMOVED, not just when one is added.
 *
 * MutationObserver callbacks run after detachment, so for a removed child
 * `watcher.element.contains(child)` is already false. The observer must
 * consult `mutation.target` (the still-attached parent whose childList
 * changed) so the watcher fires and the signal drops the removed element.
 */
const flushMutations = async () => {
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await Promise.resolve()
}

describe('issue #21 — reactive useChildren updates on child removal', () => {
  /** @type {ReturnType<typeof createObserver>} */
  let observer

  beforeEach(() => {
    initConfig({ debug: false })
    document.body.innerHTML = ''
    observer = createObserver()
    observer.start()
  })

  afterEach(() => {
    if (observer) observer.stop()
    document.body.innerHTML = ''
  })

  it('updates the plural signal when a child is removed (SANITY: additions update too)', async () => {
    document.body.innerHTML = `
      <div id="list-root" use-list>
        <div list-item>Item 1</div>
        <div list-item>Item 2</div>
        <div list-item>Item 3</div>
      </div>
    `

    const root = document.getElementById('list-root')
    if (!root) throw new Error('Test root not found')

    const result = useChildren(root, 'list', { signals: ['item'] })

    expect(isSignal(result.item)).toBe(true)
    expect(isSignal(result.items)).toBe(true)

    const itemsSignal = result.items

    expect(itemsSignal.value.length).toBe(3)

    // SANITY CHECK: additions DO update (isolates the removal path)
    const added = document.createElement('div')
    added.setAttribute('list-item', '')
    added.textContent = 'Item 4'
    root.appendChild(added)
    await flushMutations()
    expect(itemsSignal.value.length).toBe(4)

    // THE BUG: removal should update the signal
    const toRemove = root.querySelector('[list-item]')
    if (!toRemove) throw new Error('No item to remove')
    root.removeChild(toRemove)
    await flushMutations()

    expect(itemsSignal.value.length).toBe(3)
    expect(itemsSignal.value.includes(toRemove)).toBe(false)
  })
})
