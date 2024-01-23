import { LogLevel } from '@passlock/shared/logging'
import { Effect as E, LogLevel as EffectLogLevel, Logger } from 'effect'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { debug, error, info, log, logRaw, warn } from './eventLogger'

/**
 * Although the core log functionality is tested alongside the logger in the @passlock/shared
 * package, those tests deliberately exclude the event dispatch elements as the package
 * is intended to be agnostic to the runtime environment. This client package however is
 * intented to be run in the browser, so we can plugin a real event dispatcher and ensure
 * it's working as expected.
 */

describe('log', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('log DEBUG to the console', () => {
    const effect = debug('hello world')

    const withDebugLevel = effect.pipe(Logger.withMinimumLogLevel(EffectLogLevel.Debug))

    const logSpy = vi.spyOn(globalThis.console, 'log').mockImplementation(() => undefined)

    E.runSync(withDebugLevel)

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hello world'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('DEBUG'))
  })

  test('log INFO to the console', () => {
    const effect = info('hello world')

    const logSpy = vi.spyOn(globalThis.console, 'log').mockImplementation(() => undefined)

    E.runSync(effect)

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hello world'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('INFO'))
  })

  test('log WARN to the console', () => {
    const effect = warn('hello world')

    const logSpy = vi.spyOn(globalThis.console, 'log').mockImplementation(() => undefined)

    E.runSync(effect)

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hello world'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('WARN'))
  })

  test('log ERROR to the console', () => {
    const effect = error('hello world')

    const logSpy = vi.spyOn(globalThis.console, 'log').mockImplementation(() => undefined)

    E.runSync(effect)

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hello world'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('ERROR'))
  })

  test('log raw data to the console', () => {
    const effect = logRaw('raw data')

    const logSpy = vi.spyOn(globalThis.console, 'log').mockImplementation(() => undefined)

    E.runSync(effect)

    expect(logSpy).toHaveBeenCalledWith('raw data')
  })

  test('fire a custom log event', () => {
    const effect = log('hello world', LogLevel.INFO)

    const logSpy = vi.spyOn(globalThis.console, 'log').mockImplementation(() => undefined)
    const eventSpy = vi.spyOn(globalThis, 'dispatchEvent').mockImplementation(() => false)
    E.runSync(effect)

    const expectedEvent = new CustomEvent('PasslogDebugMessage', {
      detail: 'hello world',
    })
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hello world'))
    expect(eventSpy).toHaveBeenCalledWith(expectedEvent)
  })

  test('not fire a log event for a debug message', () => {
    const effect = log('hello world', LogLevel.DEBUG)

    const eventSpy = vi.spyOn(globalThis, 'dispatchEvent')
    E.runSync(effect)

    expect(eventSpy).not.toBeCalled()
  })
})
