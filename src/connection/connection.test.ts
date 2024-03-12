import { NetworkService, type RouterOps, RpcClient, RpcConfig } from '@passlock/shared/dist/rpc/rpc'
import { Effect as E, Layer as L, Layer, LogLevel, Logger, pipe } from 'effect'
import { describe, expect, test } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { ConnectionService, ConnectionServiceLive } from './connection'
import * as Fixture from './connection.fixture'

describe('preConnect should', () => {
  test('hit the rpc endpoint', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(ConnectionService)
      yield* _(service.preConnect())

      const rpcClient = yield* _(RpcClient)
      expect(rpcClient.preConnect).toBeCalledWith(Fixture.preConnectReq)

      const networkService = yield* _(NetworkService)
      expect(networkService.get).toBeCalledWith(`/token/token?warm=true`)
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

    const networkServiceTest = Layer.effect(
      NetworkService,
      E.sync(() => {
        const networkMock = mock<NetworkService['Type']>()

        networkMock.get.mockReturnValue(E.succeed({}))

        return networkMock
      }),
    )

    const service = pipe(
      ConnectionServiceLive,
      L.provide(rpcClientTest),
      L.provide(networkServiceTest),
      L.provide(rpcConfigTest),
    )

    const layers = L.mergeAll(service, rpcClientTest, networkServiceTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })
})
