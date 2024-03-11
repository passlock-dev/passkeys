import { type RouterOps, RpcClient } from '@passlock/shared/dist/rpc/rpc'
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
    })

    const rpcClientTest = Layer.effect(
      RpcClient,
      E.sync(() => {
        const rpcMock = mock<RouterOps>()

        rpcMock.preConnect.mockReturnValue(E.succeed(Fixture.preConnectRes))

        return rpcMock
      }),
    )

    const service = pipe(ConnectionServiceLive, L.provide(rpcClientTest))

    const layers = L.merge(service, rpcClientTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })
})
