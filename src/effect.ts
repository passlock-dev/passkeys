import { create, get as getCredential } from '@github/webauthn-json/browser-ponyfill'

export type {
  BadRequest,
  Disabled,
  Duplicate,
  Forbidden,
  InternalBrowserError,
  NotFound,
  NotSupported,
  Unauthorized,
} from '@passlock/shared/dist/error/error'

export type { Principal } from '@passlock/shared/dist/schema/schema'

import {
  type BadRequest,
  type Disabled,
  Duplicate,
  type Forbidden,
  InternalBrowserError,
  type NotFound,
  type NotSupported,
  type Unauthorized,
} from '@passlock/shared/dist/error/error'

import {
  DispatcherLive,
  RetrySchedule,
  RpcClientLive,
  RpcConfig,
} from '@passlock/shared/dist/rpc/rpc'

import type { Principal } from '@passlock/shared/dist/schema/schema'
import { Context, Effect as E, Layer as L, Layer, Schedule, pipe } from 'effect'
import type { NoSuchElementException } from 'effect/Cause'

import {
  AuthenticateServiceLive,
  type AuthenticationRequest,
  AuthenticationService,
  GetCredential,
} from './authentication/authenticate'

import { capabilitiesLive } from './capabilities/capabilities'
import { ConnectionService, ConnectionServiceLive } from './connection/connection'
import { EmailService, EmailServiceLive, LocationSearch, type VerifyRequest } from './email/email'

import {
  CreateCredential,
  type RegistrationRequest,
  RegistrationService,
  RegistrationServiceLive,
} from './registration/register'

import {
  type AuthType,
  Storage,
  StorageService,
  StorageServiceLive,
  type StoredToken,
} from './storage/storage'

import { type Email, UserService, UserServiceLive } from './user/user'

/* Layers */

const createLive = L.succeed(
  CreateCredential,
  CreateCredential.of((options: CredentialCreationOptions) =>
    pipe(
      E.tryPromise({
        try: () => create(options),
        catch: e => {
          if (e instanceof Error && e.message.includes('excludeCredentials')) {
            return new Duplicate({
              message: 'Passkey already registered on this device or cloud account',
            })
          } else {
            return new InternalBrowserError({
              message: 'Unable to create credential',
              detail: String(e),
            })
          }
        },
      }),
      E.map(credential => credential.toJSON()),
    ),
  ),
)

const getLive = L.succeed(
  GetCredential,
  GetCredential.of((options: CredentialRequestOptions) =>
    pipe(
      E.tryPromise({
        try: () => getCredential(options),
        catch: e =>
          new InternalBrowserError({
            message: 'Unable to get authentication credential',
            detail: String(e),
          }),
      }),
      E.map(credential => credential.toJSON()),
    ),
  ),
)

const schedule = Schedule.intersect(Schedule.recurs(3), Schedule.exponential('100 millis'))

const retryScheduleLive = L.succeed(RetrySchedule, RetrySchedule.of({ schedule }))

const dispatcherLive = pipe(DispatcherLive, L.provide(retryScheduleLive))

const rpcClientLive = pipe(RpcClientLive, L.provide(dispatcherLive))

const storageServiceLive = StorageServiceLive

const userServiceLive = pipe(UserServiceLive, L.provide(rpcClientLive))

const registrationServiceLive = pipe(
  RegistrationServiceLive,
  L.provide(rpcClientLive),
  L.provide(userServiceLive),
  L.provide(capabilitiesLive),
  L.provide(createLive),
  L.provide(storageServiceLive),
)

const authenticationServiceLive = pipe(
  AuthenticateServiceLive,
  L.provide(rpcClientLive),
  L.provide(capabilitiesLive),
  L.provide(getLive),
  L.provide(storageServiceLive),
)

const connectionServiceLive = pipe(
  ConnectionServiceLive,
  L.provide(rpcClientLive),
  L.provide(dispatcherLive),
)

const locationSearchLive = Layer.succeed(
  LocationSearch,
  LocationSearch.of(E.sync(() => globalThis.window.location.search)),
)

const emailServiceLive = pipe(
  EmailServiceLive,
  L.provide(locationSearchLive),
  L.provide(rpcClientLive),
  L.provide(capabilitiesLive),
  L.provide(authenticationServiceLive),
  L.provide(storageServiceLive),
)

export const allRequirements = Layer.mergeAll(
  capabilitiesLive,
  userServiceLive,
  registrationServiceLive,
  authenticationServiceLive,
  connectionServiceLive,
  emailServiceLive,
  storageServiceLive,
)

export class Config extends Context.Tag('Config')<
  Config,
  {
    tenancyId: string
    clientId: string
    endpoint?: string
  }
>() {}

const storageLive = Layer.effect(
  Storage,
  E.sync(() => Storage.of(globalThis.localStorage)),
)

const exchangeConfig = <A, E>(effect: E.Effect<A, E, RpcConfig | Storage>) => {
  return pipe(
    Config,
    E.flatMap(config => E.provideService(effect, RpcConfig, RpcConfig.of(config))),
    effect => E.provide(effect, storageLive),
  )
}

export const preConnect = (): E.Effect<void, never, Config> =>
  pipe(
    ConnectionService,
    E.flatMap(service => service.preConnect()),
    E.provide(connectionServiceLive),
    exchangeConfig,
  )

export const isRegistered = (email: Email): E.Effect<boolean, BadRequest, Config> =>
  pipe(
    UserService,
    E.flatMap(service => service.isExistingUser(email)),
    E.provide(userServiceLive),
    exchangeConfig,
  )

export type RegistrationErrors = NotSupported | BadRequest | Duplicate | Unauthorized | Forbidden

export const registerPasskey = (
  request: RegistrationRequest,
): E.Effect<Principal, RegistrationErrors, Config> =>
  pipe(
    RegistrationService,
    E.flatMap(service => service.registerPasskey(request)),
    E.provide(registrationServiceLive),
    exchangeConfig,
  )

export type AuthenticationErrors =
  | NotSupported
  | BadRequest
  | NotFound
  | Disabled
  | Unauthorized
  | Forbidden

export const authenticatePasskey = (
  request: AuthenticationRequest,
): E.Effect<Principal, AuthenticationErrors, Config> =>
  pipe(
    AuthenticationService,
    E.flatMap(service => service.authenticatePasskey(request)),
    E.provide(authenticationServiceLive),
    exchangeConfig,
  )

export type VerifyEmailErrors =
  | NotSupported
  | BadRequest
  | NotFound
  | Disabled
  | Unauthorized
  | Forbidden

export const verifyEmailCode = (
  request: VerifyRequest,
): E.Effect<boolean, VerifyEmailErrors, Config> =>
  pipe(
    EmailService,
    E.flatMap(service => service.verifyEmailCode(request)),
    E.provide(emailServiceLive),
    exchangeConfig,
  )

export const verifyEmailLink = (): E.Effect<boolean, VerifyEmailErrors, Config> =>
  pipe(
    EmailService,
    E.flatMap(service => service.verifyEmailLink()),
    E.provide(emailServiceLive),
    exchangeConfig,
  )

export const getSessionToken = (
  authType: AuthType,
): E.Effect<StoredToken, NoSuchElementException> =>
  pipe(
    StorageService,
    E.flatMap(service => service.getToken(authType)),
    E.provide(storageServiceLive),
    E.provide(storageLive),
  )

export const clearExpiredTokens = (): E.Effect<void> =>
  pipe(
    StorageService,
    E.flatMap(service => service.clearExpiredTokens),
    E.provide(storageServiceLive),
    E.provide(storageLive),
  )
