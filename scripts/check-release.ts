import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface ReleaseEntry { path: string; content: string }
export interface ReleaseIssue { path: string; reason: string }

const sensitiveContent = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /sb_secret_[A-Za-z0-9_-]{20,}/,
  /(?:ghp|gho|ghu|ghs)_[A-Za-z0-9]{30,}/,
  /AKIA[0-9A-Z]{16}/,
]

function pathIssue(path: string): string | null {
  const normalized = path.replaceAll('\\', '/')
  const name = normalized.split('/').at(-1) ?? normalized
  if (name !== '.env.example' && /^\.env(?:\.|$)/.test(name)) return 'environment file'
  if (name === '.mcp.json' || name === '.envrc') return 'local connection or environment file'
  if (/\.(?:pem|key|p12|pfx|jks|dump|bak|sqlite|db)$/i.test(name) || /\.sql\.gz$/i.test(name) || /^id_(?:rsa|ed25519)$/.test(name)) return 'private key or data dump path'
  if (/(?:^|\/)(?:\.codex|\.supabase|\.superpowers)(?:\/|$)/.test(normalized)) return 'local tool state'
  return null
}

export function checkReleaseFiles(entries: ReleaseEntry[], denylist: readonly string[] = []): ReleaseIssue[] {
  const issues: ReleaseIssue[] = []
  for (const entry of entries) {
    const pathReason = pathIssue(entry.path)
    if (pathReason) issues.push({ path: entry.path, reason: pathReason })
    if (sensitiveContent.some(pattern => pattern.test(entry.content))) {
      issues.push({ path: entry.path, reason: 'obvious credential pattern' })
    }
    if (denylist.some(value => value.length > 0 && entry.content.includes(value))) {
      issues.push({ path: entry.path, reason: 'matches private denylist' })
    }
  }
  return issues
}

function main() {
  const args = process.argv.slice(2)
  let denylist: string[] = []
  if (args.length > 0) {
    if (args.length !== 2 || args[0] !== '--denylist' || !isAbsolute(args[1])) {
      throw new Error('Usage: check:release [--denylist <absolute-private-path>]')
    }
    const location = resolve(args[1])
    const relativePath = relative(process.cwd(), location)
    if (relativePath === '' || (!relativePath.startsWith(`..${sep}`) && relativePath !== '..' && !isAbsolute(relativePath))) {
      throw new Error('Private denylist must be outside the repository')
    }
    denylist = readFileSync(location, 'utf8').split(/\r?\n/).filter(Boolean)
  }

  const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'buffer' })
    .toString('utf8').split('\0').filter(Boolean)
  const entries = paths.map(path => {
    const absolute = resolve(path)
    return { path, content: lstatSync(absolute).isSymbolicLink() ? readlinkSync(absolute) : readFileSync(absolute, 'utf8') }
  })
  const issues = checkReleaseFiles(entries, denylist)
  for (const issue of issues) console.error(`${issue.path}: ${issue.reason}`)
  if (issues.length) process.exitCode = 1
  else console.log(`Release file check passed for ${entries.length} tracked files.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Release file check failed')
    process.exitCode = 1
  }
}
