import type { Principal } from '@passlock/shared/schema'
import { Effect as E, Layer } from 'effect'
import { mock } from 'vitest-mock-extended'

import { Storage } from './storage'

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
  expiresAt: new Date(100),
}

export const testLayers = Layer.effect(
  Storage,
  E.sync(() => {
    return mock<Storage>()
  }),
)
