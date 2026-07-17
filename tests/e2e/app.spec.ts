import { expect, test, type Page } from '@playwright/test'

const firebaseEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const


function missingFirebaseConfig() {
  return firebaseEnvVars.filter(name => !process.env[name])
}

function testEmail() {
  return (process.env.PLAYWRIGHT_TEST_EMAIL ?? process.env.E2E_TEST_EMAIL)?.trim()
}

function testPassword() {
  return (process.env.PLAYWRIGHT_TEST_PASSWORD ?? process.env.E2E_TEST_PASSWORD)?.trim()
}

function requireAuthenticatedTestConfig() {
  const missing = [
    ...missingFirebaseConfig(),
    ...(!testEmail() ? ['PLAYWRIGHT_TEST_EMAIL'] : []),
    ...(!testPassword() ? ['PLAYWRIGHT_TEST_PASSWORD'] : []),
  ]

  if (missing.length > 0) {
    throw new Error(
      `Authenticated E2E tests require ${missing.join(', ')}. Add them to .env.local; see .env.example.`
    )
  }
}

async function login(page: Page) {
  requireAuthenticatedTestConfig()

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(testEmail()!)
  await page.getByPlaceholder('Password').fill(testPassword()!)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 15_000 })
}

async function openDailyCheckIn(page: Page) {
  await login(page)
  await expect(page.getByTestId('progress-dashboard')).toBeVisible({ timeout: 15_000 })

  const checkInNav = page.getByTestId('daily-checkin-nav')
  if (!(await checkInNav.isVisible().catch(() => false))) {
    throw new Error(
      'Daily Check-In E2E requires PLAYWRIGHT_TEST_EMAIL to belong to an account with a teen child profile.'
    )
  }

  await checkInNav.click()
  await expect(page).toHaveURL(/\/play-teen/)
  await expect(page.getByTestId('daily-checkin-start')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('daily-checkin-open').click()
  await expect(page.getByTestId('daily-checkin-form')).toBeVisible()
}

test.describe('public routes', () => {
  test('home page loads and sends users to login @smoke', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('Welcome back')).toBeVisible()
    await expect(page.getByText('Viada')).toBeVisible()
  })

  test('login page loads @smoke', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText('Welcome back')).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByPlaceholder('Password')).toBeVisible()
  })

  test('new user signup flow shows expected validation @smoke', async ({ page }) => {
    await page.goto('/signup')

    await expect(page.getByText('Create your account')).toBeVisible()
    await page.getByPlaceholder('Your name').fill('Playwright Parent')
    await page.getByPlaceholder('you@example.com').fill(`playwright-${Date.now()}@example.com`)
    await page.getByPlaceholder('Min. 6 characters').fill('ValidPass123!')
    await page.getByRole('button', { name: /create account/i }).click()

    const childName = page.getByPlaceholder('e.g. Alex')
    await expect(childName).toBeFocused()
    await expect(childName).toHaveJSProperty('validity.valueMissing', true)
  })
})

test.describe('authenticated routes', () => {
  test.beforeEach(() => {
    requireAuthenticatedTestConfig()
  })

  test('existing user login flow works', async ({ page }) => {
    await login(page)

    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('dashboard loads after login', async ({ page }) => {
    await login(page)

    await expect(page.getByTestId('progress-dashboard')).toBeVisible({ timeout: 15_000 })
  })

  test('bottom navigation works without forcing the user to log in again', async ({ page }) => {
    await login(page)

    await page.getByRole('link', { name: /settings/i }).click({ force: true })
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    await page.getByRole('link', { name: /alerts/i }).click({ force: true })
    await expect(page).toHaveURL(/\/notifications/)
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()

    await page.getByRole('link', { name: /home/i }).click({ force: true })
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('link', { name: /sign in/i })).toHaveCount(0)
  })

  test('settings page loads', async ({ page }) => {
    await login(page)
    await page.goto('/settings')

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.getByText('Account')).toBeVisible()
  })

  test('alerts page loads', async ({ page }) => {
    await login(page)
    await page.goto('/notifications')

    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
    await expect(page.getByText(/All caught up!|Notifications could not load|unread/i)).toBeVisible()
  })
})

test.describe('Daily Check-In E2E', () => {
  test.beforeEach(() => {
    requireAuthenticatedTestConfig()
  })

  test('saves a Daily Check-In and returns to a loading Progress dashboard', async ({ page }) => {
    await openDailyCheckIn(page)

    const moodOption = page.getByTestId('daily-checkin-outcome-good')
    await moodOption.click()
    await expect(page.getByText('Gratitude Check')).toBeVisible()
    await page.getByRole('button', { name: /^next →$/i }).click()
    await page.getByRole('button', { name: /^next →$/i }).click()
    await page.getByRole('button', { name: /^done$/i }).click()

    await expect(page.getByTestId('daily-checkin-save-success')).toContainText('Session saved', {
      timeout: 15_000,
    })
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page.getByTestId('progress-dashboard')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('progress-mood-chart')).toBeVisible()
  })
})
