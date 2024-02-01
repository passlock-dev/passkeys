import { ErrorCode, PasslockError } from '@passlock/shared/error'
import { PasslockLogger } from '@passlock/shared/logging'
import { createParser } from '@passlock/shared/schema'
import { Context, Effect as E, Layer, Schedule, identity, pipe } from 'effect'
import * as v from 'valibot'

import { Abort } from '../config'
import { eventLoggerLive } from '../logging/eventLogger'

/* Services */

export type Params = Record<string, string>

export type Fetch = typeof fetch
export const Fetch = Context.Tag<Fetch>()

export type NetworkService = {
  getData: (
    url: string,
    clientId: string,
    params?: Params,
  ) => E.Effect<Abort, PasslockError, object>
  postData: <T>(url: string, clientId: string, data: T) => E.Effect<Abort, PasslockError, object>
}

export const NetworkService = Context.Tag<NetworkService>()

/* Helpers */

const error = (message: string) =>
  new PasslockError({ message, code: ErrorCode.InternalServerError })

const stringify = <T>(data: T) =>
  E.try({
    try: () => JSON.stringify(data),
    catch: () => error('Unable to stringify request body'),
  })

type FetchOptions = {
  fetch: Fetch
  method: 'GET' | 'POST' | 'PUT'
  url: string
  clientId: string
  body?: string
  signal?: AbortSignal
}

const performFetch = (opts: FetchOptions) => {
  const { fetch, url, method, body, clientId, signal } = opts
  const getHeaders = { 'Accept': 'application/json', 'X-CLIENT-ID': clientId }
  const postHeaders = {
    'Content-Type': 'application/json',
    'X-CLIENT-ID': clientId,
  }
  const headers = method === 'GET' ? getHeaders : { ...getHeaders, ...postHeaders }

  return E.tryPromise({
    try: () =>
      fetch(url, {
        method,
        headers,
        body,
        signal,
      }),
    catch: () => error(`Unable to fetch from ${url}`),
  })
}

export const PasslockErrorSchema = v.object({
  message: v.string(),
  code: v.enum_(ErrorCode),
  detail: v.any(),
})

const parsePasslockError = createParser(PasslockErrorSchema)

/**
 * A little counter intuitive but we want to parse the
 * server response (which is assumed to be PasslockError data)
 * into a PasslockError instance. This parsing could in iself
 * fail so we end up with Either<PasslockError, PasslockError>
 * which we fold and then flip.
 *
 * @param res
 * @returns
 */
const handleError = (res: Response) =>
  pipe(
    toJson(res),
    E.flatMap(toObject),
    E.flatMap(parsePasslockError),
    E.map(errorData => new PasslockError(errorData)),
    E.match({ onFailure: identity, onSuccess: identity }),
    E.flip,
  )

const isOk = (res: Response) => E.suspend(() => (res.ok ? E.succeed(res) : handleError(res)))

const toJson = (res: Response) =>
  E.tryPromise({
    try: () => res.json() as Promise<unknown>,
    catch: () => error('Invalid response, expected json'),
  })

const toObject = (json: unknown) => {
  if (typeof json !== 'object' || json === null)
    return E.fail(error('Invalid response, expected object'))
  return E.succeed(json)
}

/* Effects */

type Dependencies = Abort | PasslockLogger | Fetch

export const postData = <T>(
  url: string,
  clientId: string,
  data: T,
): E.Effect<Dependencies, PasslockError, object> => {
  return E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    const { signal } = yield* _(Abort)
    const fetch = yield* _(Fetch)

    yield* _(logger.debug('Stringify data'))
    const body = yield* _(stringify(data))

    yield* _(logger.debug('POST data'))
    const postEffect = performFetch({
      fetch,
      method: 'POST',
      url,
      body,
      clientId,
      signal,
    })
    const policy = Schedule.addDelay(Schedule.recurs(3), () => '100 millis')
    const resilientPost = E.retry(postEffect, policy)
    const res = yield* _(resilientPost)

    yield* _(logger.debug('Check response status code'))
    const okRes = yield* _(isOk(res))

    yield* _(logger.debug('Extract JSON'))
    const json = yield* _(toJson(okRes))

    yield* _(logger.debug('Parse to object'))
    const object = yield* _(toObject(json))

    return object
  })
}

export const getData = (
  url: string,
  clientId: string,
  params?: Params,
): E.Effect<Dependencies, PasslockError, object> => {
  const buildUrl = E.sync(() => {
    if (!params) return url
    const queryParams = new URLSearchParams(params)
    return `${url}?${queryParams.toString()}`
  })

  return E.gen(function* (_) {
    const logger = yield* _(PasslockLogger)

    const { signal } = yield* _(Abort)
    const fetch = yield* _(Fetch)

    yield* _(logger.debug('Building URL'))
    const url = yield* _(buildUrl)

    yield* _(logger.debug('GET data'))
    const getEffect = performFetch({
      fetch,
      method: 'GET',
      url,
      clientId,
      signal,
    })
    const policy = Schedule.addDelay(Schedule.recurs(3), () => '100 millis')
    const resilientGet = E.retry(getEffect, policy)
    const res = yield* _(resilientGet)

    yield* _(logger.debug('Check response status code'))
    const okRes = yield* _(isOk(res))

    yield* _(logger.debug('Extract JSON'))
    const json = yield* _(toJson(okRes))

    yield* _(logger.debug('Parse to object'))
    const object = yield* _(toObject(json))

    return object
  })
}

/* Live */

/* v8 ignore start */
export const fetchLive = Layer.succeed(Fetch, Fetch.of(fetch))
const liveLayers = Layer.mergeAll(fetchLive, eventLoggerLive)

const getDataWithFetch = (url: string, clientId: string, params?: Params) =>
  E.provide(getData(url, clientId, params), liveLayers)

const postDataWithFetch = <T>(url: string, clientId: string, data: T) =>
  E.provide(postData(url, clientId, data), liveLayers)

export const networkServiceLive = Layer.succeed(
  NetworkService,
  NetworkService.of({
    getData: getDataWithFetch,
    postData: postDataWithFetch,
  }),
)
/* v8 ignore stop */
