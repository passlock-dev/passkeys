import { ErrorCode, PasslockError } from '@passlock/shared/src/error'
import { Effect as E, LogLevel as EffectLogLevel, Layer, Logger } from 'effect'
import type { Effect } from 'effect/Effect'
import { identity } from 'effect/Function'
import { not } from 'effect/Predicate'

import {
  buildConfigLayers,
  Config,
  DefaultEndpoint,
  Endpoint,
  Tenancy,
} from '../config'
import { loggerLive, PasslockLogger } from '../logging/logging'
import { NetworkService, networkServiceLive } from '../network/network'

/* Request */

export type Email = { email: string }

/* Helpers */

type RegisteredResponse = { registered: boolean }

const isRegisteredResponse = (value: object) => {
  const guard = (o: object): o is RegisteredResponse => 'registered' in o

  const error = () =>
    new PasslockError({
      message: "Invalid server response, expected 'registered' field",
      code: ErrorCode.InternalServerError,
    })

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

export const isExistingUser = (request: Email) =>
  E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    yield* _(logger.info('Checking registration status'))
    const { clientId } = yield* _(Tenancy)
    const statusURL = yield* _(buildUrl(request.email))
    const networkService = yield* _(NetworkService)
    const object = yield* _(
      networkService.getData(statusURL, clientId, undefined),
    )
    const data = yield* _(isRegisteredResponse(object))

    return data.registered
  })

export const isNewUser = (request: Email) => {
  const predicate = not(identity<boolean>)
  const error = () =>
    new PasslockError({
      message: 'Email already registered',
      code: ErrorCode.DuplicateEmail,
    })
  const guard = E.filterOrFail(predicate, error)

  return isExistingUser(request).pipe(guard).pipe(E.asUnit)
}

/* Live */

/* v8 ignore start */
export const isExistingUserLive = (
  request: Email & Config,
): Effect<never, PasslockError, boolean> => {
  const configLayers = buildConfigLayers(request)
  const layers = Layer.mergeAll(networkServiceLive, loggerLive, configLayers)

  const effect = isExistingUser(request)
  const withLayers = E.provide(effect, layers)
  return withLayers.pipe(Logger.withMinimumLogLevel(EffectLogLevel.Debug))
}
/* v8 ignore stop */
