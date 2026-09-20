import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173/'
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome'

export const PROFILE = path.join(os.tmpdir(), 'react-taskboard-persist-profile')

export async function launchPersistentBrowser({ reset = false } = {}) {
  if (reset) fs.rmSync(PROFILE, { recursive: true, force: true })
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 120000,
    userDataDir: PROFILE,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })
  return browser
}