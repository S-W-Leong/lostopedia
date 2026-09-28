'use client'

import Link from 'next/link'
import Image from 'next/image'
import { organization } from '@/lib/organization/config'
import { User, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/lib/supabase/auth'
import type { DbUser } from '@/types/database'

interface AdminHeaderProps {
  admin: DbUser
}

export function AdminHeader({ admin }: AdminHeaderProps) {
  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg-elevated/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center">
            <Image
              src={organization.logoPath}
              alt={`${organization.name} logo`}
              width={36}
              height={36}
              className="w-9 h-9"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">Admin Panel</h1>
            <p className="text-xs text-text-tertiary">{organization.name} Management</p>
          </div>
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-lg px-3 transition-colors hover:bg-bg-overlay"
              aria-label={`Open menu for ${admin.display_name || 'Admin'}`}
            >
              {admin.avatar_url ? (
                <img
                  src={admin.avatar_url}
                  alt={admin.display_name || 'Admin'}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted">
                  <User className="h-4 w-4 text-accent" />
                </div>
              )}
              <span className="hidden text-sm text-text-primary sm:block">
                {admin.display_name || 'Admin'}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-danger focus:bg-danger/10 focus:text-danger"
              onSelect={(event) => {
                event.preventDefault()
                void handleSignOut()
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
