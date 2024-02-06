import type { PasslockError } from '@passlock/shared/error'
import { PasslockLogger } from '@passlock/shared/logging'
import { VerifyEmailResponse, createParser } from '@passlock/shared/schema'
import { Context, Effect as E, Layer, flow, pipe } from 'effect'

import { AuthenticationService } from '../authentication/authenticate'
import { DefaultEndpoint, Endpoint, Tenancy } from '../config'
import { NetworkService } from '../network/network'
import { StorageService } from '../storage/storage'
import type { CommonDependencies } from '../utils'

/* Request */

export type VerifyRequest = {
  code: string
}

/* Service */

export type EmailService = {
  verifyEmail: (request: VerifyRequest) => E.Effect<CommonDependencies, PasslockError, boolean>
}

export const EmailService = Context.Tag<EmailService>()

/* Effects */

export type Dependencies =
  | CommonDependencies
  | StorageService
  | AuthenticationService
  | PasslockLogger
  | NetworkService

/**
 * Check for existing token in sessionStorage, otherwise force
 * passkey re-authentication
 *
 * @returns
 */
const getToken = () =>
  E.gen(function* (_) {
    // Check for existing token
    const storageService = yield* _(StorageService)
    const existingTokenE = storageService.getToken('passkey')
    const authenticationService = yield* _(AuthenticationService)

    const tokenE = E.matchEffect(existingTokenE, {
      onSuccess: token => E.succeed(token),
      onFailure: () =>
        // No token, need to authenticate the user
        pipe(
          authenticationService.authenticate({ userVerification: 'preferred' }),
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

export const verifyEmail = (
  verificationRequest: VerifyRequest,
): E.Effect<Dependencies, PasslockError, boolean> =>
  E.gen(function* (_) {
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

/* Live */
/* v8 ignore start */
export const EmailServiceLive = Layer.effect(
  EmailService,
  E.gen(function* (_) {
    const network = yield* _(NetworkService)
    const authentication = yield* _(AuthenticationService)
    const logger = yield* _(PasslockLogger)
    const storage = yield* _(StorageService)
    return EmailService.of({
      verifyEmail: flow(
        verifyEmail,
        E.provideService(AuthenticationService, authentication),
        E.provideService(PasslockLogger, logger),
        E.provideService(StorageService, storage),
        E.provideService(NetworkService, network),
      ),
    })
  }),
)
/* v8 ignore stop */
