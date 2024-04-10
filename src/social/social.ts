/**
 * Passkey authentication effects
 */
import {
  type BadRequest,
  type NotSupported
} from '@passlock/shared/dist/error/error.js'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc.js'
import type { VerificationErrors } from '@passlock/shared/dist/rpc/social.js'
import { OIDCReq } from '@passlock/shared/dist/rpc/social.js'
import type {
  Principal
} from '@passlock/shared/dist/schema/schema.js'
import { Context, Effect as E, Layer, flow } from 'effect'

/* Requests */

export type OIDCRequest = { provider: 'google', idToken: string }

/* Errors */

export type AuthenticationErrors = NotSupported | BadRequest | VerificationErrors

/* Service */

export type SocialService = {
  authenticateOIDC: (data: OIDCRequest) => E.Effect<Principal, AuthenticationErrors>
}

export const SocialService = Context.GenericTag<SocialService>(
  '@services/SocialService',
)

/* Effects */

type Dependencies = RpcClient

export const authenticateOIDC = (
  request: OIDCRequest,
): E.Effect<Principal, AuthenticationErrors, Dependencies> => {
  const effect = E.gen(function* (_) {
    yield* _(E.logInfo('Verifying social token'))

    const rpcClient = yield* _(RpcClient)

    const { principal } = yield* _(
      rpcClient.verifyIdToken(new OIDCReq(request))
    )

    return principal
  })

  return effect
}

/* Live */

/* v8 ignore start */
export const SocialServiceLive = Layer.effect(
  SocialService,
  E.gen(function* (_) {
    const context = yield* _(E.context<RpcClient>())

    return SocialService.of({
      authenticateOIDC: flow(authenticateOIDC, E.provide(context)),
    })
  }),
)
/* v8 ignore stop */
