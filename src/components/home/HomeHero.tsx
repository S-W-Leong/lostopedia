'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'motion/react'
import { ArrowRight, LogIn } from 'lucide-react'
import { StatsBar } from '@/components/common/StatsBar'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { organization } from '@/lib/organization/config'
import { registrationDescription } from '@/lib/organization/registration'

interface HomeHeroProps {
  stats: { totalItems: number; itemsRecovered: number; totalUsers: number }
}

export function HomeHero({ stats }: HomeHeroProps) {
  return (
    <section className="relative isolate overflow-hidden bg-background">
      <div className="container relative z-10 mx-auto px-6 py-24 sm:py-32 lg:pb-32 lg:pt-40">
        <motion.div
          className="mx-auto max-w-4xl text-center"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="mb-8 inline-flex items-center gap-3"
            variants={staggerItem}
          >
            <div className="flex h-14 w-14 items-center justify-center">
              <Image
                src={organization.logoPath}
                alt={`${organization.name} logo`}
                width={56}
                height={56}
                className="h-14 w-14"
              />
            </div>
            <h1 className="text-display-hero text-5xl text-text-primary sm:text-6xl">
              {organization.name}
            </h1>
          </motion.div>

          <motion.h2
            className="text-display-hero mb-6 text-3xl font-semibold text-text-primary sm:text-4xl lg:text-5xl"
            variants={staggerItem}
          >
            Lost something?{' '}
            <span className="relative inline-block text-accent">
              Let&apos;s help it find its way back.
              <span
                className="absolute -bottom-2 left-1/2 h-1 w-2/3 -translate-x-1/2 rounded-full bg-accent/15"
                aria-hidden="true"
              />
            </span>
          </motion.h2>

          <motion.p
            className="mx-auto mb-10 max-w-2xl text-lg text-text-secondary sm:text-xl"
            variants={staggerItem}
          >
            A lost-and-found space for {organization.organizationName}.
            Post what you lost, share what you found, and help items get back to
            the right people.
          </motion.p>

          <motion.div
            className="flex flex-col justify-center gap-4 sm:flex-row"
            variants={staggerItem}
          >
            <Link href="/signup" className="btn btn-primary px-8 py-3 text-lg">
              Join {organization.name}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="btn btn-secondary px-8 py-3 text-lg">
              <LogIn className="h-5 w-5" />
              Sign in
            </Link>
          </motion.div>

          <motion.p
            className="mx-auto mt-4 max-w-xl text-sm text-text-secondary"
            variants={staggerItem}
          >
            Only signed-in members can view item details, search, and contact owners.{' '}
            {registrationDescription(organization.registration)}
          </motion.p>

          <motion.div variants={staggerItem}>
            <StatsBar stats={stats} />
          </motion.div>

        </motion.div>
      </div>
    </section>
  )
}
