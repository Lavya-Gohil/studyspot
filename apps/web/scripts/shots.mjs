import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:3000'
const OUT = process.env.OUT || 'C:/Users/gohil/Documents/Studyverse/screenshots'
mkdirSync(OUT, { recursive: true })

const pages = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/auth/login' },
  { name: 'signup', path: '/auth/signup' },
]

let browser
for (const opts of [{ channel: 'msedge' }, { channel: 'chrome' }, {}]) {
  try {
    browser = await chromium.launch(opts)
    console.log('launched with', JSON.stringify(opts))
    break
  } catch (e) {
    console.log('launch failed for', JSON.stringify(opts), '-', e.message.split('\n')[0])
  }
}
if (!browser) {
  console.error('No browser available')
  process.exit(1)
}
for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  })
  await ctx.addInitScript((t) => {
    try { localStorage.setItem('theme', t) } catch {}
  }, theme)
  const page = await ctx.newPage()
  for (const p of pages) {
    await page.goto(BASE + p.path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    const file = `${OUT}/${p.name}-${theme}.png`
    await page.screenshot({ path: file, fullPage: true })
    console.log('captured', file)
  }
  await ctx.close()
}
await browser.close()
console.log('DONE')
