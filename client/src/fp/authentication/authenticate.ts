import {
  type AuthenticationPublicKeyCredential,
  get,
  parseRequestOptionsFromJSON,
} from '@github/webauthn-json/browser-ponyfill'
import { ErrorCode, PasslockError } from '@passlock/shared/src/error'
import {
  AuthenticationOptions,
  createParser,
  Principal,
} from '@passlock/shared/src/schema'
import {
  Context,
  Effect as E,
  LogLevel as EffectLogLevel,
  Layer,
  Logger,
  pipe,
} from 'effect'

import {
  buildConfigLayers,
  Config,
  DefaultEndpoint,
  Endpoint,
  Tenancy,
} from '../config'
import { loggerLive, PasslockLogger } from '../logging/logging'
import { NetworkService, networkServiceLive } from '../network/network'
import { Capabilities, capabilitiesLive } from '../utils'

/* Requests */

export type AuthenticationRequest = { userVerification: boolean }

/* Services */

export type Get = typeof get
export const Get = Context.Tag<Get>()

/* Helpers */

const toRequestOptions = (options: AuthenticationOptions) =>
  E.try({
    try: () => parseRequestOptionsFromJSON(options),
    catch: () =>
      new PasslockError({
        message: 'Unable to create credential request options',
        code: ErrorCode.InternalServerError,
      }),
  })

const getCredential = (
  options: CredentialRequestOptions,
  signal?: AbortSignal,
) => {
  const go = (get: Get) =>
    E.tryPromise({
      try: () => get({ ...options, signal }),
      catch: () => {
        return new PasslockError({
          message: 'Unable to get credentials',
          code: ErrorCode.InternalBrowserError,
        })
      },
    })

  return Get.pipe(E.flatMap(go))
}

/* Effects */

const fetchOptions = (data: AuthenticationRequest) =>
  E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    const { tenancyId, clientId } = yield* _(Tenancy)
    const endpointConfig = yield* _(Endpoint)
    const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
    const optionsURL = `${endpoint}/${tenancyId}/passkey/authentication/options`

    yield* _(logger.debug('Making request'))
    const networkService = yield* _(NetworkService)
    const response = yield* _(
      networkService.postData(optionsURL, clientId, data),
    )

    yield* _(logger.debug('Parsing Passlock authentication options'))
    const parse = createParser(AuthenticationOptions)
    const optionsJSON = yield* _(parse(response))

    yield* _(
      logger.debug('Converting Passlock options to CredentialRequestOptions'),
    )
    const options = yield* _(toRequestOptions(optionsJSON))

    const session = optionsJSON.session

    return { options, session }
  })

const verify = (
  credential: AuthenticationPublicKeyCredential,
  session: string,
) => {
  createParser(Principal)

  return E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    const { tenancyId, clientId } = yield* _(Tenancy)
    const endpointConfig = yield* _(Endpoint)
    const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
    const verificationURL = `${endpoint}/${tenancyId}/passkey/authentication/verification`

    yield* _(logger.debug('Making request'))
    const networkService = yield* _(NetworkService)
    const response = yield* _(
      networkService.postData(verificationURL, clientId, {
        credential,
        session,
      }),
    )

    yield* _(logger.debug('Parsing Principal response'))
    const parse = createParser(Principal)
    const principal = yield* _(parse(response))

    return principal
  })
}

export const authenticate = (data: AuthenticationRequest) =>
  E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    yield* _(logger.info('Checking if browser supports Passkeys'))
    const capabilities = yield* _(Capabilities)
    yield* _(capabilities.passkeysSupported)

    yield* _(logger.info('Fetching authentication options from Passlock'))
    const { options, session } = yield* _(fetchOptions(data))

    yield* _(logger.info('Looking up credential'))
    const credential = yield* _(getCredential(options))

    yield* _(logger.info('Verifying credential with Passlock'))
    const principal = yield* _(verify(credential, session))

    return principal
  })

/* Live */

/**
 * Authenticate user
 *
 * @param params Some params
 * @returns
 */
/* v8 ignore start */
export const authenticateLive = (request: AuthenticationRequest & Config) => {
  const getLive = Layer.succeed(Get, Get.of(get))
  const configLayers = buildConfigLayers(request)

  const layers = Layer.mergeAll(
    configLayers,
    getLive,
    networkServiceLive,
    capabilitiesLive,
    loggerLive,
  )

  const withLayers = E.provide(authenticate(request), layers)
  return pipe(withLayers, Logger.withMinimumLogLevel(EffectLogLevel.Debug))
}
/* v8 ignore stop */
