import { isAuthorizedCronRequest } from './auth.ts'

Deno.test('an unconfigured scheduler is denied', () => {
  if (isAuthorizedCronRequest('Bearer anything', undefined)) throw new Error('Expected denial')
})

Deno.test('wrong and missing bearer credentials are denied', () => {
  if (isAuthorizedCronRequest('Bearer wrong', 'expected')) throw new Error('Expected denial')
  if (isAuthorizedCronRequest(null, 'expected')) throw new Error('Expected denial')
  if (isAuthorizedCronRequest('expected', 'expected')) throw new Error('Expected denial')
})

Deno.test('only an exact scheduler secret is accepted', () => {
  if (!isAuthorizedCronRequest('Bearer expected', 'expected')) throw new Error('Expected access')
  if (isAuthorizedCronRequest('Bearer expected-extra', 'expected')) throw new Error('Expected denial')
})
