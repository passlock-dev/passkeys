import { Effect as E, Layer } from 'effect'
import { NoSuchElementException } from 'effect/Cause'
import { describe, expect, test } from 'vitest'
import { mock } from 'vitest-mock-extended'

import { verifyEmail } from './email'
import { principal, testLayers } from './email.fixture'
import { AuthenticationService } from '../authentication/authenticate'
import { NetworkService } from '../network/network'
import { StorageService } from '../storage/storage'

describe('verifyEmail should', () => {
  test('return true when the backend says so', async () => {
    const program = E.gen(function* (_) {
      const result = yield* _(verifyEmail({ code: '123' }))
      expect(result).toBe(true)
    })

    const noRequirements = E.provide(program, testLayers)
    await E.runPromise(noRequirements)
  })

  test('check for a token in local storage', async () => {
    const program = E.gen(function* (_) {
      const storage = yield* _(StorageService)
      const result = yield* _(verifyEmail({ code: '123' }))

      expect(storage.getToken).toHaveBeenCalledWith('passkey')
      expect(result).toBe(true)
    })

    const noRequirements = E.provide(program, testLayers)
    await E.runPromise(noRequirements)
  })

  test('re-authenticate the user if no local token', async () => {
    const storageTest = Layer.effect(
      StorageService,
      E.sync(() => {
        const mockStorage = mock<StorageService>()
        mockStorage.getToken.mockReturnValue(E.fail(new NoSuchElementException()))
        mockStorage.clearToken.mockReturnValue(E.unit)
        return mockStorage
      }),
    )

    const authenticateTest = Layer.effect(
      AuthenticationService,
      E.sync(() => {
        const authService = mock<AuthenticationService>()
        authService.authenticate.mockReturnValue(E.succeed(principal))
        return authService
      }),
    )

    const program = E.gen(function* (_) {
      const authService = yield* _(AuthenticationService)
      const result = yield* _(verifyEmail({ code: '123' }))

      expect(authService.authenticate).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    const layers = Layer.mergeAll(testLayers, storageTest, authenticateTest)
    const noRequirements = E.provide(program, layers)
    await E.runPromise(noRequirements)
  })

  test('call the backend', async () => {
    const program = E.gen(function* (_) {
      const networkService = yield* _(NetworkService)
      const result = yield* _(verifyEmail({ code: '123' }))

      expect(networkService.postData).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    const layers = Layer.mergeAll(testLayers)
    const noRequirements = E.provide(program, layers)
    await E.runPromise(noRequirements)
  })
})
