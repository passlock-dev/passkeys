import { Duplicate, NotFound } from '@passlock/shared/dist/error/error.js'
import { RpcClient, type RouterOps } from '@passlock/shared/dist/rpc/rpc.js'
import { Effect as E, Layer as L, Layer, LogLevel, Logger, pipe } from 'effect'
import { describe, expect, test } from 'vitest'
import { mock } from 'vitest-mock-extended'
import * as Fixture from './social.fixture.js'
import { SocialService, SocialServiceLive } from './social.js'

describe('registerOidc should', () => {
  test('return a valid credential', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(SocialService)
      const result = yield* _(service.registerOidc(Fixture.oidcReq))
      expect(result).toEqual(Fixture.principal)
    })

    const rpcClientTest = L.effect(
      RpcClient,
      E.sync(() => {
        const rpcMock = mock<RouterOps>()

        rpcMock.registerOidc.mockReturnValue(E.succeed(Fixture.rpcRegisterRes))

        return rpcMock
      }),
    )

    const service = pipe(
      SocialServiceLive,
      L.provide(rpcClientTest),
    )

    const layers = Layer.merge(service, rpcClientTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })

  test('pass the request to the backend', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(SocialService)
      yield* _(service.registerOidc(Fixture.oidcReq))

      const rpcClient = yield* _(RpcClient)
      expect(rpcClient.registerOidc).toHaveBeenCalledWith(Fixture.rpcRegisterReq)
    })

    const rpcClientTest = L.effect(
      RpcClient,
      E.sync(() => {
        const rpcMock = mock<RouterOps>()

        rpcMock.registerOidc.mockReturnValue(E.succeed(Fixture.rpcRegisterRes))

        return rpcMock
      }),
    )

    const service = pipe(
      SocialServiceLive,
      L.provide(rpcClientTest),
    )

    const layers = Layer.merge(service, rpcClientTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })

  test('return an error if we try to register an existing user', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(SocialService)

      const defect = yield* _(service.registerOidc(Fixture.oidcReq), E.flip)

      expect(defect).toBeInstanceOf(Duplicate)
    })

    const rpcClientTest = L.effect(
      RpcClient,
      E.sync(() => {
        const rpcMock = mock<RouterOps>()

        rpcMock.registerOidc.mockReturnValue(E.fail(new Duplicate({ message: "Duplicate user" })))

        return rpcMock
      }),
    )

    const service = pipe(
      SocialServiceLive,
      L.provide(rpcClientTest),
    )

    const layers = Layer.merge(service, rpcClientTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })
})

describe('authenticateIodc should', () => {
  test('return a valid credential', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(SocialService)
      const result = yield* _(service.authenticateOidc(Fixture.oidcReq))
      expect(result).toEqual(Fixture.principal)
    })

    const rpcClientTest = L.effect(
      RpcClient,
      E.sync(() => {
        const rpcMock = mock<RouterOps>()

        rpcMock.authenticateOidc.mockReturnValue(E.succeed(Fixture.rpcRegisterRes))

        return rpcMock
      }),
    )

    const service = pipe(
      SocialServiceLive,
      L.provide(rpcClientTest),
    )

    const layers = Layer.merge(service, rpcClientTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })

  test('pass the request to the backend', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(SocialService)
      yield* _(service.authenticateOidc(Fixture.oidcReq))

      const rpcClient = yield* _(RpcClient)
      expect(rpcClient.authenticateOidc).toHaveBeenCalledWith(Fixture.rpcAuthenticateReq)
    })

    const rpcClientTest = L.effect(
      RpcClient,
      E.sync(() => {
        const rpcMock = mock<RouterOps>()

        rpcMock.authenticateOidc.mockReturnValue(E.succeed(Fixture.rpcAuthenticateRes))

        return rpcMock
      }),
    )

    const service = pipe(
      SocialServiceLive,
      L.provide(rpcClientTest),
    )

    const layers = Layer.merge(service, rpcClientTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })

  test('return an error if we try to authenticate a non-existing user', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(SocialService)

      const defect = yield* _(service.authenticateOidc(Fixture.oidcReq), E.flip)

      expect(defect).toBeInstanceOf(NotFound)
    })

    const rpcClientTest = L.effect(
      RpcClient,
      E.sync(() => {
        const rpcMock = mock<RouterOps>()

        rpcMock.authenticateOidc.mockReturnValue(E.fail(new NotFound({ message: "User not found" })))

        return rpcMock
      }),
    )

    const service = pipe(
      SocialServiceLive,
      L.provide(rpcClientTest),
    )

    const layers = Layer.merge(service, rpcClientTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })
})
