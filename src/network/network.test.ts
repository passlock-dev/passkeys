import { ErrorCode } from '@passlock/shared/error'
import { Effect as E, pipe } from 'effect'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { Fetch, getData, postData } from './network'
import { buildFetchLayers, buildTestLayers, createFetchResponse } from './network.fixture'

describe('getData should', () => {
  const url = 'https://example.com'
  const clientId = 'testClientId'

  test('fetch json', async () => {
    const response = { status: 'ok' }

    const effect = E.gen(function* (_) {
      const result = yield* _(getData({ url, clientId }))
      expect(result).toEqual(response)
    })

    const layers = buildTestLayers(response)
    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)
  })

  test('error when the server returns a 500 response', async () => {
    const effect = pipe(
      getData({ url, clientId }),
      E.flip,
      E.tap(e => {
        expect(e.message).toBe('Received unexpected (non PasslockError) from backend')
        expect(e.code).toBe(ErrorCode.InternalServerError)
      }),
    )

    const response = { error: 'boom' }
    const layers = buildTestLayers(response, 500)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)
  })

  test("error when the server doesn't return an object", async () => {
    const effect = pipe(
      getData({ url, clientId }),
      E.flip,
      E.tap(e => {
        expect(e.message).toMatch(/Invalid response/)
        expect(e.code).toBe(ErrorCode.InternalServerError)
      }),
    )

    const response = 'junk'
    const layers = buildTestLayers(response)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)
  })

  test('error when a request fails', async () => {
    const effect = pipe(
      getData({ url, clientId }),
      E.flip,
      E.tap(e => {
        expect(e.message).toMatch(/Unable to fetch/)
        expect(e.code).toBe(ErrorCode.InternalServerError)
      }),
    )

    const fetch = vi.fn().mockRejectedValue(new Error('boom!'))
    const layers = buildFetchLayers(fetch)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)
  })

  test('propagate a server side Passlock error', async () => {
    const backendError = {
      message: 'Passlock error',
      code: ErrorCode.InternalServerError,
    }

    const effect = pipe(
      getData({ url, clientId }),
      E.flip,
      E.tap(e => {
        expect(e.message).toMatch(backendError.message)
        expect(e.code).toBe(backendError.code)
      }),
    )

    const layers = buildTestLayers(backendError, 400)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)
  })

  test('retry a failed request', async () => {
    const badResponse = { message: 'Internal Server Error', code: ErrorCode.InternalServerError }
    const goodResponse = { status: 'success' }

    const effect = E.gen(function* (_) {
      const res = yield* _(getData({ url, clientId }))
      const fetch = yield* _(Fetch)

      expect(fetch).toBeCalledTimes(2)
      expect(res).toBe(goodResponse)
    })

    const fetch = vi.fn()
    fetch.mockResolvedValueOnce(createFetchResponse(badResponse, 500))
    fetch.mockResolvedValueOnce(createFetchResponse(goodResponse, 200))

    const layers = buildFetchLayers(fetch)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)
  })

  test('not retry a failed 400 request', async () => {
    const effect = E.gen(function* (_) {
      const err = yield* _(getData({ url, clientId }), E.flip)

      const fetch = yield* _(Fetch)

      expect(fetch).toBeCalledTimes(1)
      expect(err.code).toBe(ErrorCode.Forbidden)
    })

    const response = { message: 'Invalid user', code: ErrorCode.Forbidden }

    const fetch = vi.fn()
    fetch.mockResolvedValueOnce(createFetchResponse(response, 403))

    const layers = buildFetchLayers(fetch)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)
  })

  test('add query parameters', async () => {
    const effect = E.gen(function* (_) {
      const result = yield* _(getData({ url, clientId, params: { a: 'b' } }))
      const fetch = yield* _(Fetch)

      expect(fetch).toBeCalledWith('https://example.com?a=b', expect.objectContaining({}))
      expect(result).toEqual(response)
    })

    const response = { status: 'ok' }
    const fetch = vi.fn()
    fetch.mockResolvedValue(createFetchResponse(response, 200))
    const layers = buildFetchLayers(fetch)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)
  })

  test('send the correct headers', async () => {
    const effect = E.gen(function* (_) {
      const result = yield* _(getData({ url, clientId }))
      const fetch = yield* _(Fetch)

      expect(fetch).toBeCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: {
            'Accept': 'application/json',
            'X-CLIENT-ID': 'testClientId',
          },
        }),
      )

      expect(result).toEqual(response)
    })

    const response = { status: 'ok' }
    const fetch = vi.fn()
    fetch.mockResolvedValue(createFetchResponse(response, 200))
    const layers = buildFetchLayers(fetch)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)
  })
})

describe('postData should', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const url = 'https://example.com'
  const clientId = 'testClientId'

  test('send json', async () => {
    const response = { status: 'ok' }

    const effect = E.gen(function* (_) {
      const result = yield* _(postData({ url, clientId, data: { a: 'b' } }))
      expect(result).toEqual(response)
    })

    const layers = buildTestLayers(response)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)
  })

  test('error when a request fails', async () => {
    const effect = pipe(
      postData({ url, clientId, data: { a: 'b' } }),
      E.flip,
      E.tap(e => {
        expect(e.message).toBe('Received unexpected (non PasslockError) from backend')
        expect(e.code).toBe(ErrorCode.InternalServerError)
      }),
    )

    const response = { error: 'boom' }
    const layers = buildTestLayers(response, 500)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)
  })

  test('propagate a server side Passlock error', async () => {
    const backendError = {
      message: 'Passlock error',
      code: ErrorCode.InternalServerError,
    }

    const effect = pipe(
      postData({ url, clientId, data: { a: 'b' } }),
      E.flip,
      E.tap(e => {
        expect(e.message).toMatch(backendError.message)
        expect(e.code).toBe(backendError.code)
      }),
    )

    const layers = buildTestLayers(backendError, 400)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)
  })

  test('retry a failed request', async () => {
    const badResponse = { message: 'Internal Server Error', code: ErrorCode.InternalServerError }
    const goodResponse = { status: 'success' }

    const effect = E.gen(function* (_) {
      const res = yield* _(postData({ url, clientId, data: { a: 'b' } }))
      const fetch = yield* _(Fetch)

      expect(fetch).toBeCalledTimes(2)
      expect(res).toBe(goodResponse)
    })

    const fetch = vi.fn()
    fetch.mockResolvedValueOnce(createFetchResponse(badResponse, 500))
    fetch.mockResolvedValueOnce(createFetchResponse(goodResponse, 200))

    const layers = buildFetchLayers(fetch)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)
  })

  test('send the correct headers and body', async () => {
    const response = { status: 'success' }

    const effect = E.gen(function* (_) {
      const res = yield* _(postData({ url, clientId, data: { a: 'b' } }))
      const fetch = yield* _(Fetch)
      expect(res).toBe(response)

      expect(fetch).toBeCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CLIENT-ID': 'testClientId',
          },
          body: JSON.stringify({ a: 'b' }),
        }),
      )
    })

    const fetch = vi.fn()
    fetch.mockResolvedValueOnce(createFetchResponse(response, 200))
    const layers = buildFetchLayers(fetch)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)
  })
})
