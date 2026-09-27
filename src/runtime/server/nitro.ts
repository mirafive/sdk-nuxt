import type { H3Event } from "h3"

import { getRouteRules } from "#imports"

import { servedFromCache } from "../cache"
import { flush } from "./mira"

interface NitroApp {
  hooks: { hook: (name: "request" | "afterResponse", listener: (event: H3Event) => void) => unknown }
}

export default (nitroApp: NitroApp): void => {
  // The app renderer has no access to Nitro's route rules; it reads this flag instead.
  nitroApp.hooks.hook("request", (event) => {
    event.context["mirafiveShared"] = servedFromCache({}, getRouteRules(event))
  })
  nitroApp.hooks.hook("afterResponse", flush)
}
