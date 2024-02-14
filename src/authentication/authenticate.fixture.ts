import type { AuthenticationPublicKeyCredential } from '@github/webauthn-json/browser-ponyfill'
import type { Principal } from '@passlock/shared/schema'
import { Effect as E, Layer } from 'effect'
import type { Input } from 'valibot'
import { mock } from 'vitest-mock-extended'

import { Abort, Endpoint, Tenancy } from '../config'
import { NetworkService } from '../network/network'
import { StorageService } from '../storage/storage'
import { noopLogger } from '../test/testUtils'
import { Capabilities } from '../utils'
import { Get, type AuthenticationRequest } from './authenticate'
import { authenticationOptions } from './authenticate.fixture.json'

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

const buildNetworkMock = () => {
  const networkMock = mock<NetworkService>()
  networkMock.postData.mockReturnValueOnce(E.succeed(authenticationOptions))
  networkMock.postData.mockReturnValueOnce(E.succeed(principal))
  return networkMock
}

const buildStorageMock = () => {
  const storageMock = mock<StorageService>()
  storageMock.storeToken.mockReturnValueOnce(E.unit)
  storageMock.clearExpiredToken.mockReturnValueOnce(E.unit)
  return storageMock
}

export const buildTestLayers = () => {
  const tenancyTest = Layer.succeed(Tenancy, Tenancy.of({ tenancyId, clientId }))
  const endpointTest = Layer.succeed(Endpoint, Endpoint.of({ endpoint }))
  const abortTest = Layer.succeed(Abort, Abort.of({}))
  const capabilitiesTest = Layer.succeed(
    Capabilities,
    Capabilities.of({ passkeysSupported: E.unit }),
  )

  const get: Get = () => Promise.resolve(credential)
  const getTest = Layer.succeed(Get, Get.of(get))
  const networkServiceLayer = Layer.effect(NetworkService, E.sync(buildNetworkMock))
  const storageServiceTest = Layer.effect(StorageService, E.sync(buildStorageMock))

  const layers = Layer.mergeAll(
    tenancyTest,
    endpointTest,
    abortTest,
    capabilitiesTest,
    networkServiceLayer,
    getTest,
    storageServiceTest,
    noopLogger,
  )

  return layers
}
