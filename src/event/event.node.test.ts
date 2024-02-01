import { ErrorCode } from '@passlock/shared/error'
import { describe, test } from 'vitest'

import { fireEvent } from './event'
import { runUnion } from '../exit'
import { expectPasslockError } from '../test/testUtils'

// @vitest-environment node

describe('isPasslockEvent', () => {
  test("return a Passlock error if custom events aren't supported", async () => {
    const effect = fireEvent('hello world')
    const res = await runUnion(effect)
    expectPasslockError(res).toMatch('Unable to fire custom event', ErrorCode.InternalBrowserError)
  })
})
