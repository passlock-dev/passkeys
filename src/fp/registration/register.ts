import {
  type RegistrationPublicKeyCredential,
  create,
  parseCreationOptionsFromJSON,
} from '@github/webauthn-json/browser-ponyfill'
import { ErrorCode, PasslockError, error } from '@passlock/shared/error'
import { PasslockLogger } from '@passlock/shared/logging'
import { Principal, RegistrationOptions, createParser } from '@passlock/shared/schema'
import { Context, Effect as E, LogLevel as EffectLogLevel, Layer, Logger } from 'effect'

import { Config, DefaultEndpoint, Endpoint, Tenancy, buildConfigLayers } from '../config'
import { eventLoggerLive } from '../logging/eventLogger'
import { NetworkService, networkServiceLive } from '../network/network'
import { isNewUser } from '../user/status'
import { Capabilities, type CommonDependencies, capabilitiesLive } from '../utils'

/* Request */

export type RegistrationRequest = {
  email: string
  firstName: string
  lastName: string
}

/* Services */

export type Create = typeof create
export const Create = Context.Tag<Create>()

/* Helpers */

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
          return error('Unable to create credentials', ErrorCode.InternalBrowserError)
        }
      },
    })

  return Create.pipe(E.flatMap(go))
}

/* Effects */

const fetchOptions = (data: RegistrationRequest) =>
  E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    const { tenancyId, clientId } = yield* _(Tenancy)
    const endpointConfig = yield* _(Endpoint)
    const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
    const optionsURL = `${endpoint}/${tenancyId}/passkey/registration/options`

    yield* _(logger.debug('Making request'))
    const networkService = yield* _(NetworkService)
    const response = yield* _(networkService.postData(optionsURL, clientId, data))

    yield* _(logger.debug('Parsing Passlock registration options'))
    const parse = createParser(RegistrationOptions)
    const optionsJSON = yield* _(parse(response))

    yield* _(logger.debug('Converting Passlock options to CredentialCreationOptions'))
    const options = yield* _(toCreationOptions(optionsJSON))

    const session = optionsJSON.session

    return { options, session }
  })

const verify = (credential: RegistrationPublicKeyCredential, session: string) => {
  return E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    const { tenancyId, clientId } = yield* _(Tenancy)
    const endpointConfig = yield* _(Endpoint)
    const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
    const verificationURL = `${endpoint}/${tenancyId}/passkey/registration/verification`

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

type Dependencies = CommonDependencies | Capabilities | Create

export const register = (
  data: RegistrationRequest,
): E.Effect<Dependencies, PasslockError, Principal> =>
  E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    yield* _(logger.info('Checking if browser supports Passkeys'))
    const capabilities = yield* _(Capabilities)
    yield* _(capabilities.passkeysSupported)

    yield* _(logger.info('Checking if already registered'))
    yield* _(isNewUser(data))

    yield* _(logger.info('Fetching registration options from Passlock'))
    const { options, session } = yield* _(fetchOptions(data))

    yield* _(logger.info('Building new credential'))
    const credential = yield* _(createCredential(options))

    yield* _(logger.info('Storing credential public key in Passlock'))
    const principal = yield* _(verify(credential, session))

    return principal
  })

/* Live */

/* v8 ignore start */
export const registerLive = (request: RegistrationRequest & Config) => {
  const configLayers = buildConfigLayers(request)
  const createLive = Layer.succeed(Create, Create.of(create))

  const layers = Layer.mergeAll(
    createLive,
    networkServiceLive,
    configLayers,
    capabilitiesLive,
    eventLoggerLive,
  )

  const withLayers = E.provide(register(request), layers)
  return withLayers.pipe(Logger.withMinimumLogLevel(EffectLogLevel.Debug))
}
/* v8 ignore stop */
