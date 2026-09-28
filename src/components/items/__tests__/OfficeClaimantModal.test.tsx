import { it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/test/utils'
import { OfficeClaimantModal } from '../OfficeClaimantModal'

it('submits a null optional reference with configured label', async () => {
  const onConfirm = vi.fn()
  render(<OfficeClaimantModal open onClose={vi.fn()} itemTitle="Umbrella" onConfirm={onConfirm} reference={{ label: 'Member reference', required: false }} />)
  expect(screen.getByLabelText(/Member reference/)).toBeInTheDocument()
  await userEvent.type(screen.getByLabelText('Full name'), ' Example Person ')
  await userEvent.click(screen.getByRole('button', { name: 'Mark complete' }))
  expect(onConfirm).toHaveBeenCalledWith('Example Person', null)
})
