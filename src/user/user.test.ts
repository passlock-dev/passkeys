import { type RouterOps, RpcClient } from '@passlock/shared/dist/rpc/rpc'
import { Effect as E, Layer as L, Layer, LogLevel, Logger, pipe } from 'effect'
import { describe, expect, test } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { UserService, UserServiceLive } from './user'
import * as Fixture from './user.fixture'

describe('isExistingUser should', () => {
  test('return true when the user already has a passkey', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(UserService)
      const result = yield* _(service.isExistingUser({ email: Fixture.email }))

      expect(result).toBe(true)
    })

    const service = pipe(UserServiceLive, L.provide(Fixture.rpcClientTest))

    const effect = pipe(E.provide(assertions, service), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })

  test('send the email to the backend', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(UserService)
      const result = yield* _(service.isExistingUser({ email: Fixture.email }))

      expect(result).toBe(false)
      const rpcClient = yield* _(RpcClient)
      expect(rpcClient.isExistingUser).toBeCalledWith(Fixture.isRegisteredReq)
    })

    const rpcClientTest = Layer.effect(
      RpcClient,
      E.sync(() => {
        const rpcMock = mock<RouterOps>()

        rpcMock.isExistingUser.mockReturnValue(E.succeed(Fixture.isRegisteredRes))

        return rpcMock
      }),
    )

    const service = pipe(UserServiceLive, L.provide(rpcClientTest))

    const layers = L.merge(service, rpcClientTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })
})
