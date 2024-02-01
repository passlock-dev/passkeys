import { get } from '@github/webauthn-json/browser-ponyfill'
import type { PasslockError } from '@passlock/shared/error'
import { PasslockLogger } from '@passlock/shared/logging'
import { VerifyEmailResponse, createParser } from '@passlock/shared/schema'
import { Effect as E, LogLevel as EffectLogLevel, Layer, Logger, pipe } from 'effect'

import { Get, authenticate } from '../authentication/authenticate'
import type { Config } from '../config'
import { DefaultEndpoint, Endpoint, Tenancy, buildConfigLayers } from '../config'
import { eventLoggerLive } from '../logging/eventLogger'
import { NetworkService, networkServiceLive } from '../network/network'
import { StorageService, storageServiceLive } from '../storage/storage'
import type { Capabilities, CommonDependencies } from '../utils'
import { capabilitiesLive } from '../utils'

/* Request */

export type VerifyRequest = {
  code: string
}

export type VerifyResponse = {
  verified: boolean
}

type Dependencies = CommonDependencies | Capabilities | Get | StorageService

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
    const existingToken = storageService.getToken('passkey')

    const tokenE = E.matchEffect(existingToken, {
      onSuccess: token => E.succeed(token),
      onFailure: () =>
        // No token, need to authenticate the user
        pipe(
          authenticate({ userVerification: 'preferred' }),
          E.map(principal => ({
            token: principal.token,
            authType: principal.authStatement.authType,
            expiresAt: principal.expiresAt.getTime(),
          })),
        ),
    })

    const token = yield* _(tokenE)
    storageService.clearToken('passkey')

    return token
  })

export const verifyEmail = (
  verificationRequest: VerifyRequest,
): E.Effect<Dependencies, PasslockError, VerifyResponse> =>
  E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)
    const { tenancyId, clientId } = yield* _(Tenancy)

    // Re-authenticate the user if required
    const { token } = yield* _(getToken())

    const endpointConfig = yield* _(Endpoint)
    const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
    const verifyURL = `${endpoint}/${tenancyId}/email/verify`

    yield* _(logger.debug('Making request'))
    const networkService = yield* _(NetworkService)
    const request = { ...verificationRequest, token }
    const response = yield* _(networkService.postData(verifyURL, clientId, request))

    yield* _(logger.debug('Parsing Passlock verification response'))
    const parse = createParser(VerifyEmailResponse)
    const { verified } = yield* _(parse(response))

    return { verified }
  })

/* Live */

/* v8 ignore start */
export const verifyEmailLive = (request: VerifyRequest & Config) => {
  const getLive = Layer.succeed(Get, Get.of(get))
  const configLayers = buildConfigLayers(request)

  const layers = Layer.mergeAll(
    configLayers,
    getLive,
    networkServiceLive,
    capabilitiesLive,
    eventLoggerLive,
    storageServiceLive,
  )

  const withLayers = E.provide(verifyEmail(request), layers)
  return withLayers.pipe(Logger.withMinimumLogLevel(EffectLogLevel.Debug))
}
/* v8 ignore stop */
