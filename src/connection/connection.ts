/**
 * Hits the rpc endpoint to warm up a lambda
 */
import type { RpcConfig } from '@passlock/shared/dist/rpc/config.js'
import { PreConnectReq } from '@passlock/shared/dist/rpc/connection.js'
import { Dispatcher, RpcClient } from '@passlock/shared/dist/rpc/rpc.js'
import { Context, Effect as E, Layer, flow, pipe } from 'effect'

/* Service */

export type ConnectionService = {
  preConnect: () => E.Effect<void>
}

export const ConnectionService = Context.GenericTag<ConnectionService>('@services/ConnectService')

/* Effects */

const hitPrincipal = pipe(
  E.logInfo('Pre-connecting to Principal endpoint'),
  E.zipRight(Dispatcher),
  E.flatMap(dispatcher => dispatcher.get('/token/token?warm=true')),
  E.asVoid,
  E.catchAll(() => E.void),
)

const hitRpc = pipe(
  E.logInfo('Pre-connecting to RPC endpoint'),
  E.zipRight(RpcClient),
  E.flatMap(rpcClient => rpcClient.preConnect(new PreConnectReq({}))),
  E.asVoid,
)

export const preConnect = () => pipe(E.all([hitPrincipal, hitRpc], { concurrency: 2 }), E.asVoid)

/* Live */

/* v8 ignore start */
export const ConnectionServiceLive = Layer.effect(
  ConnectionService,
  E.gen(function* (_) {
    const context = yield* _(E.context<RpcClient | Dispatcher | RpcConfig>())

    return ConnectionService.of({
      preConnect: flow(preConnect, E.provide(context)),
    })
  }),
)
/* v8 ignore stop */
