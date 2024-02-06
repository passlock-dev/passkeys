import { create, get } from '@github/webauthn-json/browser-ponyfill'
import { ErrorCode, isPasslockError } from '@passlock/shared/error'
import { Effect as E, Layer as L, Schedule, identity, pipe } from 'effect'

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

const registerLive = (request: RegistrationRequest & Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(RegistrationService, s => s.register(request)),
    E.provide(registrationServiceLive),
    E.provide(configLive),
  )
}

const authenticateLive = (request: AuthenticationRequest & Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(AuthenticationService, s => s.authenticate(request)),
    E.provide(authenticationServiceLive),
    E.provide(configLive),
  )
}

const verifyEmailLive = (request: VerifyRequest & Config) => {
  const configLive = buildConfigLayers(request)
  return pipe(
    E.flatMap(EmailService, s => s.verifyEmail(request)),
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

const clearExpiredToken = (authType: AuthType) => {
  pipe(
    E.flatMap(StorageService, s => s.clearExpiredToken(authType, true)),
    E.provide(storageServiceLive),
    E.runSync,
  )
}

/* Exports */

const isRegistered = makeUnionFn(isRegisteredLive)
const isRegisteredUnsafe = makeUnsafeFn(isRegisteredLive)

const register = makeUnionFn(registerLive)
const registerUnsafe = makeUnsafeFn(registerLive)

const authenticate = makeUnionFn(authenticateLive)
const authenticateUnsafe = makeUnsafeFn(authenticateLive)

const verifyEmail = makeUnionFn(verifyEmailLive)
const verifyEmailUnsafe = makeUnsafeFn(verifyEmailLive)

export {
  ErrorCode,
  arePasskeysSupported,
  authenticate,
  authenticateUnsafe,
  clearExpiredToken,
  getSessionToken,
  isAutofillSupported,
  isPasslockError,
  isRegistered,
  isRegisteredUnsafe,
  register,
  registerUnsafe,
  verifyEmail,
  verifyEmailUnsafe,
}
