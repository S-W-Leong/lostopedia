import { organization } from '@/lib/organization/config'

export const HELP_LOST_FOUND_OFFICE_ANCHOR = 'lost-and-found-office'

export function safeTelephoneHref(phone: string | null): string | null {
  if (!phone) return null
  const normalized = phone.replace(/[\s().-]/g, '')
  return /^\+?[0-9]{7,15}$/.test(normalized) ? `tel:${normalized}` : null
}

export const LOST_FOUND_OFFICE = {
  department: organization.office.name,
  buildingLine: organization.office.address,
  phoneDisplay: organization.office.phone,
  telHref: safeTelephoneHref(organization.office.phone),
  email: organization.office.email,
  hoursLine: organization.office.hours,
  mapsUrl: organization.office.mapsUrl,
} as const

export const LOST_FOUND_OFFICE_PICKUP_CARD_SUMMARY =
  `Item is held at ${organization.office.name}. See Help for collection details.`
