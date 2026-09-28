import { Users, Package, AlertTriangle, UserX } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { organization } from '@/lib/organization/config'
import { StatsCard } from '@/components/admin/StatsCard'

async function getStats() {
  const supabase = await createClient()

  // Get total users count
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  // Get total items count
  const { count: totalItems } = await supabase
    .from('items')
    .select('id', { count: 'exact', head: true })

  // Get pending flags count
  const { count: pendingFlags } = await supabase
    .from('flags')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  // Get banned users count
  const { count: bannedUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('is_banned', true)

  return {
    totalUsers: totalUsers || 0,
    totalItems: totalItems || 0,
    pendingFlags: pendingFlags || 0,
    bannedUsers: bannedUsers || 0,
  }
}

export default async function AdminDashboard() {
  const stats = await getStats()

  return (
    <div className="min-w-0 max-w-full space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Overview of {organization.name} platform statistics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          link="/admin/users"
          description="All registered users"
        />
        <StatsCard
          title="Total Items"
          value={stats.totalItems}
          icon={Package}
          link="/admin/items"
          description="Lost & found items"
        />
        <StatsCard
          title="Pending Flags"
          value={stats.pendingFlags}
          icon={AlertTriangle}
          link="/admin/flags"
          showAlert={stats.pendingFlags > 0}
          description="Awaiting review"
        />
        <StatsCard
          title="Banned Users"
          value={stats.bannedUsers}
          icon={UserX}
          link="/admin/users?tab=banned"
          description="Currently banned"
        />
      </div>

      {/* Recent Activity Section - Placeholder for future */}
      <div className="mt-8 min-w-0">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Activity</h2>
        <div className="rounded-lg border border-border bg-bg-elevated p-6">
          <p className="text-text-secondary text-center">
            Recent activity feed coming soon
          </p>
        </div>
      </div>
    </div>
  )
}
