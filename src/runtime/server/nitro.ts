import type { H3Event } from "h3"

import { flush } from "./mira"

interface NitroApp {
  hooks: { hook: (name: "afterResponse", listener: (event: H3Event) => void) => unknown }
}

export default (nitroApp: NitroApp): void => {
  nitroApp.hooks.hook("afterResponse", flush)
}
