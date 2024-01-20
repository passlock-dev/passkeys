import { Effect as E, LogLevel as EffectLogLevel, Logger } from 'effect'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { debug, error, info, warn } from './logging'

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
})
