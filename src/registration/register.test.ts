import { ErrorCode } from '@passlock/shared/error'
import { Effect as E, Layer } from 'effect'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { Create, register } from './register'
import {
  buildTestLayers,
  clientId,
  encodedEmail,
  endpoint,
  expectedPrincipal,
  request,
  runEffect,
  tenancyId,
} from './register.fixture'
import { runUnion } from '../exit'
import { expectPasslockError } from '../test/testUtils'

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

    expectPasslockError(result).toMatch('Email already registered', ErrorCode.DuplicateEmail)
  })

  test('generate an error if we try to reregister an existing passkey', async () => {
    const effect = register(request)
    const { layers } = buildTestLayers(false)

    const create: Create = () =>
      Promise.reject(new Error('credentialID matched by excludeCredentials'))
    const createTest = Layer.succeed(Create, Create.of(create))
    const withFailingCreate = Layer.merge(layers, createTest)

    const noRequirements = E.provide(effect, withFailingCreate)
    const result = await runUnion(noRequirements)

    expectPasslockError(result).toMatch(/Passkey already registered/, ErrorCode.DuplicatePasskey)
  })

  test("return an error if the browser can't create a credential", async () => {
    const effect = register(request)
    const { layers } = buildTestLayers(false)

    const create: Create = () => Promise.reject(new Error('BOOM!'))
    const createTest = Layer.succeed(Create, Create.of(create))
    const withFailingCreate = Layer.merge(layers, createTest)

    const noRequirements = E.provide(effect, withFailingCreate)
    const result = await runUnion(noRequirements)

    expectPasslockError(result).toMatch(
      /Unable to create credential/,
      ErrorCode.InternalBrowserError,
    )
  })
})
