# @mirafive/nuxt

MIRA FIVE for Nuxt 3 and 4: one module line for consent-aware analytics in the browser and
revenue from the server. `useMira()` and `useServerMira(event)` are auto-imported; server
events are sent after the response. The module has no dependencies besides MIRA FIVE's own (not
even `@nuxt/kit`).

## Install

```sh
npx nuxi module add @mirafive/nuxt   # or: npm install @mirafive/nuxt, then add it to modules
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@mirafive/nuxt"],
  mirafive: {
    // All optional. Runtime overrides: NUXT_PUBLIC_MIRAFIVE_KEY, NUXT_PUBLIC_MIRAFIVE_HOST.
    // key: "mira_pk_…",
    // consent: "auto",
    // autocapture: { forms: false },
  },
});
```

```sh
# .env
NUXT_PUBLIC_MIRAFIVE_KEY=mira_pk_…   # public key: browser
NUXT_MIRAFIVE_SECRET_KEY=mira_sk_…   # secret key: server only (MIRAFIVE_SECRET_KEY works too)
```

## Browser

```vue
<script setup lang="ts">
const mira = useMira();
const { user } = useUserSession();
useIdentify(
  () => user.value?.id,
  () => ({ plan: user.value?.plan }),
);
</script>

<template>
  <button @click="mira.track('signup_started', { plan: 'pro' })">Sign up</button>
</template>
```

Route changes are pageviews automatically. `useMira` and `useIdentify` are those of
[`@mirafive/vue`](https://github.com/mirafive/sdk-vue#api).

## Server

```ts
// server/api/checkout.post.ts
export default defineEventHandler(async (event) => {
  const { orderId, userId, totalCents, anonymousId } = await readBody(event);
  useServerMira(event).revenue({
    userId,
    anonymousId,
    amount: totalCents,
    currency: "EUR",
    entryId: `order:${orderId}`,
  });
  return { ok: true };
});
```

`useServerMira(event)` returns the process-wide [`@mirafive/node`](https://github.com/mirafive/sdk-node#readme)
client; a Nitro plugin flushes it with `event.waitUntil` once the response is out.

### Erasing a person (GDPR Art. 17)

```ts
// server/api/privacy.delete.ts
export default defineEventHandler(async (event) => {
  const { customerId } = await readBody(event);
  const proof = await useServerMira(event).deletePerson(customerId); // { request_id, deleted, … }
  return { requestId: proof.request_id };
});
```

Erases the person with the same effect as the dashboard's People page: events, devices, traits,
ids in other systems and touchpoints. Revenue stays in the totals, without the person. Unlike the
event methods it runs now, resolves with the proof (`request_id`, rows `deleted` per table) and
throws a `MiraError`: `error.retryable` is true for a busy or unreachable ingest, false for a wrong
key or a bad id. The erasure is idempotent: an unknown or already erased person resolves with zero
rows, so a retry is always safe. Events that name the person afterwards are refused for 30 days:
stop sending them. Details: [`deletePerson` in `@mirafive/node`](https://github.com/mirafive/sdk-node#erasing-a-person-gdpr-art-17).

The module refuses a secret key in `mirafive.key`: that value ships to every browser.

## For AI coding assistants

Rules for integrating MIRA FIVE correctly. They hold for every MIRA FIVE SDK.

- **Keys:** the public key (`mira_pk_…`) goes in browser and app code. The secret key (`mira_sk_…`)
  goes only into the server's environment (`MIRAFIVE_SECRET_KEY`), never into client code, a
  `NEXT_PUBLIC_`/`VITE_`/`PUBLIC_` variable or a repository. The SDKs refuse the wrong key.
- **Money** is sent only from the server: integer minor units plus an ISO 4217 currency
  (`amount: 1999, currency: "EUR"` is 19.99 EUR), never floats.
- **Count once:** give money an `entryId` from the payment provider (`stripe:in_123`), so the
  Stripe connector and retries do not double it. Give business events a stable id:
  `eventId: await eventIdFor("order:123:paid")`. The same key gives the same id in every SDK.
- **Personal data** never goes into event names or properties. Use your own user id (not an email)
  for `identify`; put email, name and phone in its traits, which MIRA FIVE encrypts at rest.
- **Consent:** keep `consent: "auto"`; it follows the site's consent banner (Usercentrics,
  Cookiebot, consentmanager, CCM19, Borlabs, any TCF 2.2 CMP, Google Consent Mode). Call
  `consent()` only for a custom banner. Do not gate the SDK behind consent yourself: without
  consent it is cookieless and still counts.
- **Never block on analytics:** event methods return nothing, never throw, and batch on their
  own. Do not `await` or `try` them. Call `flush()`/`shutdown()` only at the end of a script or a
  serverless function.
- **Server events and visitors:** pass the browser's `mira.anonymousId` to your server and set it
  as `anonymousId` on server events, so a purchase joins the visit and its source.
