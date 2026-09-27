import { bootstrapHeaders } from "@mirafive/sdk-server/flags"
import { createMiraPlugin } from "@mirafive/sdk-vue"

import { defineNuxtPlugin, useHead, useRequestEvent, useResponseHeader } from "#app"
import { flags } from "#build/mirafive/server.mjs"

import { miraFlagsFor, secretKey } from "./server/mira"

export default defineNuxtPlugin({
  name: "mirafive",
  async setup(nuxtApp) {
    const event = useRequestEvent()
    let bootstrap: string | undefined

    // A prerendered page would carry one visitor's answers to everyone.
    if (flags && event && !import.meta.prerender && secretKey(event)) {
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
