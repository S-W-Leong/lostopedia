import * as React from 'react'
import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/test/utils'
import { SelectionCardRadioGroup } from '../selection-card-radio-group'

function SelectionCardRadioGroupHarness() {
  const [value, setValue] = React.useState<'lost' | 'found'>('lost')

  return (
    <SelectionCardRadioGroup
      name="item-type"
      legend="Item type"
      value={value}
      onChange={setValue}
      options={[
        {
          value: 'lost',
          title: 'Lost item',
          description: 'I misplaced something.',
          activeClassName: 'border-lost bg-lost/10',
        },
        {
          value: 'found',
          title: 'Found item',
          description: 'I found something and want to return it.',
          activeClassName: 'border-found bg-found/10',
        },
      ]}
    />
  )
}

describe('SelectionCardRadioGroup', () => {
  it('renders native radio controls and updates checked state', async () => {
    const user = userEvent.setup()

    render(<SelectionCardRadioGroupHarness />)

    const lostOption = screen.getByRole('radio', { name: /lost item/i })
    const foundOption = screen.getByRole('radio', { name: /found item/i })

    expect(screen.getByText('Item type')).toBeInTheDocument()
    expect(lostOption).toBeChecked()
    expect(foundOption).not.toBeChecked()

    await user.click(screen.getByText('Found item'))

    expect(foundOption).toBeChecked()
    expect(lostOption).not.toBeChecked()
  })
})
