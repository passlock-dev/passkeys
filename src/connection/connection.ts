/**
 * Hits the rpc endpoint to warm up a lambda
 */
import { PreConnectReq } from '@passlock/shared/dist/rpc/connection'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc'
import { Context, Effect as E, Layer, flow } from 'effect'


/* Service */

export type ConnectionService = {
  preConnect: () => E.Effect<void>
}

export const ConnectionService = Context.GenericTag<ConnectionService>('@services/ConnectService')

/* Effects */

export const preConnect = () =>
  E.gen(function* (_) {
    const rpcClient = yield* _(RpcClient)
    yield* _(E.logInfo('Pre-connecting to endpoints'))
    yield* _(rpcClient.preConnect(new PreConnectReq({})))
  })

/* Live */

/* v8 ignore start */
export const ConnectionServiceLive = Layer.effect(
  ConnectionService,
  E.gen(function* (_) {
    const context = yield* _(E.context<RpcClient>())

    return ConnectionService.of({
      preConnect: flow(preConnect, E.provide(context)),
    })
  }),
)
/* v8 ignore stop */
