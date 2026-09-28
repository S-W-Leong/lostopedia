import { render, screen } from '@testing-library/react'
import { createElement, type ComponentPropsWithoutRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HomeHero } from '../HomeHero'
import { organization } from '@/lib/organization/config'
import { registrationDescription } from '@/lib/organization/registration'

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: ComponentPropsWithoutRef<'img'>) =>
    createElement('img', { alt, ...props }),
}))

vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        const Component = ({
          children,
          initial: _initial,
          animate: _animate,
          transition: _transition,
          variants: _variants,
          style: _style,
          ...props
        }: ComponentPropsWithoutRef<'div'> & Record<string, unknown>) =>
          createElement(tag, props, children)

        return Component
      },
    }
  ),
  useScroll: () => ({ scrollYProgress: 0 }),
  useTransform: () => 0,
  useReducedMotion: () => false,
  stagger: () => 0,
}))

describe('HomeHero', () => {
  it('keeps the hero focused on copy without decorative mockups or paths', () => {
    render(<HomeHero stats={{ totalItems: 12, itemsRecovered: 5, totalUsers: 40 }} />)

    expect(screen.getByRole('heading', { name: organization.name })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: "Lost something? Let's help it find its way back.",
      })
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Animated lost-to-found return path')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Animated campus lost-and-found activity')).not.toBeInTheDocument()
  })

  it('positions authenticated access as a safety feature in the hero CTAs', () => {
    render(<HomeHero stats={{ totalItems: 12, itemsRecovered: 5, totalUsers: 40 }} />)

    expect(screen.getByRole('link', { name: `Join ${organization.name}` })).toHaveAttribute('href', '/signup')
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
    expect(
      screen.getByText(
        `Only signed-in members can view item details, search, and contact owners. ${registrationDescription(organization.registration)}`
      )
    ).toBeInTheDocument()
    expect(screen.queryByText(/already have an account/i)).not.toBeInTheDocument()
  })
})
