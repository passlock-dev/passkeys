import type { Principal } from '@passlock/shared/dist/schema/schema'
import { Effect as E, Layer, pipe } from 'effect'
import { mock } from 'vitest-mock-extended'
import { Storage, StorageServiceLive } from './storage'

// Frontend receives dates as objects
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
  expireAt: new Date(100),
}

const storageTest = Layer.effect(
  Storage,
  E.sync(() => mock<Storage>()),
)

export const testLayers = (storage: Layer.Layer<Storage> = storageTest) => {
  const storageService = pipe(StorageServiceLive, Layer.provide(storage))

  return Layer.merge(storage, storageService)
}
