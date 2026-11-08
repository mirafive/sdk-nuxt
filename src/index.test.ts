import { describe, expect, test } from "bun:test";

import mirafive, { type NuxtLike } from "./index";

function fakeNuxt(mirafiveConfig?: NuxtLike["options"]["mirafive"]) {
  const hooks = new Map<string, (...args: never[]) => unknown>();
  const nuxt: NuxtLike = {
    options: {
      runtimeConfig: { public: {} },
      plugins: ["~/plugins/user.ts"],
      build: { transpile: [] },
      mirafive: mirafiveConfig,
    },
    hook: (name, handler) => hooks.set(name, handler),
  };
  const call = (name: string, ...args: unknown[]) =>
    (hooks.get(name) as ((...values: unknown[]) => unknown) | undefined)?.(...args);
  return { nuxt, call };
}

describe("@mirafive/nuxt", () => {
  test("puts the public options in public runtime config and the secret key in private", () => {
    const { nuxt } = fakeNuxt({ key: "mira_pk_1", secretKey: "mira_sk_1", debug: true });
    mirafive({ host: "https://ingest.example" }, nuxt);
    expect(nuxt.options.runtimeConfig.public.mirafive).toEqual({
      key: "mira_pk_1",
      host: "https://ingest.example",
      debug: true,
    });
    expect(nuxt.options.runtimeConfig.mirafive).toEqual({ secretKey: "mira_sk_1" });
  });

  test("keeps runtime config the app set and writes empty keys for NUXT_ overrides", () => {
    const { nuxt } = fakeNuxt();
    nuxt.options.runtimeConfig.public.mirafive = { key: "mira_pk_from_app" };
    mirafive({}, nuxt);
    expect(nuxt.options.runtimeConfig.public.mirafive).toEqual({
      key: "mira_pk_from_app",
      host: "",
    });
    expect(nuxt.options.runtimeConfig.mirafive).toEqual({ secretKey: "" });
  });

  test("refuses a secret key where the browser would see it", () => {
    const { nuxt } = fakeNuxt({ key: "mira_sk_oops" });
    expect(() => mirafive({}, nuxt)).toThrow("secret key");
  });

  test("adds its plugin first, the auto-imports and the Nitro parts", () => {
    const { nuxt, call } = fakeNuxt({ key: "mira_pk_1" });
    mirafive({}, nuxt);
    expect(nuxt.options.plugins[0]).toMatchObject({ mode: "all" });
    expect(String((nuxt.options.plugins[0] as { src: string }).src)).toEndWith("runtime/plugin.js");
    expect(nuxt.options.plugins[1]).toBe("~/plugins/user.ts");
    expect(nuxt.options.build.transpile[0]).toEndWith("runtime");

    const imports: { name: string; from: string }[] = [];
    call("imports:extend", imports);
    expect(imports.map((item) => item.name)).toEqual(["useMira", "useIdentify"]);

    const nitro: Record<string, any> = {};
    call("nitro:config", nitro);
    expect(nitro.plugins[0]).toEndWith("runtime/nitro.js");
    expect(nitro.imports.imports[0].name).toBe("useServerMira");
    expect(nitro.externals.inline[0]).toEndWith("runtime");
  });

  test("tells Nuxt its name and config key", async () => {
    expect(await mirafive.getMeta()).toMatchObject({
      name: "@mirafive/nuxt",
      configKey: "mirafive",
    });
  });
});
