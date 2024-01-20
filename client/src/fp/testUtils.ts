import { PasslockLogger } from '@passlock/shared/logging'
import { Effect as E, Layer } from 'effect'

import type { NetworkService } from './network/network'

const noop = () => E.succeed(undefined)

/**
 * We don't want logs/error messages in the console during test runs
 */
export const noopLogger = Layer.succeed(
  PasslockLogger,
  PasslockLogger.of({
    log: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    logRaw: noop,
  }),
)

export type GetData = NetworkService['getData']
export type PostData = NetworkService['postData']

const getData = () => E.succeed({})
const postData = () => E.succeed({})

export const NetworkServiceTest = {
  /**
   * NetworkService that returns the data passed in by the test fixture
   *
   * @param data
   * @returns
   */
  withData: (data: object): NetworkService => ({
    getData: () => E.succeed(data),
    postData: () => E.succeed(data),
  }),

  /**
   * Generate a NetworkService using a provided GetData function
   * (most likely a mock/spy). The postData function will be a noop
   *
   * @param getData
   * @returns
   */
  withGetData: (getData: GetData): NetworkService => ({ getData, postData }),

  /**
   * Generate a NetworkService using a provided PostData function
   * (most likely a mock/spy). The getData function will be a noop
   *
   * @param postData
   * @returns
   */
  withPostData: (postData: PostData): NetworkService => ({ getData, postData }),
}
