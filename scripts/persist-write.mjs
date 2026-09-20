import { launchPersistentBrowser } from './persist-util.mjs'

// Phase 1: write a survivor task into a persistent browser profile, then close.
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173/'

const browser = await launchPersistentBrowser({ reset: true })
try {
  const page = await browser.newPage()
  await page.goto(`${BASE_URL}#/tasks/new`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('#title', { timeout: 8000 })
  await page.type('#title', 'REDEPLOY-survivor task')
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => location.hash.includes('/tasks/'), { timeout: 8000 })
  const url = await page.url()
  if (!url.includes('/tasks/')) {
    throw new Error('task create did not navigate to detail')
  }
  console.log('persist-write: created REDEPLOY-survivor task')
} finally {
  await browser.close()
}