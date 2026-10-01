import { MainLayoutClient } from '@/components/layout/MainLayoutClient'

/**
 * App shell for search, map, item detail (public) and dashboard, post, messages, etc. (protected).
 * Auth is enforced by middleware for protected routes; this layout does not redirect.
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MainLayoutClient>{children}</MainLayoutClient>
  )
}
