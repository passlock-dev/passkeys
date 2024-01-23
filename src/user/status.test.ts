import { ErrorCode, PasslockError, error } from '@passlock/shared/error'
import type { PasslockLogger } from '@passlock/shared/logging'
import { Effect as E, Layer } from 'effect'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { type Email, isExistingUser, isNewUser } from './status'
import { Abort, Endpoint, Tenancy } from '../config'
import { runUnion } from '../exit'
import { NetworkService } from '../network/network'
import { type GetData, NetworkServiceTest, noopLogger } from '../test/testUtils'

const tenancyId = 'testTenancy'
const clientId = 'clientId'
const endpoint = 'https://example.com'
const email = 'john.doe@gmail.com'
const request: Email = { email: email }

type In<O> = E.Effect<
  NetworkService | PasslockLogger | Tenancy | Endpoint | Abort,
  PasslockError,
  O
>
type Out<O> = Promise<PasslockError | O>

function runEffect<O>(effect: In<O>, opts: boolean | GetData): Out<O> {
  const tenancyTest = Layer.succeed(Tenancy, Tenancy.of({ tenancyId, clientId }))
  const endpointTest = Layer.succeed(Endpoint, Endpoint.of({ endpoint }))
  const abortTest = Layer.succeed(Abort, Abort.of({}))

  const networkService =
    typeof opts === 'function'
      ? NetworkServiceTest.withGetData(opts)
      : NetworkServiceTest.withData({ registered: opts })

  const networkServiceLayer = Layer.succeed(NetworkService, NetworkService.of(networkService))
  const layers = Layer.mergeAll(
    tenancyTest,
    endpointTest,
    abortTest,
    networkServiceLayer,
    noopLogger,
  )

  const noRequirements = E.provide(effect, layers)
  return runUnion(noRequirements)
}

describe('isRegistered should', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('return true when the backend returns registered:true', async () => {
    const effect = isExistingUser(request)
    const alreadyRegistered = await runEffect(effect, true)
    expect(alreadyRegistered).toBe(true)
  })

  test('return false when the backend returns registered:false', async () => {
    const effect = isExistingUser(request)
    const alreadyRegistered = await runEffect(effect, false)
    expect(alreadyRegistered).toBe(false)
  })

  test('send the email to the backend', async () => {
    const getData = vi.fn(() => E.succeed({ registered: true }))
    const effect = isExistingUser(request)
    await runEffect(effect, getData)

    const encodedEmail = encodeURIComponent(email)
    const expectedUrl = `${endpoint}/${tenancyId}/users/status/${encodedEmail}`
    expect(getData).toBeCalledWith(expectedUrl, clientId, undefined)
  })

  test("fail if the backend doesn't return a {registered:boolean} object", async () => {
    const getData = vi.fn(() => E.succeed({ junk: true }))
    const effect = isExistingUser(request)
    const res = await runEffect(effect, getData)

    expect(res).toEqual(
      error("Invalid server response, expected 'registered' field", ErrorCode.InternalServerError),
    )
  })
})

describe('isUnRegistered should', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('return void when the user is not registered', async () => {
    const effect = isNewUser(request)
    const alreadyRegistered = await runEffect(effect, false)
    expect(alreadyRegistered).toBe(undefined)
  })

  test('return an error when the user is registered', async () => {
    const effect = isNewUser(request)
    const alreadyRegistered = await runEffect(effect, true)

    expect(alreadyRegistered).toEqual(error('Email already registered', ErrorCode.DuplicateEmail))
  })
})
