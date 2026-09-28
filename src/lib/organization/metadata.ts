import { resolveAppUrl } from './app-url'

export function organizationOrigin(value = process.env.NEXT_PUBLIC_APP_URL, mode = process.env.NODE_ENV): string {
  return resolveAppUrl(value, mode)
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
