import { PasslockLogger } from '@passlock/shared/logging'
import type { Principal } from '@passlock/shared/schema'
import { Context, Effect as E, Layer, Option as O, Schedule, flow, pipe } from 'effect'
import type { NoSuchElementException } from 'effect/Cause'

/* Requests */

export type AuthType = 'email' | 'passkey'

export type StoredToken = {
  token: string
  authType: AuthType
  expiresAt: number
}

/* Services */

export type StorageService = {
  storeToken: (principal: Principal) => E.Effect<never, never, void>
  getToken: (authType: AuthType) => E.Effect<never, NoSuchElementException, StoredToken>
  clearToken: (authType: AuthType) => E.Effect<never, never, void>
  clearExpiredToken: (authType: AuthType, defer: boolean) => E.Effect<never, never, void>
}

/* Utilities */

export const StorageService = Context.Tag<StorageService>()

// Inject window.localStorage to make testing easier
export const Storage = Context.Tag<Storage>()

// => passlock:t:e || passlock:t:p
export const buildKey = (authType: AuthType) => {
  const a = authType[0]
  return `passlock:${a}:t`
}

// => token:expiresAt
export const compressToken = (principal: Principal): string => {
  const expiresAt = principal.expiresAt.getTime()
  const token = principal.token
  return `${token}:${expiresAt}`
}

// token:expiresAt => { authType, token, expiresAt }
export const expandToken =
  (authType: AuthType) =>
  (s: string): O.Option<StoredToken> => {
    const tokens = s.split(':')
    if (tokens.length !== 2) return O.none()

    const [token, expiresAtString] = tokens
    const parse = O.liftThrowable(Number.parseInt)
    const expiresAt = parse(expiresAtString)

    return O.map(expiresAt, expiresAt => ({ authType, token, expiresAt }))
  }

/* Effects */

// store compressed token in local storage
export const storeToken = (principal: Principal): E.Effect<Storage, never, void> => {
  return E.gen(function* (_) {
    const localStorage = yield* _(Storage)

    const storeEffect = E.try(() => {
      const compressed = compressToken(principal)
      const key = buildKey(principal.authStatement.authType)
      localStorage.setItem(key, compressed)
    }).pipe(E.orElse(() => E.unit)) // We dont care if it fails

    return yield* _(storeEffect)
  })
}

// get stored token from local storage
export const getToken = (
  authType: AuthType,
): E.Effect<Storage, NoSuchElementException, StoredToken> => {
  return E.gen(function* (_) {
    const localStorage = yield* _(Storage)

    const getEffect = pipe(
      O.some(buildKey(authType)),
      O.flatMap(key => pipe(localStorage.getItem(key), O.fromNullable)),
      O.flatMap(expandToken(authType)),
      O.filter(({ expiresAt }) => expiresAt > Date.now()),
    )

    return yield* _(getEffect)
  })
}

export const clearToken = (authType: AuthType): E.Effect<Storage, never, void> => {
  return E.gen(function* (_) {
    const localStorage = yield* _(Storage)
    localStorage.removeItem(buildKey(authType))
  })
}

export const clearExpiredToken = (
  authType: AuthType,
  defer: boolean,
): E.Effect<Storage, never, void> => {
  const key = buildKey(authType)
  const schedule = Schedule.union(Schedule.recurs(6), Schedule.fixed('30 seconds'))
  const policy = Schedule.delayed(schedule, () => '5 minutes')

  const effect = E.gen(function* (_) {
    const storage = yield* _(Storage)
    const item = yield* _(O.fromNullable(storage.getItem(key)))
    const token = yield* _(expandToken(authType)(item))

    if (token.expiresAt < Date.now()) {
      storage.removeItem(key)
    }
  }).pipe(
    E.match({
      onSuccess: () => E.unit,
      onFailure: () => E.unit,
    }),
  )

  if (defer) {
    return pipe(effect, E.schedule(policy))
  } else {
    return effect
  }
}

/* Live */

/* v8 ignore start */
export const StorageServiceLive = Layer.effect(
  StorageService,
  E.gen(function* (_) {
    const storageLive = yield* _(Storage)
    const loggerLive = yield* _(PasslockLogger)

    return StorageService.of({
      storeToken: flow(storeToken, E.provideService(Storage, storageLive)),
      getToken: flow(getToken, E.provideService(Storage, storageLive)),
      clearToken: flow(clearToken, E.provideService(Storage, storageLive)),
      clearExpiredToken: flow(
        clearExpiredToken,
        E.provideService(Storage, storageLive),
        E.provideService(PasslockLogger, loggerLive),
      ),
    })
  }),
)
/* v8 ignore stop */
