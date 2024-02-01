import type { AuthenticationPublicKeyCredential } from '@github/webauthn-json/browser-ponyfill'
import type { PasslockError } from '@passlock/shared/error'
import type { PasslockLogger } from '@passlock/shared/logging'
import type { Principal } from '@passlock/shared/schema'
import { Effect as E, Layer } from 'effect'
import { vi } from 'vitest'
import { Input } from "valibot"

import { type AuthenticationRequest, Get } from './authenticate'
import { authenticationOptions } from './authenticate.fixture.json'
import { Abort, Endpoint, Tenancy } from '../config'
import { runUnion } from '../exit'
import { NetworkService } from '../network/network'
import { NetworkServiceTest, type PostData, noopLogger } from '../test/testUtils'
import { Capabilities } from '../utils'

export { authenticationOptions } from './authenticate.fixture.json'

const encoder = new TextEncoder()
const rawId = encoder.encode('1')

export const tenancyId = 'testTenancy'
export const clientId = 'clientId'
export const endpoint = 'https://example.com'

export const request: AuthenticationRequest = { userVerification: 'preferred' }

export const credential: AuthenticationPublicKeyCredential = {
  toJSON: () => {
    throw new Error('Function not implemented.')
  },
  authenticatorAttachment: null,
  rawId: rawId,
  response: {
    clientDataJSON: rawId,
  },
  getClientExtensionResults: () => {
    throw new Error('Function not implemented.')
  },
  id: '1',
  type: 'public-key',
}

// Frontend receives dates as objects
export const expectedPrincipal: Principal = {
  token: 'token',
  subject: {
    id: '1',
    email: 'john.doe@gmail.com',
    firstName: 'john',
    lastName: 'doe',
    emailVerified: false,
  },
  authStatement: {
    authType: 'email',
    userVerified: false,
    authTimestamp: new Date(0),
  },
  expiresAt: new Date(0),
}

// Backend sends dates as strings
const principal: Input<typeof Principal> = {
  ...expectedPrincipal,
  authStatement: {
    ...expectedPrincipal.authStatement,
    authTimestamp: expectedPrincipal.authStatement.authTimestamp.toISOString(),
  },
  expiresAt: expectedPrincipal.expiresAt.toISOString(),
}

const buildMocks = () => {
  const postData: PostData = vi
    .fn()
    .mockImplementationOnce(() => E.succeed(authenticationOptions))
    .mockImplementationOnce(() => E.succeed(principal))

  return postData
}

export type In<O> = E.Effect<
  Tenancy | Endpoint | Capabilities | Abort | NetworkService | Get | PasslockLogger,
  PasslockError,
  O
>
export type Out<O> = Promise<{ result: PasslockError | O; postData: PostData }>

export const buildTestLayers = () => {
  const tenancyTest = Layer.succeed(Tenancy, Tenancy.of({ tenancyId, clientId }))
  const endpointTest = Layer.succeed(Endpoint, Endpoint.of({ endpoint }))
  const abortTest = Layer.succeed(Abort, Abort.of({}))
  const capabilitiesTest = Layer.succeed(
    Capabilities,
    Capabilities.of({ passkeysSupported: E.unit }),
  )

  const get: Get = () => Promise.resolve(credential)
  const postData = buildMocks()
  const getTest = Layer.succeed(Get, Get.of(get))
  const networkServiceLayer = Layer.succeed(
    NetworkService,
    NetworkServiceTest.withPostData(postData),
  )

  const layers = Layer.mergeAll(
    tenancyTest,
    endpointTest,
    abortTest,
    capabilitiesTest,
    networkServiceLayer,
    getTest,
    noopLogger,
  )

  return { layers, postData }
}

export async function runEffect<O>(effect: In<O>): Out<O> {
  const { layers, postData } = buildTestLayers()
  const noRequirements = E.provide(effect, layers)
  const result = await runUnion(noRequirements)

  return { result, postData }
}
