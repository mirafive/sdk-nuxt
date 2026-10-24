import { createMiraPlugin } from "@mirafive/sdk-vue"

import { defineNuxtPlugin } from "#app"

export default defineNuxtPlugin({
  name: "mirafive",
  setup(nuxtApp) {
    nuxtApp.vueApp.use(createMiraPlugin(undefined))
  }
})
