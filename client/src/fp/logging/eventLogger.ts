import { PasslockError } from '@passlock/shared/error'
import { LogLevel, PasslockLogger } from '@passlock/shared/logging'
import { Effect as E, Layer } from 'effect'

import { fireEvent } from '../event/event'

export const log = <T>(
  message: T,
  logLevel: LogLevel,
): E.Effect<never, PasslockError, void> => {
  return E.gen(function* (_) {
    switch (logLevel) {
      case LogLevel.ERROR:
        yield* _(E.logError(message))
        break
      case LogLevel.WARN:
        yield* _(E.logWarning(message))
        break
      case LogLevel.INFO:
        yield* _(E.logInfo(message))
        break
      case LogLevel.DEBUG:
        yield* _(E.logDebug(message))
        break
    }

    if (typeof message === 'string' && logLevel !== LogLevel.DEBUG) {
      yield* _(fireEvent(message))
    }
  })
}

/**
 * Some log messages span multiple lines/include json etc which is
 * better output without being formatted by Effect's logging framework
 *
 * @param message
 * @returns
 */
export const logRaw = <T>(message: T) =>
  E.sync(() => {
    console.log(message)
  })

export const debug = <T>(message: T) => log(message, LogLevel.DEBUG)
export const info = <T>(message: T) => log(message, LogLevel.INFO)
export const warn = <T>(message: T) => log(message, LogLevel.WARN)
export const error = <T>(message: T) => log(message, LogLevel.ERROR)

export const eventLoggerLive = Layer.succeed(PasslockLogger, {
  log,
  debug,
  info,
  warn,
  error,
  logRaw,
})
