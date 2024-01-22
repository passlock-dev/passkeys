import { ErrorCode, error } from '@passlock/shared/error'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { register } from './register'
import {
  clientId,
  encodedEmail,
  endpoint,
  expectedPrincipal,
  request,
  runEffect,
  tenancyId,
} from './register.fixture'

describe('register should', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('return a valid credential', async () => {
    const effect = register(request)
    const { result } = await runEffect(effect, false)

    expect(result).toEqual(expectedPrincipal)
  })

  test('check if the user is already registered', async () => {
    const effect = register(request)
    const { getData } = await runEffect(effect, false)

    const expectedUrl = `${endpoint}/${tenancyId}/users/status/${encodedEmail}`
    expect(getData).toHaveBeenCalledWith(expectedUrl, clientId, undefined)
  })

  test('pass the registration data to the backend', async () => {
    const effect = register(request)
    const { postData } = await runEffect(effect, false)

    const expectedUrl = `${endpoint}/${tenancyId}/passkey/registration/options`
    expect(postData).toHaveBeenCalledWith(expectedUrl, clientId, request)
  })

  test('send the new credential to the backend', async () => {
    const effect = register(request)
    const { postData } = await runEffect(effect, false)

    const expectedUrl = `${endpoint}/${tenancyId}/passkey/registration/verification`
    expect(postData).toHaveBeenCalledWith(expectedUrl, clientId, expect.any(Object))
  })

  test('short-circuit if the user is already registered', async () => {
    const effect = register(request)
    const { result } = await runEffect(effect, true)

    expect(result).toEqual(error('Email already registered', ErrorCode.DuplicateEmail))
  })
})
