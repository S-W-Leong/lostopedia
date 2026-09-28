'use client'

import { describe, expect, it, beforeEach, vi } from 'vitest'

import { render, screen } from '@/test/utils'
import ProfilePage from '../page'

const mocks = vi.hoisted(() => ({
  useAuthReturn: {
    user: {
      id: 'user-1',
      email: 'student@tarc.edu.my',
    },
    profile: {
      id: 'user-1',
      display_name: 'Student',
      phone: null,
      avatar_url: null,
      created_at: '2026-04-01T00:00:00.000Z',
      reputation_score: 100,
      total_items_returned: 0,
      is_banned: false,
    },
    isLoading: false,
    refreshProfile: vi.fn(),
  } as any,
  createClient: vi.fn(),
  passwordResetCard: vi.fn(({ email }: { email?: string | null }) => (
    <div data-testid="password-reset-card">reset card for {email}</div>
  )),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mocks.useAuthReturn,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mocks.createClient(),
}))

vi.mock('@/lib/supabase/storage', () => ({
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
}))

vi.mock('@/components/profile/PasswordResetCard', () => ({
  PasswordResetCard: (props: { email?: string | null }) => mocks.passwordResetCard(props),
}))

describe('ProfilePage', () => {
  beforeEach(() => {
    mocks.useAuthReturn.isLoading = false
    mocks.useAuthReturn.user = {
      id: 'user-1',
      email: 'student@tarc.edu.my',
    }
    mocks.useAuthReturn.profile = {
      id: 'user-1',
      display_name: 'Student',
      phone: null,
      avatar_url: null,
      created_at: '2026-04-01T00:00:00.000Z',
      reputation_score: 100,
      total_items_returned: 0,
      is_banned: false,
    }
    mocks.passwordResetCard.mockClear()
    mocks.createClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null })),
        })),
      })),
    })
  })

  it('renders the password reset card with the signed-in email', () => {
    render(<ProfilePage />)

    expect(screen.getByTestId('password-reset-card')).toHaveTextContent(
      'reset card for student@tarc.edu.my'
    )
    expect(mocks.passwordResetCard).toHaveBeenCalledWith({ email: 'student@tarc.edu.my' })
    expect(screen.getByText(/danger zone/i)).toBeInTheDocument()
  })

  it('keeps the existing loading guard before rendering profile sections', () => {
    mocks.useAuthReturn.isLoading = true

    render(<ProfilePage />)

    expect(screen.queryByTestId('password-reset-card')).not.toBeInTheDocument()
  })

  it('keeps the existing signed-out error state when user data is missing', () => {
    mocks.useAuthReturn.user = null
    mocks.useAuthReturn.profile = null

    render(<ProfilePage />)

    expect(screen.getByText(/unable to load profile/i)).toBeInTheDocument()
    expect(screen.queryByTestId('password-reset-card')).not.toBeInTheDocument()
  })
})
