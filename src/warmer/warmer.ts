/**
 * Hits the user, registration, verification and token endpoints to warm up a lambda
 */
import type { PasslockError } from '@passlock/shared/error'
import { PasslockLogger } from '@passlock/shared/logging'
import { Context, Effect as E, Layer, Match, flow } from 'effect'

import { AuthenticationService, type Get } from '../authentication/authenticate'
import { DefaultEndpoint, Endpoint, Tenancy } from '../config'
import { NetworkService } from '../network/network'
import { RegistrationService } from '../registration/register'
import { UserService } from '../user/user'
import type { CommonDependencies } from '../utils'

/* Service */

export type PreConnectRequest = {
  operation: 'registration' | 'authentication' | 'all'
}

export type WarmerService = {
  preConnect: (op: PreConnectRequest) => E.Effect<void, PasslockError, CommonDependencies>
}

export const WarmerService = Context.GenericTag<WarmerService>('@services/WarmerService')

/* Effects */

export const pingTokenEndpoint = E.gen(function* (_) {
  const logger = yield* _(PasslockLogger)
  const { tenancyId, clientId } = yield* _(Tenancy)
  yield* _(logger.debug('Pinging token endpoint'))

  const endpointConfig = yield* _(Endpoint)
  const endpoint = endpointConfig.endpoint ?? DefaultEndpoint
  const tokenUrl = `${endpoint}/${tenancyId}/token/token?warm=true`

  yield* _(logger.debug('Making requests'))
  const networkService = yield* _(NetworkService)
  const tokenResponseE = networkService.getData({ url: tokenUrl, clientId })

  return yield* _(tokenResponseE)
})

export const preConnect = (request: PreConnectRequest) =>
  E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)
    yield* _(logger.info('Pre-connecting to endpoints'))

    const authenticationService = yield* _(AuthenticationService)
    const registrationService = yield* _(RegistrationService)
    const userService = yield* _(UserService)

    const matcher = Match.type<PreConnectRequest>().pipe(
      Match.when({ operation: 'registration' }, () => [
        registrationService.preConnect,
        userService.preConnect,
        pingTokenEndpoint,
      ]),
      Match.when({ operation: 'authentication' }, () => [
        authenticationService.preConnect,
        pingTokenEndpoint,
      ]),
      Match.when({ operation: 'all' }, () => [
        registrationService.preConnect,
        authenticationService.preConnect,
        pingTokenEndpoint,
      ]),
      Match.exhaustive,
    )

    const all = E.all(matcher(request), { concurrency: 'unbounded' })
    yield* _(all)
  })

/* Live */

/* v8 ignore start */
export const WarmerServiceLive = Layer.effect(
  WarmerService,
  E.gen(function* (_) {
    const context = yield* _(
      E.context<
        | Get
        | NetworkService
        | AuthenticationService
        | UserService
        | PasslockLogger
        | RegistrationService
      >(),
    )

    return WarmerService.of({
      preConnect: flow(preConnect, E.provide(context)),
    })
  }),
)
/* v8 ignore stop */
