import { expect, it, vi } from 'vitest'
import { render, screen } from '@/test/utils'

vi.mock('@/lib/organization/config', () => ({
  organization: {
    office: { name: 'Library desk', address: 'Level 2', phone: null, email: null, hours: null, mapsUrl: null },
  },
}))

it('renders another organization without empty contact links', async () => {
  const { OfficePickupDetails } = await import('../OfficePickupDetails')
  render(<OfficePickupDetails variant="full" />)
  expect(screen.getByText('Library desk')).toBeInTheDocument()
  expect(screen.getByText('Level 2')).toBeInTheDocument()
  expect(document.querySelector('a[href^="tel:"]')).toBeNull()
  expect(document.querySelector('a[href^="mailto:"]')).toBeNull()
  expect(screen.queryByRole('link', { name: /open in maps/i })).toBeNull()
})
