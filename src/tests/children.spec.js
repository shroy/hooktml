import { test, expect } from 'vitest'
import { extractChildren } from '../utils/children.js'

test('should extract children correctly', () => {
  // Setup
  const dialog = document.createElement('div')
  dialog.classList.add('Dialog')
  
  const header = document.createElement('div')
  header.setAttribute('dialog-header', '')
  dialog.appendChild(header)
  
  const item1 = document.createElement('div')
  item1.setAttribute('dialog-item', '')
  dialog.appendChild(item1)
  
  const item2 = document.createElement('div')
  item2.setAttribute('dialog-item', '')
  dialog.appendChild(item2)
  
  // Execute
  const children = extractChildren(dialog, 'Dialog')
  
  // Verify
  expect(children).toEqual({
    header,
    item: item1,
    items: [item1, item2]
  })
})

test('should handle nested components', () => {
  // Setup
  const outerDialog = document.createElement('div')
  outerDialog.classList.add('Dialog')
  
  const header = document.createElement('div')
  header.setAttribute('dialog-header', '')
  outerDialog.appendChild(header)
  
  const innerDialog = document.createElement('div')
  innerDialog.classList.add('Dialog')
  outerDialog.appendChild(innerDialog)
  
  const nestedHeader = document.createElement('div')
  nestedHeader.setAttribute('dialog-header', '')
  innerDialog.appendChild(nestedHeader)
  
  // Execute
  const children = extractChildren(outerDialog, 'Dialog')
  
  // Verify
  expect(children).toEqual({
    header
  })
})

test('should handle mixed single and multiple children', () => {
  // Setup
  const dialog = document.createElement('div')
  dialog.classList.add('Dialog')
  
  const header = document.createElement('div')
  header.setAttribute('dialog-header', '')
  dialog.appendChild(header)
  
  const item1 = document.createElement('div')
  item1.setAttribute('dialog-item', '')
  dialog.appendChild(item1)
  
  const item2 = document.createElement('div')
  item2.setAttribute('dialog-item', '')
  dialog.appendChild(item2)
  
  const footer = document.createElement('div')
  footer.setAttribute('dialog-footer', '')
  dialog.appendChild(footer)
  
  // Execute
  const children = extractChildren(dialog, 'Dialog')
  
  // Verify
  expect(children).toEqual({
    header,
    item: item1,
    items: [item1, item2],
    footer
  })
})

test('should NOT extract children from nested components', () => {
  // Setup
  const outerDialog = document.createElement('div')
  outerDialog.classList.add('Dialog')
  
  // Add direct child to outer dialog
  const directChild = document.createElement('div')
  directChild.setAttribute('dialog-header', '')
  outerDialog.appendChild(directChild)
  
  // Create nested dialog with same component name
  const nestedDialog = document.createElement('div')
  nestedDialog.classList.add('Dialog')
  outerDialog.appendChild(nestedDialog)
  
  // Add child to nested dialog with dialog-* attribute
  const nestedChild = document.createElement('div')
  nestedChild.setAttribute('dialog-footer', '')
  nestedDialog.appendChild(nestedChild)
  
  // Add another level of nesting to prove depth doesn't matter
  const deepNestedContainer = document.createElement('div')
  nestedDialog.appendChild(deepNestedContainer)
  
  const deepNestedChild = document.createElement('div')
  deepNestedChild.setAttribute('dialog-content', '')
  deepNestedContainer.appendChild(deepNestedChild)
  
  const children = extractChildren(outerDialog, 'Dialog')
  
  expect(children).toEqual({
    header: directChild
  })
  expect(children.content).toBeUndefined()
  expect(children.footer).toBeUndefined()
}) 
