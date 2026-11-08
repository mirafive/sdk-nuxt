// The Nuxt and Nitro virtual modules the runtime files use, so this package type-checks without
// installing Nuxt. In an app, Nuxt resolves the real ones.
declare module "#app" {
  interface NuxtAppLike {
    vueApp: import("vue").App;
  }
  export function defineNuxtPlugin(plugin: {
    name?: string;
    setup: (nuxtApp: NuxtAppLike) => void | Promise<void>;
  }): unknown;
  export function useRuntimeConfig(): { public: Record<string, unknown> } & Record<string, unknown>;
}

declare module "#imports" {
  export function useRuntimeConfig(event?: unknown): Record<string, unknown>;
}
