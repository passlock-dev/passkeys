import type { PasslockError } from '@passlock/shared/error'
import { ErrorCode, error as passlockError } from '@passlock/shared/error'
import { PasslockLogger } from '@passlock/shared/logging'
import { Context, Effect as E, Layer, flow, identity } from 'effect'
import { not } from 'effect/Predicate'

import { DefaultEndpoint, Endpoint, Tenancy } from '../config'
import { NetworkService } from '../network/network'
import { type CommonDependencies } from '../utils'

/* Requests */

export type Email = { email: string }

/* Services */

export type UserService = {
  isExistingUser: (email: Email) => E.Effect<CommonDependencies, PasslockError, boolean>
}

export const UserService = Context.Tag<UserService>()

/* Utilities */

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

const buildUrl = (email: string) =>
  E.gen(function* (_) {
    const { tenancyId } = yield* _(Tenancy)
    const endpointConfig = yield* _(Endpoint)
    const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
    const statusURL = `${endpoint}/${tenancyId}/users/status`
    const encodedEmail = encodeURIComponent(email)
    return `${statusURL}/${encodedEmail}`
  })

/* Effects */

type Dependencies = CommonDependencies | NetworkService | PasslockLogger

export const isExistingUser = (request: Email): E.Effect<Dependencies, PasslockError, boolean> =>
  E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    yield* _(logger.info('Checking registration status'))
    const { clientId } = yield* _(Tenancy)
    const url = yield* _(buildUrl(request.email))
    const networkService = yield* _(NetworkService)
    const object = yield* _(networkService.getData({ url, clientId }))
    const data = yield* _(isRegisteredResponse(object))

    return data.registered
  })

export const isNewUser = (request: Email) => {
  const predicate = not(identity<boolean>)
  const error = () => passlockError('Email already registered', ErrorCode.DuplicateEmail)

  return isExistingUser(request).pipe(E.filterOrFail(predicate, error)).pipe(E.asUnit)
}

/* Live */

/* v8 ignore start */
export const UserServiceLive = Layer.effect(
  UserService,
  E.gen(function* (_) {
    const context = yield* _(E.context<NetworkService | PasslockLogger>())
    return UserService.of({
      isExistingUser: flow(isExistingUser, E.provide(context)),
    })
  }),
)
/* v8 ignore stop */
