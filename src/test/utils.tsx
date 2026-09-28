import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'

/**
 * Test utilities for chat system tests
 */

// Mock fetch globally
export const mockFetch = (response: any, ok: boolean = true, status: number = 200) => {
  return vi.fn(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    } as Response)
  )
}

// Mock fetch with error
export const mockFetchError = (error: string, status: number = 500) => {
  return vi.fn(() =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.resolve({ success: false, error }),
      text: () => Promise.resolve(JSON.stringify({ success: false, error })),
    } as Response)
  )
}

// Mock Supabase client
export const createMockSupabaseClient = () => {
  return {
    auth: {
      getUser: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          limit: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        is: vi.fn(() => ({
          single: vi.fn(),
        })),
        or: vi.fn(() => ({
          order: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    rpc: vi.fn(),
  }
}

// Mock router
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}

// Mock useRouter
export const mockUseRouter = () => {
  return mockRouter
}

// Mock useSearchParams
export const mockUseSearchParams = (params: Record<string, string | null> = {}) => {
  return {
    get: (key: string) => params[key] || null,
    getAll: (key: string) => (params[key] ? [params[key]!] : []),
    has: (key: string) => key in params,
    keys: () => Object.keys(params),
    values: () => Object.values(params),
    entries: () => Object.entries(params),
    toString: () => new URLSearchParams(params as Record<string, string>).toString(),
  }
}

// Helper to wait for async updates
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0))

// Mock Notification API
export const mockNotification = {
  permission: 'granted' as NotificationPermission,
  requestPermission: vi.fn(() => Promise.resolve('granted' as NotificationPermission)),
}

// Setup global mocks
export const setupGlobalMocks = () => {
  global.fetch = mockFetch({ success: true })
  
  // Mock Notification API
  if (typeof window !== 'undefined') {
    ;(window as any).Notification = vi.fn(() => ({}))
    ;(window as any).Notification.permission = 'granted'
    ;(window as any).Notification.requestPermission = vi.fn(() => Promise.resolve('granted'))
  }
  
  // Mock document.visibilityState
  Object.defineProperty(document, 'visibilityState', {
    writable: true,
    value: 'visible',
  })
}

// Custom render with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

