import type { RegistrationPublicKeyCredential } from '@github/webauthn-json/browser-ponyfill'
import type { Principal } from '@passlock/shared/schema'
import { Effect as E, Layer, Option as O } from 'effect'
import type { Input } from 'valibot'
import { mock } from 'vitest-mock-extended'

import { Create, type RegistrationRequest } from './register'
import { registrationOptions } from './register.fixture.json'
import { Abort, Endpoint, Tenancy } from '../config'
import { NetworkService } from '../network/network'
import { StorageService } from '../storage/storage'
import { noopLogger } from '../test/testUtils'
import { Capabilities } from '../utils'

const encoder = new TextEncoder()
const rawId = encoder.encode('1')

export const tenancyId = 'testTenancy'
export const clientId = 'clientId'
export const endpoint = 'https://example.com'

export const request: RegistrationRequest = {
  email: 'john.doe@gmail.com',
  firstName: 'john',
  lastName: 'doe',
  userVerification: 'preferred',
}

export const encodedEmail = encodeURIComponent(request.email)

export const credential: RegistrationPublicKeyCredential = {
  authenticatorAttachment: null,
  rawId: rawId,
  response: {
    clientDataJSON: encoder.encode('json'),
  },
  getClientExtensionResults: () => {
    throw new Error('Function not implemented.')
  },
  id: '1',
  type: 'public-key',
  toJSON: () => {
    throw new Error('Function not implemented.')
  },
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

const buildNetworkMock = (registered: boolean) => {
  const networkMock = mock<NetworkService>()
  networkMock.getData.mockReturnValue(E.succeed({ registered }))
  networkMock.postData.mockReturnValueOnce(E.succeed(registrationOptions))
  networkMock.postData.mockReturnValueOnce(E.succeed(principal))
  return networkMock
}

export const buildTestLayers = (registered: boolean) => {
  const tenancyTest = Layer.succeed(Tenancy, Tenancy.of({ tenancyId, clientId }))
  const endpointTest = Layer.succeed(Endpoint, Endpoint.of({ endpoint }))
  const abortTest = Layer.succeed(Abort, Abort.of({}))
  const capabilitiesTest = Layer.succeed(
    Capabilities,
    Capabilities.of({ passkeysSupported: E.unit }),
  )

  const create: Create = () => Promise.resolve(credential)
  const createTest = Layer.succeed(Create, Create.of(create))

  const networkServiceLayer = Layer.effect(
    NetworkService,
    E.sync(() => buildNetworkMock(registered)),
  )

  const storageServiceTest = Layer.succeed(
    StorageService,
    StorageService.of({
      storeToken: () => E.unit,
      getToken: () =>
        O.some({
          token: 'token',
          authType: 'passkey',
          expiresAt: Date.now(),
        }),
      clearToken: () => E.unit,
      clearExpiredToken: () => E.unit,
    }),
  )

  const layers = Layer.mergeAll(
    tenancyTest,
    endpointTest,
    abortTest,
    capabilitiesTest,
    networkServiceLayer,
    createTest,
    storageServiceTest,
    noopLogger,
  )

  return layers
}
