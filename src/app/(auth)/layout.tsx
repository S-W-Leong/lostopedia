import Link from 'next/link'
import Image from 'next/image'
import { organization } from '@/lib/organization/config'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center transition-transform group-hover:scale-105">
            <Image
              src={organization.logoPath}
              alt={`${organization.name} logo`}
              width={36}
              height={36}
              className="w-9 h-9"
            />
          </div>
          <span className="text-display text-xl text-text-primary">
            {organization.name}
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md animate-fade-up">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-text-muted">
        <p>© {new Date().getFullYear()} {organization.name}. All rights reserved.</p>
      </footer>
    </div>
  )
}
