import { render, screen } from '@testing-library/react'
import { createElement, type ComponentPropsWithoutRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HomeFeaturesSection } from '../HomeFeaturesSection'

vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        const Component = ({
          children,
          initial: _initial,
          whileInView: _whileInView,
          viewport: _viewport,
          variants: _variants,
          animate: _animate,
          transition: _transition,
          ...props
        }: ComponentPropsWithoutRef<'div'> & Record<string, unknown>) =>
          createElement(tag, props, children)

        return Component
      },
    }
  ),
  stagger: () => 0,
  useReducedMotion: () => false,
}))

describe('HomeFeaturesSection', () => {
  it('uses custom lo-fi visuals instead of generic icon-only tiles', () => {
    render(<HomeFeaturesSection />)

    expect(screen.getByLabelText('Custom visual for helpful match suggestions')).toBeInTheDocument()
    expect(screen.getByLabelText('Custom visual for search by what you remember')).toBeInTheDocument()
    expect(screen.getByLabelText('Custom visual for location context')).toBeInTheDocument()
    expect(screen.getByLabelText('Custom visual for listing updates')).toBeInTheDocument()
    expect(screen.getByLabelText('Custom visual for safer returns')).toBeInTheDocument()
  })
})
