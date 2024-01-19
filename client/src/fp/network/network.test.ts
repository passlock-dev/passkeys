import { ErrorCode, PasslockError } from '@passlock/shared/src/error'
import { Effect as E, Exit, Layer } from 'effect'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { Fetch, getData, postData } from './network'
import { Abort } from '../config'
import { runUnion } from '../exit'
import { noopLogger } from '../testUtils'

function createFetchResponse(data: unknown, status: number) {
  return {
    status,
    ok: status === 200,
    json: () =>
      new Promise(resolve => {
        resolve(data)
      }),
  }
}

function createLayers(fetch: Fetch) {
  const fetchTest = Layer.succeed(Fetch, Fetch.of(fetch))
  const abortTest = Layer.succeed(Abort, Abort.of({}))
  return Layer.mergeAll(fetchTest, abortTest, noopLogger)
}

function createTestLayers(response: unknown, status = 200) {
  const fetch = vi.fn()
  const mockResponse = createFetchResponse(response, status)
  fetch.mockResolvedValue(mockResponse)
  return createLayers(fetch)
}

describe('getData', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('fetch json', async () => {
    const effect = getData('https://example.com', 'testClientId')

    const response = { status: 'ok' }
    const layers = createTestLayers(response)

    const noRequirements = E.provide(effect, layers)
    const res = await E.runPromise(noRequirements)

    expect(res).toEqual(response)
  })

  test('error when the server returns a 500 response', async () => {
    const effect = getData('https://example.com', 'testClientId')

    const response = { error: 'boom' }
    const layers = createTestLayers(response, 500)

    const noRequirements = E.provide(effect, layers)
    const res = await E.runPromiseExit(noRequirements)

    expect(Exit.isFailure(res)).toEqual(true)
  })

  test("error when the server doesn't return an object", async () => {
    const effect = getData('https://example.com', 'testClientId')

    const response = 'junk'
    const layers = createTestLayers(response)

    const noRequirements = E.provide(effect, layers)
    const res = await E.runPromiseExit(noRequirements)

    expect(Exit.isFailure(res)).toEqual(true)
  })

  test('error when a request fails', async () => {
    const effect = getData('https://example.com', 'testClientId')

    const fetch = vi.fn().mockRejectedValue(new Error('boom!'))
    const layers = createLayers(fetch)

    const noRequirements = E.provide(effect, layers)
    const res = await E.runPromiseExit(noRequirements)

    expect(Exit.isFailure(res)).toEqual(true)
  })

  test('propagate a server side Passlock error', async () => {
    const effect = getData('https://example.com', 'testClientId')

    const backendError = {
      message: 'Passlock error',
      code: ErrorCode.InternalServerError,
    }
    const layers = createTestLayers(backendError, 400)

    const noRequirements = E.provide(effect, layers)
    const res = await runUnion(noRequirements)

    expect(res).toEqual(new PasslockError(backendError))
  })

  test('retry a failed request', async () => {
    const effect = getData('https://example.com', 'testClientId')

    const response = { status: 'ok' }

    const fetch = vi.fn()
    fetch.mockResolvedValue(createFetchResponse(response, 500))
    fetch.mockResolvedValue(createFetchResponse(response, 200))
    const layers = createLayers(fetch)

    const noRequirements = E.provide(effect, layers)
    const res = await E.runPromise(noRequirements)

    expect(res).toEqual(response)
  })

  test('add query parameters', async () => {
    const effect = getData('https://example.com', 'testClientId', { a: 'b' })

    const response = { status: 'ok' }
    const fetch = vi.fn()
    fetch.mockResolvedValue(createFetchResponse(response, 200))
    const layers = createLayers(fetch)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)

    expect(fetch).toBeCalledWith(
      'https://example.com?a=b',
      expect.objectContaining({}),
    )
  })

  test('send the correct headers', async () => {
    const effect = getData('https://example.com', 'testClientId')

    const response = { status: 'ok' }
    const fetch = vi.fn()
    fetch.mockResolvedValue(createFetchResponse(response, 200))
    const layers = createLayers(fetch)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)

    expect(fetch).toBeCalledWith(
      'https://example.com',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          'X-CLIENT-ID': 'testClientId',
        },
      }),
    )
  })
})

describe('postData', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('send json', async () => {
    const effect = postData('https://example.com', 'testClientId', { a: 'b' })

    const response = { status: 'ok' }
    const layers = createTestLayers(response)

    const noRequirements = E.provide(effect, layers)
    const res = await E.runPromise(noRequirements)

    expect(res).toEqual(response)
  })

  test('error when a request fails', async () => {
    const effect = postData('https://example.com', 'testClientId', { a: 'b' })

    const response = { error: 'boom' }
    const layers = createTestLayers(response, 500)

    const noRequirements = E.provide(effect, layers)
    const res = await E.runPromiseExit(noRequirements)

    expect(Exit.isFailure(res)).toEqual(true)
  })

  test('propagate a server side Passlock error', async () => {
    const effect = postData('https://example.com', 'testClientId', { a: 'b' })

    const backendError = {
      message: 'Passlock error',
      code: ErrorCode.InternalServerError,
    }
    const layers = createTestLayers(backendError, 400)

    const noRequirements = E.provide(effect, layers)
    const res = await runUnion(noRequirements)

    const expectedError = new PasslockError(backendError)
    expect(res).toEqual(expectedError)
  })

  test('retry a failed request', async () => {
    const effect = postData('https://example.com', 'testClientId', { a: 'b' })

    const response = { status: 'ok' }

    const fetch = vi.fn()
    fetch.mockResolvedValue(createFetchResponse(response, 500))
    fetch.mockResolvedValue(createFetchResponse(response, 200))
    const layers = createLayers(fetch)

    const noRequirements = E.provide(effect, layers)
    const res = await E.runPromise(noRequirements)

    expect(res).toEqual(response)
  })

  test('send the correct headers and body', async () => {
    const effect = postData('https://example.com', 'testClientId', { a: 'b' })

    const response = { status: 'ok' }
    const fetch = vi.fn()
    fetch.mockResolvedValue(createFetchResponse(response, 200))
    const layers = createLayers(fetch)

    const noRequirements = E.provide(effect, layers)
    await E.runPromise(noRequirements)

    expect(fetch).toBeCalledWith(
      'https://example.com',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CLIENT-ID': 'testClientId',
        },
        body: JSON.stringify({ a: 'b' }),
      }),
    )
  })
})
