import { render, screen } from '@testing-library/react'
import { createElement, type ComponentPropsWithoutRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HomeHowItWorksSection } from '../HomeHowItWorksSection'

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
          custom: _custom,
          animate: _animate,
          transition: _transition,
          ...props
        }: ComponentPropsWithoutRef<'div'> & Record<string, unknown>) => {
          return createElement(tag, props, children)
        }

        return Component
      },
    }
  ),
  stagger: () => 0,
  useReducedMotion: () => false,
}))

describe('HomeHowItWorksSection', () => {
  it('shows lo-fi visual previews for each recovery step', () => {
    render(<HomeHowItWorksSection />)

    expect(screen.getByLabelText('Lo-fi preview of reporting a lost or found item')).toBeInTheDocument()
    expect(screen.getByLabelText('Lo-fi preview of checking possible item matches')).toBeInTheDocument()
    expect(screen.getByLabelText('Lo-fi preview of arranging a safe item return')).toBeInTheDocument()
  })
})
