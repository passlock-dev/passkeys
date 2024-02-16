import { Effect as E, Layer, identity, pipe } from 'effect'
import { describe, expect, test } from 'vitest'
import { mock } from 'vitest-mock-extended'

import { Storage, clearExpiredToken, clearToken, getToken, storeToken } from './storage'
import { principal, testLayers } from './storage.fixture'

// eslint chokes on expect(storage.setItem) etc
/* eslint @typescript-eslint/unbound-method: 0 */

describe('storeToken should', () => {
  test('set the token in local storage', () => {
    const program = E.gen(function* (_) {
      const storage = yield* _(Storage)
      yield* _(storeToken(principal))
      expect(storage.setItem).toHaveBeenCalled()
    })

    const noRequirements = E.provide(program, testLayers)
    E.runSync(noRequirements)
  })

  test('with the key passlock:p:t', () => {
    const program = E.gen(function* (_) {
      const storage = yield* _(Storage)
      yield* _(storeToken(principal))
      expect(storage.setItem).toHaveBeenCalledWith('passlock:p:t', expect.any(String))
    })

    const noRequirements = E.provide(program, testLayers)
    E.runSync(noRequirements)
  })

  test('with the value token:expiry', () => {
    const program = E.gen(function* (_) {
      const storage = yield* _(Storage)
      yield* _(storeToken(principal))
      const token = principal.token
      const expiry = principal.expiresAt.getTime()
      expect(storage.setItem).toHaveBeenCalledWith('passlock:p:t', `${token}:${expiry}`)
    })

    const noRequirements = E.provide(program, testLayers)
    E.runSync(noRequirements)
  })
})

describe('getToken should', () => {
  test('get the token from local storage', () => {
    const storageTest = Layer.effect(
      Storage,
      E.sync(() => {
        const mockStorage = mock<Storage>()
        const expiry = Date.now() + 1000
        mockStorage.getItem.mockReturnValue(`token:${expiry}`)
        return mockStorage
      }),
    )

    const program = E.gen(function* (_) {
      const storage = yield* _(Storage)
      const token = yield* _(getToken('passkey'))
      expect(storage.getItem).toHaveBeenCalledWith('passlock:p:t')
      return token
    })

    const noRequirements = E.provide(program, storageTest)
    E.runSync(noRequirements)
  })

  test('filter out expired tokens', () => {
    const storageTest = Layer.effect(
      Storage,
      E.sync(() => {
        const mockStorage = mock<Storage>()
        const expiry = Date.now() - 1000
        mockStorage.getItem.mockReturnValue(`token:${expiry}`)
        return mockStorage
      }),
    )

    const program = pipe(
      getToken('passkey'),
      E.match({
        onSuccess: identity,
        onFailure: () => undefined,
      }),
      E.flatMap(result =>
        E.sync(() => {
          expect(result).toBeUndefined()
        }),
      ),
    )

    const noRequirements = E.provide(program, storageTest)
    E.runSync(noRequirements)
  })
})

describe('clearToken should', () => {
  test('clear the token in local storage', () => {
    const program = E.gen(function* (_) {
      const storage = yield* _(Storage)
      yield* _(clearToken('passkey'))
      expect(storage.removeItem).toHaveBeenCalledWith('passlock:p:t')
    })

    const noRequirements = E.provide(program, testLayers)
    E.runSync(noRequirements)
  })
})

describe('clearExpiredToken should', () => {
  test('clear an expired token from local storage', () => {
    const storageTest = Layer.effect(
      Storage,
      E.sync(() => {
        const mockStorage = mock<Storage>()
        const expiry = Date.now() - 1000
        mockStorage.getItem.mockReturnValue(`token:${expiry}`)
        return mockStorage
      }),
    )

    const program = E.gen(function* (_) {
      const storage = yield* _(Storage)
      yield* _(clearExpiredToken('passkey'))
      expect(storage.getItem).toHaveBeenCalledWith('passlock:p:t')
      expect(storage.removeItem).toHaveBeenCalledWith('passlock:p:t')
    })

    const noRequirements = E.provide(program, storageTest)
    E.runSync(noRequirements)
  })

  test('leave a live token in local storage', () => {
    const storageTest = Layer.effect(
      Storage,
      E.sync(() => {
        const mockStorage = mock<Storage>()
        const expiry = Date.now() + 1000
        mockStorage.getItem.mockReturnValue(`token:${expiry}`)
        return mockStorage
      }),
    )

    const program = E.gen(function* (_) {
      const storage = yield* _(Storage)
      yield* _(clearExpiredToken('passkey'))
      expect(storage.getItem).toHaveBeenCalledWith('passlock:p:t')
      expect(storage.removeItem).not.toHaveBeenCalled()
    })

    const noRequirements = E.provide(program, storageTest)
    E.runSync(noRequirements)
  })
})
