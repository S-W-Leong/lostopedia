'use client'

import { describe, expect, it, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import { render, screen, waitFor } from '@/test/utils'
import { PasswordResetCard } from '../PasswordResetCard'

const mocks = vi.hoisted(() => ({
  resetPassword: vi.fn(),
}))

vi.mock('@/lib/supabase/auth', () => ({
  resetPassword: mocks.resetPassword,
}))

describe('PasswordResetCard', () => {
  beforeEach(() => {
    mocks.resetPassword.mockReset()
  })

  it('requests a reset link for the signed-in email and shows success feedback', async () => {
    const user = userEvent.setup()
    mocks.resetPassword.mockResolvedValue({ success: true })

    render(<PasswordResetCard email="member@example.org" />)

    await user.click(screen.getByRole('button', { name: /email me a reset link/i }))

    await waitFor(() => {
      expect(mocks.resetPassword).toHaveBeenCalledWith('member@example.org')
    })

    expect(
      screen.getByText(/we've sent a password reset link to member@example\.org/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /send another link/i })
    ).toBeInTheDocument()
  })

  it('allows requesting another link after success', async () => {
    const user = userEvent.setup()
    mocks.resetPassword.mockResolvedValue({ success: true })

    render(<PasswordResetCard email="member@example.org" />)

    await user.click(screen.getByRole('button', { name: /email me a reset link/i }))
    await screen.findByRole('button', { name: /send another link/i })
    await user.click(screen.getByRole('button', { name: /send another link/i }))

    await waitFor(() => {
      expect(mocks.resetPassword).toHaveBeenCalledTimes(2)
    })
  })

  it('shows an error when the reset request fails', async () => {
    const user = userEvent.setup()
    mocks.resetPassword.mockResolvedValue({
      success: false,
      error: { message: 'Rate limit exceeded' },
    })

    render(<PasswordResetCard email="member@example.org" />)

    await user.click(screen.getByRole('button', { name: /email me a reset link/i }))

    expect(await screen.findByText(/rate limit exceeded/i)).toBeInTheDocument()
  })

  it('disables the action when no email is available', () => {
    render(<PasswordResetCard email={null} />)

    expect(
      screen.getByText(/we couldn't find your account email/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /email me a reset link/i })
    ).toBeDisabled()
  })
})
