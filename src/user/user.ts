/**
 * Check for an existing user
 */
import type { BadRequest } from '@passlock/shared/dist/error/error'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc'
import { IsExistingUserReq } from '@passlock/shared/dist/rpc/user'
import { Context, Effect as E, Layer, flow } from 'effect'


/* Requests */

export type Email = { email: string }

/* Service */

export type UserService = {
  isExistingUser: (email: Email) => E.Effect<boolean, BadRequest>
}

export const UserService = Context.GenericTag<UserService>('@services/UserService')

/* Effects */

type Dependencies = RpcClient

export const isExistingUser = (request: Email): E.Effect<boolean, BadRequest, Dependencies> => {
  return E.gen(function* (_) {
    yield* _(E.logInfo('Checking registration status'))
    const rpcClient = yield* _(RpcClient)

    yield* _(E.logDebug('Making RPC request'))
    const { existingUser } = yield* _(rpcClient.isExistingUser(new IsExistingUserReq(request)))

    return existingUser
  })
}

/* Live */

/* v8 ignore start */
export const UserServiceLive = Layer.effect(
  UserService,
  E.gen(function* (_) {
    const context = yield* _(E.context<RpcClient>())
    return UserService.of({
      isExistingUser: flow(isExistingUser, E.provide(context)),
    })
  }),
)
/* v8 ignore stop */
