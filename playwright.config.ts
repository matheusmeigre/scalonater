import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 90_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  // Testa o build de produção (com service worker), não o servidor de dev.
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'iphone-se',
      use: { ...devices['iPhone SE'], viewport: { width: 375, height: 667 } },
    },
    {
      name: 'small-phone-320',
      use: { ...devices['Pixel 7'], viewport: { width: 320, height: 568 } },
    },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
    {
      name: 'phone-landscape',
      use: { ...devices['Pixel 7'], viewport: { width: 839, height: 412 } },
    },
    { name: 'ipad', use: { ...devices['iPad (gen 7)'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
})
