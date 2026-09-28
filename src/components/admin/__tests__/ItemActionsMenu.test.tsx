import type { ComponentProps } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/test/utils'
import { ItemActionsMenu } from '../ItemActionsMenu'

describe('ItemActionsMenu', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      } as Response)
    )
  })

  it('lets admins mark active office pickup items as recovered with claimant details', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    const item: ComponentProps<typeof ItemActionsMenu>['item'] = {
      id: 'item-1',
      title: 'Blue Umbrella',
      status: 'active',
      removed_flag_id: null,
      pickup_method: 'office',
      type: 'found',
    }

    render(
      <ItemActionsMenu
        item={item}
        onUpdate={onUpdate}
      />
    )

    await user.click(screen.getByRole('button', { name: /open item actions/i }))
    await user.click(await screen.findByRole('menuitem', { name: /mark as recovered/i }))

    await user.type(screen.getByLabelText(/claimant name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/member reference/i), 'S1234567')
    await user.click(screen.getByRole('button', { name: /confirm recovery/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/items/item-1/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimantName: 'Jane Doe',
          claimantStudentId: 'S1234567',
        }),
      })
    })
    expect(onUpdate).toHaveBeenCalled()
  })
})
