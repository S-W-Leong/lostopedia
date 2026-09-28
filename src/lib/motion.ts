import { stagger } from 'motion/react'

/** Default stagger delay in seconds for list entrances */
export const STAGGER_DELAY = 0.06

/** Cubic-bezier ease-out expo for Motion (typed as tuple) */
const easeOutExpo = [0.16, 1, 0.3, 1] as const

/**
 * Shared scroll-trigger settings for landing sections: one-shot reveal,
 * triggers slightly before the block is fully in view.
 */
export const landingScrollViewport = {
  once: false,
  amount: 0.18,
  margin: '0px 0px -10% 0px',
} as const

/** Container variant: fade in and stagger children */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      delayChildren: stagger(STAGGER_DELAY),
    },
  },
}

/** Item variant: fade up for use inside stagger container */
export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOutExpo },
  },
}

/**
 * Stagger child with horizontal offset; pass `custom: -1 | 1` for direction.
 * Use with staggerContainer for alternating slide-ins.
 */
export const staggerItemFromSide = {
  hidden: (dir?: number) => ({
    opacity: 0,
    x: (dir ?? 0) * 22,
    y: 10,
  }),
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.42, ease: easeOutExpo },
  },
}

/** Simple fade-up for single elements */
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOutExpo },
  },
}

/** Viewport-triggered fade up (for scroll reveals) */
export const fadeUpInView = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOutExpo },
  },
}

/** CTA / emphasize blocks: subtle scale + fade */
export const scaleFadeUpInView = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: easeOutExpo },
  },
}

/** Hero-style block: scale + opacity with staggered children */
export const scaleStaggerContainer = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      when: 'beforeChildren',
      delayChildren: stagger(STAGGER_DELAY),
      duration: 0.5,
      ease: easeOutExpo,
    },
  },
}
