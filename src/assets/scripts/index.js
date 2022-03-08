import { activate } from './common'

const triggerEl = document.querySelector('[data-trigger]')
const targetEl = document.querySelector('[data-target]')
if (triggerEl && targetEl) {
  triggerEl.addEventListener('click', () => {
    activate(targetEl)
  })
}
