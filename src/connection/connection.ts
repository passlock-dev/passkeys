/**
 * Hits the rpc endpoint to warm up a lambda
 */
import { PreConnectReq } from '@passlock/shared/dist/rpc/connection'
import { NetworkService, RpcClient, RpcConfig } from '@passlock/shared/dist/rpc/rpc'
import { Context, Effect as E, Layer, flow, pipe } from 'effect'
import { DefaultEndpoint } from '../config'


/* Service */

export type ConnectionService = {
  preConnect: () => E.Effect<void>
}

export const ConnectionService = Context.GenericTag<ConnectionService>('@services/ConnectService')

/* Effects */

const url = pipe(
  RpcConfig, 
  E.map(({ endpoint }) => endpoint ?? DefaultEndpoint),
  E.map(endpoint => `${endpoint}/tenancy/token/token?warm=true`)
)

const hitPrincipal = pipe(
  E.logInfo('Pre-connecting to Principal endpoint'),
  E.zipRight(NetworkService),
  E.zipWith(url, (networkService, url) => () => networkService.get(url)),
  E.flatMap(fn => E.sync(fn)),
  E.asUnit,
  E.catchAll(() => E.unit)
)

const hitRpc = pipe(
  E.logInfo('Pre-connecting to RPC endpoint'),
  E.zipRight(RpcClient),
  E.flatMap(rpcClient => rpcClient.preConnect(new PreConnectReq({}))),
  E.asUnit
)

export const preConnect = () => pipe(
  E.all([hitPrincipal, hitRpc], { concurrency: 2 }),
  E.asUnit
)

/* Live */

/* v8 ignore start */
export const ConnectionServiceLive = Layer.effect(
  ConnectionService,
  E.gen(function* (_) {
    const context = yield* _(E.context<RpcClient | NetworkService | RpcConfig>())

    return ConnectionService.of({
      preConnect: flow(preConnect, E.provide(context)),
    })
  }),
)
/* v8 ignore stop */
