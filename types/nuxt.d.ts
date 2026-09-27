// Type-checking only: Nuxt provides these aliases inside an app build.
declare module "#app" {
  export { defineNuxtPlugin, useHead, useRequestEvent, useResponseHeader, useRuntimeConfig } from "nuxt/app"
}

declare module "#imports" {
  export { useRuntimeConfig } from "nuxt/app"
}

declare module "#build/mirafive/client.mjs" {
  import type { Mira, MiraOptions, Mode, Plugin } from "@mirafive/sdk-browser"

  export const createMira: (options: MiraOptions) => Mira
  export const mode: Mode
  export const plugins: () => Plugin[]
}

declare module "#build/mirafive/server.mjs" {
  export const flags: boolean
}

interface ImportMeta {
  readonly prerender?: boolean
}
