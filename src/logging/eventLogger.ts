/**
 * Logger implementation that also fires DOM events.
 * This is useful to allow external code to plug into the logging
 * mechanism. E.g. the Passlock demo subscribes to events to generate
 * a typewriter style effect
 */
import { Effect as E, LogLevel, Logger } from 'effect'

/**
 * Some log messages span multiple lines/include json etc which is
 * better output without being formatted by Effect's logging framework
 *
 * @param message
 * @returns
 */
export const logRaw = <T>(message: T) => {
  return E.sync(() => {
    console.log(message)
  })
}

export const DebugMessage = 'PasslogDebugMessage'

export const eventLoggerLive = Logger.add(
  Logger.make(options => {
    if (typeof options.message === 'string' && options.logLevel !== LogLevel.Debug) {
      try {
        const evt = new CustomEvent(DebugMessage, { detail: options.message })
        globalThis.dispatchEvent(evt)
      } catch (e) {
        globalThis.console.log('Unable to fire custom event')
      }
    }
  }),
)
