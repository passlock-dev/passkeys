/**
 * User & passkey registration effects
 */
import {
  type CredentialCreationOptionsJSON,
  parseCreationOptionsFromJSON,
} from '@github/webauthn-json/browser-ponyfill'
import type { NotSupported } from '@passlock/shared/dist/error/error'
import { Duplicate, InternalBrowserError } from '@passlock/shared/dist/error/error'
import type { OptionsErrors, VerificationErrors } from '@passlock/shared/dist/rpc/registration'
import { OptionsReq, VerificationReq } from '@passlock/shared/dist/rpc/registration'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc'
import type {
  Principal,
  RegistrationCredential,
  UserVerification,
  VerifyEmail,
} from '@passlock/shared/dist/schema/schema'
import { Context, Effect as E, Layer, flow, pipe } from 'effect'
import { Capabilities } from '../capabilities/capabilities'
import { StorageService } from '../storage/storage'
import { UserService } from '../user/user'

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

export type CreateCredential = (
  options: CredentialCreationOptions,
) => E.Effect<RegistrationCredential, InternalBrowserError | Duplicate>
export const CreateCredential = Context.GenericTag<CreateCredential>('@services/Create')

/* Errors */

export type RegistrationErrors = NotSupported | OptionsErrors | VerificationErrors

/* Service */

export type RegistrationService = {
  registerPasskey: (request: RegistrationRequest) => E.Effect<Principal, RegistrationErrors>
}

export const RegistrationService = Context.GenericTag<RegistrationService>(
  '@services/RegistrationService',
)

/* Utilities */

const fetchOptions = (req: OptionsReq) => {
  return E.gen(function* (_) {
    yield* _(E.logDebug('Making request'))

    const rpcClient = yield* _(RpcClient)
    const { publicKey, session } = yield* _(rpcClient.getRegistrationOptions(req))

    yield* _(E.logDebug('Converting Passlock options to CredentialCreationOptions'))
    const options = yield* _(toCreationOptions({ publicKey }))

    return { options, session }
  })
}

const toCreationOptions = (jsonOptions: CredentialCreationOptionsJSON) => {
  return pipe(
    E.try(() => parseCreationOptionsFromJSON(jsonOptions)),
    E.mapError(
      error =>
        new InternalBrowserError({
          message: 'Browser was unable to create credential creation options',
          detail: String(error.error),
        }),
    ),
  )
}

const verifyCredential = (req: VerificationReq) => {
  return E.gen(function* (_) {
    yield* _(E.logDebug('Making request'))

    const rpcClient = yield* _(RpcClient)
    const { principal } = yield* _(rpcClient.verifyRegistrationCredential(req))

    return principal
  })
}

const isNewUser = (email: string) => {
  return pipe(
    UserService,
    E.flatMap(service => service.isExistingUser({ email })),
    E.catchTag('BadRequest', () => E.unit),
    E.flatMap(isExistingUser => {
      return isExistingUser
        ? new Duplicate({ message: 'User already has a passkey registered' })
        : E.unit
    }),
  )
}

/* Effects */

type Dependencies = Capabilities | CreateCredential | StorageService | UserService | RpcClient

export const registerPasskey = (
  request: RegistrationRequest,
): E.Effect<Principal, RegistrationErrors, Dependencies> => {
  const effect = E.gen(function* (_) {
    yield* _(E.logInfo('Checking if browser supports Passkeys'))
    const capabilities = yield* _(Capabilities)
    yield* _(capabilities.passkeySupport)

    yield* _(E.logInfo('Checking if already registered'))
    yield* _(isNewUser(request.email))

    yield* _(E.logInfo('Fetching registration options from Passlock'))
    const { options, session } = yield* _(fetchOptions(new OptionsReq(request)))

    yield* _(E.logInfo('Building new credential'))
    const createCredential = yield* _(CreateCredential)
    const credential = yield* _(createCredential(options))

    yield* _(E.logInfo('Storing credential public key in Passlock'))
    const verificationRequest = new VerificationReq({
      ...request,
      credential,
      session,
    })

    const principal = yield* _(verifyCredential(verificationRequest))

    const storageService = yield* _(StorageService)
    yield* _(storageService.storeToken(principal))
    yield* _(E.logDebug('Storing token in local storage'))

    yield* _(E.logDebug('Defering local token deletion'))
    const delayedClearTokenE = pipe(
      storageService.clearExpiredToken('passkey'),
      E.delay('6 minutes'),
      E.fork,
    )
    yield* _(delayedClearTokenE)

    return principal
  })

  return E.catchTag(effect, 'InternalBrowserError', e => E.die(e))
}

/* Live */

/* v8 ignore start */
export const RegistrationServiceLive = Layer.effect(
  RegistrationService,
  E.gen(function* (_) {
    const context = yield* _(
      E.context<CreateCredential | RpcClient | Capabilities | StorageService | UserService>(),
    )

    return RegistrationService.of({
      registerPasskey: flow(registerPasskey, E.provide(context)),
    })
  }),
)
/* v8 ignore stop */
