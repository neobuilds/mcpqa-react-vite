import { launchPersistentBrowser } from './persist-util.mjs'

// Phase 2: reopen the same persistent browser profile against a restarted
// server and verify the survivor task written in phase 1 is still present.
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173/'

const browser = await launchPersistentBrowser()
try {
  const page = await browser.newPage()
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="task-list"]', { timeout: 8000 })
  const text = await page.evaluate(() => document.querySelector('[data-testid="task-list"]').textContent)
  if (!text.includes('REDEPLOY-survivor task')) {
    throw new Error('survivor task missing after server restart: ' + text.slice(0, 200))
  }
  console.log('persist-read: REDEPLOY-survivor task survived server restart')
} finally {
  await browser.close()
}