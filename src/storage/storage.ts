import type { Principal } from '@passlock/shared/schema'
import { Context, Effect as E, Layer, Option as O, flow, pipe } from 'effect'
import type { NoSuchElementException } from 'effect/Cause'

/* Services */

export type AuthType = 'email' | 'passkey'

export type StoredToken = {
  token: string
  authType: AuthType
  expiresAt: number
}

export type StorageService = {
  storeToken: (principal: Principal) => E.Effect<never, never, void>
  getToken: (authType: AuthType) => E.Effect<never, NoSuchElementException, StoredToken>
  clearToken: (authType: AuthType) => E.Effect<never, never, void>
}

/* Components */

export const StorageService = Context.Tag<StorageService>()

// Inject window.sessionStorage to make testing easier
export const Storage = Context.Tag<Storage>()

// prefix authType with passlock:token:
export const buildKey = (authType: AuthType) => `passlock:token:${authType}`

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

// store compressed token in session storage
const storeToken = (principal: Principal): E.Effect<Storage, never, void> => {
  return E.gen(function* (_) {
    const sessionStorage = yield* _(Storage)
    E.try(() => {
      const compressed = compressToken(principal)
      const key = buildKey(principal.authStatement.authType)
      sessionStorage.setItem(key, compressed)
    }).pipe(E.asUnit) // We dont care if it fails
  })
}

// get stored token from session storage
const getToken = (authType: AuthType): E.Effect<Storage, NoSuchElementException, StoredToken> => {
  return E.gen(function* (_) {
    const sessionStorage = yield* _(Storage)
    return yield* _(
      pipe(
        O.some(buildKey(authType)),
        O.flatMap(key => pipe(sessionStorage.getItem(key), O.fromNullable)),
        O.flatMap(expandToken(authType)),
        O.filter(({ expiresAt }) => expiresAt > Date.now()),
      ),
    )
  })
}

const clearToken = (authType: AuthType): E.Effect<Storage, never, void> => {
  return E.gen(function* (_) {
    const sessionStorage = yield* _(Storage)
    sessionStorage.removeItem(buildKey(authType))
  })
}

/* Live */

/* v8 ignore start */
const storageLive = Layer.suspend(() => Layer.succeed(Storage, Storage.of(sessionStorage)))

export const storageServiceLive = Layer.succeed(
  StorageService,
  StorageService.of({
    storeToken: flow(storeToken, E.provide(storageLive)),
    getToken: flow(getToken, E.provide(storageLive)),
    clearToken: flow(clearToken, E.provide(storageLive)),
  }),
)
/* v8 ignore stop */
