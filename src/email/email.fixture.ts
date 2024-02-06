import type { Principal } from '@passlock/shared/schema'
import { Effect as E, Layer } from 'effect'
import { mock } from 'vitest-mock-extended'

import { AuthenticationService } from '../authentication/authenticate'
import { Abort, Endpoint, Tenancy } from '../config'
import { eventLoggerLive } from '../logging/eventLogger'
import { NetworkService } from '../network/network'
import { StorageService } from '../storage/storage'

const tenancyId = 'testTenancy'
const clientId = 'clientId'
const endpoint = 'https://example.com'

export const principal: Principal = {
  token: 'token',
  subject: {
    id: '1',
    email: 'john.doe@gmail.com',
    firstName: 'john',
    lastName: 'doe',
    emailVerified: false,
  },
  authStatement: {
    authType: 'passkey',
    userVerified: false,
    authTimestamp: new Date(0),
  },
  expiresAt: new Date(100),
}

export const storageServiceTest = Layer.effect(
  StorageService,
  E.sync(() => {
    const storageServiceMock = mock<StorageService>()

    storageServiceMock.getToken.mockReturnValue(
      E.succeed({
        authType: 'passkey',
        token: 'token',
        expiresAt: Date.now() + 1000,
      }),
    )

    storageServiceMock.clearToken.mockReturnValue(E.unit)

    return storageServiceMock
  }),
)

const authenticationServiceTest = Layer.effect(
  AuthenticationService,
  E.sync(() => {
    return mock<AuthenticationService>()
  }),
)

const networkServiceTest = Layer.effect(
  NetworkService,
  E.sync(() => {
    const networkServiceMock = mock<NetworkService>()
    networkServiceMock.postData.mockReturnValue(
      E.succeed({
        verified: true,
      }),
    )
    return networkServiceMock
  }),
)

const tenancyTest = Layer.succeed(Tenancy, Tenancy.of({ tenancyId, clientId }))
const endpointTest = Layer.succeed(Endpoint, Endpoint.of({ endpoint }))
const abortTest = Layer.succeed(Abort, Abort.of({}))

export const testLayers = Layer.mergeAll(
  storageServiceTest,
  networkServiceTest,
  authenticationServiceTest,
  eventLoggerLive,
  tenancyTest,
  endpointTest,
  abortTest,
)
