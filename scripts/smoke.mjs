import puppeteer from 'puppeteer-core'

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173/'
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome'

let passed = 0
let failed = 0

function ok(label) {
  passed += 1
  console.log(`  ok ${label}`)
}

function fail(label, detail = '') {
  failed += 1
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
}

function assert(cond, label, detail = '') {
  if (cond) ok(label)
  else fail(label, detail)
}

function qid(id) {
  return `[data-testid="${id}"]`
}

const log = (m) => console.log(`\n[smoke] ${m}`)

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 120000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })
  const page = await browser.newPage()

  try {
    // ---------- 1. Home loads and shows the storage label + release marker ----------
    log('load home')
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 })
    await page.waitForSelector('main', { timeout: 15000 })
    await page.waitForFunction(() => !!document.querySelector('[data-testid="task-list"]') || !!document.querySelector('[data-testid="empty-state"]'), {
      timeout: 15000,
      label: 'board or empty state rendered',
    })
    assert(/browser-only localStorage/i.test(await page.$eval('.storage-label', (el) => el.textContent)), 'storage label says browser-only localStorage')
    const marker = await page.$eval('[data-testid="build-marker"]', (el) => el.textContent)
    assert(/^build: /.test(marker), 'release marker visible', marker)

    // ---------- 2. Negative: blank title is rejected with a visible error ----------
    log('invalid input (blank title)')
    await page.click('text=Add task')
    await page.waitForSelector('#title', { timeout: 8000 })
    assert((await page.url()).includes('/tasks/new'), 'deep link to create form', page.url())
    await page.click('button[type="submit"]')
    await page.waitForSelector('#title-error', { timeout: 8000 })
    const errText = await page.$eval('#title-error', (el) => el.textContent)
    assert(/required/i.test(errText), 'blank title shows required error', errText)

    /* Over-long titles are rejected by the model; the input caps typing at
       maxLength, so this path only fires on programmatic input. Skip it:
       covered by the unit tests in tests/taskModel.test.js. */

    // ---------- 3. Create a first task ----------
    log('create task one')
    await page.type('#title', 'Prepare deployment notes')
    await page.select('#priority', 'high')
    await page.type('#description', 'Write the README runbook section')
    await page.click('button[type="submit"]')
    await page.waitForFunction(() => location.hash.includes('/tasks/'), { timeout: 8000 })
    assert(/\/tasks\//.test(await page.url()), 'create redirects to task deep link', await page.url())
    const created = await page.$eval('#title', (el) => el.value)
    assert(created === 'Prepare deployment notes', 'task persisted in form after create', created)

    // ---------- 4. Home board lists the new task ----------
    log('board lists created task')
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 })
    await page.waitForSelector(qid('task-list'), { timeout: 8000 })
    const listText = await page.$eval(qid('task-list'), (el) => el.textContent)
    assert(listText.includes('Prepare deployment notes'), 'created task appears in board list', listText.slice(0, 80))

    // ---------- 5. Search positive and negative ----------
    log('search filter')
    await page.type('#filter-q', 'deployment')
    await page.waitForFunction(() => document.querySelector('[data-testid="task-count"]')?.textContent.includes('1 task'), { timeout: 8000 })
    const boardAfter = await page.$eval(qid('task-list'), (el) => el.textContent)
    assert(boardAfter.includes('Prepare deployment notes'), 'search finds matching task')

    await page.$eval('#filter-q', (el) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(el, 'zzz-no-match')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForSelector(qid('empty-state'), { timeout: 8000 })
    assert((await page.$(qid('task-list'))) === null, 'search excludes non-matching tasks')

    await page.$eval('#filter-q', (el) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(el, '')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForFunction(() => document.querySelector('[data-testid="task-list"]') !== null, { timeout: 8000 })

    // ---------- 6. Status filter via UI ----------
    log('status filter')
    await page.select('#filter-status', 'in_progress')
    await page.waitForSelector(qid('empty-state'), { timeout: 8000 })
    assert((await page.$(qid('task-list'))) === null, 'status filter excludes mismatched tasks')
    await page.select('#filter-status', 'todo')
    await page.waitForSelector(qid('task-list'), { timeout: 8000 })

    // ---------- 7. Edit the first task ----------
    log('update task')
    await page.click('text=Edit')
    await page.waitForSelector('#title', { timeout: 8000 })
    await page.click('#title')
    await page.keyboard.down('Control')
    await page.keyboard.press('KeyA')
    await page.keyboard.up('Control')
    await page.type('#title', 'Prepare deployment notes v2')
    await page.select('#status', 'done')
    await page.click('button[type="submit"]')
    await page.waitForSelector('[data-testid="saved-notice"]', { timeout: 8000 })
    assert((await page.$('[data-testid="saved-notice"]')) !== null, 'saved notice shown after update')

    // ---------- 8. Deep link to the task ----------
    log('deep link to task')
    const taskUrl = await page.url()
    assert(/\/tasks\/[^/]+$/.test(taskUrl), 'edit URL is a deep link', taskUrl)
    await page.reload({ waitUntil: 'load', timeout: 15000 })
    await page.waitForFunction(() => document.querySelector('#title')?.value === 'Prepare deployment notes v2', { timeout: 8000 })
    const titleAfterReload = await page.$eval('#title', (el) => el.value)
    assert(titleAfterReload === 'Prepare deployment notes v2', 'task update survives deep-link reload', titleAfterReload)

    // ---------- 9. Persistence across full page reload ----------
    log('reload persistence')
    await page.goto(`${BASE_URL}#/tasks/new`, { waitUntil: 'load', timeout: 15000 })
    await page.waitForSelector('#title', { timeout: 8000 })
    await page.type('#title', 'PERSIST-survivor task')
    await page.click('button[type="submit"]')
    await page.waitForFunction(() => location.hash.includes('/tasks/'), { timeout: 8000 })
    const survivorUrl = await page.url()
    await page.reload({ waitUntil: 'load', timeout: 15000 })
    await page.waitForSelector('#title', { timeout: 8000 })
    await page.waitForFunction(() => document.querySelector('#title')?.value === 'PERSIST-survivor task', { timeout: 8000 })
    assert((await page.$eval('#title', (el) => el.value)) === 'PERSIST-survivor task', 'task persists across reload')

    // Re-open a brand-new page on the same origin: localStorage must still hold it.
    log('fresh tab persistence')
    const probe = await browser.newPage()
    await probe.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 })
    await probe.waitForSelector(qid('task-list'), { timeout: 8000 })
    const probeText = await probe.$eval(qid('task-list'), (el) => el.textContent)
    assert(probeText.includes('PERSIST-survivor task'), 'task visible in a fresh tab (localStorage across reload)', probeText.slice(0, 60))
    await probe.close()

    // ---------- 10. Delete the survivor ----------
    log('delete task')
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 })
    await page.waitForSelector(qid('task-list'), { timeout: 8000 })
    const deleteButtons = await page.$$('button[aria-label^="Delete PERSIST-survivor"]')
    assert(deleteButtons.length === 1, 'delete button found for survivor task')
    await deleteButtons[0].click()
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Yes, delete')), { timeout: 8000 })
    await page.$$eval('button', (btns) => btns.find((b) => b.textContent.includes('Yes, delete'))?.click())
    await page.waitForFunction(() => /1 task$/.test((document.querySelector('[data-testid="task-count"]')?.textContent ?? '').trim()), { timeout: 8000 })
    const listAfterDelete = await page.$eval(qid('task-list'), (el) => el.textContent)
    assert(!listAfterDelete.includes('PERSIST-survivor task'), 'deleted task is gone from board')

    // ---------- 11. Deep link to a nonexistent task shows not-found ----------
    log('deep link to nonexistent task')
    await page.goto(`${BASE_URL}#/tasks/does-not-exist-123`, { waitUntil: 'load', timeout: 15000 })
    await page.waitForFunction(() => document.querySelector('h1')?.textContent.includes('Task not found'), { timeout: 8000 })
    const notFound = await page.$eval('h1', (el) => el.textContent)
    assert(/Task not found/i.test(notFound), 'unknown task id shows not-found', notFound)
  } finally {
    await browser.close()
  }

  console.log(`\n=== React smoke summary: ${passed} passed, ${failed} failed ===`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('smoke crashed:', err)
  process.exit(1)
})