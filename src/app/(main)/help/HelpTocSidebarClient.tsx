'use client'

import type { TocItem } from './parseHeadings'
import { HelpTocSidebar } from './HelpTocSidebar'

interface HelpTocSidebarClientProps {
  toc: TocItem[]
}

export function HelpTocSidebarClient({ toc }: HelpTocSidebarClientProps) {
  return <HelpTocSidebar toc={toc} />
}
