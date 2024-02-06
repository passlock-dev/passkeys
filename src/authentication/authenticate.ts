import { parseRequestOptionsFromJSON } from '@github/webauthn-json/browser-ponyfill'
import type { AuthenticationPublicKeyCredential, get } from '@github/webauthn-json/browser-ponyfill'
import type { PasslockError } from '@passlock/shared/error'
import { ErrorCode, error } from '@passlock/shared/error'
import { PasslockLogger } from '@passlock/shared/logging'
import type { UserVerification } from '@passlock/shared/schema'
import { AuthenticationOptions, Principal, createParser } from '@passlock/shared/schema'
import { Context, Effect as E, Layer, flow, pipe } from 'effect'

import { DefaultEndpoint, Endpoint, Tenancy } from '../config'
import { NetworkService } from '../network/network'
import { StorageService } from '../storage/storage'
import { Capabilities, type CommonDependencies } from '../utils'

/* Requests */

export type AuthenticationRequest = { userVerification?: UserVerification }

/* Dependencies */

export type Get = typeof get
export const Get = Context.Tag<Get>()

/* Services */

export type AuthenticationService = {
  authenticate: (
    data: AuthenticationRequest,
  ) => E.Effect<CommonDependencies, PasslockError, Principal>
}

export const AuthenticationService = Context.Tag<AuthenticationService>()

/* Utilities */

const toRequestOptions = (options: AuthenticationOptions) =>
  E.try({
    try: () => parseRequestOptionsFromJSON(options),
    catch: () =>
      error('Unable to create credential request options', ErrorCode.InternalServerError),
  })

const getCredential = (options: CredentialRequestOptions, signal?: AbortSignal) => {
  const go = (get: Get) =>
    E.tryPromise({
      try: () => get({ ...options, signal }),
      catch: e => {
        return error('Unable to get credentials', ErrorCode.InternalBrowserError, e)
      },
    })

  return Get.pipe(E.flatMap(go))
}

const fetchOptions = (data: AuthenticationRequest) =>
  E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    const { tenancyId, clientId } = yield* _(Tenancy)
    const endpointConfig = yield* _(Endpoint)
    const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
    const url = `${endpoint}/${tenancyId}/passkey/authentication/options`

    yield* _(logger.debug('Making request'))
    const networkService = yield* _(NetworkService)
    const response = yield* _(networkService.postData({ url, clientId, data }))

    yield* _(logger.debug('Parsing Passlock authentication options'))
    const parse = createParser(AuthenticationOptions)
    const optionsJSON = yield* _(parse(response))

    yield* _(logger.debug('Converting Passlock options to CredentialRequestOptions'))
    const options = yield* _(toRequestOptions(optionsJSON))

    const session = optionsJSON.session

    return { options, session }
  })

const verify = (credential: AuthenticationPublicKeyCredential, session: string) => {
  return E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    const { tenancyId, clientId } = yield* _(Tenancy)
    const endpointConfig = yield* _(Endpoint)
    const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
    const url = `${endpoint}/${tenancyId}/passkey/authentication/verification`

    yield* _(logger.debug('Making request'))
    const networkService = yield* _(NetworkService)
    const data = { credential, session }

    const response = yield* _(networkService.postData({ url, clientId, data }))

    yield* _(logger.debug('Parsing Principal response'))
    const parse = createParser(Principal)
    const principal = yield* _(parse(response))

    return principal
  })
}

/* Effects */

type Dependencies =
  | CommonDependencies
  | Capabilities
  | Get
  | StorageService
  | NetworkService
  | PasslockLogger

export const authenticate = (
  data: AuthenticationRequest,
): E.Effect<Dependencies, PasslockError, Principal> =>
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

    const storageService = yield* _(StorageService)
    yield* _(storageService.storeToken(principal))
    yield* _(logger.debug('Stored token in local storage'))

    yield* _(logger.debug('Defering local token deletion'))
    yield* _(pipe(storageService.clearExpiredToken('passkey', true), E.fork))

    return principal
  })

/* Live */

/* v8 ignore start */
export const AuthenticateServiceLive = Layer.effect(
  AuthenticationService,
  E.gen(function* (_) {
    const get = yield* _(Get)
    const network = yield* _(NetworkService)
    const capabilities = yield* _(Capabilities)
    const logger = yield* _(PasslockLogger)
    const storage = yield* _(StorageService)
    return AuthenticationService.of({
      authenticate: flow(
        authenticate,
        E.provideService(Get, get),
        E.provideService(Capabilities, capabilities),
        E.provideService(PasslockLogger, logger),
        E.provideService(StorageService, storage),
        E.provideService(NetworkService, network),
      ),
    })
  }),
)
/* v8 ignore stop */
