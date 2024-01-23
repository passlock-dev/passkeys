import { ErrorCode } from '@passlock/shared/error'
import { Effect as E, Layer } from 'effect'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { Get, authenticate } from './authenticate'
import {
  buildTestLayers,
  clientId,
  endpoint,
  expectedPrincipal,
  request,
  runEffect,
  tenancyId,
} from './authenticate.fixture'
import { runUnion } from '../exit'
import { expectPasslockError } from '../test/testUtils'

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

  test("return an error if the browser can't create a credential", async () => {
    const effect = authenticate(request)
    const { layers } = buildTestLayers()

    const get: Get = () => Promise.reject(new Error('BOOM!'))
    const createTest = Layer.succeed(Get, Get.of(get))
    const withFailingCreate = Layer.merge(layers, createTest)

    const noRequirements = E.provide(effect, withFailingCreate)
    const result = await runUnion(noRequirements)

    expectPasslockError(result).toMatch('Unable to get credentials', ErrorCode.InternalBrowserError)
  })
})
