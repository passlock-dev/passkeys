import { Context, Layer } from 'effect'

export const DefaultEndpoint = 'https://api.passlock.dev'

export type Tenancy = {
  tenancyId: string
  clientId: string
}
export const Tenancy = Context.Tag<Tenancy>()

export type Endpoint = {
  endpoint?: string
}
export const Endpoint = Context.Tag<Endpoint>()

export type Abort = {
  signal?: AbortSignal
}
export const Abort = Context.Tag<Abort>()

export type Config = Tenancy & Endpoint & Abort
export const Config = Context.Tag<Config>()

export const buildConfigLayers = (config: Config) => {
  const abortLive = Layer.succeed(Abort, Abort.of(config))
  const tenancyLayer = Layer.succeed(Tenancy, Tenancy.of(config))
  const endpointLayer = Layer.succeed(Endpoint, Endpoint.of(config))
  return Layer.mergeAll(tenancyLayer, endpointLayer, abortLive)
}
