import GitHubSlugger from 'github-slugger'

export type TocItem = {
  level: 2 | 3
  text: string
  slug: string
}

/**
 * Extract ## and ### headings from markdown and build TOC with slugs
 * matching rehype-slug (github-slugger) so anchor links work.
 */
export function parseHeadings(markdown: string): TocItem[] {
  const slugger = new GitHubSlugger()
  const lines = markdown.split('\n')
  const toc: TocItem[] = []

  for (const line of lines) {
    const h2 = line.match(/^## (.+)$/)
    const h3 = line.match(/^### (.+)$/)
    if (h2) {
      const raw = h2[1].replace(/\s*\{#[\w-]+\}\s*$/, '').trim()
      const text = stripMarkdownInline(raw)
      toc.push({ level: 2, text, slug: slugger.slug(text) })
    } else if (h3) {
      const raw = h3[1].replace(/\s*\{#[\w-]+\}\s*$/, '').trim()
      const text = stripMarkdownInline(raw)
      toc.push({ level: 3, text, slug: slugger.slug(text) })
    }
  }

  return toc
}

function stripMarkdownInline(raw: string): string {
  return raw
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim()
}
