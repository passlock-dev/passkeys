/**
 * Passkey authentication effects
 */
import {
  type BadRequest,
  type NotSupported
} from '@passlock/shared/dist/error/error.js'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc.js'
import { AuthenticateOidcErrors, AuthenticateOidcReq, RegisterOidcErrors, RegisterOidcReq } from '@passlock/shared/dist/rpc/social.js'
import type {
  Principal
} from '@passlock/shared/dist/schema/schema.js'
import { Context, Effect as E, Layer, flow } from 'effect'

/* Requests */

export type OidcRequest = { provider: 'google', idToken: string }

/* Errors */

export type RegistrationErrors = NotSupported | BadRequest | RegisterOidcErrors

export type AuthenticationErrors = NotSupported | BadRequest | AuthenticateOidcErrors

/* Service */

export type SocialService = {
  registerOidc: (data: OidcRequest) => E.Effect<Principal, RegistrationErrors>
  authenticateOidc: (data: OidcRequest) => E.Effect<Principal, AuthenticationErrors>
}

export const SocialService = Context.GenericTag<SocialService>(
  '@services/SocialService',
)

/* Effects */

type Dependencies = RpcClient

export const registerOidc = (
  request: OidcRequest,
): E.Effect<Principal, RegistrationErrors, Dependencies> => {
  return E.gen(function* (_) {
    yield* _(E.logInfo('Registering social account'))

    const rpcClient = yield* _(RpcClient)

    const { principal } = yield* _(
      rpcClient.registerOidc(new RegisterOidcReq(request))
    )

    return principal
  })
}

export const authenticateOidc = (
  request: OidcRequest,
): E.Effect<Principal, AuthenticationErrors, Dependencies> => {
  return E.gen(function* (_) {
    yield* _(E.logInfo('Authenticating with social account'))

    const rpcClient = yield* _(RpcClient)

    const { principal } = yield* _(
      rpcClient.authenticateOidc(new AuthenticateOidcReq(request))
    )

    return principal
  })
}

/* Live */

/* v8 ignore start */
export const SocialServiceLive = Layer.effect(
  SocialService,
  E.gen(function* (_) {
    const context = yield* _(E.context<RpcClient>())

    return SocialService.of({
      registerOidc: flow(registerOidc, E.provide(context)),
      authenticateOidc: flow(authenticateOidc, E.provide(context))
    })
  }),
)
/* v8 ignore stop */
