import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
const url = process.env.PLAY_URL ?? 'http://127.0.0.1:4173/'
await page.goto(url, { waitUntil: 'networkidle' })

const title = await page.locator('h1').innerText()
if (!title.includes('SHOW YOUR HAND')) {
  throw new Error(`Start screen missing: ${title}`)
}

await page.locator('button', { hasText: '2' }).click()
await page.getByTestId('start-game').click()
await page.waitForSelector('.syh-you')

const humanCards = await page.locator('.syh-you .syh-card img').count()
if (humanCards !== 5) throw new Error(`Expected 5 human cards, got ${humanCards}`)

const firstArt = await page.locator('.syh-you .syh-card img').first().getAttribute('src')
if (!firstArt || firstArt.includes('back.png')) {
  throw new Error('Human cards should be face-up with artwork')
}

let sawDefense = false
let sawRound = false
let matchOver = false

for (let i = 0; i < 220; i++) {
  if (await page.getByRole('heading', { name: 'Match over' }).count()) {
    matchOver = true
    break
  }
  if (await page.getByTestId('next-round').count()) {
    sawRound = true
    await page.getByTestId('next-round').click()
    await page.waitForTimeout(200)
    continue
  }
  if (await page.getByRole('button', { name: 'Continue' }).count()) {
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForTimeout(200)
    continue
  }
  if (await page.getByRole('heading', { name: 'Reverse Drop Color' }).count()) {
    const color = page.locator('.syh-color').first()
    if (await color.count()) {
      await color.click()
      await page.waitForTimeout(220)
      continue
    }
  }
  if (await page.getByRole('button', { name: 'Accept Attack' }).count()) {
    sawDefense = true
    await page.getByRole('button', { name: 'Accept Attack' }).click()
    await page.waitForTimeout(220)
    continue
  }
  if (await page.getByRole('button', { name: 'Play Blank' }).count()) {
    sawDefense = true
    await page.getByRole('button', { name: 'Play Blank' }).click()
    await page.waitForTimeout(220)
    continue
  }
  if (await page.getByRole('button', { name: 'Play matching counter' }).count()) {
    sawDefense = true
    await page.getByRole('button', { name: 'Play matching counter' }).click()
    await page.waitForTimeout(220)
    continue
  }
  const declare = page.getByTestId('declare-hand')
  if ((await declare.count()) && !(await declare.isDisabled())) {
    await declare.click()
    await page.waitForTimeout(220)
    continue
  }
  if (await page.getByTestId('confirm-shuffle').count()) {
    const target = page.locator('.syh-seat .syh-card').first()
    if (await target.count()) await target.click()
    const confirm = page.getByTestId('confirm-shuffle')
    if (!(await confirm.isDisabled())) {
      await confirm.click()
      await page.waitForTimeout(220)
      continue
    }
  }
  if (await page.locator('.syh-chooser').count()) {
    const color = page.locator('.syh-color').first()
    if (await color.count()) await color.click()
    const target = page.locator('.syh-seat .syh-card').first()
    if (await target.count()) {
      await target.click()
      await page.waitForTimeout(220)
      continue
    }
  }
  const liveCard = page.locator('.syh-you .syh-card:not(:disabled)').first()
  if (await liveCard.count()) {
    await liveCard.click()
    await page.waitForTimeout(220)
    continue
  }
  await page.waitForTimeout(250)
}

await page.screenshot({ path: 'playthrough-final.png', fullPage: true })
await browser.close()

if (!matchOver) {
  throw new Error(`Browser match did not finish. defense=${sawDefense} round=${sawRound}`)
}

console.log(
  JSON.stringify({ ok: true, humanCards, firstArt, sawDefense, sawRound, matchOver }, null, 2),
)
