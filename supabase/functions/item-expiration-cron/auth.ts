/** Validate the independent scheduler bearer secret before any database work. */
export function isAuthorizedCronRequest(
  authorization: string | null,
  secret: string | undefined
): boolean {
  if (!secret || !authorization?.startsWith('Bearer ')) return false

  const supplied = new TextEncoder().encode(authorization.slice('Bearer '.length))
  const expected = new TextEncoder().encode(secret)
  let difference = supplied.length ^ expected.length
  for (let index = 0; index < Math.max(supplied.length, expected.length); index++) {
    difference |= (supplied[index] ?? 0) ^ (expected[index] ?? 0)
  }
  return difference === 0
}
