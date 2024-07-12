/**
 * Passkey authentication effects
 */
import {
  type BadRequest,
  type NotSupported
} from '@passlock/shared/dist/error/error.js'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc.js'
import * as Shared from '@passlock/shared/dist/rpc/social.js'
import type {
  Principal
} from '@passlock/shared/dist/schema/schema.js'
import { Context, Effect as E, Layer, Option as O, flow } from 'effect'

/* Requests */

export type Provider = 'apple' | 'google'

export type RegisterOidcReq = {
  provider: Provider
  idToken: string
  nonce: string
  givenName?: string
  familyName?: string
}

export type AuthenticateOidcReq = {
  provider: Provider
  idToken: string
  nonce: string
}

/* Errors */

export type RegistrationErrors = NotSupported | BadRequest | Shared.RegisterOidcErrors

export type AuthenticationErrors = NotSupported | BadRequest | Shared.AuthOidcErrors

/* Service */

export type SocialService = {
  registerOidc: (data: RegisterOidcReq) => E.Effect<Principal, RegistrationErrors>
  authenticateOidc: (data: AuthenticateOidcReq) => E.Effect<Principal, AuthenticationErrors>
}

export const SocialService = Context.GenericTag<SocialService>(
  '@services/SocialService',
)

/* Effects */

type Dependencies = RpcClient

export const registerOidc = (
  request: RegisterOidcReq,
): E.Effect<Principal, RegistrationErrors, Dependencies> => {
  return E.gen(function* (_) {
    yield* _(E.logInfo('Registering social account'))

    const rpcClient = yield* _(RpcClient)

    const rpcRequest = new Shared.RegisterOidcReq({
      ...request,
      givenName: O.fromNullable(request.givenName),
      familyName: O.fromNullable(request.familyName),
    })

    const { principal } = yield* _(
      rpcClient.registerOidc(rpcRequest)
    )

    return principal
  })
}

export const authenticateOidc = (
  request: AuthenticateOidcReq,
): E.Effect<Principal, AuthenticationErrors, Dependencies> => {
  return E.gen(function* (_) {
    yield* _(E.logInfo('Authenticating with social account'))

    const rpcClient = yield* _(RpcClient)
    const rpcRequest = new Shared.AuthOidcReq(request)

    const { principal } = yield* _(
      rpcClient.authenticateOidc(rpcRequest)
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
