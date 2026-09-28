'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { organization } from '@/lib/organization/config'
import {
  scaleStaggerContainer,
  staggerItem,
  landingScrollViewport,
} from '@/lib/motion'

export function HomeCTASection() {
  return (
    <section className="relative overflow-hidden bg-surface-1 py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-bg-base to-transparent" />
      <div className="container mx-auto px-6">
        <motion.div
          className="card mx-auto max-w-4xl border-accent/30 bg-gradient-to-br from-bg-elevated to-surface-1 p-12 text-center shadow-md"
          initial="hidden"
          whileInView="visible"
          viewport={landingScrollViewport}
          variants={scaleStaggerContainer}
        >
          <motion.h2
            className="text-display-hero mb-4 text-3xl font-semibold text-text-primary sm:text-4xl"
            variants={staggerItem}
          >
            Lost something in your community?
          </motion.h2>
          <motion.p
            className="mx-auto mb-8 max-w-2xl text-lg text-text-secondary"
            variants={staggerItem}
          >
            Search existing posts, report a found item, or help another {organization.memberLabel}
            {' '}get their belongings back.
          </motion.p>
          <motion.div
            className="flex flex-col justify-center gap-4 sm:flex-row"
            variants={staggerItem}
          >
            <Link href="/signup" className="btn btn-primary px-8 py-3 text-lg">
              Start here
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="btn btn-secondary px-8 py-3 text-lg">
              I already have an account
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
