import { afterEach, describe, expect, test, vi } from 'vitest'

import { authenticate } from './authenticate'
import {
  clientId,
  endpoint,
  expectedPrincipal,
  request,
  runEffect,
  tenancyId,
} from './authenticate.fixture'

describe('authenticate should', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('return a valid credential', async () => {
    const effect = authenticate(request)
    const { result } = await runEffect(effect)

    expect(result).toEqual(expectedPrincipal)
  })

  test('pass the authentication request to the backend', async () => {
    const effect = authenticate(request)
    const { postData } = await runEffect(effect)

    const expectedUrl = `${endpoint}/${tenancyId}/passkey/authentication/options`
    expect(postData).toHaveBeenCalledWith(expectedUrl, clientId, request)
  })

  test('send the credential to the backend', async () => {
    const effect = authenticate(request)
    const { postData } = await runEffect(effect)

    const expectedUrl = `${endpoint}/${tenancyId}/passkey/authentication/verification`
    expect(postData).toHaveBeenCalledWith(expectedUrl, clientId, expect.any(Object))
  })
})
