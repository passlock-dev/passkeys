import { ErrorCode } from '@passlock/shared/error'
import { Effect as E, Layer, pipe } from 'effect'
import { describe, expect, test } from 'vitest'

import { Create, register } from './register'
import {
  buildTestLayers,
  clientId,
  request as data,
  encodedEmail,
  endpoint,
  expectedPrincipal,
  tenancyId,
} from './register.fixture'
import { NetworkService } from '../network/network'

describe('register should', () => {
  test('return a valid credential', async () => {
    const program = E.gen(function* (_) {
      const result = yield* _(register(data))
      expect(result).toEqual(expectedPrincipal)
    })

    const layers = buildTestLayers(false)
    const noRequirements = E.provide(program, layers)
    await E.runPromise(noRequirements)
  })

  test('check if the user is already registered', async () => {
    const program = E.gen(function* (_) {
      const result = yield* _(register(data))
      const networkService = yield* _(NetworkService)
      const url = `${endpoint}/${tenancyId}/users/status/${encodedEmail}`
      expect(networkService.getData).toHaveBeenCalledWith({ url, clientId })
      expect(result).toEqual(expectedPrincipal)
    })

    const layers = buildTestLayers(false)
    const noRequirements = E.provide(program, layers)
    await E.runPromise(noRequirements)
  })

  test('pass the registration data to the backend', async () => {
    const program = E.gen(function* (_) {
      const result = yield* _(register(data))
      const networkService = yield* _(NetworkService)
      const url = `${endpoint}/${tenancyId}/passkey/registration/options`
      expect(networkService.postData).toHaveBeenCalledWith({ url, clientId, data })
      expect(result).toEqual(expectedPrincipal)
    })

    const layers = buildTestLayers(false)
    const noRequirements = E.provide(program, layers)
    await E.runPromise(noRequirements)
  })

  test('send the new credential to the backend', async () => {
    const program = E.gen(function* (_) {
      const result = yield* _(register(data))
      const networkService = yield* _(NetworkService)
      const url = `${endpoint}/${tenancyId}/passkey/registration/verification`
      expect(networkService.postData).toHaveBeenCalledWith({
        url,
        clientId,
        data: expect.any(Object) as object,
      })
      expect(result).toEqual(expectedPrincipal)
    })

    const layers = buildTestLayers(false)
    const noRequirements = E.provide(program, layers)
    await E.runPromise(noRequirements)
  })

  test('short-circuit if the user is already registered', async () => {
    const program = pipe(
      register(data),
      E.flip,
      E.flatMap(e =>
        E.sync(() => {
          expect(e.message).toBe('Email already registered')
          expect(e.code).toBe(ErrorCode.DuplicateEmail)
        }),
      ),
    )

    const layers = buildTestLayers(true)
    const noRequirements = E.provide(program, layers)
    await E.runPromise(noRequirements)
  })

  test('generate an error if we try to reregister an existing passkey', async () => {
    const effect = pipe(
      register(data),
      E.flip,
      E.flatMap(e =>
        E.sync(() => {
          expect(e.message).toMatch(/Passkey already registered/)
          expect(e.code).toBe(ErrorCode.DuplicatePasskey)
        }),
      ),
    )

    const create: Create = () =>
      Promise.reject(new Error('credentialID matched by excludeCredentials'))
    const createTest = Layer.succeed(Create, Create.of(create))
    const withFailingCreate = Layer.merge(buildTestLayers(false), createTest)

    const noRequirements = E.provide(effect, withFailingCreate)
    await E.runPromise(noRequirements)
  })

  test("return an error if the browser can't create a credential", async () => {
    const effect = pipe(
      register(data),
      E.flip,
      E.flatMap(e =>
        E.sync(() => {
          expect(e.message).toBe('Unable to create credential')
          expect(e.code).toBe(ErrorCode.InternalBrowserError)
        }),
      ),
    )

    const create: Create = () => Promise.reject(new Error('BOOM!'))
    const createTest = Layer.succeed(Create, Create.of(create))
    const withFailingCreate = Layer.merge(buildTestLayers(false), createTest)

    const noRequirements = E.provide(effect, withFailingCreate)
    await E.runPromise(noRequirements)
  })
})
