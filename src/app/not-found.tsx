'use client'

import Link from 'next/link'
import { Home, Search, ArrowLeft, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-24 bg-bg-base">
      <div className="text-center max-w-2xl mx-auto">
        {/* 404 Illustration */}
        <div className="mb-8 animate-fade-up">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-surface-2 mb-6">
            <MapPin className="h-16 w-16 text-text-muted" />
          </div>
          <h1 className="text-6xl sm:text-7xl font-bold text-text-primary mb-4">404</h1>
        </div>

        {/* Message */}
        <div className="animate-fade-up stagger-1">
          <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-4">
            Page Not Found
          </h2>
          <p className="text-lg text-text-secondary mb-8 max-w-md mx-auto">
            Oops! Looks like this page got lost. Let&apos;s help you find your way back.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up stagger-2">
          <Button size="lg" asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/search">
              <Search className="h-4 w-4" />
              Browse Items
            </Link>
          </Button>
        </div>

        {/* Back Link */}
        <div className="mt-8 animate-fade-up stagger-3">
          <button
            onClick={() => window.history.back()}
            className="text-text-secondary hover:text-accent transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back to previous page
          </button>
        </div>
      </div>
    </div>
  )
}

