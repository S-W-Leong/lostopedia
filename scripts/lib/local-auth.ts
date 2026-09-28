export function assertLocalAuthUrl(value: string): URL {
  const url = new URL(value)
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Local Auth checks require a loopback HTTP URL')
  }
  return url
}
