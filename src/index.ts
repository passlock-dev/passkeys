import { create, get } from '@github/webauthn-json/browser-ponyfill'
import { ErrorCode, isPasslockError } from '@passlock/shared/error'
import { Effect as E, Layer as L, Schedule, identity, pipe } from 'effect'

import {
  AuthenticateServiceLive,
  AuthenticationService,
  Get,
  type AuthenticationRequest
} from './authentication/authenticate'
import type { Config } from './config'
import { buildConfigLayers } from './config'
import { EmailService, EmailServiceLive, type VerifyRequest } from './email/email'
import { makeUnionFn, makeUnsafeFn } from './exit'
import { eventLoggerLive } from './logging/eventLogger'
import { Fetch, NetworkServiceLive, RetrySchedule } from './network/network'
import {
  Create,
  RegistrationService,
  RegistrationServiceLive,
  type RegistrationRequest,
} from './registration/register'
import type { AuthType } from './storage/storage'
import { Storage, StorageService, StorageServiceLive } from './storage/storage'
import { UserService, UserServiceLive, type Email } from './user/user'
import * as Utils from './utils'
import { capabilitiesLive } from './utils'
import { WarmerService, WarmerServiceLive, type PreConnectRequest } from './warmer/warmer'

const arePasskeysSupported = () => E.runPromise(Utils.arePasskeysSupported)
const isAutofillSupported = () => E.runPromise(Utils.isAutofillSupported)

/* Layers */

const loggerLive = eventLoggerLive

const fetchLive = L.succeed(Fetch, Fetch.of(fetch))

const createLive = L.succeed(Create, Create.of(create))

const getLive = L.succeed(Get, Get.of(get))

const schedule = Schedule.intersect(Schedule.recurs(3), Schedule.exponential('100 millis'))

const retryScheduleLive = L.succeed(RetrySchedule, RetrySchedule.of({ schedule }))

const storageLive = L.suspend(() => L.succeed(Storage, Storage.of(localStorage)))

const networkService = pipe(
  NetworkServiceLive,
  L.provide(fetchLive),
  L.provide(loggerLive),
  L.provide(retryScheduleLive),
)

const userServiceLive = pipe(UserServiceLive, L.provide(networkService), L.provide(loggerLive))

const storageServiceLive = pipe(StorageServiceLive, L.provide(storageLive), L.provide(loggerLive))

const registrationServiceLive = pipe(
  RegistrationServiceLive,
  L.provide(networkService),
  L.provide(loggerLive),
  L.provide(capabilitiesLive),
  L.provide(createLive),
  L.provide(storageServiceLive),
)

const authenticationServiceLive = pipe(
  AuthenticateServiceLive,
  L.provide(networkService),
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
  L.provide(networkService),
  L.provide(loggerLive),
  L.provide(capabilitiesLive),
  L.provide(getLive),
  L.provide(storageServiceLive),
)

const emailServiceLive = pipe(
  EmailServiceLive,
  L.provide(networkService),
  L.provide(loggerLive),
  L.provide(capabilitiesLive),
  L.provide(authenticationServiceLive),
  L.provide(storageServiceLive),
)

/* Effects */

const isRegisteredLive = (request: Email & Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(UserService, s => s.isExistingUser(request)),
    E.provide(userServiceLive),
    E.provide(configLive),
  )
}

const registerPasskeylive = (request: RegistrationRequest & Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(RegistrationService, s => s.registerPasskey(request)),
    E.provide(registrationServiceLive),
    E.provide(configLive),
  )
}

const preConnectLive = (request: PreConnectRequest & Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(WarmerService, s => s.preConnect(request)),
    E.provide(warmerServiceLive),
    E.provide(configLive),
  )
}

const authenticatePasskeyLive = (request: AuthenticationRequest & Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(AuthenticationService, s => s.authenticatePasskey(request)),
    E.provide(authenticationServiceLive),
    E.provide(configLive),
  )
}

const verifyEmailCodeLive = (request: VerifyRequest & Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(EmailService, s => s.verifyEmailCode(request)),
    E.provide(emailServiceLive),
    E.provide(configLive),
  )
}

const verifyEmailLinkLive = (request: Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(EmailService, s => s.verifyEmailLink()),
    E.provide(emailServiceLive),
    E.provide(configLive),
  )
}

const getSessionToken = (authType: AuthType): string | undefined => {
  return pipe(
    E.flatMap(StorageService, s => s.getToken(authType)),
    E.map(t => t.token),
    E.provide(storageServiceLive),
    E.match({
      onSuccess: identity,
      onFailure: () => undefined,
    }),
    E.runSync,
  )
}

const clearExpiredToken = (authType: AuthType, defer: boolean) =>
  pipe(
    E.flatMap(StorageService, s => s.clearExpiredToken(authType, defer)),
    E.provide(storageServiceLive),
    E.runPromise,
  )

const clearExpiredTokens = (defer: boolean) =>
  pipe(
    E.flatMap(StorageService, s => s.clearExpiredTokens(defer)),
    E.provide(storageServiceLive),
    E.runPromise,
  )

/* Exports */

const isRegistered = makeUnionFn(isRegisteredLive)
const isRegisteredUnsafe = makeUnsafeFn(isRegisteredLive)

const registerPasskey = makeUnionFn(registerPasskeylive)
const registerUnsafe = makeUnsafeFn(registerPasskeylive)

const preConnect = makeUnionFn(preConnectLive)
const preConnectUnsafe = makeUnsafeFn(preConnectLive)

const authenticatePasskey = makeUnionFn(authenticatePasskeyLive)
const authenticateUnsafe = makeUnsafeFn(authenticatePasskeyLive)

const verifyEmailCode = makeUnionFn(verifyEmailCodeLive)
const verifyEmailCodeUnsafe = makeUnsafeFn(verifyEmailCodeLive)

const verifyEmailLink = makeUnionFn(verifyEmailLinkLive)
const verifyEmailLinkUnsafe = makeUnsafeFn(verifyEmailLinkLive)

export {
  ErrorCode,
  arePasskeysSupported, authenticatePasskey,
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
  verifyEmailLinkUnsafe
}

