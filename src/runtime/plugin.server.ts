import { bootstrapHeaders } from "@mirafive/sdk-server/flags"
import { createMiraPlugin } from "@mirafive/sdk-vue"

import { defineNuxtPlugin, useHead, useRequestEvent, useResponseHeader } from "#app"
import { flags } from "#build/mirafive/server.mjs"

import { servedFromCache } from "./cache"
import { miraFlagsFor, secretKey, warnOnce } from "./server/mira"

export default defineNuxtPlugin({
  name: "mirafive",
  async setup(nuxtApp) {
    const event = useRequestEvent()
    let bootstrap: string | undefined

    // A page Nitro or a CDN stores (swr, isr, cache, prerender) would serve one visitor's answers to everyone.
    const shared =
      import.meta.prerender ||
      (!!event && (servedFromCache(event.context, {}) || event.context["mirafiveShared"] === true))

    if (flags && event && shared) {
      warnOnce(`no flag bootstrap on cached route ${event.path}: the browser loads its flags instead`)
    }

    if (flags && event && !shared && secretKey(event)) {
      bootstrap = (await miraFlagsFor(event, event.context["mirafive"] ?? {})).bootstrap()
      useResponseHeader("cache-control").value = bootstrapHeaders["Cache-Control"]
      useHead({
        script: [
          {
            id: "mirafive-flags",
            type: "application/json",
            innerHTML: bootstrap.slice(bootstrap.indexOf(">") + 1, bootstrap.lastIndexOf("<"))
          }
        ]
      })
    }

    nuxtApp.vueApp.use(createMiraPlugin(undefined, { bootstrap }))
  }
})
