/**
 * User & passkey registration effects
 */
import type {
  RegistrationPublicKeyCredential,
  create,
} from '@github/webauthn-json/browser-ponyfill'
import { parseCreationOptionsFromJSON } from '@github/webauthn-json/browser-ponyfill'
import type { PasslockError } from '@passlock/shared/error'
import { ErrorCode, error } from '@passlock/shared/error'
import { PasslockLogger } from '@passlock/shared/logging'
import type { UserVerification, VerifyEmail } from '@passlock/shared/schema'
import { Principal, RegistrationOptions, createParser } from '@passlock/shared/schema'
import { Context, Effect as E, Layer, flow, pipe } from 'effect'

import { DefaultEndpoint, Endpoint, Tenancy } from '../config'
import { NetworkService } from '../network/network'
import { StorageService } from '../storage/storage'
import { isNewUser } from '../user/user'
import { Capabilities, type CommonDependencies } from '../utils'

/* Requests */

export type RegistrationRequest = {
  email: string
  firstName: string
  lastName: string
  userVerification?: UserVerification
  verifyEmail?: VerifyEmail
  redirectUrl?: string
}

/* Dependencies */

export type Create = typeof create
export const Create = Context.GenericTag<Create>('@services/Create')

/* Service */

export type RegistrationService = {
  preConnect: E.Effect<void, PasslockError, CommonDependencies>
  registerPasskey: (
    request: RegistrationRequest,
  ) => E.Effect<Principal, PasslockError, CommonDependencies>
}

export const RegistrationService = Context.GenericTag<RegistrationService>(
  '@services/RegistrationService',
)

/* Utilities */

const toCreationOptions = (options: RegistrationOptions) =>
  E.try({
    try: () => parseCreationOptionsFromJSON(options),
    catch: () =>
      error('Unable to create credential creation options', ErrorCode.InternalServerError),
  })

const createCredential = (options: CredentialCreationOptions, signal?: AbortSignal) => {
  const go = (create: Create) =>
    E.tryPromise({
      try: () => create({ ...options, signal }),
      catch: e => {
        if (e instanceof Error && e.message.includes('excludeCredentials')) {
          return error(
            'Passkey already registered on this device or cloud account',
            ErrorCode.DuplicatePasskey,
          )
        } else {
          return error('Unable to create credential', ErrorCode.InternalBrowserError)
        }
      },
    })

  return Create.pipe(E.flatMap(go))
}

const fetchOptions = (data: RegistrationRequest) =>
  E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    const { tenancyId, clientId } = yield* _(Tenancy)
    const endpointConfig = yield* _(Endpoint)
    const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
    const url = `${endpoint}/${tenancyId}/passkey/registration/options`

    yield* _(logger.debug('Making request'))
    const networkService = yield* _(NetworkService)
    const response = yield* _(networkService.postData({ url, clientId, data }))

    yield* _(logger.debug('Parsing Passlock registration options'))
    const parse = createParser(RegistrationOptions)
    const optionsJSON = yield* _(parse(response))

    yield* _(logger.debug('Converting Passlock options to CredentialCreationOptions'))
    const options = yield* _(toCreationOptions(optionsJSON))

    const session = optionsJSON.session

    return { options, session }
  })

type VerificationData = {
  credential: RegistrationPublicKeyCredential
  session: string
  verifyEmail?: VerifyEmail
  redirectUrl?: string
}

const verify = (data: VerificationData) => {
  return E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    const { tenancyId, clientId } = yield* _(Tenancy)
    const endpointConfig = yield* _(Endpoint)
    const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
    const url = `${endpoint}/${tenancyId}/passkey/registration/verification`

    yield* _(logger.debug('Making request'))
    const networkService = yield* _(NetworkService)
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
  | Create
  | StorageService
  | NetworkService
  | PasslockLogger

export const preConnect = E.gen(function* (_) {
  const logger = yield* _(PasslockLogger)
  const { tenancyId, clientId } = yield* _(Tenancy)
  yield* _(logger.debug('Hitting options & verification endpoints'))

  const endpointConfig = yield* _(Endpoint)
  const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
  const optionsUrl = `${endpoint}/${tenancyId}/passkey/registration/options?warm=true`
  const verifyUrl = `${endpoint}/${tenancyId}/passkey/registration/verification?warm=true`

  yield* _(logger.debug('Making requests'))
  const networkService = yield* _(NetworkService)
  const optionsResponseE = networkService.postData({ url: optionsUrl, clientId, data: {} })
  const verifyResponseE = networkService.postData({ url: verifyUrl, clientId, data: {} })

  const all = E.all([optionsResponseE, verifyResponseE], { concurrency: 'unbounded' })
  return yield* _(all)
})

export const registerPasskey = (
  registrationRequest: RegistrationRequest,
): E.Effect<Principal, PasslockError, Dependencies> =>
  E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    yield* _(logger.info('Checking if browser supports Passkeys'))
    const capabilities = yield* _(Capabilities)
    yield* _(capabilities.passkeysSupported)

    yield* _(logger.info('Checking if already registered'))
    yield* _(isNewUser(registrationRequest))

    yield* _(logger.info('Fetching registration options from Passlock'))
    const { options, session } = yield* _(fetchOptions(registrationRequest))

    yield* _(logger.info('Building new credential'))
    const credential = yield* _(createCredential(options))

    yield* _(logger.info('Storing credential public key in Passlock'))
    const verificationData = {
      credential,
      session,
      verifyEmail: registrationRequest.verifyEmail,
      redirectUrl: registrationRequest.redirectUrl,
    }
    const principal = yield* _(verify(verificationData))

    const storageService = yield* _(StorageService)
    yield* _(storageService.storeToken(principal))
    yield* _(logger.debug('Storing token in local storage'))

    yield* _(logger.debug('Defering local token deletion'))
    const delayedClearTokenE = pipe(
      storageService.clearExpiredToken('passkey'),
      E.delay('6 minutes'),
      E.fork,
    )
    yield* _(delayedClearTokenE)

    return principal
  })

/* Live */

/* v8 ignore start */
export const RegistrationServiceLive = Layer.effect(
  RegistrationService,
  E.gen(function* (_) {
    const context = yield* _(
      E.context<Create | NetworkService | Capabilities | PasslockLogger | StorageService>(),
    )

    return RegistrationService.of({
      preConnect: pipe(preConnect, E.provide(context)),
      registerPasskey: flow(registerPasskey, E.provide(context)),
    })
  }),
)
/* v8 ignore stop */
