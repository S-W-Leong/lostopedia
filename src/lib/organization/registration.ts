import type { OrganizationConfig } from './schema'

const emailPattern = /^[^\s@\u0000-\u001f\u007f]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/
const domainPattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isEmailAllowed(value: string, policy: OrganizationConfig['registration']): boolean {
  const email = normalizeEmail(value)
  if (!emailPattern.test(email) || email.length > 254) return false
  const at = email.lastIndexOf('@')
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (!local || local.length > 64 || !domainPattern.test(domain)) return false
  return policy.mode === 'open' || policy.allowedDomains.includes(domain)
}

export function registrationDescription(policy: OrganizationConfig['registration']): string {
  return policy.mode === 'open'
    ? 'Sign up with a valid email address.'
    : `Sign up with an email address from ${policy.allowedDomains.join(', ')}.`
}
