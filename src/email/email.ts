/**
 * Email verification effects
 */
import { ErrorCode, type PasslockError, error } from '@passlock/shared/error'
import { PasslockLogger } from '@passlock/shared/logging'
import { VerifyEmailResponse, createParser } from '@passlock/shared/schema'
import { Context, Effect as E, Layer, Option as O, flow, pipe } from 'effect'

import { AuthenticationService } from '../authentication/authenticate'
import { DefaultEndpoint, Endpoint, Tenancy } from '../config'
import { NetworkService } from '../network/network'
import { StorageService } from '../storage/storage'
import type { CommonDependencies } from '../utils'

/* Requests */

export type VerifyRequest = {
  code: string
}

/* Service */

export type EmailService = {
  verifyEmailCode: (request: VerifyRequest) => E.Effect<boolean, PasslockError, CommonDependencies>
  verifyEmailLink: () => E.Effect<boolean, PasslockError, CommonDependencies>
}

export const EmailService = Context.GenericTag<EmailService>('@services/EmailService')

/* Utils */

export type Dependencies =
  | CommonDependencies
  | StorageService
  | AuthenticationService
  | PasslockLogger
  | NetworkService

/**
 * Check for existing token in sessionStorage,
 * otherwise force passkey re-authentication
 * @returns
 */
const getToken = () => {
  return E.gen(function* (_) {
    // Check for existing token
    const storageService = yield* _(StorageService)
    const existingTokenE = storageService.getToken('passkey')
    const authenticationService = yield* _(AuthenticationService)

    const tokenE = E.matchEffect(existingTokenE, {
      onSuccess: token => E.succeed(token),
      onFailure: () =>
        // No token, need to authenticate the user
        pipe(
          authenticationService.authenticatePasskey({ userVerification: 'preferred' }),
          E.map(principal => ({
            token: principal.token,
            authType: principal.authStatement.authType,
            expiresAt: principal.expiresAt.getTime(),
          })),
        ),
    })

    const token = yield* _(tokenE)
    yield* _(storageService.clearToken('passkey'))

    return token
  })
}

/**
 * Look for ?code=<code> in the url
 * @returns
 */
export const extractCodeFromHref = () => {
  return pipe(
    O.fromNullable(globalThis.window),
    O.map(window => window.location.search),
    O.map(search => new URLSearchParams(search)),
    O.flatMap(search => O.fromNullable(search.get('code'))),
  )
}

/* Effects */

/**
 * Verify the mailbox using the given code
 * @param verificationRequest
 * @returns
 */
export const verifyEmail = (
  verificationRequest: VerifyRequest,
): E.Effect<boolean, PasslockError, Dependencies> => {
  return E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)
    const { tenancyId, clientId } = yield* _(Tenancy)

    // Re-authenticate the user if required
    const { token } = yield* _(getToken())

    const endpointConfig = yield* _(Endpoint)
    const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
    const url = `${endpoint}/${tenancyId}/email/verify`

    yield* _(logger.debug('Making request'))
    const networkService = yield* _(NetworkService)
    const data = { ...verificationRequest, token }
    const response = yield* _(networkService.postData({ url, clientId, data }))

    yield* _(logger.debug('Parsing Passlock verification response'))
    const parse = createParser(VerifyEmailResponse)
    const { verified } = yield* _(parse(response))

    return verified
  })
}
/**
 * Look for a code in the current url and verify it
 * @returns
 */
export const verifyEmailLink = () =>
  pipe(
    extractCodeFromHref(),
    E.mapError(() =>
      error('Expected ?code=xxx in window.location', ErrorCode.InternalBrowserError),
    ),
    E.flatMap(code => verifyEmail({ code })),
  )

/* Live */

/* v8 ignore start */
export const EmailServiceLive = Layer.effect(
  EmailService,
  E.gen(function* (_) {
    const context = yield* _(
      E.context<NetworkService | AuthenticationService | PasslockLogger | StorageService>(),
    )
    return EmailService.of({
      verifyEmailCode: flow(verifyEmail, E.provide(context)),
      verifyEmailLink: flow(verifyEmailLink, E.provide(context)),
    })
  }),
)
/* v8 ignore stop */
