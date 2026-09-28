import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import sample from '../../config/organization.json'
import { parseOrganizationConfig } from '../../src/lib/organization/schema'
import { escapeHtml, renderEmailTemplate, EMAIL_TEMPLATE_NAMES } from '../lib/email-templates'

it('escapes branding while preserving the Auth URL placeholder', () => {
  const config = parseOrganizationConfig({ ...sample, name: 'Example <Team> & Co' })
  const html = renderEmailTemplate('%%APP_NAME%% <a href="{{ .ConfirmationURL }}">Go</a>', config)
  expect(html).toContain('Example &lt;Team&gt; &amp; Co')
  expect(html).toContain('{{ .ConfirmationURL }}')
  expect(escapeHtml(`'"<> &`)).toBe('&#39;&quot;&lt;&gt; &amp;')
})

it('renders all six sources deterministically without inherited URLs', () => {
  const config = parseOrganizationConfig(sample)
  for (const name of EMAIL_TEMPLATE_NAMES) {
    const source = readFileSync(resolve('templates/source', `${name}.html`), 'utf8')
    const first = renderEmailTemplate(source, config)
    expect(renderEmailTemplate(source, config)).toBe(first)
    expect(first).toContain('{{ .SiteURL }}/template-logo.svg')
    expect(first).not.toMatch(/%%[A-Z_]+%%/)
    expect(first).not.toContain('supabase.co/storage')
  }
})

it('rejects unknown placeholders and unsafe logo paths', () => {
  const config = parseOrganizationConfig(sample)
  expect(() => renderEmailTemplate('%%UNKNOWN%%', config)).toThrow()
  expect(() => renderEmailTemplate('%%LOGO_PATH%%', { ...config, logoPath: '//evil.test/logo.svg' })).toThrow()
})
