import { Mira } from "@mirafive/sdk-server"
import { type FlagUnit, MiraFlags, type UserFlags } from "@mirafive/sdk-server/flags"
import type { H3Event } from "h3"

import { useRuntimeConfig } from "#imports"

interface Clients {
  mira?: Mira
  flags?: MiraFlags
}

// The app renderer and Nitro bundle this file separately; both share one client pair.
const clients: Clients = Reflect.get(globalThis, "__mirafive_server") ?? {}

Reflect.set(globalThis, "__mirafive_server", clients)

const setting = (section: unknown, name: string): string | undefined => {
  const value: unknown = typeof section === "object" && section ? Reflect.get(section, name) : undefined

  return typeof value === "string" && value !== "" ? value : undefined
}

/** The secret key from private runtime config, else `MIRAFIVE_SECRET_KEY`. */
export const secretKey = (event: H3Event): string | undefined =>
  setting(useRuntimeConfig(event)["mirafive"], "secretKey") ??
  (globalThis.process?.env["MIRAFIVE_SECRET_KEY"] || undefined)

const options = (event: H3Event) => ({
  key: secretKey(event),
  host: setting(useRuntimeConfig(event).public["mirafive"], "host")
})

const server = (event: H3Event): Mira => (clients.mira ??= new Mira(options(event)))

/** A process-wide server client on the secret key, flushed with `event.waitUntil` after the response. */
export const useServerMira = (event: H3Event): Mira => {
  event.context["mirafiveFlush"] = true

  return server(event)
}

/** Flags for a unit; `Sec-GPC: 1` or `DNT: 1` on the request sets `optedOut`. */
export const miraFlagsFor = (event: H3Event, unit: FlagUnit = {}): Promise<UserFlags> => {
  const optedOut =
    unit.optedOut === true || event.headers.get("sec-gpc") === "1" || event.headers.get("dnt") === "1"

  clients.flags ??= new MiraFlags({ ...options(event), mira: server(event) })

  return clients.flags.for({ ...unit, optedOut }, { waitUntil: (promise) => event.waitUntil(promise) })
}

export const flush = (event: H3Event): void => {
  if (event.context["mirafiveFlush"] && clients.mira) {
    event.waitUntil(clients.mira.flush())
  }
}
