import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/test/utils'
import { FilterChip } from '../filter-chip'

describe('FilterChip', () => {
  it('exposes a keyboard-reachable remove button with an accessible name', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()

    render(
      <FilterChip
        label="Lost items"
        removeLabel="Remove type filter"
        onRemove={onRemove}
      />
    )

    const removeButton = screen.getByRole('button', { name: /remove type filter/i })

    await user.tab()
    expect(removeButton).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
