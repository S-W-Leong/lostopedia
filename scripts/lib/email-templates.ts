import type { OrganizationConfig } from '../../src/lib/organization/schema'

export const EMAIL_TEMPLATE_NAMES = [
  'confirm-signup',
  'confirm-email-change',
  'invite',
  'magic-link',
  'reauthenticate',
  'reset-password',
] as const

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

export function renderEmailTemplate(source: string, config: OrganizationConfig): string {
  if (!/^\/(?!\/)[A-Za-z0-9/_-]+\.[A-Za-z0-9]+$/.test(config.logoPath) || config.logoPath.includes('..')) {
    throw new Error('Unsafe logo path in organization configuration')
  }

  const values: Record<string, string> = {
    APP_NAME: escapeHtml(config.name),
    ORGANIZATION_NAME: escapeHtml(config.organizationName),
    DESCRIPTION: escapeHtml(config.description),
    LOGO_PATH: escapeHtml(config.logoPath),
  }
  return source.replace(/%%([^%]+)%%/g, (_match, name: string) => {
    if (!(name in values)) throw new Error(`Unknown email template placeholder: ${name}`)
    return values[name]
  })
}
