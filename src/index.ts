import { create, get } from '@github/webauthn-json/browser-ponyfill'
import { ErrorCode, isPasslockError } from '@passlock/shared/error'
import { Effect as E, Layer as L, Layer, Schedule, Scope, identity, pipe } from 'effect'

import {
  AuthenticateServiceLive,
  type AuthenticationRequest,
  AuthenticationService,
  Get,
} from './authentication/authenticate'
import type { Config } from './config'
import { buildConfigLayers } from './config'
import { EmailService, EmailServiceLive, type VerifyRequest } from './email/email'
import { makeUnionFn, makeUnsafeFn } from './exit'
import { eventLoggerLive } from './logging/eventLogger'
import { Fetch, NetworkServiceLive, RetrySchedule } from './network/network'
import {
  Create,
  type RegistrationRequest,
  RegistrationService,
  RegistrationServiceLive,
} from './registration/register'
import type { AuthType } from './storage/storage'
import { Storage, StorageService, StorageServiceLive } from './storage/storage'
import { type Email, UserService, UserServiceLive } from './user/user'
import * as Utils from './utils'
import { capabilitiesLive } from './utils'
import { type PreConnectRequest, WarmerService, WarmerServiceLive } from './warmer/warmer'

const arePasskeysSupported = () => E.runPromise(Utils.arePasskeysSupported)
const isAutofillSupported = () => E.runPromise(Utils.isAutofillSupported)

/* Layers */

const loggerLive = eventLoggerLive

const fetchLive = L.succeed(Fetch, Fetch.of(fetch))

const createLive = L.succeed(Create, Create.of(create))

const getLive = L.succeed(Get, Get.of(get))

const schedule = Schedule.intersect(Schedule.recurs(3), Schedule.exponential('100 millis'))

const retryScheduleLive = L.succeed(RetrySchedule, RetrySchedule.of({ schedule }))

const networkServiceLive = pipe(
  NetworkServiceLive,
  L.provide(fetchLive),
  L.provide(loggerLive),
  L.provide(retryScheduleLive),
)

const userServiceLive = pipe(UserServiceLive, L.provide(networkServiceLive), L.provide(loggerLive))

const storageServiceLive = pipe(StorageServiceLive, L.provide(loggerLive))

const registrationServiceLive = pipe(
  RegistrationServiceLive,
  L.provide(networkServiceLive),
  L.provide(loggerLive),
  L.provide(capabilitiesLive),
  L.provide(createLive),
  L.provide(storageServiceLive),
)

const authenticationServiceLive = pipe(
  AuthenticateServiceLive,
  L.provide(networkServiceLive),
  L.provide(loggerLive),
  L.provide(capabilitiesLive),
  L.provide(getLive),
  L.provide(storageServiceLive),
)

const warmerServiceLive = pipe(
  WarmerServiceLive,
  L.provide(userServiceLive),
  L.provide(registrationServiceLive),
  L.provide(authenticationServiceLive),
  L.provide(networkServiceLive),
  L.provide(loggerLive),
  L.provide(capabilitiesLive),
  L.provide(getLive),
  L.provide(storageServiceLive),
)

const emailServiceLive = pipe(
  EmailServiceLive,
  L.provide(networkServiceLive),
  L.provide(loggerLive),
  L.provide(capabilitiesLive),
  L.provide(authenticationServiceLive),
  L.provide(storageServiceLive),
)

const all = Layer.mergeAll(
  userServiceLive,
  registrationServiceLive,
  authenticationServiceLive,
  warmerServiceLive,
  emailServiceLive,
)

// Create a scope for resources used in the layers
const scope = E.runSync(Scope.make())

// Transform the layer into a runtime
const runtime = E.runSync(Layer.toRuntime(all).pipe(Scope.extend(scope)))

/* Effects */

// We don't want to eagerly build this layer as this file could be included
// during SSR (where there is not localStorage). The effects are never run
// during SSR, only during a browser render, so it's fine to provide them
// when the effects are created and run
const storageLive = Layer.effect(
  Storage,
  E.sync(() => localStorage),
)

const isRegisteredLive = (request: Email & Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(UserService, s => s.isExistingUser(request)),
    E.provide(storageLive),
    E.provide(configLive),
  )
}

const registerPasskeylive = (request: RegistrationRequest & Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(RegistrationService, s => s.registerPasskey(request)),
    E.provide(storageLive),
    E.provide(configLive),
  )
}

const preConnectLive = (request: PreConnectRequest & Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(WarmerService, s => s.preConnect(request)),
    E.provide(storageLive),
    E.provide(configLive),
  )
}

const authenticatePasskeyLive = (request: AuthenticationRequest & Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(AuthenticationService, s => s.authenticatePasskey(request)),
    E.provide(storageLive),
    E.provide(configLive),
  )
}

const verifyEmailCodeLive = (request: VerifyRequest & Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(EmailService, s => s.verifyEmailCode(request)),
    E.provide(storageLive),
    E.provide(configLive),
  )
}

const verifyEmailLinkLive = (request: Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(EmailService, s => s.verifyEmailLink()),
    E.provide(storageLive),
    E.provide(configLive),
  )
}

const getSessionToken = (authType: AuthType): string | undefined => {
  return pipe(
    E.flatMap(StorageService, s => s.getToken(authType)),
    E.map(t => t.token),
    E.provide(storageServiceLive),
    E.provide(storageLive),
    E.match({
      onSuccess: identity,
      onFailure: () => undefined,
    }),
    E.runSync,
  )
}

const clearExpiredToken = (authType: AuthType) =>
  pipe(
    E.flatMap(StorageService, s => s.clearExpiredToken(authType)),
    E.provide(storageServiceLive),
    E.provide(storageLive),
    E.runPromise,
  )

const clearExpiredTokens = () =>
  pipe(
    E.flatMap(StorageService, s => s.clearExpiredTokens),
    E.provide(storageServiceLive),
    E.provide(storageLive),
    E.runPromise,
  )

/* Exports */

const isRegistered = makeUnionFn(isRegisteredLive, runtime)
const isRegisteredUnsafe = makeUnsafeFn(isRegisteredLive, runtime)

const registerPasskey = makeUnionFn(registerPasskeylive, runtime)
const registerUnsafe = makeUnsafeFn(registerPasskeylive, runtime)

const preConnect = makeUnionFn(preConnectLive, runtime)
const preConnectUnsafe = makeUnsafeFn(preConnectLive, runtime)

const authenticatePasskey = makeUnionFn(authenticatePasskeyLive, runtime)
const authenticateUnsafe = makeUnsafeFn(authenticatePasskeyLive, runtime)

const verifyEmailCode = makeUnionFn(verifyEmailCodeLive, runtime)
const verifyEmailCodeUnsafe = makeUnsafeFn(verifyEmailCodeLive, runtime)

const verifyEmailLink = makeUnionFn(verifyEmailLinkLive, runtime)
const verifyEmailLinkUnsafe = makeUnsafeFn(verifyEmailLinkLive, runtime)

export {
  ErrorCode,
  arePasskeysSupported,
  authenticatePasskey,
  authenticateUnsafe,
  clearExpiredToken,
  clearExpiredTokens,
  getSessionToken,
  isAutofillSupported,
  isPasslockError,
  isRegistered,
  isRegisteredUnsafe,
  preConnect,
  preConnectUnsafe,
  registerPasskey,
  registerUnsafe,
  verifyEmailCode,
  verifyEmailCodeUnsafe,
  verifyEmailLink,
  verifyEmailLinkUnsafe,
}
