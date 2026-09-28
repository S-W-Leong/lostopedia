import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/supabase/admin'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminLayoutWrapper } from '@/components/admin/AdminLayoutWrapper'

// Force dynamic rendering since we're using cookies
export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check admin authentication on the server
  const admin = await getCurrentAdmin()

  // Redirect to dashboard if not admin
  if (!admin) {
    redirect('/dashboard')
  }

  return (
    <AdminLayoutWrapper
      header={<AdminHeader admin={admin!} />}
      sidebar={<AdminSidebar />}
    >
      {children}
    </AdminLayoutWrapper>
  )
}

