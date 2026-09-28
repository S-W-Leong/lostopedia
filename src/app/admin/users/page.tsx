'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, MoreVertical, Shield, MailPlus, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { UserDetailModal } from '@/components/admin/UserDetailModal'
import { PaginationFooter } from '@/components/admin/PaginationFooter'
import { ReputationDisplay } from '@/components/ui/reputation-display'
import type { DbUser } from '@/types/database'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { organization } from '@/lib/organization/config'
import { registrationDescription } from '@/lib/organization/registration'

interface UserWithStats extends DbUser {
  itemsCount: number
  flagsCount: number
}

type TabType = 'all' | 'banned' | 'admins'

const tableHeaderClass =
  'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary sm:px-6'
const tableCellClass = 'px-4 py-4 sm:px-6'
const stickyActionsHeaderClass =
  'sticky right-0 z-20 w-20 border-l border-border bg-bg-base text-right'
const stickyActionsCellClass =
  'sticky right-0 z-10 w-20 border-l border-border bg-bg-elevated text-right group-hover:bg-bg-overlay'
const PAGE_SIZE = 25

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null)
  const [totalUsers, setTotalUsers] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteDisplayName, setInviteDisplayName] = useState('')
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 500)
  const lastQueryRef = useRef('')

  const loadUsers = useCallback(async (page = currentPage) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        limit: PAGE_SIZE.toString(),
        offset: ((page - 1) * PAGE_SIZE).toString(),
      })

      if (activeTab === 'banned') {
        params.append('banned', 'true')
      } else if (activeTab === 'admins') {
        params.append('admins', 'true')
      }

      const response = await fetch(`/api/admin/users?${params}`)
      const data = await response.json()

      if (data.success) {
        setUsers(data.users)
        setTotalUsers(data.total)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, currentPage, debouncedSearch])

  useEffect(() => {
    const queryKey = [debouncedSearch, activeTab].join('|')

    if (lastQueryRef.current !== queryKey && currentPage !== 1) {
      setCurrentPage(1)
      return
    }

    lastQueryRef.current = queryKey
    loadUsers(currentPage)
  }, [activeTab, currentPage, debouncedSearch, loadUsers])

  async function handleInviteUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setInviteSubmitting(true)
    setInviteError(null)
    setInviteSuccess(null)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          displayName: inviteDisplayName,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setInviteError(data.error || 'Failed to send invite.')
        return
      }

      setInviteSuccess(`Invite sent to ${inviteEmail.trim().toLowerCase()}.`)
      setInviteEmail('')
      setInviteDisplayName('')
      loadUsers()
    } catch (error) {
      console.error('Error inviting user:', error)
      setInviteError('Failed to send invite.')
    } finally {
      setInviteSubmitting(false)
    }
  }


  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-text-primary">User Management</h1>
        <p className="text-text-secondary">
          Manage users, permissions, and account status
        </p>
      </div>

      <section className="rounded-xl border border-border bg-bg-elevated shadow-sm">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="max-w-md space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-muted text-accent">
                <MailPlus className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-text-primary">Admin access</h2>
                <p className="text-sm text-text-secondary">
                  Invite a new administrator into {organization.name}.
                </p>
              </div>
            </div>
            <p className="text-sm leading-6 text-text-secondary">
              {registrationDescription(organization.registration)} The invite opens the existing password setup flow, and the
              account is promoted to admin automatically after the invite is created.
            </p>
          </div>

          <form onSubmit={handleInviteUser} className="w-full max-w-3xl space-y-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] xl:items-end">
              <div className="space-y-2">
                <label htmlFor="inviteDisplayName" className="text-sm font-medium text-text-primary">
                  Full Name
                </label>
                <Input
                  id="inviteDisplayName"
                  type="text"
                  placeholder="Jane Doe"
                  value={inviteDisplayName}
                  onChange={(event) => setInviteDisplayName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="inviteEmail" className="text-sm font-medium text-text-primary">
                  Email
                </label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="member@example.org"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={inviteSubmitting} className="w-full xl:w-auto">
                {inviteSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending invite...
                  </>
                ) : (
                  <>
                    <MailPlus className="h-4 w-4" />
                    Send Invite
                  </>
                )}
              </Button>
            </div>

            {inviteError && (
              <div className="rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
                {inviteError}
              </div>
            )}

            {inviteSuccess && (
              <div className="rounded-md border border-found/20 bg-found-muted px-3 py-2 text-sm text-found">
                {inviteSuccess}
              </div>
            )}
          </form>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="min-w-0">
        <div className="rounded-xl border border-border bg-bg-elevated p-4 shadow-sm">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">Browse users</p>
              <p className="text-sm text-text-secondary">
                Filter by account type, moderation state, or search by name and email.
              </p>
            </div>

            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="w-full overflow-x-auto sm:w-auto">
                <TabsList className="flex min-w-max">
                  <TabsTrigger value="all">All Users</TabsTrigger>
                  <TabsTrigger value="banned">Banned Users</TabsTrigger>
                  <TabsTrigger value="admins">Admins</TabsTrigger>
                </TabsList>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <Input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-5 min-w-0">
          {/* Users Table */}
          <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-bg-elevated">
            {loading ? (
              <div className="p-12 text-center">
                <p className="text-text-secondary">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-text-secondary">No users found</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border md:hidden">
                  {users.map((user) => (
                    <article key={user.id} className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.display_name || 'User'}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted text-accent font-medium">
                              {user.display_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-text-primary">
                                {user.display_name || 'Unknown'}
                              </p>
                              {user.is_admin && (
                                <Shield className="h-4 w-4 shrink-0 text-accent" />
                              )}
                            </div>
                            <p className="truncate text-xs text-text-secondary">
                              {user.email}
                            </p>
                            <p className="text-xs text-text-tertiary">
                              {user.campus_id || 'No location'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="rounded-md border border-border bg-bg-base p-2 text-text-secondary transition-colors hover:bg-bg-overlay hover:text-text-primary"
                          aria-label="More actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={user.is_banned ? 'banned' : 'active'} />
                        {user.reputation_score !== null && user.reputation_score !== undefined ? (
                          <ReputationDisplay
                            score={user.reputation_score}
                            variant="default"
                            size="sm"
                          />
                        ) : (
                          <span className="text-xs text-text-tertiary">Reputation N/A</span>
                        )}
                      </div>

                      <dl className="grid grid-cols-3 gap-2">
                        <div className="rounded-md bg-bg-base px-3 py-2">
                          <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">Items</dt>
                          <dd className="mt-1 text-sm font-medium text-text-primary">{user.itemsCount}</dd>
                        </div>
                        <div className="rounded-md bg-bg-base px-3 py-2">
                          <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">Flags</dt>
                          <dd className="mt-1 text-sm font-medium text-text-primary">{user.flagsCount}</dd>
                        </div>
                        <div className="rounded-md bg-bg-base px-3 py-2">
                          <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">Joined</dt>
                          <dd className="mt-1 text-sm font-medium text-text-primary">
                            {new Date(user.created_at ?? '').toLocaleDateString()}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>

                <div className="hidden min-w-0 overflow-x-auto md:block">
                  <table className="w-full min-w-[44rem] lg:min-w-[56rem] xl:min-w-[68rem]">
                    <thead className="bg-bg-base border-b border-border">
                      <tr>
                        <th className={tableHeaderClass}>
                          User
                        </th>
                        <th className={cn(tableHeaderClass, 'hidden xl:table-cell')}>
                          Email
                        </th>
                        <th className={cn(tableHeaderClass, 'hidden md:table-cell')}>
                          Reputation
                        </th>
                        <th className={cn(tableHeaderClass, 'hidden lg:table-cell')}>
                          Items
                        </th>
                        <th className={cn(tableHeaderClass, 'hidden xl:table-cell')}>
                          Flags
                        </th>
                        <th className={tableHeaderClass}>
                          Status
                        </th>
                        <th className={cn(tableHeaderClass, 'hidden xl:table-cell')}>
                          Joined
                        </th>
                        <th className={cn(tableHeaderClass, stickyActionsHeaderClass)}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="group transition-colors hover:bg-bg-overlay"
                        >
                          <td className={cn(tableCellClass, 'whitespace-nowrap')}>
                            <div className="flex items-center gap-3">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.display_name || 'User'}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-accent-muted flex items-center justify-center text-accent font-medium">
                                  {user.display_name?.[0]?.toUpperCase() || 'U'}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-text-primary">
                                    {user.display_name || 'Unknown'}
                                  </p>
                                  {user.is_admin && (
                                    <Shield className="h-4 w-4 text-accent" />
                                  )}
                                </div>
                                <p className="text-xs text-text-tertiary">
                                  {user.campus_id || 'No location'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className={cn(tableCellClass, 'hidden whitespace-nowrap xl:table-cell')}>
                            <p className="text-sm text-text-primary">{user.email}</p>
                          </td>
                          <td className={cn(tableCellClass, 'hidden whitespace-nowrap md:table-cell')}>
                            {user.reputation_score !== null && user.reputation_score !== undefined ? (
                              <ReputationDisplay
                                score={user.reputation_score}
                                variant="default"
                                size="sm"
                              />
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className={cn(tableCellClass, 'hidden whitespace-nowrap lg:table-cell')}>
                            <p className="text-sm text-text-primary">{user.itemsCount}</p>
                          </td>
                          <td className={cn(tableCellClass, 'hidden whitespace-nowrap xl:table-cell')}>
                            <p className="text-sm text-text-primary">{user.flagsCount}</p>
                          </td>
                          <td className={cn(tableCellClass, 'whitespace-nowrap')}>
                            <StatusBadge
                              status={user.is_banned ? 'banned' : 'active'}
                            />
                          </td>
                          <td className={cn(tableCellClass, 'hidden whitespace-nowrap xl:table-cell')}>
                            <p className="text-sm text-text-secondary">
                              {new Date(user.created_at ?? "").toLocaleDateString()}
                            </p>
                          </td>
                          <td className={cn(tableCellClass, stickyActionsCellClass, 'whitespace-nowrap')}>
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="ml-auto rounded-md p-2 text-text-secondary transition-colors hover:bg-bg-overlay hover:text-text-primary"
                              aria-label="More actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Pagination Info */}
                {!loading && users.length > 0 && (
                  <PaginationFooter
                    totalItems={totalUsers}
                    currentPage={currentPage}
                    pageSize={PAGE_SIZE}
                    itemLabel="users"
                    loading={loading}
                    onPageChange={setCurrentPage}
                  />
                )}
          </div>
        </TabsContent>
      </Tabs>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={loadUsers}
        />
      )}
    </div>
  )
}
