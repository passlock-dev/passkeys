import { RpcConfig } from '@passlock/shared/dist/rpc/config.js'
import { Dispatcher, RpcClient, type RouterOps } from '@passlock/shared/dist/rpc/rpc.js'
import { Effect as E, Layer as L, Layer, LogLevel, Logger, pipe } from 'effect'
import { describe, expect, test } from 'vitest'
import { mock } from 'vitest-mock-extended'
import * as Fixture from './connection.fixture.js'
import { ConnectionService, ConnectionServiceLive } from './connection.js'

describe('preConnect should', () => {
  test('hit the rpc endpoint', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(ConnectionService)
      yield* _(service.preConnect())

      const rpcClient = yield* _(RpcClient)
      expect(rpcClient.preConnect).toBeCalledWith(Fixture.preConnectReq)

      const dispatcher = yield* _(Dispatcher)
      expect(dispatcher.get).toBeCalledWith(`/token/token?warm=true`)
    })

    const rpcClientTest = Layer.effect(
      RpcClient,
      E.sync(() => {
        const rpcMock = mock<RouterOps>()

        rpcMock.preConnect.mockReturnValue(E.succeed(Fixture.preConnectRes))

        return rpcMock
      }),
    )

    const rpcConfigTest = Layer.succeed(RpcConfig, RpcConfig.of(Fixture.rpcConfig))

    const dispatcherTest = Layer.effect(
      Dispatcher,
      E.sync(() => {
        const dispatcherMock = mock<Dispatcher['Type']>()

        dispatcherMock.get.mockReturnValue(E.succeed({}))

        return dispatcherMock
      }),
    )

    const service = pipe(
      ConnectionServiceLive,
      L.provide(rpcClientTest),
      L.provide(dispatcherTest),
      L.provide(rpcConfigTest),
    )

    const layers = L.mergeAll(service, rpcClientTest, dispatcherTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })
})
