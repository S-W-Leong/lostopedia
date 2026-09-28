'use client'

import { motion, useReducedMotion } from 'motion/react'
import { organization } from '@/lib/organization/config'
import { registrationDescription } from '@/lib/organization/registration'
import {
  staggerContainer,
  staggerItem,
  fadeUpInView,
  landingScrollViewport,
} from '@/lib/motion'

const FEATURES = [
  {
    visual: 'match',
    visualLabel: 'Custom visual for helpful match suggestions',
    title: 'Helpful match suggestions',
    description:
      `${organization.name} can suggest possible matches based on item details, so you do not have to scroll through every post manually.`,
    color: 'accent' as const,
  },
  {
    visual: 'search',
    visualLabel: 'Custom visual for search by what you remember',
    title: 'Search by what you remember',
    description:
      'Look through posts by keywords, categories, dates, and details you still remember.',
    color: 'lost' as const,
  },
  {
    visual: 'location',
    visualLabel: 'Custom visual for location context',
    title: 'See where it was lost or found',
    description:
      'Use location details to narrow your search, then open a listing for photos and return information.',
    color: 'found' as const,
  },
  {
    visual: 'updates',
    visualLabel: 'Custom visual for listing updates',
    title: 'Stay updated',
    description:
      'Get notified when there are new matches or activity on your listings.',
    color: 'accent' as const,
  },
  {
    visual: 'trust',
    visualLabel: 'Custom visual for safer returns',
    title: 'A safer way to return items',
    description:
      `${registrationDescription(organization.registration)} Moderation and helper credits keep returns more accountable.`,
    color: 'found' as const,
  },
]

const colorClasses = {
  accent: 'border-accent/20 bg-accent-muted text-accent',
  found: 'border-found/20 bg-found-muted text-found',
  lost: 'border-lost/20 bg-lost-muted text-lost',
}

type FeatureVisualKind = (typeof FEATURES)[number]['visual']

function MiniItemCard({ tone }: { tone: 'lost' | 'found' }) {
  return (
    <div className="w-16 rounded-md border border-border bg-bg-elevated p-2 shadow-sm">
      <div className={`mb-2 h-8 rounded ${tone === 'lost' ? 'bg-lost-muted' : 'bg-found-muted'}`} />
      <div className="space-y-1.5">
        <div className="h-1.5 w-9 rounded-full bg-text-primary/15" />
        <div className="h-1.5 w-11 rounded-full bg-text-secondary/15" />
      </div>
    </div>
  )
}

