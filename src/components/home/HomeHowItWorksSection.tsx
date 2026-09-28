'use client'

import { motion, useReducedMotion } from 'motion/react'
import { organization } from '@/lib/organization/config'
import {
  Camera,
  ChatCircleText,
  Check,
  MagnifyingGlass,
  MapPin,
  Sparkle,
  CheckCircle,
} from '@phosphor-icons/react'
import {
  staggerContainer,
  staggerItemFromSide,
  fadeUpInView,
  landingScrollViewport,
} from '@/lib/motion'

const STEPS = [
  {
    number: '1',
    title: 'Share what happened',
    description:
      'Add a few details, a photo if you have one, and where it was lost or found.',
    icon: MagnifyingGlass,
  },
  {
    number: '2',
    title: 'Check possible matches',
    description:
      `${organization.name} will suggest listings that might be related to yours.`,
    icon: Sparkle,
  },
  {
    number: '3',
    title: 'Return it safely',
    description:
      'Confirm the details, arrange the handoff, or follow the office return instructions.',
    icon: CheckCircle,
  },
]

function PreviewShell({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      className="mb-6 overflow-hidden rounded-lg border border-border bg-surface-1 p-3"
      aria-label={label}
    >
      <div className="mb-3 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-lost/60" />
        <span className="h-2 w-2 rounded-full bg-warning/60" />
        <span className="h-2 w-2 rounded-full bg-found/60" />
      </div>
      <div className="relative min-h-32 rounded-md bg-bg-elevated p-3 shadow-sm">
        {children}
      </div>
    </div>
  )
}

interface StepPreviewProps {
  reduceMotion: boolean
}

function ReportPreview({ reduceMotion }: StepPreviewProps) {
  return (
    <PreviewShell label="Lo-fi preview of reporting a lost or found item">
      <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3">
        <motion.div
          className="flex h-14 w-14 items-center justify-center rounded-md border border-border bg-accent-muted text-accent"
          animate={reduceMotion ? undefined : { scale: [1, 1.04, 1] }}
          transition={reduceMotion ? undefined : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Camera size={22} weight="duotone" />
        </motion.div>
        <div className="space-y-2">
          <div className="h-2.5 w-3/4 rounded-full bg-text-primary/15" />
          <div className="h-2 w-full rounded-full bg-text-secondary/15" />
          <div className="h-2 w-2/3 rounded-full bg-text-secondary/15" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <span className="rounded-full bg-lost-muted px-3 py-1 text-[0.65rem] font-semibold text-lost">
          Lost
        </span>
        <span className="rounded-full bg-found-muted px-3 py-1 text-[0.65rem] font-semibold text-found">
          Found
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-secondary">
        <MapPin size={14} weight="duotone" className="text-accent" />
        <div className="h-2 w-28 rounded-full bg-text-secondary/15" />
      </div>
      <motion.div
        className="absolute bottom-4 right-4 h-4 w-4 rounded-full border-2 border-bg-elevated bg-accent shadow-md"
        animate={reduceMotion ? undefined : { x: [0, -12, -12, 0], y: [0, -8, -8, 0] }}
        transition={reduceMotion ? undefined : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </PreviewShell>
  )
}

function MatchesPreview({ reduceMotion }: StepPreviewProps) {
  return (
    <PreviewShell label="Lo-fi preview of checking possible item matches">
      <motion.div
        className="absolute inset-x-3 top-3 h-8 rounded-md border border-accent/30 bg-accent-muted"
        animate={reduceMotion ? undefined : { opacity: [0.45, 0.9, 0.45] }}
        transition={reduceMotion ? undefined : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative space-y-3">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-bg-elevated px-3 py-2"
          >
            <div
              className={`h-10 w-10 rounded-md ${
                item === 0 ? 'bg-lost-muted' : 'bg-found-muted'
              }`}
            />
            <div className="space-y-2">
              <div className="h-2.5 w-24 rounded-full bg-text-primary/15" />
              <div className="h-2 w-32 rounded-full bg-text-secondary/15" />
            </div>
            {item === 0 ? (
              <motion.span
                className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground"
                animate={reduceMotion ? undefined : { rotate: [0, 8, -8, 0] }}
                transition={reduceMotion ? undefined : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkle size={15} weight="fill" />
              </motion.span>
            ) : (
              <span className="h-7 w-7 rounded-full bg-surface-2" />
            )}
          </div>
        ))}
      </div>
      <motion.div
        className="mt-3 h-1 rounded-full bg-accent"
        animate={reduceMotion ? undefined : { width: ['28%', '82%', '28%'] }}
        transition={reduceMotion ? undefined : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </PreviewShell>
  )
}

function ReturnPreview({ reduceMotion }: StepPreviewProps) {
  return (
    <PreviewShell label="Lo-fi preview of arranging a safe item return">
      <div className="space-y-3">
        <div className="flex justify-start">
          <div className="max-w-[78%] rounded-lg rounded-bl-sm bg-surface-2 px-3 py-2">
            <div className="mb-2 h-2 w-24 rounded-full bg-text-secondary/15" />
            <div className="h-2 w-16 rounded-full bg-text-secondary/15" />
          </div>
        </div>
        <div className="flex justify-end">
          <motion.div
            className="max-w-[82%] rounded-lg rounded-br-sm bg-accent px-3 py-2 text-accent-foreground"
            animate={reduceMotion ? undefined : { y: [0, -2, 0] }}
            transition={reduceMotion ? undefined : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="mb-2 h-2 w-28 rounded-full bg-white/55" />
            <div className="h-2 w-20 rounded-full bg-white/45" />
          </motion.div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-md border border-found/20 bg-found-muted px-3 py-2">
        <div className="flex items-center gap-2 text-found">
          <ChatCircleText size={15} weight="duotone" />
          <span className="text-[0.65rem] font-semibold">Office handoff</span>
        </div>
        <motion.span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-found text-found-foreground"
          animate={reduceMotion ? undefined : { scale: [1, 1.08, 1] }}
          transition={reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Check size={15} weight="bold" />
        </motion.span>
      </div>
    </PreviewShell>
  )
}

const previews = [ReportPreview, MatchesPreview, ReturnPreview]

export function HomeHowItWorksSection() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <motion.div
          className="mb-12 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={landingScrollViewport}
          variants={fadeUpInView}
        >
          <h2 className="text-display-hero mb-4 text-3xl font-semibold text-text-primary">
            How It Works
          </h2>
          <p className="mx-auto max-w-2xl text-text-secondary">
            Whether you lost something or found someone else&apos;s item, the
            process is meant to be straightforward.
          </p>
        </motion.div>

        <motion.div
          className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={landingScrollViewport}
        >
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const Preview = previews[index]
            return (
              <motion.div
                key={step.number}
                className="relative"
                custom={index % 2 === 0 ? -1 : 1}
                variants={staggerItemFromSide}
              >
                <div className="card h-full p-6">
                  <Preview reduceMotion={shouldReduceMotion ?? false} />
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg font-bold text-black">
                      {step.number}
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-muted text-accent">
                      <Icon size={20} weight="duotone" className="shrink-0" />
                    </div>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {step.description}
                  </p>
                </div>
                {step.number !== '3' && (
                  <div className="absolute -right-4 top-1/2 hidden h-0.5 w-8 bg-border md:block" />
                )}
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
