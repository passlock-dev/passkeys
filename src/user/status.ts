import { ErrorCode, PasslockError, error as passlockError } from '@passlock/shared/error'
import { PasslockLogger } from '@passlock/shared/logging'
import { Effect as E, LogLevel as EffectLogLevel, Layer, Logger } from 'effect'
import type { Effect } from 'effect/Effect'
import { identity } from 'effect/Function'
import { not } from 'effect/Predicate'

import { Config, DefaultEndpoint, Endpoint, Tenancy, buildConfigLayers } from '../config'
import { eventLoggerLive } from '../logging/eventLogger'
import { NetworkService, networkServiceLive } from '../network/network'
import { type CommonDependencies } from '../utils'

/* Request */

export type Email = { email: string }

/* Helpers */

type RegisteredResponse = { registered: boolean }

const isRegisteredResponse = (value: object) => {
  const guard = (o: object): o is RegisteredResponse => 'registered' in o

  const error = () =>
    passlockError(
      "Invalid server response, expected 'registered' field",
      ErrorCode.InternalServerError,
    )

  return E.succeed(value).pipe(E.filterOrFail(guard, error))
}

/* Effects */

const buildUrl = (email: string) =>
  E.gen(function* (_) {
    const { tenancyId } = yield* _(Tenancy)
    const endpointConfig = yield* _(Endpoint)
    const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
    const statusURL = `${endpoint}/${tenancyId}/users/status`
    const encodedEmail = encodeURIComponent(email)
    return `${statusURL}/${encodedEmail}`
  })

type Dependencies = CommonDependencies

export const isExistingUser = (request: Email): E.Effect<Dependencies, PasslockError, boolean> =>
  E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    yield* _(logger.info('Checking registration status'))
    const { clientId } = yield* _(Tenancy)
    const statusURL = yield* _(buildUrl(request.email))
    const networkService = yield* _(NetworkService)
    const object = yield* _(networkService.getData(statusURL, clientId, undefined))
    const data = yield* _(isRegisteredResponse(object))

    return data.registered
  })

export const isNewUser = (request: Email) => {
  const predicate = not(identity<boolean>)
  const error = () => passlockError('Email already registered', ErrorCode.DuplicateEmail)

  return isExistingUser(request).pipe(
    E.filterOrFail(predicate, error)
  ).pipe(E.asUnit)
}

/* Live */

/* v8 ignore start */
export const isExistingUserLive = (
  request: Email & Config,
): Effect<never, PasslockError, boolean> => {
  const configLayers = buildConfigLayers(request)
  const layers = Layer.mergeAll(networkServiceLive, eventLoggerLive, configLayers)

  const effect = isExistingUser(request)
  const withLayers = E.provide(effect, layers)
  return withLayers.pipe(Logger.withMinimumLogLevel(EffectLogLevel.Debug))
}
/* v8 ignore stop */