function FeatureVisual({
  kind,
  label,
  color,
  reduceMotion,
  large = false,
}: {
  kind: FeatureVisualKind
  label: string
  color: keyof typeof colorClasses
  reduceMotion: boolean
  large?: boolean
}) {
  const sizeClass = large ? 'h-44 w-full max-w-sm' : 'h-24 w-full'
  const motionTransition = reduceMotion
    ? undefined
    : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' as const }

  return (
    <div
      className={`relative mb-5 overflow-hidden rounded-lg border p-4 ${sizeClass} ${colorClasses[color]}`}
      aria-label={label}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.5),transparent_55%)]" />
      {kind === 'match' && (
        <div className="relative flex h-full items-center justify-center gap-3">
          <motion.div
            animate={reduceMotion ? undefined : { x: [0, 7, 0] }}
            transition={motionTransition}
          >
            <MiniItemCard tone="lost" />
          </motion.div>
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm"
            animate={reduceMotion ? undefined : { scale: [1, 1.08, 1] }}
            transition={reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-sm font-bold">+</span>
          </motion.div>
          <motion.div
            animate={reduceMotion ? undefined : { x: [0, -7, 0] }}
            transition={motionTransition}
          >
            <MiniItemCard tone="found" />
          </motion.div>
        </div>
      )}

      {kind === 'search' && (
        <div className="relative flex h-full items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-lost">
            <motion.span
              className="block h-3 w-3 rounded-full bg-lost"
              animate={reduceMotion ? undefined : { scale: [1, 0.65, 1] }}
              transition={motionTransition}
            />
          </div>
          <div className="h-8 w-1 -rotate-45 rounded-full bg-lost" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-2 w-4/5 rounded-full bg-text-primary/15" />
            <div className="h-2 w-3/5 rounded-full bg-text-secondary/15" />
          </div>
        </div>
      )}

      {kind === 'location' && (
        <div className="relative h-full">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 240 90" aria-hidden="true">
            <path
              d="M18 70 C58 20, 92 82, 130 42 S198 30, 222 64"
              fill="none"
              stroke="currentColor"
              strokeDasharray="5 8"
              strokeLinecap="round"
              strokeWidth="4"
              opacity="0.35"
            />
          </svg>
          <motion.div
            className="absolute left-[42%] top-3 flex h-12 w-12 items-center justify-center rounded-full bg-found text-found-foreground shadow-sm"
            animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
            transition={motionTransition}
          >
            <span className="h-4 w-4 rounded-full border-2 border-current" />
          </motion.div>
        </div>
      )}

      {kind === 'updates' && (
        <div className="relative flex h-full items-center justify-center">
          <div className="w-32 rounded-md border border-border bg-bg-elevated p-3 shadow-sm">
            <div className="mb-3 h-2 w-16 rounded-full bg-text-primary/15" />
            <div className="space-y-2">
              <div className="h-2 w-24 rounded-full bg-text-secondary/15" />
              <div className="h-2 w-20 rounded-full bg-text-secondary/15" />
            </div>
          </div>
          <motion.span
            className="absolute right-8 top-5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground"
            animate={reduceMotion ? undefined : { y: [0, -6, 0], scale: [1, 1.08, 1] }}
            transition={motionTransition}
          >
            1
          </motion.span>
        </div>
      )}

      {kind === 'trust' && (
        <div className="relative flex h-full items-center justify-center">
          <div className="relative h-16 w-14 rounded-t-lg border-2 border-found bg-bg-elevated shadow-sm">
            <div className="absolute -bottom-5 left-1/2 h-10 w-10 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-found bg-bg-elevated" />
            <motion.div
              className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-found text-found-foreground"
              animate={reduceMotion ? undefined : { scale: [1, 1.08, 1] }}
              transition={motionTransition}
            >
              <span className="text-sm font-bold">✓</span>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  )
}

export function HomeFeaturesSection() {
  const [primaryFeature, ...secondaryFeatures] = FEATURES
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden bg-surface-1 py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-bg-base to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg-base to-transparent" />
      <div className="container mx-auto px-6">
        <motion.div
          className="mx-auto mb-12 flex max-w-5xl flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
          initial="hidden"
          whileInView="visible"
          viewport={landingScrollViewport}
          variants={fadeUpInView}
        >
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-accent">
              Here to make lost-and-found easier
            </p>
            <h2 className="text-display-hero text-3xl font-semibold text-text-primary">
              Less confusion when something goes missing.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-text-secondary sm:text-base">
            {organization.name} keeps the process practical: clearer posts, easier
            searching, and the context members need to return items
            responsibly.
          </p>
        </motion.div>

        <motion.div
          className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={landingScrollViewport}
        >
          <motion.div
            className="card relative overflow-hidden border-accent/20 bg-bg-elevated p-8 sm:p-10"
            variants={staggerItem}
          >
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative">
              <FeatureVisual
                kind={primaryFeature.visual}
                label={primaryFeature.visualLabel}
                color={primaryFeature.color}
                reduceMotion={shouldReduceMotion ?? false}
                large
              />
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-accent">
                Spotlight feature
              </p>
              <h3 className="max-w-sm text-2xl font-semibold text-text-primary sm:text-3xl">
                {primaryFeature.title}
              </h3>
              <p className="mt-4 max-w-xl text-base leading-8 text-text-secondary">
                {primaryFeature.description}
              </p>
              <p className="mt-8 max-w-lg text-sm leading-7 text-text-secondary">
                Especially helpful when item titles are vague, details are
                incomplete, or you are trying to check several possible posts at
                once.
              </p>
            </div>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2">
            {secondaryFeatures.map((feature) => {
              return (
                <motion.div
                  key={feature.title}
                  className="card h-full p-6 transition-all hover:-translate-y-1 hover:border-accent/35 hover:shadow-md"
                  variants={staggerItem}
                >
                  <FeatureVisual
                    kind={feature.visual}
                    label={feature.visualLabel}
                    color={feature.color}
                    reduceMotion={shouldReduceMotion ?? false}
                  />
                  <h3 className="mb-2 text-lg font-semibold text-text-primary">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {feature.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
