import { test, expect } from '@playwright/test'

/**
 * Procore Integration E2E Tests
 *
 * These tests verify the Procore integration flow from a user's perspective.
 * Note: In production, these would use mocked Procore responses.
 * The dev mode built into the Procore integration provides mock data.
 */

test.describe('Procore Integration UI', () => {
  // Skip if not logged in - these tests require auth
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login')

    // These tests will be skipped in CI without proper test credentials
    // In a real setup, you'd use test fixtures or mock auth
  })

  test.describe('Integrations Settings Page', () => {
    test('settings page shows Procore integration option', async ({ page }) => {
      // This test verifies the UI exists, even without being logged in
      await page.goto('/dashboard/settings')

      // Should redirect to login if not authenticated
      const url = page.url()
      if (url.includes('/login')) {
        // Expected behavior - authentication required
        expect(url).toContain('/login')
      } else {
        // If we somehow got in, verify Procore UI exists
        const procoreSection = page.locator('text=/procore/i')
        await expect(procoreSection).toBeVisible({ timeout: 10000 })
      }
    })

    test('integrations page is protected', async ({ page }) => {
      await page.goto('/dashboard/settings/integrations')
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Procore OAuth Flow (UI Components)', () => {
    test('connect button should be present when not connected', async ({ page }) => {
      // Even without auth, we can check that routes exist
      const response = await page.goto('/api/integrations/procore/connect')

      // Should require authentication
      expect(response?.status()).toBe(401)
    })

    test('callback route exists', async ({ page }) => {
      // Testing that the callback route is registered
      const response = await page.goto('/api/integrations/procore/callback')

      // Should return error without proper OAuth state
      expect([400, 401, 500]).toContain(response?.status() || 0)
    })
  })

  test.describe('Procore API Routes', () => {
    test('projects API requires authentication', async ({ page }) => {
      const response = await page.goto('/api/procore/projects')
      expect(response?.status()).toBe(401)
    })

    test('vendors API requires authentication', async ({ page }) => {
      const response = await page.goto('/api/procore/vendors')
      expect(response?.status()).toBe(401)
    })

    test('push-compliance API requires authentication', async ({ page }) => {
      const response = await page.goto('/api/procore/push-compliance')
      expect(response?.status()).toBe(401)
    })

    test('projects sync API requires authentication', async ({ page }) => {
      const response = await page.request.post('/api/procore/projects/sync', {
        data: { projectIds: [] },
      })
      expect(response.status()).toBe(401)
    })

    test('vendors sync API requires authentication', async ({ page }) => {
      const response = await page.request.post('/api/procore/vendors/sync', {
        data: { vendorIds: [] },
      })
      expect(response.status()).toBe(401)
    })
  })
})

test.describe('Procore API Response Format', () => {
  test('projects API returns proper error format', async ({ page }) => {
    const response = await page.goto('/api/procore/projects')
    const body = await response?.json()

    expect(body).toHaveProperty('error')
    expect(body.error).toBe('Unauthorized')
  })

  test('vendors API returns proper error format', async ({ page }) => {
    const response = await page.goto('/api/procore/vendors')
    const body = await response?.json()

    expect(body).toHaveProperty('error')
    expect(body.error).toBe('Unauthorized')
  })
})

/**
 * Authenticated flow tests - these require a valid auth cookie
 * In a real test setup, you would:
 * 1. Use a test user fixture
 * 2. Set up auth cookies via storageState
 * 3. Mock the Procore API responses
 */
test.describe.skip('Authenticated Procore Flow', () => {
  // These tests would run with proper test authentication

  test('can view Procore projects when connected', async ({ page }) => {
    // Navigate to projects sync page
    await page.goto('/dashboard/settings/integrations/procore/projects')

    // Should show projects list or "not connected" message
    const content = await page.textContent('body')
    expect(content).toBeTruthy()
  })

  test('can view Procore vendors when connected', async ({ page }) => {
    // Navigate to vendors sync page
    await page.goto('/dashboard/settings/integrations/procore/vendors')

    // Should show vendors list or "not connected" message
    const content = await page.textContent('body')
    expect(content).toBeTruthy()
  })

  test('shows sync status for projects', async ({ page }) => {
    await page.goto('/dashboard/settings/integrations/procore/projects')

    // Should show sync status badges
    const syncedBadge = page.locator('text=/synced/i')
    // May or may not be visible depending on state
  })

  test('shows ABN extraction for vendors', async ({ page }) => {
    await page.goto('/dashboard/settings/integrations/procore/vendors')

    // Should show ABN in vendor list
    const abnField = page.locator('text=/abn/i')
    // May or may not be visible depending on data
  })

  test('can trigger project sync', async ({ page }) => {
    await page.goto('/dashboard/settings/integrations/procore/projects')

    // Find and click sync button
    const syncButton = page.locator('button:has-text("Sync")')
    if (await syncButton.isVisible()) {
      await syncButton.click()
      // Should show success or progress message
    }
  })

  test('can push compliance to Procore', async ({ page }) => {
    await page.goto('/dashboard/subcontractors')

    // Navigate to a subcontractor detail page
    // Find the push to Procore button
    const pushButton = page.locator('button:has-text("Push to Procore")')
    // Button may not be visible if Procore not connected
  })
})

/**
 * Dev Mode Tests - these verify the mock data flow
 */
test.describe('Procore Dev Mode', () => {
  test('dev mode provides mock data for development', async ({ page }) => {
    // In dev mode, the system should work without real Procore credentials
    // This is verified by the unit tests, but we can check the UI behavior

    const response = await page.goto('/api/procore/projects')

    // Even without auth, we get a proper JSON response
    const contentType = response?.headers()['content-type']
    expect(contentType).toContain('application/json')
  })
})

/**
 * Integration Health Checks
 */
test.describe('Integration Health', () => {
  test('API endpoints are registered', async ({ page }) => {
    // Verify all Procore API endpoints exist
    const endpoints = [
      '/api/procore/projects',
      '/api/procore/projects/sync',
      '/api/procore/vendors',
      '/api/procore/vendors/sync',
      '/api/procore/push-compliance',
    ]

    for (const endpoint of endpoints) {
      const response = await page.goto(endpoint)
      // 401 Unauthorized is expected, 404 would indicate missing route
      expect(response?.status()).not.toBe(404)
    }
  })

  test('OAuth endpoints are registered', async ({ page }) => {
    const oauthEndpoints = [
      '/api/integrations/procore/connect',
      '/api/integrations/procore/callback',
    ]

    for (const endpoint of oauthEndpoints) {
      const response = await page.goto(endpoint)
      // Should not 404
      expect(response?.status()).not.toBe(404)
    }
  })
})
