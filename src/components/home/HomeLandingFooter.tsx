'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'motion/react'
import { fadeUpInView, landingScrollViewport } from '@/lib/motion'
import { organization } from '@/lib/organization/config'

export function HomeLandingFooter() {
  return (
    <motion.footer
      className="bg-surface-1 py-8 text-center"
      initial="hidden"
      whileInView="visible"
      viewport={landingScrollViewport}
      variants={fadeUpInView}
    >
      <div className="container mx-auto px-6">
        <div className="mb-4 flex items-center justify-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center">
            <Image
              src={organization.logoPath}
              alt={`${organization.name} logo`}
              width={32}
              height={32}
              className="h-8 w-8"
            />
          </div>
          <span className="text-lg font-semibold text-text-primary">
            {organization.name}
          </span>
        </div>
        <p className="text-sm text-text-muted">
          © {new Date().getFullYear()} {organization.name}. Made for {organization.organizationName}.
        </p>
        <nav className="mt-4 flex items-center justify-center gap-4 text-sm text-text-muted">
          <Link href="/help" className="text-accent hover:underline">
            Help & Support
          </Link>
          <Link href="/terms" className="text-accent hover:underline">
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-accent hover:underline">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </motion.footer>
  )
}
