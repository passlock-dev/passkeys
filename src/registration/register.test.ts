import { Duplicate, InternalBrowserError } from '@passlock/shared/dist/error/error'
import { type RouterOps, RpcClient } from '@passlock/shared/dist/rpc/rpc'
import { Effect as E, Layer as L, Layer, LogLevel, Logger, pipe } from 'effect'
import { describe, expect, test, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { CreateCredential, RegistrationService, RegistrationServiceLive } from './register'
import * as Fixture from './register.fixture'
import { UserService } from '../user/user'


describe('register should', () => {
  test('return a valid credential', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(RegistrationService)
      const result = yield* _(service.registerPasskey(Fixture.registrationRequest))
      expect(result).toEqual(Fixture.principal)
    })

    const service = pipe(
      RegistrationServiceLive,
      L.provide(Fixture.createCredentialTest),
      L.provide(Fixture.userServiceTest),
      L.provide(Fixture.capabilitiesTest),
      L.provide(Fixture.storageServiceTest),
      L.provide(Fixture.rpcClientTest),
    )

    const effect = pipe(E.provide(assertions, service), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })

  test('check if the user is already registered', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(RegistrationService)
      yield* _(service.registerPasskey(Fixture.registrationRequest))

      const userService = yield* _(UserService)
      expect(userService.isExistingUser).toHaveBeenCalled()
    })

    const userServiceTest = L.effect(
      UserService,
      E.sync(() => {
        const userMock = mock<UserService>()

        userMock.isExistingUser.mockReturnValue(E.succeed(false))

        return userMock
      }),
    )

    const service = pipe(
      RegistrationServiceLive,
      L.provide(Fixture.createCredentialTest),
      L.provide(Fixture.capabilitiesTest),
      L.provide(Fixture.storageServiceTest),
      L.provide(Fixture.rpcClientTest),
      L.provide(userServiceTest),
    )

    const layers = Layer.merge(service, userServiceTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })

  test('pass the registration data to the backend', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(RegistrationService)
      yield* _(service.registerPasskey(Fixture.registrationRequest))

      const rpcClient = yield* _(RpcClient)
      expect(rpcClient.getRegistrationOptions).toHaveBeenCalledWith(Fixture.optionsReq)
    })

    const rpcClientTest = L.effect(
      RpcClient,
      E.sync(() => {
        const rpcMock = mock<RouterOps>()

        rpcMock.getRegistrationOptions.mockReturnValue(E.succeed(Fixture.optionsRes))
        rpcMock.verifyRegistrationCredential.mockReturnValue(E.succeed(Fixture.verificationRes))

        return rpcMock
      }),
    )

    const service = pipe(
      RegistrationServiceLive,
      L.provide(Fixture.createCredentialTest),
      L.provide(Fixture.capabilitiesTest),
      L.provide(Fixture.storageServiceTest),
      L.provide(Fixture.userServiceTest),
      L.provide(rpcClientTest),
    )

    const layers = Layer.merge(service, rpcClientTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })

  test('send the new credential to the backend', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(RegistrationService)
      yield* _(service.registerPasskey(Fixture.registrationRequest))

      const rpcClient = yield* _(RpcClient)
      expect(rpcClient.verifyRegistrationCredential).toHaveBeenCalledWith(Fixture.verificationReq)
    })

    const rpcClientTest = L.effect(
      RpcClient,
      E.sync(() => {
        const rpcMock = mock<RouterOps>()

        rpcMock.getRegistrationOptions.mockReturnValue(E.succeed(Fixture.optionsRes))
        rpcMock.verifyRegistrationCredential.mockReturnValue(E.succeed(Fixture.verificationRes))

        return rpcMock
      }),
    )

    const service = pipe(
      RegistrationServiceLive,
      L.provide(Fixture.createCredentialTest),
      L.provide(Fixture.capabilitiesTest),
      L.provide(Fixture.storageServiceTest),
      L.provide(Fixture.userServiceTest),
      L.provide(rpcClientTest),
    )

    const layers = Layer.merge(service, rpcClientTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })

  test('short-circuit if the user is already registered', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(RegistrationService)

      const error = yield* _(service.registerPasskey(Fixture.registrationRequest), E.flip)

      expect(error).toBeInstanceOf(Duplicate)
    })

    const userServiceTest = L.effect(
      UserService,
      E.sync(() => {
        const userMock = mock<UserService>()

        userMock.isExistingUser.mockReturnValue(E.succeed(true))

        return userMock
      }),
    )

    const service = pipe(
      RegistrationServiceLive,
      L.provide(Fixture.createCredentialTest),
      L.provide(Fixture.capabilitiesTest),
      L.provide(Fixture.storageServiceTest),
      L.provide(Fixture.rpcClientTest),
      L.provide(userServiceTest),
    )

    const layers = Layer.merge(service, userServiceTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })

  test('return an error if we try to re-register a credential', async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(RegistrationService)

      const defect = yield* _(service.registerPasskey(Fixture.registrationRequest), E.flip)

      expect(defect).toBeInstanceOf(Duplicate)
    })

    const createTest = L.effect(
      CreateCredential,
      E.sync(() => {
        const createTest = vi.fn()

        createTest.mockReturnValue(E.fail(new Duplicate({ message: 'boom!' })))

        return createTest
      }),
    )

    const service = pipe(
      RegistrationServiceLive,
      L.provide(Fixture.userServiceTest),
      L.provide(Fixture.capabilitiesTest),
      L.provide(Fixture.storageServiceTest),
      L.provide(Fixture.rpcClientTest),
      L.provide(createTest),
    )

    const layers = Layer.merge(service, createTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })

  test("throw an error if the browser can't create a credential", async () => {
    const assertions = E.gen(function* (_) {
      const service = yield* _(RegistrationService)

      const defect = yield* _(
        service.registerPasskey(Fixture.registrationRequest),
        E.catchAllDefect(defect => E.succeed(defect)),
      )

      expect(defect).toBeInstanceOf(InternalBrowserError)
    })

    const createTest = L.effect(
      CreateCredential,
      E.sync(() => {
        const createTest = vi.fn()

        createTest.mockReturnValue(E.fail(new InternalBrowserError({ message: 'boom!' })))

        return createTest
      }),
    )

    const service = pipe(
      RegistrationServiceLive,
      L.provide(Fixture.userServiceTest),
      L.provide(Fixture.capabilitiesTest),
      L.provide(Fixture.storageServiceTest),
      L.provide(Fixture.rpcClientTest),
      L.provide(createTest),
    )

    const layers = Layer.merge(service, createTest)
    const effect = pipe(E.provide(assertions, layers), Logger.withMinimumLogLevel(LogLevel.None))

    return E.runPromise(effect)
  })
})
