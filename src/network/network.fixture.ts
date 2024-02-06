import { Layer, Schedule, pipe } from 'effect'
import { vi } from 'vitest'

import { Fetch, RetrySchedule } from './network'
import { Abort } from '../config'
import { noopLogger } from '../test/testUtils'

export const createFetchResponse = (data: unknown, status: number) => {
  return {
    status,
    ok: status === 200,
    json: () => {
      return new Promise(resolve => {
        resolve(data)
      })
    },
  }
}

export const buildFetchLayers = (fetch: Fetch) => {
  const fetchTest = Layer.succeed(Fetch, Fetch.of(fetch))
  const abortTest = Layer.succeed(Abort, Abort.of({}))
  const scheduleTest = Layer.succeed(
    RetrySchedule,
    RetrySchedule.of({
      schedule: Schedule.once,
    }),
  )
  return Layer.mergeAll(fetchTest, abortTest, scheduleTest, noopLogger)
}

export const buildTestLayers = (response: unknown, status = 200) =>
  pipe(createFetchResponse(response, status), v => vi.fn().mockResolvedValue(v), buildFetchLayers)
