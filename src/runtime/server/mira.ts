import { Mira } from "@mirafive/sdk-server"
import type { H3Event } from "h3"

import { useRuntimeConfig } from "#imports"

interface Clients {
  mira?: Mira
}

// The app renderer and Nitro bundle this file separately; both share one client.
const clients: Clients = Reflect.get(globalThis, "__mirafive_server") ?? {}

Reflect.set(globalThis, "__mirafive_server", clients)

const setting = (section: unknown, name: string): string | undefined => {
  const value: unknown = typeof section === "object" && section ? Reflect.get(section, name) : undefined

  return typeof value === "string" && value !== "" ? value : undefined
}

/** The secret key from private runtime config, else `MIRAFIVE_SECRET_KEY`. */
const secretKey = (event: H3Event): string | undefined =>
  setting(useRuntimeConfig(event)["mirafive"], "secretKey") ??
  (globalThis.process?.env["MIRAFIVE_SECRET_KEY"] || undefined)

const options = (event: H3Event) => ({
  key: secretKey(event),
  host:
    setting(useRuntimeConfig(event).public["mirafive"], "host") ??
    (globalThis.process?.env["MIRAFIVE_HOST"] || undefined)
})

const server = (event: H3Event): Mira => (clients.mira ??= new Mira(options(event)))

/** A process-wide server client on the secret key, flushed with `event.waitUntil` after the response. */
export const useServerMira = (event: H3Event): Mira => {
  event.context["mirafiveFlush"] = true

  return server(event)
}

export const flush = (event: H3Event): void => {
  if (event.context["mirafiveFlush"] && clients.mira) {
    event.waitUntil(clients.mira.flush())
  }
}
