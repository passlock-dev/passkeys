/**
 * Passkey authentication effects
 */
import type { AuthenticationPublicKeyCredential, get } from '@github/webauthn-json/browser-ponyfill'
import { parseRequestOptionsFromJSON } from '@github/webauthn-json/browser-ponyfill'
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
export const Get = Context.GenericTag<Get>('@services/Get')

/* Service */

export type AuthenticationService = {
  preConnect: E.Effect<void, PasslockError, CommonDependencies>

  authenticatePasskey: (
    data: AuthenticationRequest,
  ) => E.Effect<Principal, PasslockError, CommonDependencies>
}

export const AuthenticationService = Context.GenericTag<AuthenticationService>(
  '@services/AuthenticationService',
)

/* Utilities */

const toRequestOptions = (options: AuthenticationOptions) => {
  return E.try({
    try: () => parseRequestOptionsFromJSON(options),
    catch: () =>
      error('Unable to create credential request options', ErrorCode.InternalServerError),
  })
}

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

export const fetchOptions = (data: AuthenticationRequest) => {
  return E.gen(function* (_) {
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

    return optionsJSON
  })
}

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

/**
 * Hit the options & verification urls
 * to warmup any lambdas before the real requests
 */
export const preConnect = E.gen(function* (_) {
  const logger = yield* _(PasslockLogger)
  const { tenancyId, clientId } = yield* _(Tenancy)
  yield* _(logger.debug('Hitting options & verification endpoints'))

  const endpointConfig = yield* _(Endpoint)
  const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
  const optionsUrl = `${endpoint}/${tenancyId}/passkey/authentication/options?warm=true`
  const verifyUrl = `${endpoint}/${tenancyId}/passkey/authentication/verification?warm=true`

  yield* _(logger.debug('Making requests'))
  const networkService = yield* _(NetworkService)
  const optionsResponseE = networkService.postData({ url: optionsUrl, clientId, data: {} })
  const verifyResponseE = networkService.postData({ url: verifyUrl, clientId, data: {} })

  const all = E.all([optionsResponseE, verifyResponseE], { concurrency: 'unbounded' })
  return yield* _(all)
})

export const authenticatePasskey = (
  data: AuthenticationRequest,
): E.Effect<Principal, PasslockError, Dependencies> => {
  return E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    yield* _(logger.info('Checking if browser supports Passkeys'))
    const capabilities = yield* _(Capabilities)
    yield* _(capabilities.passkeysSupported)

    yield* _(logger.info('Fetching authentication options from Passlock'))
    const optionsJSON = yield* _(fetchOptions(data))

    yield* _(logger.debug('Converting Passlock options to CredentialRequestOptions'))
    const options = yield* _(toRequestOptions(optionsJSON))

    const session = optionsJSON.session

    yield* _(logger.info('Looking up credential'))
    const credential = yield* _(getCredential(options))

    yield* _(logger.info('Verifying credential with Passlock'))
    const principal = yield* _(verify(credential, session))

    const storageService = yield* _(StorageService)
    yield* _(storageService.storeToken(principal))
    yield* _(logger.debug('Stored token in local storage'))

    yield* _(logger.debug('Defering local token deletion'))
    const delayedClearTokenE = pipe(
      storageService.clearExpiredToken('passkey'),
      E.delay('6 minutes'),
      E.fork,
    )
    yield* _(delayedClearTokenE)

    return principal
  })
}

/* Live */

/* v8 ignore start */
export const AuthenticateServiceLive = Layer.effect(
  AuthenticationService,
  E.gen(function* (_) {
    const context = yield* _(
      E.context<Get | NetworkService | Capabilities | PasslockLogger | StorageService>(),
    )

    return AuthenticationService.of({
      preConnect: pipe(preConnect, E.provide(context)),
      authenticatePasskey: flow(authenticatePasskey, E.provide(context)),
    })
  }),
)
/* v8 ignore stop */
