import { readFile } from 'fs/promises'
import path from 'path'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { ImgHTMLAttributes } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { parseHeadings } from './parseHeadings'
import { HelpTocSidebarClient } from './HelpTocSidebarClient'
import { HelpSupportLocationMap } from './HelpSupportLocationMap'
import { organization } from '@/lib/organization/config'
import { HELP_LOST_FOUND_OFFICE_ANCHOR } from '@/lib/campus/lost-found-office'

export const metadata: Metadata = {
  title: 'Help & Support',
  description:
    `User guide and support for ${organization.name} – how to post items, manage recoveries, and use the platform safely.`,
}

async function getGuideContent() {
  try {
    const filePath = path.join(process.cwd(), 'docs/user-side/USER_GUIDE.md')
    const content = await readFile(filePath, 'utf-8')
    return content
  } catch (error) {
    console.error('Failed to read USER_GUIDE.md:', error)
    return null
  }
}

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-display text-2xl sm:text-3xl font-bold text-text-primary lg:text-4xl mt-8 mb-4 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children, id }: { children?: React.ReactNode; id?: string }) => (
    <h2
      id={id}
      className="text-lg sm:text-xl font-semibold text-text-primary mt-8 sm:mt-10 mb-3 scroll-mt-24"
    >
      {children}
    </h2>
  ),
  h3: ({ children, id }: { children?: React.ReactNode; id?: string }) => (
    <h3
      id={id}
      className="text-base sm:text-lg font-semibold text-text-primary mt-5 sm:mt-6 mb-2 scroll-mt-24"
    >
      {children}
    </h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-4">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-6 space-y-2 text-text-secondary mb-4 break-words">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-6 space-y-2 text-text-secondary mb-4 break-words">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed break-words">{children}</li>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    const isExternal = href?.startsWith('http')
    const isAnchor = href?.startsWith('#')
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline break-all"
        >
          {children}
        </a>
      )
    }
    if (isAnchor && href) {
      return (
        <a href={href} className="text-accent hover:underline break-words">
          {children}
        </a>
      )
    }
    return href ? (
      <Link href={href} className="text-accent hover:underline break-words">
        {children}
      </Link>
    ) : (
      <span>{children}</span>
    )
  },
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-text-primary break-words">{children}</strong>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-bg-overlay px-1.5 py-0.5 rounded text-sm font-mono break-all">
      {children}
    </code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="bg-bg-overlay p-4 rounded-lg overflow-x-auto my-4">
      {children}
    </pre>
  ),
  hr: () => <hr className="border-border my-8" />,
  // Must stay phrasing-only (no <figure>/<div>) — markdown wraps images in <p>, and <p> cannot contain block elements.
  img: ({ src, alt, ...rest }: ImgHTMLAttributes<HTMLImageElement>) => {
    const url = typeof src === 'string' ? src : undefined
    if (!url) return null
    return (
      // eslint-disable-next-line @next/next/no-img-element -- markdown-driven; static assets from /public
      <img
        {...rest}
        src={url}
        alt={alt ?? ''}
        className="my-6 block h-auto w-full max-w-2xl rounded-lg border border-border bg-bg-overlay shadow-sm object-cover"
        loading="lazy"
        decoding="async"
      />
    )
  },
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-accent pl-3 sm:pl-4 py-2 my-4 text-sm sm:text-base text-text-secondary italic">
      {children}
    </blockquote>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-6">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full border border-border rounded-lg overflow-hidden">
          {children}
        </table>
      </div>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-bg-overlay">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody className="divide-y divide-border">{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="divide-x divide-border">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-4 py-3 text-sm text-text-secondary">{children}</td>
  ),
}

export default async function HelpPage() {
  const content = await getGuideContent()
  const toc = content ? [...parseHeadings(content), { level: 2 as const, text: 'Lost and Found Office', slug: HELP_LOST_FOUND_OFFICE_ANCHOR }] : []

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
        <header className="mb-8 sm:mb-10">
          <h1 className="text-display text-2xl sm:text-3xl font-bold text-text-primary lg:text-4xl">
            Help & Support
          </h1>
          <p className="mt-2 text-sm sm:text-base text-text-secondary">
            Everything you need to use {organization.name} – from posting items to recovery,
            reputation, and safety.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row lg:gap-10">
          <HelpTocSidebarClient toc={toc} />

          <main className="min-w-0 flex-1 max-w-3xl w-full overflow-hidden">
            {content ? (
              <article className="space-y-2 [&>*:first-child]:mt-0 break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSlug]}
                  components={markdownComponents}
                >
                  {content}
                </ReactMarkdown>
              </article>
            ) : (
              <div className="card p-8 text-center">
                <p className="text-text-secondary">
                  The user guide could not be loaded. Please try again later or
                  contact support.
                </p>
              </div>
            )}

            <HelpSupportLocationMap />

            <footer className="mt-16 pt-8 border-t border-border">
              <p className="text-sm text-text-muted">
                Need more help? Contact <a className="text-accent hover:underline" href={`mailto:${organization.supportEmail}`}>{organization.supportEmail}</a>.
              </p>
            </footer>
          </main>
        </div>
      </div>
    </div>
  )
}
