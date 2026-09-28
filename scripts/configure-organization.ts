import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { organization } from '../src/lib/organization/config'
import { renderOrganizationSql } from './lib/organization-setup'
import { EMAIL_TEMPLATE_NAMES, renderEmailTemplate } from './lib/email-templates'

const seedPath = resolve(process.cwd(), 'supabase/seed.sql')
const generatedFiles = new Map<string, string>([[seedPath, renderOrganizationSql(organization)]])
for (const name of EMAIL_TEMPLATE_NAMES) {
  const sourcePath = resolve(process.cwd(), 'templates/source', `${name}.html`)
  const outputPath = resolve(process.cwd(), 'templates', `${name}.html`)
  generatedFiles.set(outputPath, renderEmailTemplate(readFileSync(sourcePath, 'utf8'), organization))
}

if (process.argv.includes('--check')) {
  const stale: string[] = []
  for (const [file, generated] of generatedFiles) {
    let current = ''
    try {
      current = readFileSync(file, 'utf8')
    } catch {
      // A missing generated file is stale setup.
    }
    if (current !== generated) stale.push(file.replace(`${process.cwd()}/`, ''))
  }
  if (stale.length) {
    console.error(`Generated organization files are stale: ${stale.join(', ')}. Run pnpm run setup:organization.`)
    process.exitCode = 1
  } else {
    console.log('Organization setup is current.')
  }
} else {
  for (const [file, generated] of generatedFiles) writeFileSync(file, generated)
  console.log('Generated organization SQL and email templates from config/organization.json.')
}
