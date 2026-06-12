// Verification for the security + pages update:
//  1. Screenshots every new/changed public page in both themes.
//  2. Asserts public pages are reachable logged-out (no login redirect).
//  3. Asserts security headers are present.
//  4. Hammers an /auth route to confirm the middleware returns a graceful 429.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:3000'
const OUT = process.env.OUT || 'C:/Users/gohil/Documents/Studyverse/screenshots-v4'
mkdirSync(OUT, { recursive: true })

const pages = [
  { name: 'landing', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'blog', path: '/blog' },
  { name: 'blog-post', path: '/blog/body-doubling-why-studying-together-works' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
  { name: 'safety', path: '/safety' },
  { name: 'cookies', path: '/cookies' },
  { name: 'signup', path: '/auth/signup' },
]

let failures = 0
const fail = (msg) => { failures++; console.error('FAIL:', msg) }
const pass = (msg) => console.log('ok:', msg)

// --- 2 + 3: public access + security headers (plain fetch, no cookies) ---
for (const p of pages) {
  const res = await fetch(BASE + p.path, { redirect: 'manual' })
  if (res.status !== 200) fail(`${p.path} returned ${res.status} (expected 200, logged out)`)
  else pass(`${p.path} is publicly reachable`)
}
{
  const res = await fetch(BASE + '/', { redirect: 'manual' })
  const need = ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'strict-transport-security', 'permissions-policy']
  for (const h of need) {
    if (!res.headers.get(h)) fail(`missing security header: ${h}`)
  }
  if (res.headers.get('x-powered-by')) fail('x-powered-by should be removed')
  pass('security headers present, x-powered-by removed')

  // Open-redirect guard: callback with a hostile `next` must NOT bounce off-site.
  const cb = await fetch(BASE + '/auth/callback?code=x&next=//evil.com', { redirect: 'manual' })
  const loc = cb.headers.get('location') || ''
  if (loc.includes('evil.com')) fail(`open redirect! callback Location: ${loc}`)
  else pass(`auth callback rejects hostile next (-> ${loc || cb.status})`)
}

// --- 1: screenshots ---
let browser
for (const opts of [{ channel: 'msedge' }, { channel: 'chrome' }, {}]) {
  try { browser = await chromium.launch(opts); break } catch {}
}
if (!browser) { console.error('No browser available'); process.exit(1) }

for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t) } catch {} }, theme)
  const page = await ctx.newPage()
  for (const p of pages) {
    await page.goto(BASE + p.path, { waitUntil: 'load' })
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${OUT}/${p.name}-${theme}.png`, fullPage: true })
    console.log('captured', `${p.name}-${theme}.png`)
  }
  // Mobile nav check (landing, menu open)
  if (theme === 'dark') {
    const m = await ctx.newPage()
    await m.setViewportSize({ width: 390, height: 844 })
    await m.goto(BASE + '/', { waitUntil: 'load' })
    await m.click('button[aria-label="Open menu"]')
    await m.waitForTimeout(400)
    await m.screenshot({ path: `${OUT}/landing-mobile-menu.png` })
    console.log('captured landing-mobile-menu.png')
  }
  await ctx.close()
}
await browser.close()

// --- 4 (last so the hammer can't starve the page loads above): 429 on /auth ---
{
  let got429 = null
  for (let i = 0; i < 45; i++) {
    const res = await fetch(BASE + '/auth/login', { headers: { accept: 'application/json' } })
    if (res.status === 429) { got429 = res; break }
  }
  if (!got429) fail('no 429 after 45 rapid /auth requests')
  else {
    const body = await got429.json().catch(() => null)
    if (!got429.headers.get('retry-after')) fail('429 missing Retry-After header')
    else pass(`429 served gracefully (Retry-After=${got429.headers.get('retry-after')}, body=${JSON.stringify(body)})`)
  }
}

console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
