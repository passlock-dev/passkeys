import { ErrorCode } from '@passlock/shared/error'
import { Effect as E, Layer, pipe } from 'effect'
import { describe, expect, test } from 'vitest'

import { Get, authenticatePasskey } from './authenticate'
import {
  buildTestLayers,
  clientId,
  request as data,
  endpoint,
  expectedPrincipal,
  tenancyId,
} from './authenticate.fixture'
import { NetworkService } from '../network/network'
import { StorageService } from '../storage/storage'

describe('authenticate should', () => {
  test('return a valid credential', async () => {
    const program = E.gen(function* (_) {
      const result = yield* _(authenticatePasskey(data))
      expect(result).toEqual(expectedPrincipal)
    })

    const layers = buildTestLayers()
    const noRequirements = E.provide(program, layers)
    await E.runPromise(noRequirements)
  })

  test('pass the authentication request to the backend', async () => {
    const program = E.gen(function* (_) {
      const result = yield* _(authenticatePasskey(data))
      const networkService = yield* _(NetworkService)
      const url = `${endpoint}/${tenancyId}/passkey/authentication/options`

      expect(networkService.postData).toHaveBeenCalledWith({ url, clientId, data })
      expect(result).toEqual(expectedPrincipal)
    })

    const layers = buildTestLayers()
    const noRequirements = E.provide(program, layers)
    await E.runPromise(noRequirements)
  })

  test('send the credential to the backend', async () => {
    const program = E.gen(function* (_) {
      const result = yield* _(authenticatePasskey(data))
      const networkService = yield* _(NetworkService)
      const url = `${endpoint}/${tenancyId}/passkey/authentication/verification`

      expect(networkService.postData).toHaveBeenCalledWith({
        url,
        clientId,
        data: expect.any(Object) as object,
      })
      expect(result).toEqual(expectedPrincipal)
    })

    const layers = buildTestLayers()
    const noRequirements = E.provide(program, layers)
    await E.runPromise(noRequirements)
  })

  test('store the credential in local storage', async () => {
    const program = E.gen(function* (_) {
      const result = yield* _(authenticatePasskey(data))
      const storageService = yield* _(StorageService)

      expect(storageService.storeToken).toHaveBeenCalledWith(expectedPrincipal)
      expect(result).toEqual(expectedPrincipal)
    })

    const layers = buildTestLayers()
    const noRequirements = E.provide(program, layers)
    await E.runPromise(noRequirements)
  })

  test('schedule deletion of the local token', async () => {
    const program = E.gen(function* (_) {
      const result = yield* _(authenticatePasskey(data))
      const storageService = yield* _(StorageService)

      expect(storageService.clearExpiredToken).toHaveBeenCalledWith('passkey', true)
      expect(result).toEqual(expectedPrincipal)
    })

    const layers = buildTestLayers()
    const noRequirements = E.provide(program, layers)
    await E.runPromise(noRequirements)
  })

  test("return an error if the browser can't create a credential", async () => {
    const program = pipe(
      authenticatePasskey(data),
      E.flip,
      E.tap(e => {
        expect(e.message).toBe('Unable to get credentials')
        expect(e.code).toBe(ErrorCode.InternalBrowserError)
      }),
    )

    const layers = buildTestLayers()
    const get: Get = () => Promise.reject(new Error('BOOM!'))
    const createTest = Layer.succeed(Get, Get.of(get))
    const withFailingCreate = Layer.merge(layers, createTest)
    const noRequirements = E.provide(program, withFailingCreate)
    await E.runPromise(noRequirements)
  })
})
