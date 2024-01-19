import { Effect as E, LogLevel as EffectLogLevel, Logger } from 'effect'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { debug, error, info, log, LogLevel, warn } from './logging'

describe('log', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('log DEBUG to the console', () => {
    const effect = debug('hello world')
    const withDebugLevel = effect.pipe(
      Logger.withMinimumLogLevel(EffectLogLevel.Debug),
    )
    const logSpy = vi
      .spyOn(globalThis.console, 'log')
      .mockImplementation(() => undefined)
    E.runSync(withDebugLevel)

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hello world'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('DEBUG'))
  })

  test('log INFO to the console', () => {
    const effect = info('hello world')
    const logSpy = vi
      .spyOn(globalThis.console, 'log')
      .mockImplementation(() => undefined)
    E.runSync(effect)

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hello world'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('INFO'))
  })

  test('log WARN to the console', () => {
    const effect = warn('hello world')
    const logSpy = vi
      .spyOn(globalThis.console, 'log')
      .mockImplementation(() => undefined)
    E.runSync(effect)

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hello world'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('WARN'))
  })

  test('log ERROR to the console', () => {
    const effect = error('hello world')
    const logSpy = vi
      .spyOn(globalThis.console, 'log')
      .mockImplementation(() => undefined)
    E.runSync(effect)

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hello world'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('ERROR'))
  })

  test('fire a custom log event', () => {
    const effect = log('hello world', LogLevel.INFO)
    const logSpy = vi
      .spyOn(globalThis.console, 'log')
      .mockImplementation(() => undefined)
    const eventSpy = vi
      .spyOn(globalThis, 'dispatchEvent')
      .mockImplementation(() => false)
    E.runSync(effect)

    const expectedEvent = new CustomEvent('PasslogDebugMessage', {
      detail: 'hello world',
    })
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hello world'))
    expect(eventSpy).toHaveBeenCalledWith(expectedEvent)
  })

  test('not fire a custom log event for a debug message', () => {
    const effect = log('hello world', LogLevel.DEBUG)
    const eventSpy = vi.spyOn(globalThis, 'dispatchEvent')
    E.runSync(effect)

    expect(eventSpy).not.toBeCalled()
  })
})
