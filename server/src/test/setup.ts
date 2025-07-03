import { beforeAll, afterAll, beforeEach } from 'vitest'

// Set up test environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test'
  process.env.LITELLM_PROXY_URL = 'https://test-proxy.com'
  process.env.LITELLM_MASTER_KEY = 'test-master-key'
  process.env.DATABASE_URL = 'file:./test.db'
})

// Clean up after all tests
afterAll(() => {
  // Cleanup can be added here if needed
})

// Reset environment before each test
beforeEach(() => {
  // Reset any test-specific environment variables if needed
})